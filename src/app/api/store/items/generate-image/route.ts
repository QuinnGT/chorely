import { NextResponse } from 'next/server';
import { buildStoreItemPrompt } from '@/lib/store-item-prompt';
import {
  IMAGE_GEN_TIMEOUT_MS,
  generateFromPrompt,
  resolveOpenRouterModel,
  saveImageUpload,
  type GeneratedImage,
  type Quality,
} from '@/lib/image-gen';

const VALID_CATEGORIES = ['toys', 'games', 'experiences', 'books'] as const;
type Category = (typeof VALID_CATEGORIES)[number];

export const maxDuration = 300;

function isValidCategory(value: unknown): value is Category {
  return typeof value === 'string' && (VALID_CATEGORIES as readonly string[]).includes(value);
}

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
    const { name, description, category, quality } = body as {
      name?: unknown;
      description?: unknown;
      category?: unknown;
      quality?: unknown;
    };

    if (typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Item name is required' }, { status: 400 });
    }
    if (name.length > 120) {
      return NextResponse.json({ error: 'Item name is too long' }, { status: 400 });
    }
    if (description !== undefined && typeof description !== 'string') {
      return NextResponse.json({ error: 'Invalid description' }, { status: 400 });
    }
    if (typeof description === 'string' && description.length > 500) {
      return NextResponse.json({ error: 'Description is too long' }, { status: 400 });
    }

    const qualityId: Quality = quality === 'quality' ? 'quality' : 'fast';
    const categoryId = isValidCategory(category) ? category : undefined;

    const prompt = buildStoreItemPrompt({
      name,
      description: typeof description === 'string' ? description : undefined,
      category: categoryId,
    });
    const modelId = resolveOpenRouterModel(qualityId);

    console.log('[store-item-image] start', { model: modelId, name, quality: qualityId });
    const startedAt = Date.now();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), IMAGE_GEN_TIMEOUT_MS);

    let generated: GeneratedImage;
    try {
      generated = await generateFromPrompt({
        apiKey,
        modelId,
        prompt,
        signal: controller.signal,
        label: '[store-item-image]',
      });
    } catch (err: unknown) {
      const aborted = err instanceof Error && err.name === 'AbortError';
      const errMessage = err instanceof Error ? err.message : String(err);
      const filtered =
        errMessage.includes('No image generated') ||
        errMessage.includes('No image in response');
      console.error('[store-item-image] generation failed', {
        ms: Date.now() - startedAt,
        aborted,
        error: errMessage,
        stack: err instanceof Error ? err.stack : undefined,
      });
      const userMessage = aborted
        ? 'Generation timed out'
        : filtered
          ? 'Couldn’t generate that one — try rephrasing without brand names'
          : 'Image generation failed';
      return NextResponse.json(
        { error: userMessage },
        { status: aborted ? 504 : 502 },
      );
    } finally {
      clearTimeout(timeoutId);
    }

    console.log('[store-item-image] success', {
      ms: Date.now() - startedAt,
      bytes: generated.buffer.length,
      mimeType: generated.mimeType,
    });

    const url = await saveImageUpload(generated);
    return NextResponse.json({ url }, { status: 201 });
  } catch (error: unknown) {
    console.error('[store-item-image] uncaught error', error);
    return NextResponse.json({ error: 'Failed to generate image' }, { status: 500 });
  }
}
