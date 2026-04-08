import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { chores, choreAssignments } from '@/db/schema';
import { updateChoreSchema } from '@/lib/validators';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params;
    const body: unknown = await request.json();
    const { assignedKidIds, ...choreData } = updateChoreSchema.parse(body);

    const [updated] = await db
      .update(chores)
      .set(choreData)
      .where(eq(chores.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Chore not found' }, { status: 404 });
    }

    if (assignedKidIds) {
      await db.delete(choreAssignments).where(eq(choreAssignments.choreId, id));
      const assignments = assignedKidIds.map((kidId) => ({
        choreId: id,
        kidId,
      }));
      await db.insert(choreAssignments).values(assignments);
    }

    return NextResponse.json(updated);
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: error }, { status: 400 });
    }
    console.error('Failed to update chore:', error);
    return NextResponse.json({ error: 'Failed to update chore' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params;
    const [deleted] = await db
      .delete(chores)
      .where(eq(chores.id, id))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: 'Chore not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Failed to delete chore:', error);
    return NextResponse.json({ error: 'Failed to delete chore' }, { status: 500 });
  }
}
