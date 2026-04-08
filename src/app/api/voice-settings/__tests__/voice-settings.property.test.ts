// Feature: elevenlabs-voice-integration, Property 7: Voice ID settings round trip
import { describe, test, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';

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

const KID_ID = '00000000-0000-0000-0000-000000000001';

function createPutRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/voice-settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function setupMockInsert(): void {
  const mockOnConflict = vi.fn().mockResolvedValue(undefined);
  const mockValues = vi.fn().mockReturnValue({ onConflictDoUpdate: mockOnConflict });
  mockInsert.mockReturnValue({ values: mockValues });
}

function setupMockSelectWithVoiceId(voiceId: string): void {
  const rows = [
    { key: 'voice.global.defaultWakePhrase', value: 'Hey Family' },
    { key: 'voice.global.defaultProviderId', value: 'web-speech' },
    { key: 'voice.global.volume', value: '80' },
    { key: `voice.kid.${KID_ID}.enabled`, value: 'true' },
    { key: `voice.kid.${KID_ID}.wakePhrase`, value: 'Hey Family' },
    { key: `voice.kid.${KID_ID}.providerId`, value: 'elevenlabs' },
    { key: `voice.kid.${KID_ID}.elevenlabsVoiceId`, value: voiceId },
    { key: `voice.kid.${KID_ID}.speechOutput`, value: 'true' },
    { key: `voice.kid.${KID_ID}.soundEffects`, value: 'true' },
  ];
  const mockWhere = vi.fn().mockResolvedValue(rows);
  const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
  mockSelect.mockReturnValue({ from: mockFrom });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Property 7: Voice ID settings round trip', () => {
  // **Validates: Requirements 5.1, 5.3**
  test('storing a valid voice ID via PUT and retrieving via GET returns the same voice ID', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
        async (voiceId) => {
          vi.clearAllMocks();

          // Arrange: mock insert for PUT
          setupMockInsert();

          const putBody = {
            global: {
              defaultWakePhrase: 'Hey Family',
              defaultProviderId: 'web-speech' as const,
              volume: 80,
            },
            perKid: {
              [KID_ID]: {
                enabled: true,
                wakePhrase: 'Hey Family',
                providerId: 'elevenlabs' as const,
                elevenlabsVoiceId: voiceId,
                speechOutput: true,
                soundEffects: true,
              },
            },
          };

          // Act: PUT the voice ID
          const putRequest = createPutRequest(putBody);
          const putResponse = await PUT(putRequest);
          expect(putResponse.status).toBe(200);

          const putResult = await putResponse.json();
          expect(putResult.perKid[KID_ID].elevenlabsVoiceId).toBe(voiceId);

          // Arrange: mock select for GET to return the stored voice ID
          setupMockSelectWithVoiceId(voiceId);

          // Act: GET the voice settings
          const getResponse = await GET();
          expect(getResponse.status).toBe(200);

          const getResult = await getResponse.json();

          // Assert: round-tripped voice ID matches
          expect(getResult.perKid[KID_ID].elevenlabsVoiceId).toBe(voiceId);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: elevenlabs-voice-integration, Property 8: Voice ID validation rejects invalid values
describe('Property 8: Voice ID validation rejects invalid values', () => {
  // **Validates: Requirements 5.4**
  test('PUT rejects overly long elevenlabsVoiceId with HTTP 400', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 51, maxLength: 200 }),
        async (invalidVoiceId) => {
          vi.clearAllMocks();

          // Arrange
          setupMockInsert();

          const putBody = {
            global: {
              defaultWakePhrase: 'Hey Family',
              defaultProviderId: 'web-speech' as const,
              volume: 80,
            },
            perKid: {
              [KID_ID]: {
                enabled: true,
                wakePhrase: 'Hey Family',
                providerId: 'web-speech' as const,
                elevenlabsVoiceId: invalidVoiceId,
                speechOutput: true,
                soundEffects: true,
              },
            },
          };

          // Act
          const request = createPutRequest(putBody);
          const response = await PUT(request);

          // Assert: validation rejects with 400
          expect(response.status).toBe(400);

          const result = await response.json();
          expect(result.error).toBe('Validation failed');
          expect(result.details).toBeDefined();
        },
      ),
      { numRuns: 100 },
    );
  });
});
