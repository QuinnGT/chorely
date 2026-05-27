import { NextResponse } from 'next/server';
import { db } from '@/db';
import { uploads } from '@/db/schema';
import {
  buildAvatarFromPhotoPrompt,
  isValidPreset,
  isValidQuality,
  isValidStyle,
  type QualityId,
} from '@/lib/avatar-presets';

const FAST_MODEL = process.env.AVATAR_PHOTO_MODEL_FAST || 'google/gemini-2.5-flash-image';
const REQUEST_TIMEOUT_MS = 240_000;
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

export const maxDuration = 300;

interface GeneratedImage {
  buffer: Buffer;
  mimeType: string;
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

function dataUrlToImage(dataUrl: string): GeneratedImage {
  const match = dataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);
  if (!match) throw new Error('Malformed data url');
  return { buffer: Buffer.from(match[2], 'base64'), mimeType: match[1] };
}

function extractTextContent(json: unknown): string | null {
  if (typeof json !== 'object' || json === null) return null;
  const choices = (json as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const message = (choices[0] as { message?: unknown }).message;
  if (typeof message !== 'object' || message === null) return null;
  const content = (message as { content?: unknown }).content;
  if (typeof content === 'string' && content.trim().length > 0) return content;
  if (Array.isArray(content)) {
    for (const part of content) {
      const text = (part as { text?: unknown }).text;
      if (typeof text === 'string' && text.trim().length > 0) return text;
    }
  }
  return null;
}

class ModelRefusalError extends Error {
  reason: string;
  constructor(reason: string) {
    super('Model declined the request');
    this.name = 'ModelRefusalError';
    this.reason = reason;
  }
}

async function generateFast(
  apiKey: string,
  prompt: string,
  photoDataUrl: string,
  signal: AbortSignal,
): Promise<GeneratedImage> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: FAST_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: photoDataUrl } },
          ],
        },
      ],
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
    const text = extractTextContent(json);
    if (text) throw new ModelRefusalError(text);
    throw new Error(`No image in response: ${JSON.stringify(json).slice(0, 500)}`);
  }
  return dataUrlToImage(dataUrl);
}

async function generateQuality(
  apiKey: string,
  prompt: string,
  photoBuffer: Buffer,
  photoMime: string,
  signal: AbortSignal,
): Promise<GeneratedImage> {
  const ext = photoMime === 'image/png' ? 'png' : 'jpg';
  const form = new FormData();
  form.append('model', 'gpt-image-1');
  form.append('prompt', prompt);
  form.append('size', '1024x1024');
  form.append(
    'image',
    new Blob([new Uint8Array(photoBuffer)], { type: photoMime }),
    `source.${ext}`,
  );

  const res = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
    signal,
  });

  const rawText = await res.text();
  if (!res.ok) {
    throw new Error(`OpenAI ${res.status}: ${rawText.slice(0, 500)}`);
  }

  let json: unknown;
  try {
    json = JSON.parse(rawText);
  } catch {
    throw new Error(`Non-JSON response: ${rawText.slice(0, 500)}`);
  }

  const data = (json as { data?: Array<{ b64_json?: unknown }> }).data;
  const b64 = Array.isArray(data) ? data[0]?.b64_json : undefined;
  if (typeof b64 !== 'string') {
    throw new Error(`No image in response: ${JSON.stringify(json).slice(0, 500)}`);
  }
  return { buffer: Buffer.from(b64, 'base64'), mimeType: 'image/png' };
}

export async function POST(request: Request): Promise<NextResponse> {
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  if (!openrouterKey) {
    return NextResponse.json(
      { error: 'OPENROUTER_API_KEY not configured' },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
  }

  const photo = form.get('photo');
  const preset = form.get('preset');
  const style = form.get('style');
  const qualityRaw = form.get('quality');

  if (!(photo instanceof File)) {
    return NextResponse.json({ error: 'Missing photo' }, { status: 400 });
  }
  if (photo.size > MAX_PHOTO_BYTES) {
    return NextResponse.json({ error: 'Photo too large' }, { status: 413 });
  }
  if (!photo.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Photo must be an image' }, { status: 400 });
  }
  if (typeof preset !== 'string' || !isValidPreset(preset)) {
    return NextResponse.json({ error: 'Invalid preset' }, { status: 400 });
  }
  if (typeof style !== 'string' || !isValidStyle(style)) {
    return NextResponse.json({ error: 'Invalid style' }, { status: 400 });
  }
  const quality: QualityId =
    typeof qualityRaw === 'string' && isValidQuality(qualityRaw) ? qualityRaw : 'fast';

  const photoBuffer = Buffer.from(await photo.arrayBuffer());
  const photoMime = photo.type;
  const photoDataUrl = `data:${photoMime};base64,${photoBuffer.toString('base64')}`;
  const prompt = buildAvatarFromPhotoPrompt(preset, style);

  const openaiKey = process.env.OPENAI_API_KEY;
  const useQuality = quality === 'quality' && !!openaiKey;
  const effectiveQuality: QualityId = useQuality ? 'quality' : 'fast';

  console.log('[avatar-photo-gen] start', {
    preset,
    style,
    requestedQuality: quality,
    effectiveQuality,
    photoBytes: photoBuffer.length,
    photoMime,
  });
  const startedAt = Date.now();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let generated: GeneratedImage;
  try {
    if (useQuality) {
      generated = await generateQuality(
        openaiKey!,
        prompt,
        photoBuffer,
        photoMime,
        controller.signal,
      );
    } else {
      generated = await generateFast(openrouterKey, prompt, photoDataUrl, controller.signal);
    }
  } catch (err: unknown) {
    const aborted = err instanceof Error && err.name === 'AbortError';
    const refusal = err instanceof ModelRefusalError ? err : null;
    console.error('[avatar-photo-gen] generation failed', {
      ms: Date.now() - startedAt,
      aborted,
      refusal: refusal ? refusal.reason.slice(0, 400) : undefined,
      error: err instanceof Error ? err.message : String(err),
    });
    if (refusal) {
      return NextResponse.json(
        {
          error:
            'The image generator declined this combination. Try a different character or style.',
        },
        { status: 422 },
      );
    }
    return NextResponse.json(
      { error: aborted ? 'Generation timed out' : 'Image generation failed' },
      { status: aborted ? 504 : 502 },
    );
  } finally {
    clearTimeout(timeoutId);
  }

  console.log('[avatar-photo-gen] success', {
    ms: Date.now() - startedAt,
    bytes: generated.buffer.length,
    mimeType: generated.mimeType,
  });

  const [row] = await db
    .insert(uploads)
    .values({ mimeType: generated.mimeType, data: generated.buffer })
    .returning({ id: uploads.id });

  return NextResponse.json({ url: `/api/uploads/${row.id}` }, { status: 201 });
}
