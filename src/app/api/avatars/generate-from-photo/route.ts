import { NextResponse } from 'next/server';
import {
  buildAvatarFromPhotoPrompt,
  isValidPreset,
  isValidQuality,
  isValidStyle,
  type QualityId,
} from '@/lib/avatar-presets';
import {
  IMAGE_GEN_TIMEOUT_MS,
  ModelRefusalError,
  generateFromPromptAndPhoto,
  resolveOpenRouterModel,
  saveImageUpload,
  type GeneratedImage,
} from '@/lib/image-gen';

const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

export const maxDuration = 300;

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

  const modelId = resolveOpenRouterModel(quality);

  console.log('[avatar-photo-gen] start', {
    preset,
    style,
    quality,
    model: modelId,
    photoBytes: photoBuffer.length,
    photoMime,
  });
  const startedAt = Date.now();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), IMAGE_GEN_TIMEOUT_MS);

  let generated: GeneratedImage;
  try {
    generated = await generateFromPromptAndPhoto({
      apiKey: openrouterKey,
      modelId,
      prompt,
      photoDataUrl,
      signal: controller.signal,
    });
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

  const url = await saveImageUpload(generated);
  return NextResponse.json({ url }, { status: 201 });
}
