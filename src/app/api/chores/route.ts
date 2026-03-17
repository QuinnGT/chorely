import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { chores, choreAssignments } from '@/db/schema';
import { createChoreSchema } from '@/lib/validators';

export async function GET(): Promise<NextResponse> {
  try {
    const allChores = await db.query.chores.findMany({
      where: eq(chores.isActive, true),
      with: {
        choreAssignments: {
          with: {
            kid: true,
          },
        },
      },
      orderBy: [chores.frequency, chores.createdAt],
    });

    return NextResponse.json(allChores);
  } catch (error: unknown) {
    console.error('Failed to fetch chores:', error);
    return NextResponse.json({ error: 'Failed to fetch chores' }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const { assignedKidIds, ...choreData } = createChoreSchema.parse(body);

    // Create chore
    const [created] = await db.insert(chores).values(choreData).returning();

    // Create assignments
    const assignments = assignedKidIds.map((kidId) => ({
      choreId: created.id,
      kidId,
    }));
    await db.insert(choreAssignments).values(assignments);

    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: error }, { status: 400 });
    }
    console.error('Failed to create chore:', error);
    return NextResponse.json({ error: 'Failed to create chore' }, { status: 500 });
  }
}
