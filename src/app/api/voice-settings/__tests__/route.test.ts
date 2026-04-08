import { describe, test, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing the route
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

import { GET, PUT } from '../route';
import { db } from '@/db';

const mockSelect = db.select as ReturnType<typeof vi.fn>;
const mockInsert = db.insert as ReturnType<typeof vi.fn>;

function createRequest(url: string, options?: RequestInit): Request {
  return new Request(url, options);
}

function setupMockSelect(rows: { key: string; value: string }[]) {
  const mockWhere = vi.fn().mockResolvedValue(rows);
  const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
  mockSelect.mockReturnValue({ from: mockFrom });
  return { mockFrom, mockWhere };
}

function setupMockInsert() {
  const mockOnConflict = vi.fn().mockResolvedValue(undefined);
  const mockValues = vi.fn().mockReturnValue({ onConflictDoUpdate: mockOnConflict });
  mockInsert.mockReturnValue({ values: mockValues });
  return { mockValues, mockOnConflict };
}

beforeEach(() => {
  vi.clearAllMocks();
});

const validPayload = {
  global: {
    defaultWakePhrase: 'Hey Family',
    defaultProviderId: 'web-speech' as const,
    volume: 80,
  },
  perKid: {} as Record<string, unknown>,
};

const KID_ID = '00000000-0000-0000-0000-000000000001';

describe('GET /api/voice-settings', () => {
  test('returns defaults when no settings exist in database', async () => {
    setupMockSelect([]);

    const response = await GET();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      global: {
        defaultWakePhrase: 'Hey Family',
        defaultProviderId: 'web-speech',
        volume: 80,
      },
      perKid: {},
      availableProviders: ['web-speech'],
    });
  });

  test('returns stored global settings from database', async () => {
    setupMockSelect([
      { key: 'voice.global.defaultWakePhrase', value: 'Hello Home' },
      { key: 'voice.global.defaultProviderId', value: 'elevenlabs' },
      { key: 'voice.global.volume', value: '60' },
    ]);

    const response = await GET();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.global).toEqual({
      defaultWakePhrase: 'Hello Home',
      defaultProviderId: 'elevenlabs',
      volume: 60,
    });
  });

  test('returns stored per-kid settings from database', async () => {
    setupMockSelect([
      { key: `voice.kid.${KID_ID}.enabled`, value: 'true' },
      { key: `voice.kid.${KID_ID}.wakePhrase`, value: 'Hey Liesl' },
      { key: `voice.kid.${KID_ID}.providerId`, value: 'elevenlabs' },
      { key: `voice.kid.${KID_ID}.elevenlabsVoiceId`, value: '21m00Tcm4TlvDq8ikWAM' },
      { key: `voice.kid.${KID_ID}.speechOutput`, value: 'true' },
      { key: `voice.kid.${KID_ID}.soundEffects`, value: 'false' },
    ]);

    const response = await GET();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.perKid[KID_ID]).toEqual({
      enabled: true,
      wakePhrase: 'Hey Liesl',
      providerId: 'elevenlabs',
      elevenlabsVoiceId: '21m00Tcm4TlvDq8ikWAM',
      speechOutput: true,
      soundEffects: false,
    });
  });

  test('fills in defaults for missing global keys', async () => {
    setupMockSelect([
      { key: 'voice.global.defaultWakePhrase', value: 'Ok House' },
    ]);

    const response = await GET();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.global).toEqual({
      defaultWakePhrase: 'Ok House',
      defaultProviderId: 'web-speech',
      volume: 80,
    });
  });

  test('converts string booleans to proper boolean types in per-kid settings', async () => {
    setupMockSelect([
      { key: `voice.kid.${KID_ID}.enabled`, value: 'false' },
      { key: `voice.kid.${KID_ID}.wakePhrase`, value: 'Hey Family' },
      { key: `voice.kid.${KID_ID}.providerId`, value: 'web-speech' },
      { key: `voice.kid.${KID_ID}.elevenlabsVoiceId`, value: '' },
      { key: `voice.kid.${KID_ID}.speechOutput`, value: 'true' },
      { key: `voice.kid.${KID_ID}.soundEffects`, value: 'false' },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(body.perKid[KID_ID].enabled).toBe(false);
    expect(body.perKid[KID_ID].speechOutput).toBe(true);
    expect(body.perKid[KID_ID].soundEffects).toBe(false);
    expect(typeof body.perKid[KID_ID].enabled).toBe('boolean');
    expect(typeof body.perKid[KID_ID].speechOutput).toBe('boolean');
  });

  test('returns 500 on database error', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      where: vi.fn().mockRejectedValue(new Error('DB connection failed')),
    });
    mockSelect.mockReturnValue({ from: mockFrom });

    const response = await GET();

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Failed to fetch voice settings');
  });
});

