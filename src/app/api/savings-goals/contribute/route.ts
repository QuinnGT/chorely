import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z, ZodError } from 'zod';
import { db } from '@/db';
import { savingsGoals } from '@/db/schema';
import { computeWallet } from '@/lib/allowance-week';

// ─── POST /api/savings-goals/contribute ─────────────────────────────────────
// Move money between the kid's spendable balance / Save jar and a goal.
//   action 'contribute' — add to the goal (capped at available funds + target)
//   action 'withdraw'   — take back the kid's own (manual) contributions
//
// `currentAmount` is the goal's manual net contribution; auto-fill from the
// Save jar (jars mode) is derived separately by computeWallet.

const contributeSchema = z.object({
  goalId: z.string().uuid(),
  amount: z.number().positive().multipleOf(0.01),
  action: z.enum(['contribute', 'withdraw']),
});

const round2 = (n: number): number => Math.round(n * 100) / 100;
const EPSILON = 1e-9;

function formatGoal(goal: typeof savingsGoals.$inferSelect) {
  return {
    ...goal,
    targetAmount: Number(goal.targetAmount),
    currentAmount: Number(goal.currentAmount),
  };
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const { goalId, amount, action } = contributeSchema.parse(body);

    const [goal] = await db
      .select()
      .from(savingsGoals)
      .where(eq(savingsGoals.id, goalId));

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }
    if (goal.status === 'archived') {
      return NextResponse.json({ error: 'Goal is archived' }, { status: 400 });
    }

    const manual = Number(goal.currentAmount);
    const target = Number(goal.targetAmount);

    // ── Withdraw: give back the kid's own contributions ──
    if (action === 'withdraw') {
      if (amount > manual + EPSILON) {
        return NextResponse.json(
          { error: 'You can only take back what you put in' },
          { status: 400 }
        );
      }
      const [updated] = await db
        .update(savingsGoals)
        .set({ currentAmount: String(round2(manual - amount)) })
        .where(eq(savingsGoals.id, goalId))
        .returning();
      return NextResponse.json(formatGoal(updated));
    }

    // ── Contribute: pull from the spendable balance / Save jar ──
    const wallet = await computeWallet(goal.kidId);
    const saved = wallet.goals.find((g) => g.id === goalId)?.savedAmount ?? manual;
    const roomToTarget = Math.max(0, round2(target - saved));

    if (roomToTarget <= 0) {
      return NextResponse.json(
        { error: 'This goal is already fully funded' },
        { status: 400 }
      );
    }
    if (amount > wallet.goalAvailable + EPSILON) {
      return NextResponse.json(
        { error: 'Not enough available to save that much' },
        { status: 400 }
      );
    }

    // Never push a goal past its target.
    const contribution = round2(Math.min(amount, roomToTarget));
    const [updated] = await db
      .update(savingsGoals)
      .set({ currentAmount: String(round2(manual + contribution)) })
      .where(eq(savingsGoals.id, goalId))
      .returning();

    return NextResponse.json(formatGoal(updated));
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      const details: Record<string, string[]> = {};
      for (const issue of error.issues) {
        const field = issue.path.join('.');
        if (!details[field]) details[field] = [];
        details[field].push(issue.message);
      }
      return NextResponse.json({ error: 'Validation failed', details }, { status: 400 });
    }
    console.error('Failed to update goal contribution:', error);
    return NextResponse.json({ error: 'Failed to update goal contribution' }, { status: 500 });
  }
}
