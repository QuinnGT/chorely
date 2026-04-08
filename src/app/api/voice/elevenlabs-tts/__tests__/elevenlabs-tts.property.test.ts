// Feature: elevenlabs-voice-integration, Property 5: TTS proxy schema validation
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';

// Store original env
const originalEnv = process.env;

// Mock global fetch before importing the route
const mockFetch = vi.fn();
global.fetch = mockFetch;

import { POST } from '../../elevenlabs-tts/route';

function createPostRequest(body: unknown): Request {
  return new Request('http://localhost/api/voice/elevenlabs-tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function setupMockFetchSuccess(): void {
  const audioBody = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array([0xff, 0xfb, 0x90, 0x00]));
      controller.close();
    },
  });
  mockFetch.mockResolvedValue(
    new Response(audioBody, {
      status: 200,
      headers: { 'Content-Type': 'audio/mpeg' },
    }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env = { ...originalEnv, ELEVENLABS_API_KEY: 'test-api-key' };
  setupMockFetchSuccess();
});

afterEach(() => {
  process.env = originalEnv;
});

describe('Property 5: TTS proxy schema validation', () => {
  // **Validates: Requirements 3.1, 3.2, 3.7**

  test('valid inputs (text 1-5000 chars, optional voiceId max 50 chars) are accepted', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          text: fc.string({ minLength: 1, maxLength: 5000 }).filter((s) => s.trim().length > 0),
          voiceId: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
        }),
        async ({ text, voiceId }) => {
          vi.clearAllMocks();
          setupMockFetchSuccess();

          const body: Record<string, string> = { text };
          if (voiceId !== undefined) {
            body.voiceId = voiceId;
          }

          const request = createPostRequest(body);
          const response = await POST(request);

          // Valid input should not return 400
          expect(response.status).not.toBe(400);
        },
      ),
      { numRuns: 100 },
    );
  });

  test('invalid inputs (empty text, text > 5000 chars, voiceId > 50 chars) are rejected with 400 and field-level errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          // Empty text
          fc.record({
            text: fc.constant(''),
            voiceId: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
          }),
          // Text exceeding 5000 characters
          fc.record({
            text: fc.string({ minLength: 5001, maxLength: 6000 }),
            voiceId: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
          }),
          // voiceId exceeding 50 characters
          fc.record({
            text: fc.string({ minLength: 1, maxLength: 5000 }).filter((s) => s.trim().length > 0),
            voiceId: fc.option(fc.string({ minLength: 51, maxLength: 200 }), { nil: undefined }),
          }).filter((r) => r.voiceId !== undefined),
        ),
        async ({ text, voiceId }) => {
          vi.clearAllMocks();
          setupMockFetchSuccess();

          const body: Record<string, string> = { text };
          if (voiceId !== undefined) {
            body.voiceId = voiceId;
          }

          const request = createPostRequest(body);
          const response = await POST(request);

          // Invalid input must return 400
          expect(response.status).toBe(400);

          const result = await response.json();
          expect(result.error).toBe('Validation failed');
          expect(result.details).toBeDefined();
          // At least one field should have error details
          const fieldKeys = Object.keys(result.details);
          expect(fieldKeys.length).toBeGreaterThan(0);
          // Each field's errors should be an array of strings
          for (const key of fieldKeys) {
            expect(Array.isArray(result.details[key])).toBe(true);
            expect(result.details[key].length).toBeGreaterThan(0);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
