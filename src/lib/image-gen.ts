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

async function generateViaSdk(
  apiKey: string,
  modelId: string,
  prompt: string,
  signal: AbortSignal,
  photoDataUrl?: string,
): Promise<GeneratedImage> {
  const openrouter = createOpenRouter({ apiKey });
  const result = await generateImage({
    model: openrouter.imageModel(modelId),
    prompt: photoDataUrl
      ? { text: prompt, images: [photoDataUrl] }
      : prompt,
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

export interface GenerateFromPromptInput {
  apiKey: string;
  modelId: string;
  prompt: string;
  signal: AbortSignal;
}

/** Text→image through the OpenRouter provider's dedicated Images API. */
export async function generateFromPrompt({
  apiKey,
  modelId,
  prompt,
  signal,
}: GenerateFromPromptInput): Promise<GeneratedImage> {
  return generateViaSdk(apiKey, modelId, prompt, signal);
}

export interface GenerateFromPromptAndPhotoInput {
  apiKey: string;
  modelId: string;
  prompt: string;
  photoDataUrl: string;
  signal: AbortSignal;
}

/** Photo + prompt → image through the OpenRouter provider's reference-image support. */
export async function generateFromPromptAndPhoto({
  apiKey,
  modelId,
  prompt,
  photoDataUrl,
  signal,
}: GenerateFromPromptAndPhotoInput): Promise<GeneratedImage> {
  return generateViaSdk(apiKey, modelId, prompt, signal, photoDataUrl);
}

/** Persist a generated image and return its served URL. */
export async function saveImageUpload(image: GeneratedImage): Promise<string> {
  const [row] = await db
    .insert(uploads)
    .values({ mimeType: image.mimeType, data: image.buffer })
    .returning({ id: uploads.id });
  return `/api/uploads/${row.id}`;
}
