import { NextResponse } from 'next/server';
import { db } from '@/db';
import { kids } from '@/db/schema';
import { createKidSchema } from '@/lib/validators';

export async function GET(): Promise<NextResponse> {
  try {
    const allKids = await db.select().from(kids).orderBy(kids.createdAt);
    return NextResponse.json(allKids);
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
