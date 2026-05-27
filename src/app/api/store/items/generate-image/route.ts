import { NextResponse } from 'next/server';
import { generateImage } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { db } from '@/db';
import { uploads } from '@/db/schema';
import { buildStoreItemPrompt } from '@/lib/store-item-prompt';

const DEFAULT_FAST_MODEL = 'google/gemini-2.5-flash-image';
const DEFAULT_QUALITY_MODEL = 'openai/gpt-5.4-image-2';
const REQUEST_TIMEOUT_MS = 240_000;
const VALID_CATEGORIES = ['toys', 'games', 'experiences', 'books'] as const;
type Category = (typeof VALID_CATEGORIES)[number];

export const maxDuration = 300;

function resolveModel(quality: 'fast' | 'quality'): string {
  if (quality === 'fast') {
    return process.env.AVATAR_MODEL_FAST || DEFAULT_FAST_MODEL;
  }
  return process.env.AVATAR_MODEL || DEFAULT_QUALITY_MODEL;
}

interface GeneratedImage {
  buffer: Buffer;
  mimeType: string;
}

async function generateViaSdk(
  apiKey: string,
  modelId: string,
  prompt: string,
  signal: AbortSignal,
): Promise<GeneratedImage> {
  const openrouter = createOpenRouter({ apiKey });
  const result = await generateImage({
    model: openrouter.imageModel(modelId),
    prompt,
    abortSignal: signal,
  });
  const image = result.image;
  return {
    buffer: Buffer.from(image.uint8Array),
    mimeType:
      (image as { mediaType?: string }).mediaType ??
      (image as { mimeType?: string }).mimeType ??
      'image/png',
  };
}

function extractImageDataUrl(json: unknown): string | null {
  if (typeof json !== 'object' || json === null) return null;
  const choices = (json as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const message = (choices[0] as { message?: unknown }).message;
  if (typeof message !== 'object' || message === null) return null;

  const images = (message as { images?: unknown }).images;
  if (Array.isArray(images)) {
    for (const img of images) {
      const url = (img as { image_url?: { url?: unknown } })?.image_url?.url;
      if (typeof url === 'string' && url.startsWith('data:image/')) return url;
    }
  }

  const content = (message as { content?: unknown }).content;
  if (Array.isArray(content)) {
    for (const part of content) {
      const url = (part as { image_url?: { url?: unknown } })?.image_url?.url;
      if (typeof url === 'string' && url.startsWith('data:image/')) return url;
      const b64 = (part as { b64_json?: unknown }).b64_json;
      if (typeof b64 === 'string') return `data:image/png;base64,${b64}`;
    }
  }

  if (typeof content === 'string') {
    const match = content.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/);
    if (match) return match[0];
  }

  return null;
}

async function generateViaImageOnly(
  apiKey: string,
  modelId: string,
  prompt: string,
  signal: AbortSignal,
): Promise<GeneratedImage> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelId,
      messages: [{ role: 'user', content: prompt }],
      modalities: ['image'],
    }),
    signal,
  });

  const rawText = await res.text();
  if (!res.ok) {
    throw new Error(`OpenRouter ${res.status}: ${rawText.slice(0, 500)}`);
  }

  let json: unknown;
  try {
    json = JSON.parse(rawText);
  } catch {
    throw new Error(`Non-JSON response: ${rawText.slice(0, 500)}`);
  }

  const dataUrl = extractImageDataUrl(json);
  if (!dataUrl) {
    throw new Error(
      `No image in response: ${JSON.stringify(json).slice(0, 500)}`,
    );
  }

  const match = dataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);
  if (!match) throw new Error('Malformed data url');
  return { buffer: Buffer.from(match[2], 'base64'), mimeType: match[1] };
}

function shouldRetryViaImageOnly(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return (
    err.message.includes('No endpoints found that support the requested output modalities') ||
    err.message.includes('No image generated')
  );
}

const IMAGE_ONLY_MODEL_PREFIXES = ['x-ai/grok-imagine'];

function isImageOnlyModel(modelId: string): boolean {
  return IMAGE_ONLY_MODEL_PREFIXES.some((prefix) => modelId.startsWith(prefix));
}

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

    const qualityId: 'fast' | 'quality' = quality === 'quality' ? 'quality' : 'fast';
    const categoryId = isValidCategory(category) ? category : undefined;

    const prompt = buildStoreItemPrompt({
      name,
      description: typeof description === 'string' ? description : undefined,
      category: categoryId,
    });
    const modelId = resolveModel(qualityId);

    console.log('[store-item-image] start', { model: modelId, name, quality: qualityId });
    const startedAt = Date.now();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let generated: GeneratedImage;
    try {
      if (isImageOnlyModel(modelId)) {
        generated = await generateViaImageOnly(apiKey, modelId, prompt, controller.signal);
      } else {
        try {
          generated = await generateViaSdk(apiKey, modelId, prompt, controller.signal);
        } catch (err: unknown) {
          if (shouldRetryViaImageOnly(err)) {
            console.log('[store-item-image] sdk path failed, retrying via image-only endpoint', {
              model: modelId,
              reason: err instanceof Error ? err.message : String(err),
            });
            generated = await generateViaImageOnly(apiKey, modelId, prompt, controller.signal);
          } else {
            throw err;
          }
        }
      }
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

    const [row] = await db
      .insert(uploads)
      .values({ mimeType: generated.mimeType, data: generated.buffer })
      .returning({ id: uploads.id });

    return NextResponse.json({ url: `/api/uploads/${row.id}` }, { status: 201 });
  } catch (error: unknown) {
    console.error('[store-item-image] uncaught error', error);
    return NextResponse.json({ error: 'Failed to generate image' }, { status: 500 });
  }
}
