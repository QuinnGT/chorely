import { generateImage } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { db } from '@/db';
import { uploads } from '@/db/schema';

export interface GeneratedImage {
  buffer: Buffer;
  mimeType: string;
}

export type Quality = 'fast' | 'quality';

const DEFAULT_FAST_MODEL = 'google/gemini-3.1-flash-image-preview';
const DEFAULT_QUALITY_MODEL = 'openai/gpt-5.4-image-2';

export const IMAGE_GEN_TIMEOUT_MS = 240_000;

/**
 * The image model for a quality tier, shared by every generation flow (text avatars,
 * photo avatars, store items) over OpenRouter. Two knobs total:
 *   fast    → AVATAR_MODEL_FAST
 *   quality → AVATAR_MODEL
 */
export function resolveOpenRouterModel(quality: Quality): string {
  if (quality === 'fast') {
    return process.env.AVATAR_MODEL_FAST || DEFAULT_FAST_MODEL;
  }
  return process.env.AVATAR_MODEL || DEFAULT_QUALITY_MODEL;
}

/** Thrown when the model returns prose declining the request instead of an image. */
export class ModelRefusalError extends Error {
  reason: string;
  constructor(reason: string) {
    super('Model declined the request');
    this.name = 'ModelRefusalError';
    this.reason = reason;
  }
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

function dataUrlToImage(dataUrl: string): GeneratedImage {
  const match = dataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);
  if (!match) throw new Error('Malformed data url');
  return { buffer: Buffer.from(match[2], 'base64'), mimeType: match[1] };
}

const IMAGE_ONLY_MODEL_PREFIXES = ['x-ai/grok-imagine'];

function isImageOnlyModel(modelId: string): boolean {
  return IMAGE_ONLY_MODEL_PREFIXES.some((prefix) => modelId.startsWith(prefix));
}

function shouldRetryViaImageOnly(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return (
    err.message.includes('No endpoints found that support the requested output modalities') ||
    err.message.includes('No image generated')
  );
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
    throw new Error(`No image in response: ${JSON.stringify(json).slice(0, 500)}`);
  }
  return dataUrlToImage(dataUrl);
}

export interface GenerateFromPromptInput {
  apiKey: string;
  modelId: string;
  prompt: string;
  signal: AbortSignal;
  /** Log prefix so the retry line is attributable to the calling route. */
  label?: string;
}

/**
 * Text→image via OpenRouter. Uses the AI SDK image endpoint, falling back to the raw
 * chat-completions "image-only" endpoint for models the SDK path can't drive.
 */
export async function generateFromPrompt({
  apiKey,
  modelId,
  prompt,
  signal,
  label = '[image-gen]',
}: GenerateFromPromptInput): Promise<GeneratedImage> {
  if (isImageOnlyModel(modelId)) {
    return generateViaImageOnly(apiKey, modelId, prompt, signal);
  }
  try {
    return await generateViaSdk(apiKey, modelId, prompt, signal);
  } catch (err: unknown) {
    if (shouldRetryViaImageOnly(err)) {
      console.log(`${label} sdk path failed, retrying via image-only endpoint`, {
        model: modelId,
        reason: err instanceof Error ? err.message : String(err),
      });
      return generateViaImageOnly(apiKey, modelId, prompt, signal);
    }
    throw err;
  }
}

export interface GenerateFromPromptAndPhotoInput {
  apiKey: string;
  modelId: string;
  prompt: string;
  photoDataUrl: string;
  signal: AbortSignal;
}

/** Photo + prompt → image via OpenRouter chat completions (the photo-avatar path). */
export async function generateFromPromptAndPhoto({
  apiKey,
  modelId,
  prompt,
  photoDataUrl,
  signal,
}: GenerateFromPromptAndPhotoInput): Promise<GeneratedImage> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelId,
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

/** Persist a generated image and return its served URL. */
export async function saveImageUpload(image: GeneratedImage): Promise<string> {
  const [row] = await db
    .insert(uploads)
    .values({ mimeType: image.mimeType, data: image.buffer })
    .returning({ id: uploads.id });
  return `/api/uploads/${row.id}`;
}
