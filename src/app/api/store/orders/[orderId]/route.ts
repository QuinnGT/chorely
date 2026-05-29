import { NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { ZodError } from 'zod';
import { db } from '@/db';
import { storeOrders, storeItems } from '@/db/schema';
import { storeOrderStatusSchema } from '@/lib/validators';

// ─── PATCH /api/store/orders/:orderId ───────────────────────────────────────

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
): Promise<NextResponse> {
  try {
    const { orderId } = await params;
    const body: unknown = await request.json();
    const validated = storeOrderStatusSchema.parse(body);

    // Fetch the current order so we can detect status transitions
    // (declining an order returns its item to stock).
    const [existing] = await db
      .select()
      .from(storeOrders)
      .where(eq(storeOrders.id, orderId));

    if (!existing) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 },
      );
    }

    const [updated] = await db
      .update(storeOrders)
      .set({
        status: validated.status,
        updatedAt: new Date(),
      })
      .where(eq(storeOrders.id, orderId))
      .returning();

    // Returning the item to stock when an order is declined. Guarded so
    // re-declining an already-declined order can't inflate stock.
    if (validated.status === 'declined' && existing.status !== 'declined') {
      await db
        .update(storeItems)
        .set({
          stock: sql`${storeItems.stock} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(storeItems.id, existing.itemId));
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
        { status: 400 },
      );
    }
    console.error('Failed to update store order:', error);
    return NextResponse.json(
      { error: 'Failed to update store order' },
      { status: 500 },
    );
  }
}
