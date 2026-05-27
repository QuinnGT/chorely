import { NextResponse } from 'next/server';
import { generateImage } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { db } from '@/db';
import { uploads } from '@/db/schema';
import { buildAvatarPrompt, isValidPreset, isValidStyle } from '@/lib/avatar-presets';

const DEFAULT_MODEL = 'openai/gpt-5.4-image-2';
const REQUEST_TIMEOUT_MS = 240_000;

export const maxDuration = 300;

export async function POST(request: Request): Promise<NextResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OPENROUTER_API_KEY not configured' },
      { status: 503 },
    );
  }

  try {
    const body: unknown = await request.json();
    if (typeof body !== 'object' || !body) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }
    const { preset, style } = body as { preset?: unknown; style?: unknown };

    if (typeof preset !== 'string' || !isValidPreset(preset)) {
      return NextResponse.json({ error: 'Invalid preset' }, { status: 400 });
    }
    if (typeof style !== 'string' || !isValidStyle(style)) {
      return NextResponse.json({ error: 'Invalid style' }, { status: 400 });
    }

    const prompt = buildAvatarPrompt(preset, style);
    const modelId = process.env.AVATAR_MODEL || DEFAULT_MODEL;

    console.log('[avatar-gen] start', { model: modelId, preset, style });
    const startedAt = Date.now();

    const openrouter = createOpenRouter({ apiKey });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let result;
    try {
      result = await generateImage({
        model: openrouter.imageModel(modelId),
        prompt,
        abortSignal: controller.signal,
      });
    } catch (err: unknown) {
      const aborted = err instanceof Error && err.name === 'AbortError';
      console.error('[avatar-gen] generateImage failed', {
        ms: Date.now() - startedAt,
        aborted,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
      return NextResponse.json(
        { error: aborted ? 'Generation timed out' : 'Image generation failed' },
        { status: aborted ? 504 : 502 },
      );
    } finally {
      clearTimeout(timeoutId);
    }

    const elapsed = Date.now() - startedAt;
    const image = result.image;
    const buffer = Buffer.from(image.uint8Array);
    const mimeType =
      (image as { mediaType?: string }).mediaType ??
      (image as { mimeType?: string }).mimeType ??
      'image/png';

    console.log('[avatar-gen] success', {
      ms: elapsed,
      bytes: buffer.length,
      mimeType,
    });

    const [row] = await db
      .insert(uploads)
      .values({ mimeType, data: buffer })
      .returning({ id: uploads.id });

    return NextResponse.json({ url: `/api/uploads/${row.id}` }, { status: 201 });
  } catch (error: unknown) {
    console.error('[avatar-gen] uncaught error', error);
    return NextResponse.json({ error: 'Failed to generate avatar' }, { status: 500 });
  }
}
