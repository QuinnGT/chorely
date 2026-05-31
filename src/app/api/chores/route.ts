import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { chores, choreAssignments } from '@/db/schema';
import { createChoreSchema, type CreateChoreInput } from '@/lib/validators';
import type { ChoreFrequency, ChoreKind } from '@/lib/chore-types';

type CreateChoreValues = Omit<CreateChoreInput, 'assignedKidIds' | 'rewardAmount'> & {
  frequency: ChoreFrequency;
  kind: ChoreKind;
  description: string | null;
  rewardAmount: string;
};

function serializeChore<T extends { rewardAmount: string }>(chore: T): Omit<T, 'rewardAmount'> & {
  rewardAmount: number;
} {
  return {
    ...chore,
    rewardAmount: Number(chore.rewardAmount),
  };
}

function buildCreateChoreValues(
  input: Omit<CreateChoreInput, 'assignedKidIds'>
): CreateChoreValues {
  const kind = input.kind;
  const description = input.description?.trim() || null;

  return {
    name: input.name,
    icon: input.icon,
    frequency: kind === 'big_boss' ? 'weekly' : input.frequency,
    kind,
    description: kind === 'big_boss' ? description : null,
    rewardAmount: String(kind === 'big_boss' ? input.rewardAmount : 0),
  };
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const allChores = await db.query.chores.findMany({
      ...(includeInactive ? {} : { where: eq(chores.isActive, true) }),
      with: {
        choreAssignments: {
          with: {
            kid: true,
          },
        },
      },
      orderBy: [chores.frequency, chores.createdAt],
    });

    return NextResponse.json(allChores.map(serializeChore));
  } catch (error: unknown) {
    console.error('Failed to fetch chores:', error);
    return NextResponse.json({ error: 'Failed to fetch chores' }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const { assignedKidIds, ...choreData } = createChoreSchema.parse(body);
    const values = buildCreateChoreValues(choreData);

    // Create chore
    const [created] = await db.insert(chores).values(values).returning();

    // Create assignments
    const assignments = assignedKidIds.map((kidId) => ({
      choreId: created.id,
      kidId,
    }));
    await db.insert(choreAssignments).values(assignments);

    return NextResponse.json(serializeChore(created), { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: error }, { status: 400 });
    }
    console.error('Failed to create chore:', error);
    return NextResponse.json({ error: 'Failed to create chore' }, { status: 500 });
  }
}
