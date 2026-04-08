// Feature: elevenlabs-voice-integration, Property 6: Voices API returns correctly shaped and filtered results
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';

// Store original env
const originalEnv = process.env;

// Mock global fetch before importing the route
const mockFetch = vi.fn();
global.fetch = mockFetch;

import { GET } from '../../elevenlabs-voices/route';

/**
 * Arbitrary that generates a single ElevenLabs voice object
 * with varying voice_id, name, preview_url, and category fields.
 */
const elevenLabsVoiceArb = fc.record({
  voice_id: fc.string({ minLength: 1, maxLength: 40 }),
  name: fc.string({ minLength: 1, maxLength: 80 }),
  preview_url: fc.webUrl(),
  category: fc.constantFrom('premade', 'cloned', 'generated', 'professional'),
});

beforeEach(() => {
  vi.clearAllMocks();
  process.env = { ...originalEnv, ELEVENLABS_API_KEY: 'test-api-key' };
});

afterEach(() => {
  process.env = originalEnv;
});

describe('Property 6: Voices API returns correctly shaped and filtered results', () => {
  // **Validates: Requirements 4.1, 4.4**

  test('each returned voice has exactly voiceId, name, previewUrl fields (all strings) and count matches input', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(elevenLabsVoiceArb, { minLength: 0, maxLength: 30 }),
        async (voices) => {
          vi.clearAllMocks();

          mockFetch.mockResolvedValue(
            new Response(JSON.stringify({ voices }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }),
          );

          const response = await GET();
          expect(response.status).toBe(200);

          const result = await response.json();
          expect(Array.isArray(result.voices)).toBe(true);

          // Count should match input since the current implementation maps all voices
          expect(result.voices.length).toBe(voices.length);

          for (const voice of result.voices) {
            // Each voice must have exactly three keys
            const keys = Object.keys(voice).sort();
            expect(keys).toEqual(['name', 'previewUrl', 'voiceId']);

            // All fields must be strings
            expect(typeof voice.voiceId).toBe('string');
            expect(typeof voice.name).toBe('string');
            expect(typeof voice.previewUrl).toBe('string');
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  test('returned voiceId, name, previewUrl map correctly from upstream voice_id, name, preview_url', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(elevenLabsVoiceArb, { minLength: 1, maxLength: 20 }),
        async (voices) => {
          vi.clearAllMocks();

          mockFetch.mockResolvedValue(
            new Response(JSON.stringify({ voices }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }),
          );

          const response = await GET();
          const result = await response.json();

          for (let i = 0; i < voices.length; i++) {
            expect(result.voices[i].voiceId).toBe(voices[i].voice_id);
            expect(result.voices[i].name).toBe(voices[i].name);
            expect(result.voices[i].previewUrl).toBe(voices[i].preview_url);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
