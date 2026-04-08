import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { elevenlabsTtsSchema } from '@/lib/validators';

const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel
const ELEVENLABS_TTS_URL = 'https://api.elevenlabs.io/v1/text-to-speech';
const TTS_MODEL_ID = 'eleven_flash_v2_5';

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'ElevenLabs service is not configured' },
      { status: 503 },
    );
  }

  let validated;
  try {
    const body: unknown = await request.json();
    validated = elevenlabsTtsSchema.parse(body);
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      const details: Record<string, string[]> = {};
      for (const issue of error.issues) {
        const field = issue.path.join('.');
        if (!details[field]) {
          details[field] = [];
        }
        details[field].push(issue.message);
      }
      return NextResponse.json(
        { error: 'Validation failed', details },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: 'Validation failed', details: { body: ['Invalid JSON'] } },
      { status: 400 },
    );
  }

  const voiceId = validated.voiceId || DEFAULT_VOICE_ID;

  try {
    const upstream = await fetch(`${ELEVENLABS_TTS_URL}/${voiceId}/stream`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text: validated.text,
        model_id: TTS_MODEL_ID,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!upstream.ok) {
      const errorText = await upstream.text().catch(() => 'Unknown error');
      console.error(
        `ElevenLabs TTS error: status=${upstream.status} body=${errorText}`,
      );
      return NextResponse.json(
        { error: 'Text-to-speech service error' },
        { status: 502 },
      );
    }

    if (!upstream.body) {
      console.error('ElevenLabs TTS error: empty response body');
      return NextResponse.json(
        { error: 'Text-to-speech service error' },
        { status: 502 },
      );
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
      },
    });
  } catch (error: unknown) {
    console.error('ElevenLabs TTS request failed:', error);
    return NextResponse.json(
      { error: 'Text-to-speech service error' },
      { status: 502 },
    );
  }
}
