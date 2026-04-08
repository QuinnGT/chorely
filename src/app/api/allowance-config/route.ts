import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { ZodError } from 'zod';
import { db } from '@/db';
import { allowanceRules } from '@/db/schema';
import { allowanceRulesSchema } from '@/lib/validators';
import { loadAllowanceRules } from '@/lib/allowance-rules';

// ─── GET /api/allowance-config?kidId=X ──────────────────────────────────────

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const kidId = searchParams.get('kidId');

    if (!kidId) {
      return NextResponse.json({ error: 'kidId is required' }, { status: 400 });
    }

    const rules = await loadAllowanceRules(kidId);

    return NextResponse.json(rules);
  } catch (error: unknown) {
    console.error('Failed to fetch allowance config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch allowance config' },
      { status: 500 }
    );
  }
}

// ─── PUT /api/allowance-config ──────────────────────────────────────────────

export async function PUT(request: Request): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const validated = allowanceRulesSchema.parse(body);

    const [record] = await db
      .insert(allowanceRules)
      .values({
        kidId: validated.kidId,
        fullCompletionAmount: String(validated.fullCompletionAmount),
        partialCompletionAmount: String(validated.partialCompletionAmount),
        streakBonusAmount: String(validated.streakBonusAmount),
        minStreakDays: validated.minStreakDays,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: allowanceRules.kidId,
        set: {
          fullCompletionAmount: String(validated.fullCompletionAmount),
          partialCompletionAmount: String(validated.partialCompletionAmount),
          streakBonusAmount: String(validated.streakBonusAmount),
          minStreakDays: validated.minStreakDays,
          updatedAt: new Date(),
        },
      })
      .returning();

    return NextResponse.json({
      fullCompletionAmount: Number(record.fullCompletionAmount),
      partialCompletionAmount: Number(record.partialCompletionAmount),
      streakBonusAmount: Number(record.streakBonusAmount),
      minStreakDays: record.minStreakDays,
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
    console.error('Failed to save allowance config:', error);
    return NextResponse.json(
      { error: 'Failed to save allowance config' },
      { status: 500 }
    );
  }
}
