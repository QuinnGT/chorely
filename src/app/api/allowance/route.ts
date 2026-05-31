import { NextResponse } from 'next/server';
import { eq, and, desc, lt } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { allowanceLedger } from '@/db/schema';
import { calculateAllowance, calculateStreak } from '@/lib/allowance-engine';
import { loadAllowanceRules } from '@/lib/allowance-rules';
import {
  getAssignmentsWithChores,
  getCompletionsForWeek,
  buildCompletionRecords,
  computeTotalExpected,
  calculateBigBossBonus,
  buildStreakMap,
  computeWallet,
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

// ─── GET /api/allowance?kidId=X ─────────────────────────────────────────────

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const kidId = searchParams.get('kidId');

    if (!kidId) {
      return NextResponse.json({ error: 'kidId is required' }, { status: 400 });
    }

    // computeWallet banks the in-progress week and derives the full picture
    // (jars/wallet, store balance, goal funding) from persisted facts.
    const wallet = await computeWallet(kidId, new Date());

    // History = strictly past weeks (the in-progress week shows separately).
    const history = await db
      .select()
      .from(allowanceLedger)
      .where(
        and(
          eq(allowanceLedger.kidId, kidId),
          lt(allowanceLedger.weekStart, wallet.currentWeek.weekStart)
        )
      )
      .orderBy(desc(allowanceLedger.weekStart));

    return NextResponse.json({
      currentWeek: wallet.currentWeek,
      history,
      wallet,
      // Back-compat fields consumed by the store page / older callers.
      spendableBalance: wallet.storeBalance,
      lifetimeEarned: wallet.lifetimeEarned,
      totalSpent: wallet.storeSpent,
    });
  } catch (error: unknown) {
    console.error('Failed to fetch allowance:', error);
    return NextResponse.json({ error: 'Failed to fetch allowance' }, { status: 500 });
  }
}

// ─── POST /api/allowance ────────────────────────────────────────────────────
// Records (or recomputes) a specific week's earned/bonus into the ledger.
// Jar/goal allocation is no longer done here — balances are derived live by
// computeWallet, so recording a week only needs to persist its totals.

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
    const bigBossBonus = calculateBigBossBonus(completions, assignments);
    const bonus = Math.round((result.bonus + bigBossBonus) * 100) / 100;

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
          bonusEarned: String(bonus),
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
          bonusEarned: String(bonus),
        })
        .returning();
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
