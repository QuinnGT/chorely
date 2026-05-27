import { NextResponse } from 'next/server';
import { db } from '@/db';
import { uploads } from '@/db/schema';
import { buildAvatarPrompt, isValidPreset, isValidStyle } from '@/lib/avatar-presets';

const DEFAULT_MODEL = 'openai/gpt-5.4-image-2';

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
    const model = process.env.AVATAR_MODEL || DEFAULT_MODEL;

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        modalities: ['image', 'text'],
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('OpenRouter error:', res.status, text);
      return NextResponse.json({ error: 'Image generation failed' }, { status: 502 });
    }

    const json = await res.json();
    const dataUrl: unknown = json?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
      console.error('No image in response:', JSON.stringify(json).slice(0, 500));
      return NextResponse.json({ error: 'No image returned' }, { status: 502 });
    }

    const match = dataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);
    if (!match) {
      return NextResponse.json({ error: 'Malformed image data' }, { status: 502 });
    }
    const mimeType = match[1];
    const buffer = Buffer.from(match[2], 'base64');

    const [row] = await db
      .insert(uploads)
      .values({ mimeType, data: buffer })
      .returning({ id: uploads.id });

    return NextResponse.json({ url: `/api/uploads/${row.id}` }, { status: 201 });
  } catch (error: unknown) {
    console.error('Avatar generation error:', error);
    return NextResponse.json({ error: 'Failed to generate avatar' }, { status: 500 });
  }
}
