import { NextResponse } from 'next/server';
import { eq, and, desc, gte, lte, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import {
  allowanceLedger,
  choreAssignments,
  choreCompletions,
  spendingCategories,
  categoryBalances,
  savingsGoals,
} from '@/db/schema';
import { calculateAllowance, calculateStreak } from '@/lib/allowance-engine';
import { loadAllowanceRules } from '@/lib/allowance-rules';
import { getWeekStart, formatDate } from '@/lib/date-utils';
import { splitEarnings } from '@/lib/spending-categories';
import { allocateEarnings } from '@/lib/savings-allocation';

// ─── Validation schemas ─────────────────────────────────────────────────────

const postAllowanceSchema = z.object({
  kidId: z.string().uuid(),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'weekStart must be YYYY-MM-DD'),
});

const patchAllowanceSchema = z.object({
  id: z.string().uuid(),
  paidVia: z.string().max(50).optional(),
});

// ─── Helpers ────────────────────────────────────────────────────────────────

async function getAssignmentsWithChores(kidId: string) {
  return db.query.choreAssignments.findMany({
    where: eq(choreAssignments.kidId, kidId),
    with: { chore: true },
  });
}

async function getCompletionsForWeek(assignmentIds: string[], weekStart: string) {
  const endDate = new Date(weekStart);
  endDate.setDate(endDate.getDate() + 6);
  const endStr = formatDate(endDate);

  if (assignmentIds.length === 0) return [];

  return db
    .select()
    .from(choreCompletions)
    .where(
      and(
        inArray(choreCompletions.assignmentId, assignmentIds),
        eq(choreCompletions.completed, true),
        gte(choreCompletions.date, weekStart),
        lte(choreCompletions.date, endStr)
      )
    );
}

function buildCompletionRecords(
  completions: { date: string; completed: boolean; assignmentId: string }[],
  assignments: { id: string; chore: { frequency: 'daily' | 'weekly' } }[]
) {
  const assignmentFreqMap = new Map(
    assignments.map((a) => [a.id, a.chore.frequency])
  );

  return completions.map((c) => ({
    date: c.date,
    completed: c.completed,
    frequency: assignmentFreqMap.get(c.assignmentId) ?? ('daily' as const),
  }));
}

function computeTotalExpected(
  assignments: { chore: { frequency: 'daily' | 'weekly' } }[]
) {
  let total = 0;
  for (const a of assignments) {
    total += a.chore.frequency === 'daily' ? 7 : 1;
  }
  return total;
}

async function buildStreakMap(kidId: string, today: Date) {
  const assignments = await getAssignmentsWithChores(kidId);
  const dailyAssignmentIds = assignments
    .filter((a) => a.chore.frequency === 'daily')
    .map((a) => a.id);

  if (dailyAssignmentIds.length === 0) {
    return new Map<string, boolean[]>();
  }

  // Query only completions for daily assignments in the last year
  const yearAgo = new Date(today);
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);
  const yearAgoStr = formatDate(yearAgo);
  const todayStr = formatDate(today);

  const dailyCompletions = await db
    .select()
    .from(choreCompletions)
    .where(
      and(
        inArray(choreCompletions.assignmentId, dailyAssignmentIds),
        eq(choreCompletions.completed, true),
        gte(choreCompletions.date, yearAgoStr),
        lte(choreCompletions.date, todayStr)
      )
    );

  // Build map: date → array of booleans (one per daily assignment)
  const dateMap = new Map<string, boolean[]>();
  const d = new Date(today);
  d.setHours(0, 0, 0, 0);

  for (let i = 0; i < 365; i++) {
    const dateStr = formatDate(d);
    const completionsForDate = dailyCompletions.filter((c) => c.date === dateStr);
    const booleans = dailyAssignmentIds.map((aId) =>
      completionsForDate.some((c) => c.assignmentId === aId)
    );
    dateMap.set(dateStr, booleans);
    d.setDate(d.getDate() - 1);
  }

  return dateMap;
}

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

    // Fetch ledger history
    const history = await db
      .select()
      .from(allowanceLedger)
      .where(eq(allowanceLedger.kidId, kidId))
      .orderBy(desc(allowanceLedger.weekStart));

    // Compute current week's projected allowance
    const today = new Date();
    const weekStartDate = getWeekStart(today);
    const weekStartStr = formatDate(weekStartDate);

    const assignments = await getAssignmentsWithChores(kidId);
    const assignmentIds = assignments.map((a) => a.id);
    const completions = await getCompletionsForWeek(assignmentIds, weekStartStr);

    const completionRecords = buildCompletionRecords(completions, assignments);
    const totalExpected = computeTotalExpected(assignments);

    const streakMap = await buildStreakMap(kidId, today);
    const streakDays = calculateStreak(streakMap, today);

    const rules = await loadAllowanceRules(kidId);
    const currentWeek = calculateAllowance(completionRecords, totalExpected, streakDays, rules);

    return NextResponse.json({ currentWeek, history });
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
