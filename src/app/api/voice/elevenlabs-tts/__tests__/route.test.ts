import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

// Store original env
const originalEnv = process.env;

// Mock global fetch before importing the route
const mockFetch = vi.fn();
global.fetch = mockFetch;

import { POST } from '../route';

function createPostRequest(body: unknown): Request {
  return new Request('http://localhost/api/voice/elevenlabs-tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('TTS proxy route unit tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('returns 503 when ELEVENLABS_API_KEY is missing', async () => {
    // Arrange
    delete process.env.ELEVENLABS_API_KEY;
    const request = createPostRequest({ text: 'Hello world' });

    // Act
    const response = await POST(request);

    // Assert
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.error).toBe('ElevenLabs service is not configured');
  });

  test('returns 502 with generic message on upstream error', async () => {
    // Arrange
    process.env.ELEVENLABS_API_KEY = 'test-api-key';
    mockFetch.mockResolvedValue(
      new Response('Internal Server Error', { status: 500 }),
    );
    const request = createPostRequest({ text: 'Hello world' });

    // Act
    const response = await POST(request);

    // Assert
    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.error).toBe('Text-to-speech service error');
  });

  test('sets Content-Type to audio/mpeg on success', async () => {
    // Arrange
    process.env.ELEVENLABS_API_KEY = 'test-api-key';
    const audioStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array([0xff, 0xfb, 0x90, 0x00]));
        controller.close();
      },
    });
    mockFetch.mockResolvedValue(
      new Response(audioStream, {
        status: 200,
        headers: { 'Content-Type': 'audio/mpeg' },
      }),
    );
    const request = createPostRequest({ text: 'Hello world' });

    // Act
    const response = await POST(request);

    // Assert
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('audio/mpeg');
  });
});
