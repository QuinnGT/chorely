import { NextResponse } from 'next/server';
import { like } from 'drizzle-orm';
import { ZodError } from 'zod';
import { db } from '@/db';
import { appSettings } from '@/db/schema';
import { storeSettingsSchema } from '@/lib/validators';
import type { StoreSettingsInput } from '@/lib/validators';

const STORE_KEY_PREFIX = 'store.';

const DEFAULTS: StoreSettingsInput = {
  currencyName: 'Coins',
  minimumBalance: 10,
  notifyNewOrders: true,
};

function buildSettingsFromRows(rows: { key: string; value: string }[]): StoreSettingsInput {
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    currencyName: map.get('store.currencyName') ?? DEFAULTS.currencyName,
    minimumBalance: Number(map.get('store.minimumBalance') ?? DEFAULTS.minimumBalance),
    notifyNewOrders: (map.get('store.notifyNewOrders') ?? String(DEFAULTS.notifyNewOrders)) === 'true',
  };
}

// ─── GET /api/store/settings ────────────────────────────────────────────────

export async function GET(): Promise<NextResponse> {
  try {
    const rows = await db
      .select({ key: appSettings.key, value: appSettings.value })
      .from(appSettings)
      .where(like(appSettings.key, `${STORE_KEY_PREFIX}%`));

    return NextResponse.json(buildSettingsFromRows(rows));
  } catch (error: unknown) {
    console.error('Failed to fetch store settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch store settings' },
      { status: 500 },
    );
  }
}

// ─── PUT /api/store/settings ────────────────────────────────────────────────

export async function PUT(request: Request): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const validated = storeSettingsSchema.parse(body);

    const entries: { key: string; value: string }[] = [
      { key: 'store.currencyName', value: validated.currencyName },
      { key: 'store.minimumBalance', value: String(validated.minimumBalance) },
      { key: 'store.notifyNewOrders', value: String(validated.notifyNewOrders) },
    ];

    for (const entry of entries) {
      await db
        .insert(appSettings)
        .values({ key: entry.key, value: entry.value })
        .onConflictDoUpdate({
          target: appSettings.key,
          set: { value: entry.value },
        });
    }

    return NextResponse.json(validated);
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
    console.error('Failed to save store settings:', error);
    return NextResponse.json(
      { error: 'Failed to save store settings' },
      { status: 500 },
    );
  }
}
