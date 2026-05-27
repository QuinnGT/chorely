import { NextResponse } from 'next/server';
import { generateImage } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { db } from '@/db';
import { uploads } from '@/db/schema';
import {
  buildAvatarPrompt,
  isValidPreset,
  isValidQuality,
  isValidStyle,
  type QualityId,
} from '@/lib/avatar-presets';

const DEFAULT_FAST_MODEL = 'google/gemini-2.5-flash-image';
const DEFAULT_QUALITY_MODEL = 'openai/gpt-5.4-image-2';
const REQUEST_TIMEOUT_MS = 240_000;

export const maxDuration = 300;

function resolveModel(quality: QualityId): string {
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

function isUnsupportedModalitiesError(err: unknown): boolean {
  return (
    err instanceof Error &&
    err.message.includes('No endpoints found that support the requested output modalities')
  );
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
    const { preset, style, quality } = body as {
      preset?: unknown;
      style?: unknown;
      quality?: unknown;
    };

    if (typeof preset !== 'string' || !isValidPreset(preset)) {
      return NextResponse.json({ error: 'Invalid preset' }, { status: 400 });
    }
    if (typeof style !== 'string' || !isValidStyle(style)) {
      return NextResponse.json({ error: 'Invalid style' }, { status: 400 });
    }
    const qualityId: QualityId =
      typeof quality === 'string' && isValidQuality(quality) ? quality : 'fast';

    const prompt = buildAvatarPrompt(preset, style);
    const modelId = resolveModel(qualityId);

    console.log('[avatar-gen] start', { model: modelId, preset, style, quality: qualityId });
    const startedAt = Date.now();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let generated: GeneratedImage;
    try {
      try {
        generated = await generateViaSdk(apiKey, modelId, prompt, controller.signal);
      } catch (err: unknown) {
        if (isUnsupportedModalitiesError(err)) {
          console.log('[avatar-gen] sdk path rejected modalities, retrying image-only', {
            model: modelId,
          });
          generated = await generateViaImageOnly(apiKey, modelId, prompt, controller.signal);
        } else {
          throw err;
        }
      }
    } catch (err: unknown) {
      const aborted = err instanceof Error && err.name === 'AbortError';
      console.error('[avatar-gen] generation failed', {
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

    console.log('[avatar-gen] success', {
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
    console.error('[avatar-gen] uncaught error', error);
    return NextResponse.json({ error: 'Failed to generate avatar' }, { status: 500 });
  }
}
