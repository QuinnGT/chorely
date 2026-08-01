import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  generateFromPrompt,
  generateFromPromptAndPhoto,
} from '@/lib/image-gen';

vi.mock('@/db', () => ({ db: {} }));

const GENERATED_PNG_BASE64 = 'iVBORw0KGgo=';

function mockImageResponse(): ReturnType<typeof vi.spyOn> {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(
      JSON.stringify({
        created: 1,
        data: [{ b64_json: GENERATED_PNG_BASE64, media_type: 'image/png' }],
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    ),
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('OpenRouter image generation', () => {
  test('uses the dedicated Images API for text prompts', async () => {
    const fetchMock = mockImageResponse();

    const image = await generateFromPrompt({
      apiKey: 'test-key',
      modelId: 'krea/krea-2-large',
      prompt: 'A friendly knight avatar',
      signal: new AbortController().signal,
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;

    expect(url).toBe('https://openrouter.ai/api/v1/images');
    expect(body).toMatchObject({
      model: 'krea/krea-2-large',
      prompt: 'A friendly knight avatar',
      n: 1,
    });
    expect(body).not.toHaveProperty('messages');
    expect(image.buffer).toEqual(Buffer.from(GENERATED_PNG_BASE64, 'base64'));
    expect(image.mimeType).toBe('image/png');
  });

  test('sends an uploaded photo as an input reference', async () => {
    const fetchMock = mockImageResponse();
    const photoDataUrl = 'data:image/jpeg;base64,/9j/';

    await generateFromPromptAndPhoto({
      apiKey: 'test-key',
      modelId: 'openai/gpt-image-2',
      prompt: 'Turn this child into a painted knight avatar',
      photoDataUrl,
      signal: new AbortController().signal,
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;

    expect(url).toBe('https://openrouter.ai/api/v1/images');
    expect(body).toMatchObject({
      model: 'openai/gpt-image-2',
      prompt: 'Turn this child into a painted knight avatar',
      input_references: [
        {
          type: 'image_url',
          image_url: { url: photoDataUrl },
        },
      ],
    });
    expect(body).not.toHaveProperty('messages');
  });
});
