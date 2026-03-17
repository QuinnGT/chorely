import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { appSettings } from '@/db/schema';
import { verifyPinSchema } from '@/lib/validators';

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const { pin } = verifyPinSchema.parse(body);

    const setting = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, 'admin_pin'));

    if (setting.length === 0) {
      return NextResponse.json({ error: 'PIN not configured' }, { status: 500 });
    }

    if (setting[0].value !== pin) {
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
