import { NextResponse } from 'next/server';
import { eq, and, desc, lt, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import {
  allowanceLedger,
  spendingCategories,
  categoryBalances,
  savingsGoals,
} from '@/db/schema';
import { calculateAllowance, calculateStreak } from '@/lib/allowance-engine';
import { loadAllowanceRules } from '@/lib/allowance-rules';
import { splitEarnings } from '@/lib/spending-categories';
import { allocateEarnings } from '@/lib/savings-allocation';
import {
  getAssignmentsWithChores,
  getCompletionsForWeek,
  buildCompletionRecords,
  computeTotalExpected,
  buildStreakMap,
  computeCurrentWeekAllowance,
  bankWeek,
  summarizeWallet,
} from '@/lib/allowance-week';

// ─── Validation schemas ─────────────────────────────────────────────────────

const postAllowanceSchema = z.object({
  kidId: z.string().uuid(),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'weekStart must be YYYY-MM-DD'),
});

const patchAllowanceSchema = z.object({
  id: z.string().uuid(),
  paidVia: z.string().max(50).optional(),
});

// ─── Allocation helpers ─────────────────────────────────────────────────────

async function allocateToSpendingCategories(
  kidId: string,
  totalEarning: number
): Promise<void> {
  const categories = await db
    .select()
    .from(spendingCategories)
    .where(eq(spendingCategories.kidId, kidId))
    .orderBy(spendingCategories.sortOrder);

  if (categories.length === 0) return;

  const allocations = splitEarnings(
    totalEarning,
    categories.map((c) => ({ name: c.name, percentage: c.percentage }))
  );

  if (!allocations) return;

  // Build a map from category name to DB category id
  const nameToId = new Map(categories.map((c) => [c.name, c.id]));

  for (const allocation of allocations) {
    const categoryId = nameToId.get(allocation.name);
    if (!categoryId || allocation.amount <= 0) continue;

    await db
      .update(categoryBalances)
      .set({
        balance: sql`${categoryBalances.balance} + ${String(allocation.amount)}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(categoryBalances.categoryId, categoryId),
          eq(categoryBalances.kidId, kidId)
        )
      );
  }
}

async function allocateToSavingsGoals(
  kidId: string,
  totalEarning: number
): Promise<void> {
  const goals = await db
    .select()
    .from(savingsGoals)
    .where(
      and(
        eq(savingsGoals.kidId, kidId),
        eq(savingsGoals.status, 'active')
      )
    )
    .orderBy(savingsGoals.createdAt);

  if (goals.length === 0) return;

  const mappedGoals = goals.map((g) => ({
    id: g.id,
    status: g.status as 'active' | 'completed' | 'archived',
    targetAmount: Number(g.targetAmount),
    currentAmount: Number(g.currentAmount),
    createdAt: g.createdAt,
  }));

  const result = allocateEarnings(mappedGoals, totalEarning);

  for (const updated of result.updatedGoals) {
    const original = mappedGoals.find((g) => g.id === updated.id);
    if (!original) continue;

    // Only update goals whose amounts or status changed
    const amountChanged = updated.currentAmount !== original.currentAmount;
    const statusChanged = updated.status !== original.status;

    if (!amountChanged && !statusChanged) continue;

    const updateData: Record<string, unknown> = {
      currentAmount: String(updated.currentAmount),
    };

    if (result.completedGoalIds.includes(updated.id)) {
      updateData.status = 'completed';
      updateData.completedAt = new Date();
    }

    await db
      .update(savingsGoals)
      .set(updateData)
      .where(eq(savingsGoals.id, updated.id));
  }
}

// ─── GET /api/allowance?kidId=X ─────────────────────────────────────────────

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const kidId = searchParams.get('kidId');

    if (!kidId) {
      return NextResponse.json({ error: 'kidId is required' }, { status: 400 });
    }

    // Compute the in-progress week's projected allowance.
    const today = new Date();
    const currentWeek = await computeCurrentWeekAllowance(kidId, today);

    // History is strictly past weeks (the in-progress week shows separately).
    const history = await db
      .select()
      .from(allowanceLedger)
      .where(
        and(
          eq(allowanceLedger.kidId, kidId),
          lt(allowanceLedger.weekStart, currentWeek.weekStart)
        )
      )
      .orderBy(desc(allowanceLedger.weekStart));

    // Bank the in-progress week so it counts toward the persistent wallet,
    // then derive the spendable balance (lifetime earned − non-declined spend).
    await bankWeek(kidId, currentWeek.weekStart, currentWeek.base, currentWeek.bonus);
    const wallet = await summarizeWallet(kidId);

    return NextResponse.json({
      currentWeek,
      history,
      spendableBalance: wallet.spendableBalance,
      lifetimeEarned: wallet.lifetimeEarned,
      totalSpent: wallet.totalSpent,
    });
  } catch (error: unknown) {
    console.error('Failed to fetch allowance:', error);
    return NextResponse.json({ error: 'Failed to fetch allowance' }, { status: 500 });
  }
}

// ─── POST /api/allowance ────────────────────────────────────────────────────

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const { kidId, weekStart } = postAllowanceSchema.parse(body);

    const assignments = await getAssignmentsWithChores(kidId);
    const assignmentIds = assignments.map((a) => a.id);
    const completions = await getCompletionsForWeek(assignmentIds, weekStart);

    const completionRecords = buildCompletionRecords(completions, assignments);
    const totalExpected = computeTotalExpected(assignments);

    const weekStartDate = new Date(weekStart + 'T00:00:00');
    const streakMap = await buildStreakMap(kidId, weekStartDate);
    const streakDays = calculateStreak(streakMap, weekStartDate);

    const rules = await loadAllowanceRules(kidId);
    const result = calculateAllowance(completionRecords, totalExpected, streakDays, rules);

    // Upsert: update if exists, insert otherwise
    const existing = await db
      .select()
      .from(allowanceLedger)
      .where(
        and(
          eq(allowanceLedger.kidId, kidId),
          eq(allowanceLedger.weekStart, weekStart)
        )
      );

    let record;
    if (existing.length > 0) {
      [record] = await db
        .update(allowanceLedger)
        .set({
          earned: String(result.base),
          bonusEarned: String(result.bonus),
        })
        .where(eq(allowanceLedger.id, existing[0].id))
        .returning();
    } else {
      [record] = await db
        .insert(allowanceLedger)
        .values({
          kidId,
          weekStart,
          earned: String(result.base),
          bonusEarned: String(result.bonus),
        })
        .returning();
    }

    // ── Allocate earnings to spending categories and savings goals ──
    // These are independent features — both use the full earning amount.
    // Failures here should not break the main allowance recording.
    const totalEarning = result.total;

    try {
      await allocateToSpendingCategories(kidId, totalEarning);
    } catch (err: unknown) {
      console.error('Failed to allocate to spending categories:', err);
    }

    try {
      await allocateToSavingsGoals(kidId, totalEarning);
    } catch (err: unknown) {
      console.error('Failed to allocate to savings goals:', err);
    }

    return NextResponse.json(record, { status: existing.length > 0 ? 200 : 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: error }, { status: 400 });
    }
    console.error('Failed to record allowance:', error);
    return NextResponse.json({ error: 'Failed to record allowance' }, { status: 500 });
  }
}

// ─── PATCH /api/allowance ───────────────────────────────────────────────────

export async function PATCH(request: Request): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const { id, paidVia } = patchAllowanceSchema.parse(body);

    const [updated] = await db
      .update(allowanceLedger)
      .set({
        paid: true,
        paidAt: new Date(),
        paidVia: paidVia ?? null,
      })
      .where(eq(allowanceLedger.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Allowance record not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: error }, { status: 400 });
    }
    console.error('Failed to mark allowance as paid:', error);
    return NextResponse.json({ error: 'Failed to mark allowance as paid' }, { status: 500 });
  }
}
