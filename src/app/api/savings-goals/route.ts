import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { ZodError } from 'zod';
import { db } from '@/db';
import { savingsGoals } from '@/db/schema';
import {
  createSavingsGoalSchema,
  updateSavingsGoalSchema,
} from '@/lib/validators';

// ─── GET /api/savings-goals?kidId=X ─────────────────────────────────────────

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const kidId = searchParams.get('kidId');

    if (!kidId) {
      return NextResponse.json({ error: 'kidId is required' }, { status: 400 });
    }

    const goals = await db
      .select()
      .from(savingsGoals)
      .where(eq(savingsGoals.kidId, kidId))
      .orderBy(savingsGoals.createdAt);

    const formatted = goals.map((goal) => ({
      ...goal,
      targetAmount: Number(goal.targetAmount),
      currentAmount: Number(goal.currentAmount),
    }));

    return NextResponse.json(formatted);
  } catch (error: unknown) {
    console.error('Failed to fetch savings goals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch savings goals' },
      { status: 500 }
    );
  }
}

// ─── POST /api/savings-goals ────────────────────────────────────────────────

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const validated = createSavingsGoalSchema.parse(body);

    const [goal] = await db
      .insert(savingsGoals)
      .values({
        kidId: validated.kidId,
        name: validated.name,
        targetAmount: String(validated.targetAmount),
        status: 'active',
      })
      .returning();

    return NextResponse.json(
      {
        ...goal,
        targetAmount: Number(goal.targetAmount),
        currentAmount: Number(goal.currentAmount),
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      const details: Record<string, string[]> = {};
      for (const issue of error.issues) {
        const field = issue.path.join('.');
        if (!details[field]) {
          details[field] = [];
        }
        details[field].push(issue.message);
      }
      return NextResponse.json(
        { error: 'Validation failed', details },
        { status: 400 }
      );
    }
    console.error('Failed to create savings goal:', error);
    return NextResponse.json(
      { error: 'Failed to create savings goal' },
      { status: 500 }
    );
  }
}

// ─── PATCH /api/savings-goals ───────────────────────────────────────────────

export async function PATCH(request: Request): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const validated = updateSavingsGoalSchema.parse(body);

    const updateData: Record<string, unknown> = {};

    if (validated.name !== undefined) {
      updateData.name = validated.name;
    }
    if (validated.targetAmount !== undefined) {
      updateData.targetAmount = String(validated.targetAmount);
    }
    if (validated.status !== undefined) {
      updateData.status = validated.status;
      if (validated.status === 'completed') {
        updateData.completedAt = new Date();
      }
    }

    const [updated] = await db
      .update(savingsGoals)
      .set(updateData)
      .where(eq(savingsGoals.id, validated.id))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: 'Savings goal not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...updated,
      targetAmount: Number(updated.targetAmount),
      currentAmount: Number(updated.currentAmount),
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      const details: Record<string, string[]> = {};
      for (const issue of error.issues) {
        const field = issue.path.join('.');
        if (!details[field]) {
          details[field] = [];
        }
        details[field].push(issue.message);
      }
      return NextResponse.json(
        { error: 'Validation failed', details },
        { status: 400 }
      );
    }
    console.error('Failed to update savings goal:', error);
    return NextResponse.json(
      { error: 'Failed to update savings goal' },
      { status: 500 }
    );
  }
}
