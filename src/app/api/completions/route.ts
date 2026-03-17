import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { choreCompletions, choreAssignments } from '@/db/schema';
import { toggleCompletionSchema } from '@/lib/validators';

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const kidId = searchParams.get('kidId');
    const weekStart = searchParams.get('weekStart');

    if (!kidId) {
      return NextResponse.json({ error: 'kidId is required' }, { status: 400 });
    }

    // Get all assignments for this kid
    const assignments = await db
      .select()
      .from(choreAssignments)
      .where(eq(choreAssignments.kidId, kidId));

    const assignmentIds = assignments.map((a) => a.id);

    if (assignmentIds.length === 0) {
      return NextResponse.json([]);
    }

    // Get completions for those assignments
    let completions;
    if (weekStart) {
      // Get completions for a specific week (7 days from weekStart)
      const endDate = new Date(weekStart);
      endDate.setDate(endDate.getDate() + 6);
      const endStr = endDate.toISOString().split('T')[0];

      completions = await db
        .select()
        .from(choreCompletions)
        .where(
          and(
            eq(choreCompletions.completed, true),
          )
        );

      // Filter by assignment IDs and date range in JS for simplicity
      completions = completions.filter(
        (c) =>
          assignmentIds.includes(c.assignmentId) &&
          c.date >= weekStart &&
          c.date <= endStr
      );
    } else {
      completions = await db
        .select()
        .from(choreCompletions);

      completions = completions.filter((c) => assignmentIds.includes(c.assignmentId));
    }

    return NextResponse.json(completions);
  } catch (error: unknown) {
    console.error('Failed to fetch completions:', error);
    return NextResponse.json({ error: 'Failed to fetch completions' }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const { assignmentId, date, completed } = toggleCompletionSchema.parse(body);

    // Check if a completion record exists for this assignment + date
    const existing = await db
      .select()
      .from(choreCompletions)
      .where(
        and(
          eq(choreCompletions.assignmentId, assignmentId),
          eq(choreCompletions.date, date)
        )
      );

    if (existing.length > 0) {
      // Update existing
      const [updated] = await db
        .update(choreCompletions)
        .set({
          completed,
          completedAt: completed ? new Date() : null,
        })
        .where(eq(choreCompletions.id, existing[0].id))
        .returning();

      return NextResponse.json(updated);
    }

    // Create new
    const [created] = await db
      .insert(choreCompletions)
      .values({
        assignmentId,
        date,
        completed,
        completedAt: completed ? new Date() : null,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: error }, { status: 400 });
    }
    console.error('Failed to toggle completion:', error);
    return NextResponse.json({ error: 'Failed to toggle completion' }, { status: 500 });
  }
}
