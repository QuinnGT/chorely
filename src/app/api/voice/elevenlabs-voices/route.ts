import { NextResponse } from 'next/server';
import type { ElevenLabsVoiceItem } from '@/lib/validators';

const ELEVENLABS_VOICES_URL = 'https://api.elevenlabs.io/v1/voices';

interface ElevenLabsVoiceResponse {
  voices: Array<{
    voice_id: string;
    name: string;
    preview_url: string;
    category: string;
  }>;
}

export async function GET(): Promise<Response> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'ElevenLabs service is not configured' },
      { status: 503 },
    );
  }

  try {
    const upstream = await fetch(ELEVENLABS_VOICES_URL, {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey,
      },
    });

    if (!upstream.ok) {
      const errorText = await upstream.text().catch(() => 'Unknown error');
      console.error(
        `ElevenLabs voices error: status=${upstream.status} body=${errorText}`,
      );
      return NextResponse.json(
        { error: 'Failed to fetch voice list' },
        { status: 502 },
      );
    }

    const data = (await upstream.json()) as ElevenLabsVoiceResponse;

    const voices: ElevenLabsVoiceItem[] = data.voices.map((voice) => ({
      voiceId: voice.voice_id,
      name: voice.name,
      previewUrl: voice.preview_url,
    }));

    return NextResponse.json({ voices });
  } catch (error: unknown) {
    console.error('ElevenLabs voices request failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch voice list' },
      { status: 502 },
    );
  }
}
