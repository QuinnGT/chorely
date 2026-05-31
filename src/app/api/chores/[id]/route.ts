import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { chores, choreAssignments } from '@/db/schema';
import { updateChoreSchema, type UpdateChoreInput } from '@/lib/validators';
import type { ChoreFrequency, ChoreKind } from '@/lib/chore-types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface UpdateChoreValues {
  name?: string;
  icon?: string;
  frequency?: ChoreFrequency;
  kind?: ChoreKind;
  description?: string | null;
  rewardAmount?: string;
  isActive?: boolean;
}

function serializeChore<T extends { rewardAmount: string }>(chore: T): Omit<T, 'rewardAmount'> & {
  rewardAmount: number;
} {
  return {
    ...chore,
    rewardAmount: Number(chore.rewardAmount),
  };
}

function buildUpdateChoreValues(
  input: Omit<UpdateChoreInput, 'assignedKidIds'>
): UpdateChoreValues {
  const values: UpdateChoreValues = {};

  if (input.name !== undefined) values.name = input.name;
  if (input.icon !== undefined) values.icon = input.icon;
  if (input.kind !== undefined) values.kind = input.kind;
  if (input.isActive !== undefined) values.isActive = input.isActive;

  if (input.kind === 'big_boss') {
    values.frequency = 'weekly';
    values.description = input.description?.trim() || null;
    if (input.rewardAmount !== undefined) {
      values.rewardAmount = String(input.rewardAmount);
    }
  } else if (input.kind === 'standard') {
    values.description = null;
    values.rewardAmount = '0';
    if (input.frequency !== undefined) values.frequency = input.frequency;
  } else {
    if (input.frequency !== undefined) values.frequency = input.frequency;
    if (input.description !== undefined) values.description = input.description?.trim() || null;
    if (input.rewardAmount !== undefined) values.rewardAmount = String(input.rewardAmount);
  }

  return values;
}

export async function PATCH(request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params;
    const body: unknown = await request.json();
    const { assignedKidIds, ...choreData } = updateChoreSchema.parse(body);
    const values = buildUpdateChoreValues(choreData);

    const [updated] = await db
      .update(chores)
      .set(values)
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
      if (assignments.length > 0) {
        await db.insert(choreAssignments).values(assignments);
      }
    }

    return NextResponse.json(serializeChore(updated));
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
