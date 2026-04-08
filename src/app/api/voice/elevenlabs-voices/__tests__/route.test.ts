import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

// Store original env
const originalEnv = process.env;

// Mock global fetch before importing the route
const mockFetch = vi.fn();
global.fetch = mockFetch;

import { GET } from '../route';

describe('Voices route unit tests', () => {
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

    // Act
    const response = await GET();

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

    // Act
    const response = await GET();

    // Assert
    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.error).toBe('Failed to fetch voice list');
  });
});
