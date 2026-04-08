import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { ZodError } from 'zod';
import { db } from '@/db';
import { storeItems } from '@/db/schema';
import {
  createStoreItemSchema,
  updateStoreItemSchema,
} from '@/lib/validators';

// ─── GET /api/store/items ────────────────────────────────────────────────────

export async function GET(): Promise<NextResponse> {
  try {
    const items = await db
      .select()
      .from(storeItems)
      .orderBy(storeItems.createdAt);

    const formatted = items.map((item) => ({
      ...item,
      price: Number(item.price),
    }));

    return NextResponse.json(formatted);
  } catch (error: unknown) {
    console.error('Failed to fetch store items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch store items' },
      { status: 500 }
    );
  }
}

// ─── POST /api/store/items ───────────────────────────────────────────────────

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const validated = createStoreItemSchema.parse(body);

    const [item] = await db
      .insert(storeItems)
      .values({
        name: validated.name,
        description: validated.description,
        imageUrl: validated.imageUrl ?? null,
        price: String(validated.price),
        category: validated.category,
        stock: validated.stock,
        active: validated.active,
      })
      .returning();

    return NextResponse.json(
      { ...item, price: Number(item.price) },
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
    console.error('Failed to create store item:', error);
    return NextResponse.json(
      { error: 'Failed to create store item' },
      { status: 500 }
    );
  }
}

// ─── PATCH /api/store/items ──────────────────────────────────────────────────

export async function PATCH(request: Request): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const validated = updateStoreItemSchema.parse(body);

    const updateData: Record<string, unknown> = {};
    if (validated.name !== undefined) updateData.name = validated.name;
    if (validated.description !== undefined) updateData.description = validated.description;
    if (validated.imageUrl !== undefined) updateData.imageUrl = validated.imageUrl;
    if (validated.price !== undefined) updateData.price = String(validated.price);
    if (validated.category !== undefined) updateData.category = validated.category;
    if (validated.stock !== undefined) updateData.stock = validated.stock;
    if (validated.active !== undefined) updateData.active = validated.active;
    updateData.updatedAt = new Date();

    const [updated] = await db
      .update(storeItems)
      .set(updateData)
      .where(eq(storeItems.id, validated.id))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: 'Store item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ ...updated, price: Number(updated.price) });
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
    console.error('Failed to update store item:', error);
    return NextResponse.json(
      { error: 'Failed to update store item' },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/store/items ─────────────────────────────────────────────────

export async function DELETE(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const [deleted] = await db
      .delete(storeItems)
      .where(eq(storeItems.id, id))
      .returning();

    if (!deleted) {
      return NextResponse.json(
        { error: 'Store item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Failed to delete store item:', error);
    return NextResponse.json(
      { error: 'Failed to delete store item' },
      { status: 500 }
    );
  }
}