describe('PUT /api/voice-settings', () => {
  test('saves valid global settings and returns them', async () => {
    setupMockInsert();

    const request = createRequest('http://localhost/api/voice-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPayload),
    });
    const response = await PUT(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.global).toEqual(validPayload.global);
    expect(body.perKid).toEqual({});
    // 3 global entries
    expect(mockInsert).toHaveBeenCalledTimes(3);
  });

  test('saves per-kid settings alongside global settings', async () => {
    setupMockInsert();

    const payload = {
      ...validPayload,
      perKid: {
        [KID_ID]: {
          enabled: true,
          wakePhrase: 'Hey Liesl',
          providerId: 'elevenlabs',
          elevenlabsVoiceId: '21m00Tcm4TlvDq8ikWAM',
          speechOutput: true,
          soundEffects: true,
        },
      },
    };

    const request = createRequest('http://localhost/api/voice-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const response = await PUT(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.perKid[KID_ID].providerId).toBe('elevenlabs');
    expect(body.perKid[KID_ID].elevenlabsVoiceId).toBe('21m00Tcm4TlvDq8ikWAM');
    // 3 global + 6 per-kid = 9
    expect(mockInsert).toHaveBeenCalledTimes(9);
  });

  test('returns 400 with field errors for invalid wake phrase (single word)', async () => {
    const request = createRequest('http://localhost/api/voice-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...validPayload,
        global: { ...validPayload.global, defaultWakePhrase: 'Hey' },
      }),
    });
    const response = await PUT(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Validation failed');
    expect(body.details).toHaveProperty('global.defaultWakePhrase');
  });

  test('returns 400 for wake phrase with numbers', async () => {
    const request = createRequest('http://localhost/api/voice-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...validPayload,
        global: { ...validPayload.global, defaultWakePhrase: 'Hey 123' },
      }),
    });
    const response = await PUT(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Validation failed');
    expect(body.details).toHaveProperty('global.defaultWakePhrase');
  });

  test('returns 400 for wake phrase with more than 5 words', async () => {
    const request = createRequest('http://localhost/api/voice-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...validPayload,
        global: { ...validPayload.global, defaultWakePhrase: 'one two three four five six' },
      }),
    });
    const response = await PUT(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Validation failed');
    expect(body.details).toHaveProperty('global.defaultWakePhrase');
  });

  test('returns 400 for invalid providerId in per-kid settings', async () => {
    const request = createRequest('http://localhost/api/voice-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...validPayload,
        perKid: {
          [KID_ID]: {
            enabled: true,
            wakePhrase: 'Hey Family',
            providerId: 'invalid-provider',
            elevenlabsVoiceId: '',
            speechOutput: true,
            soundEffects: true,
          },
        },
      }),
    });
    const response = await PUT(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Validation failed');
  });

  test('returns 400 when required fields are missing', async () => {
    const request = createRequest('http://localhost/api/voice-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const response = await PUT(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Validation failed');
    expect(body.details).toBeDefined();
  });

  test('accepts all valid provider IDs in global settings', async () => {
    for (const providerId of ['web-speech', 'elevenlabs', 'bedrock']) {
      setupMockInsert();
      const request = createRequest('http://localhost/api/voice-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...validPayload,
          global: { ...validPayload.global, defaultProviderId: providerId },
        }),
      });
      const response = await PUT(request);
      expect(response.status).toBe(200);
    }
  });

  test('persists elevenlabsVoiceId in per-kid settings', async () => {
    setupMockInsert();

    const request = createRequest('http://localhost/api/voice-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...validPayload,
        perKid: {
          [KID_ID]: {
            enabled: true,
            wakePhrase: 'Hey Family',
            providerId: 'elevenlabs',
            elevenlabsVoiceId: '21m00Tcm4TlvDq8ikWAM',
            speechOutput: true,
            soundEffects: true,
          },
        },
      }),
    });
    const response = await PUT(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.perKid[KID_ID].elevenlabsVoiceId).toBe('21m00Tcm4TlvDq8ikWAM');
  });

  test('returns 500 on database error during upsert', async () => {
    const mockOnConflict = vi.fn().mockRejectedValue(new Error('DB write failed'));
    const mockValues = vi.fn().mockReturnValue({ onConflictDoUpdate: mockOnConflict });
    mockInsert.mockReturnValue({ values: mockValues });

    const request = createRequest('http://localhost/api/voice-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPayload),
    });
    const response = await PUT(request);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Failed to save voice settings');
  });
});
