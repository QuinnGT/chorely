import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { kids } from '@/db/schema';
import { updateKidSchema } from '@/lib/validators';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params;
    const body: unknown = await request.json();
    const parsed = updateKidSchema.parse(body);

    const [updated] = await db
      .update(kids)
      .set(parsed)
      .where(eq(kids.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Kid not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: error }, { status: 400 });
    }
    console.error('Failed to update kid:', error);
    return NextResponse.json({ error: 'Failed to update kid' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params;
    const [deleted] = await db
      .delete(kids)
      .where(eq(kids.id, id))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: 'Kid not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Failed to delete kid:', error);
    return NextResponse.json({ error: 'Failed to delete kid' }, { status: 500 });
  }
}
