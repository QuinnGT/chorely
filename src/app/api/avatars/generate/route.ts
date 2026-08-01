import { NextResponse } from 'next/server';
import {
  buildAvatarPrompt,
  isValidPreset,
  isValidQuality,
  isValidStyle,
  type QualityId,
} from '@/lib/avatar-presets';
import {
  IMAGE_GEN_TIMEOUT_MS,
  generateFromPrompt,
  resolveOpenRouterModel,
  saveImageUpload,
  type GeneratedImage,
} from '@/lib/image-gen';

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
    const modelId = resolveOpenRouterModel(qualityId);

    console.log('[avatar-gen] start', { model: modelId, preset, style, quality: qualityId });
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
      });
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

    const url = await saveImageUpload(generated);
    return NextResponse.json({ url }, { status: 201 });
  } catch (error: unknown) {
    console.error('[avatar-gen] uncaught error', error);
    return NextResponse.json({ error: 'Failed to generate avatar' }, { status: 500 });
  }
}
