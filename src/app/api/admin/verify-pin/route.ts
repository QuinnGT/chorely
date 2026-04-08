import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { timingSafeEqual } from 'crypto';
import { db } from '@/db';
import { appSettings } from '@/db/schema';
import { verifyPinSchema } from '@/lib/validators';

// --- In-memory rate limiter (per-IP, resets on restart) ---
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const MAX_ATTEMPTS = 5;

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

function getRateLimitKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  // Fallback — in production a reverse proxy should always set x-forwarded-for
  return 'unknown';
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

// --- Timing-safe PIN comparison ---
function pinsMatch(stored: string, provided: string): boolean {
  // Pad both to the same length to avoid leaking length info
  const maxLen = Math.max(stored.length, provided.length, 1);
  const a = Buffer.from(stored.padEnd(maxLen, '\0'));
  const b = Buffer.from(provided.padEnd(maxLen, '\0'));
  return a.length === b.length && timingSafeEqual(a, b);
}

// --- POST /api/admin/verify-pin ---
export async function POST(request: Request): Promise<NextResponse> {
  try {
    // Rate limiting
    const clientKey = getRateLimitKey(request);
    if (isRateLimited(clientKey)) {
      return NextResponse.json(
        { error: 'Too many attempts. Please wait a minute and try again.' },
        { status: 429 },
      );
    }

    const body: unknown = await request.json();
    const { pin } = verifyPinSchema.parse(body);

    const setting = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, 'admin_pin'));

    if (setting.length === 0) {
      return NextResponse.json({ error: 'PIN not configured' }, { status: 500 });
    }

    if (!pinsMatch(setting[0].value, pin)) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: error }, { status: 400 });
    }
    console.error('Failed to verify PIN:', error);
    return NextResponse.json({ error: 'Failed to verify PIN' }, { status: 500 });
  }
}
