import { NextResponse } from 'next/server';
import { like } from 'drizzle-orm';
import { ZodError } from 'zod';
import { db } from '@/db';
import { appSettings } from '@/db/schema';
import { voiceSettingsSchema } from '@/lib/validators';
import type { KidVoiceSettingsInput, GlobalVoiceSettingsInput } from '@/lib/validators';

// ─── Defaults ───────────────────────────────────────────────────────────────

const GLOBAL_DEFAULTS: GlobalVoiceSettingsInput = {
  defaultWakePhrase: 'Hey Family',
  defaultProviderId: 'web-speech',
  volume: 80,
};

const KID_DEFAULTS: KidVoiceSettingsInput = {
  enabled: true,
  wakePhrase: 'Hey Family',
  providerId: 'web-speech',
  elevenlabsVoiceId: '',
  speechOutput: true,
  soundEffects: true,
};

const VOICE_KEY_PREFIX = 'voice.';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Check server-side env vars to determine which voice providers are configured. */
function detectAvailableProviders(): string[] {
  const available: string[] = ['web-speech']; // Always available (browser-native)

  if (process.env.ELEVENLABS_API_KEY) {
    available.push('elevenlabs');
  }

  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_REGION) {
    available.push('bedrock');
  }

  return available;
}

interface ParsedSettings {
  global: GlobalVoiceSettingsInput;
  perKid: Record<string, KidVoiceSettingsInput>;
}

function buildSettingsFromRows(rows: { key: string; value: string }[]): ParsedSettings {
  const map = new Map(rows.map((r) => [r.key, r.value]));

  const global: GlobalVoiceSettingsInput = {
    defaultWakePhrase: map.get('voice.global.defaultWakePhrase') ?? GLOBAL_DEFAULTS.defaultWakePhrase,
    defaultProviderId: (map.get('voice.global.defaultProviderId') ?? GLOBAL_DEFAULTS.defaultProviderId) as GlobalVoiceSettingsInput['defaultProviderId'],
    volume: Number(map.get('voice.global.volume') ?? GLOBAL_DEFAULTS.volume),
  };

  // Collect per-kid settings by parsing keys like voice.kid.<kidId>.<field>
  const kidIds = new Set<string>();
  for (const key of map.keys()) {
    const match = key.match(/^voice\.kid\.([^.]+)\./);
    if (match) {
      kidIds.add(match[1]);
    }
  }

  const perKid: Record<string, KidVoiceSettingsInput> = {};
  for (const kidId of kidIds) {
    const prefix = `voice.kid.${kidId}.`;
    perKid[kidId] = {
      enabled: (map.get(`${prefix}enabled`) ?? String(KID_DEFAULTS.enabled)) === 'true',
      wakePhrase: map.get(`${prefix}wakePhrase`) ?? KID_DEFAULTS.wakePhrase,
      providerId: (map.get(`${prefix}providerId`) ?? KID_DEFAULTS.providerId) as KidVoiceSettingsInput['providerId'],
      elevenlabsVoiceId: map.get(`${prefix}elevenlabsVoiceId`) ?? KID_DEFAULTS.elevenlabsVoiceId,
      speechOutput: (map.get(`${prefix}speechOutput`) ?? String(KID_DEFAULTS.speechOutput)) === 'true',
      soundEffects: (map.get(`${prefix}soundEffects`) ?? String(KID_DEFAULTS.soundEffects)) === 'true',
    };
  }

  return { global, perKid };
}

// ─── GET /api/voice-settings ────────────────────────────────────────────────

export async function GET(): Promise<NextResponse> {
  try {
    const rows = await db
      .select({ key: appSettings.key, value: appSettings.value })
      .from(appSettings)
      .where(like(appSettings.key, `${VOICE_KEY_PREFIX}%`));

    const { global, perKid } = buildSettingsFromRows(rows);

    return NextResponse.json({
      global,
      perKid,
      availableProviders: detectAvailableProviders(),
    });
  } catch (error: unknown) {
    console.error('Failed to fetch voice settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch voice settings' },
      { status: 500 },
    );
  }
}

// ─── PUT /api/voice-settings ────────────────────────────────────────────────

export async function PUT(request: Request): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const validated = voiceSettingsSchema.parse(body);

    const entries: { key: string; value: string }[] = [
      { key: 'voice.global.defaultWakePhrase', value: validated.global.defaultWakePhrase },
      { key: 'voice.global.defaultProviderId', value: validated.global.defaultProviderId },
      { key: 'voice.global.volume', value: String(validated.global.volume) },
    ];

    for (const [kidId, kidSettings] of Object.entries(validated.perKid)) {
      const prefix = `voice.kid.${kidId}.`;
      entries.push(
        { key: `${prefix}enabled`, value: String(kidSettings.enabled) },
        { key: `${prefix}wakePhrase`, value: kidSettings.wakePhrase },
        { key: `${prefix}providerId`, value: kidSettings.providerId },
        { key: `${prefix}elevenlabsVoiceId`, value: kidSettings.elevenlabsVoiceId },
        { key: `${prefix}speechOutput`, value: String(kidSettings.speechOutput) },
        { key: `${prefix}soundEffects`, value: String(kidSettings.soundEffects) },
      );
    }

    for (const entry of entries) {
      await db
        .insert(appSettings)
        .values({ key: entry.key, value: entry.value })
        .onConflictDoUpdate({
          target: appSettings.key,
          set: { value: entry.value },
        });
    }

    return NextResponse.json({
      global: validated.global,
      perKid: validated.perKid,
    });
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
    console.error('Failed to save voice settings:', error);
    return NextResponse.json(
      { error: 'Failed to save voice settings' },
      { status: 500 },
    );
  }
}
