import { NextResponse } from 'next/server';
import { sql, eq } from 'drizzle-orm';
import { db } from '@/db';
import { kids, choreAssignments, choreCompletions, allowanceLedger } from '@/db/schema';
import { createKidSchema } from '@/lib/validators';

// --- GET /api/kids ---
export async function GET(): Promise<NextResponse> {
  try {
    const allKids = await db.select().from(kids).orderBy(kids.createdAt);

    // Aggregate tasks done per kid
    const taskCounts = await db
      .select({
        kidId: choreAssignments.kidId,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(choreCompletions)
      .innerJoin(choreAssignments, eq(choreCompletions.assignmentId, choreAssignments.id))
      .where(eq(choreCompletions.completed, true))
      .groupBy(choreAssignments.kidId);

    // Aggregate total earned per kid
    const earnedTotals = await db
      .select({
        kidId: allowanceLedger.kidId,
        total: sql<string>`SUM(${allowanceLedger.earned}::numeric + ${allowanceLedger.bonusEarned}::numeric)`,
      })
      .from(allowanceLedger)
      .groupBy(allowanceLedger.kidId);

    const taskMap = new Map(taskCounts.map((r) => [r.kidId, r.count]));
    const earnedMap = new Map(earnedTotals.map((r) => [r.kidId, Number(r.total)]));

    const result = allKids.map((kid) => ({
      ...kid,
      tasksDone: taskMap.get(kid.id) ?? 0,
      totalEarned: earnedMap.get(kid.id) ?? 0,
    }));

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Failed to fetch kids:', error);
    return NextResponse.json({ error: 'Failed to fetch kids' }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const parsed = createKidSchema.parse(body);

    const [created] = await db.insert(kids).values(parsed).returning();
    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: error }, { status: 400 });
    }
    console.error('Failed to create kid:', error);
    return NextResponse.json({ error: 'Failed to create kid' }, { status: 500 });
  }
}
