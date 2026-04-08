import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { ZodError } from 'zod';
import { db } from '@/db';
import { spendingCategories, categoryBalances } from '@/db/schema';
import { spendingCategoriesConfigSchema } from '@/lib/validators';

// ─── Default categories when feature is first enabled ───────────────────────

const DEFAULT_CATEGORIES = [
  { name: 'Save', percentage: 40, sortOrder: 0 },
  { name: 'Spend', percentage: 40, sortOrder: 1 },
  { name: 'Give', percentage: 20, sortOrder: 2 },
];

// ─── GET /api/spending-categories?kidId=X ───────────────────────────────────

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const kidId = searchParams.get('kidId');

    if (!kidId) {
      return NextResponse.json({ error: 'kidId is required' }, { status: 400 });
    }

    const categories = await db
      .select()
      .from(spendingCategories)
      .where(eq(spendingCategories.kidId, kidId))
      .orderBy(spendingCategories.sortOrder);

    if (categories.length === 0) {
      return NextResponse.json({ enabled: false, categories: [] });
    }

    // Fetch balances for each category
    const balances = await db
      .select()
      .from(categoryBalances)
      .where(eq(categoryBalances.kidId, kidId));

    const balanceMap = new Map(
      balances.map((b) => [b.categoryId, Number(b.balance)])
    );

    const formatted = categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      percentage: cat.percentage,
      sortOrder: cat.sortOrder,
      balance: balanceMap.get(cat.id) ?? 0,
    }));

    return NextResponse.json({ enabled: true, categories: formatted });
  } catch (error: unknown) {
    console.error('Failed to fetch spending categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch spending categories' },
      { status: 500 }
    );
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function injectDefaultsIfNeeded(body: unknown): unknown {
  if (
    typeof body === 'object' &&
    body !== null &&
    'enabled' in body &&
    (body as Record<string, unknown>).enabled === true &&
    'categories' in body &&
    Array.isArray((body as Record<string, unknown>).categories) &&
    ((body as Record<string, unknown>).categories as unknown[]).length === 0
  ) {
    return {
      ...body as Record<string, unknown>,
      categories: DEFAULT_CATEGORIES.map(({ name, percentage }) => ({ name, percentage })),
    };
  }
  return body;
}

function isDefaultCategories(
  categories: { name: string; percentage: number }[]
): boolean {
  if (categories.length !== DEFAULT_CATEGORIES.length) return false;
  return DEFAULT_CATEGORIES.every(
    (def, i) =>
      categories[i].name === def.name &&
      categories[i].percentage === def.percentage
  );
}

// ─── PUT /api/spending-categories ───────────────────────────────────────────

export async function PUT(request: Request): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();

    // Pre-process: inject default categories when enabling with empty array
    const preprocessed = injectDefaultsIfNeeded(body);

    const validated = spendingCategoriesConfigSchema.parse(preprocessed);

    const { kidId, enabled, categories: inputCategories } = validated;

    if (!enabled) {
      // Disable: delete all categories (cascade deletes balances)
      await db
        .delete(spendingCategories)
        .where(eq(spendingCategories.kidId, kidId));

      return NextResponse.json({ enabled: false, categories: [] });
    }

    // Check if kid already has categories
    const existing = await db
      .select()
      .from(spendingCategories)
      .where(eq(spendingCategories.kidId, kidId));

    // Determine which categories to use: defaults only when first enabling with no existing
    const categoriesToInsert =
      existing.length === 0 && isDefaultCategories(inputCategories)
        ? DEFAULT_CATEGORIES
        : inputCategories.map((c, i) => ({
            name: c.name,
            percentage: c.percentage,
            sortOrder: i,
          }));

    // Delete existing categories first (replace strategy)
    if (existing.length > 0) {
      await db
        .delete(spendingCategories)
        .where(eq(spendingCategories.kidId, kidId));
    }

    // Insert new categories
    const inserted = await db
      .insert(spendingCategories)
      .values(
        categoriesToInsert.map((c) => ({
          kidId,
          name: c.name,
          percentage: c.percentage,
          sortOrder: c.sortOrder,
        }))
      )
      .returning();

    // Create category balances for each new category
    await db.insert(categoryBalances).values(
      inserted.map((cat) => ({
        categoryId: cat.id,
        kidId,
        balance: '0.00',
      }))
    );

    const formatted = inserted.map((cat) => ({
      id: cat.id,
      name: cat.name,
      percentage: cat.percentage,
      sortOrder: cat.sortOrder,
      balance: 0,
    }));

    return NextResponse.json({ enabled: true, categories: formatted });
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
    console.error('Failed to save spending categories:', error);
    return NextResponse.json(
      { error: 'Failed to save spending categories' },
      { status: 500 }
    );
  }
}
