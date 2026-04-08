import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { ZodError } from 'zod';
import { db } from '@/db';
import { storeOrders, storeItems } from '@/db/schema';
import {
  createStoreOrderSchema,
  updateStoreOrderSchema,
} from '@/lib/validators';

// ─── GET /api/store/orders?kidId=X ───────────────────────────────────────────

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const kidId = searchParams.get('kidId');

    if (!kidId) {
      return NextResponse.json({ error: 'kidId is required' }, { status: 400 });
    }

    const orders = await db
      .select({
        id: storeOrders.id,
        kidId: storeOrders.kidId,
        itemId: storeOrders.itemId,
        status: storeOrders.status,
        createdAt: storeOrders.createdAt,
        updatedAt: storeOrders.updatedAt,
        itemName: storeItems.name,
        itemPrice: storeItems.price,
        itemImageUrl: storeItems.imageUrl,
      })
      .from(storeOrders)
      .leftJoin(storeItems, eq(storeOrders.itemId, storeItems.id))
      .where(eq(storeOrders.kidId, kidId))
      .orderBy(storeOrders.createdAt);

    return NextResponse.json(
      orders.map((o) => ({
        ...o,
        itemPrice: Number(o.itemPrice),
      }))
    );
  } catch (error: unknown) {
    console.error('Failed to fetch store orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch store orders' },
      { status: 500 }
    );
  }
}

// ─── POST /api/store/orders ──────────────────────────────────────────────────

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const validated = createStoreOrderSchema.parse(body);

    // Verify item exists and is available
    const [item] = await db
      .select()
      .from(storeItems)
      .where(
        and(
          eq(storeItems.id, validated.itemId),
          eq(storeItems.active, true)
        )
      );

    if (!item) {
      return NextResponse.json(
        { error: 'Item not found or not available' },
        { status: 404 }
      );
    }

    if (item.stock <= 0) {
      return NextResponse.json(
        { error: 'Item is out of stock' },
        { status: 400 }
      );
    }

    // Create order
    const [order] = await db
      .insert(storeOrders)
      .values({
        kidId: validated.kidId,
        itemId: validated.itemId,
        status: 'pending',
      })
      .returning();

    // Decrement stock
    await db
      .update(storeItems)
      .set({
        stock: item.stock - 1,
        updatedAt: new Date(),
      })
      .where(eq(storeItems.id, item.id));

    return NextResponse.json(
      {
        ...order,
        item: {
          ...item,
          price: Number(item.price),
        },
      },
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
    console.error('Failed to create store order:', error);
    return NextResponse.json(
      { error: 'Failed to create store order' },
      { status: 500 }
    );
  }
}

// ─── PATCH /api/store/orders ─────────────────────────────────────────────────

export async function PATCH(request: Request): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const validated = updateStoreOrderSchema.parse(body);

    const [updated] = await db
      .update(storeOrders)
      .set({
        status: validated.status,
        updatedAt: new Date(),
      })
      .where(eq(storeOrders.id, validated.id))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
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
    console.error('Failed to update store order:', error);
    return NextResponse.json(
      { error: 'Failed to update store order' },
      { status: 500 }
    );
  }
}
