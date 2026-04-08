// Feature: elevenlabs-voice-integration, Property 1: Speak sends text to TTS proxy and plays audio
// Feature: elevenlabs-voice-integration, Property 2: StopSpeaking halts playback and aborts fetch
// Feature: elevenlabs-voice-integration, Property 3: Configured voice ID is sent in TTS requests
// Feature: elevenlabs-voice-integration, Property 4: Recognition transcript forwarding
// Feature: elevenlabs-voice-integration, Property 9: Availability reflects constructor parameter
// Feature: elevenlabs-voice-integration, Property 10: TTS errors reject the speak promise
// Feature: elevenlabs-voice-integration, Property 12: Dispose cleans up all active resources
// Feature: elevenlabs-voice-integration, Property 13: Speak after dispose is rejected

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { createElevenLabsProvider, setVoiceId } from '../elevenlabs-provider';
import type { VoiceProvider } from '../types';

/* ------------------------------------------------------------------ */
/*  Mock infrastructure                                                */
/* ------------------------------------------------------------------ */

let mockSourceNode: {
  connect: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  onended: (() => void) | null;
  buffer: AudioBuffer | null;
};

let mockAudioContext: {
  decodeAudioData: ReturnType<typeof vi.fn>;
  createBufferSource: ReturnType<typeof vi.fn>;
  resume: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  state: string;
  destination: {};
};

let mockRecognitionInstance: {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: unknown) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  abort: ReturnType<typeof vi.fn>;
};

let capturedFetchCalls: { url: string; body: Record<string, unknown> }[];

function createMockSourceNode() {
  mockSourceNode = {
    connect: vi.fn(),
    start: vi.fn().mockImplementation(() => {
      // Simulate instant playback completion
      if (mockSourceNode.onended) {
        mockSourceNode.onended();
      }
    }),
    stop: vi.fn(),
    onended: null,
    buffer: null,
  };
  return mockSourceNode;
}

function createMockAudioContext() {
  mockAudioContext = {
    decodeAudioData: vi.fn().mockResolvedValue({ duration: 1, length: 44100 } as unknown as AudioBuffer),
    createBufferSource: vi.fn().mockImplementation(() => createMockSourceNode()),
    resume: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    state: 'running',
    destination: {},
  };
  return mockAudioContext;
}

function createMockRecognition() {
  mockRecognitionInstance = {
    continuous: false,
    interimResults: false,
    lang: '',
    onresult: null,
    onerror: null,
    onend: null,
    start: vi.fn(),
    stop: vi.fn(),
    abort: vi.fn(),
  };
  return mockRecognitionInstance;
}


function setupMocks(): void {
  // Mock AudioContext — must use function keyword for `new` to work
  vi.stubGlobal('AudioContext', function AudioContextMock() {
    return createMockAudioContext();
  });

  // Mock SpeechRecognition — must use function keyword for `new` to work
  vi.stubGlobal('SpeechRecognition', function SpeechRecognitionMock() {
    return createMockRecognition();
  });

  // Reset captured fetch calls
  capturedFetchCalls = [];

  // Mock fetch to intercept TTS proxy calls
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(init.body as string) : {};
      capturedFetchCalls = [...capturedFetchCalls, { url, body }];

      return new Response(new ArrayBuffer(1024), {
        status: 200,
        headers: { 'Content-Type': 'audio/mpeg' },
      });
    }),
  );
}

function cleanupMocks(): void {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  capturedFetchCalls = [];
}

beforeEach(() => {
  setupMocks();
});

afterEach(() => {
  cleanupMocks();
});

/* ------------------------------------------------------------------ */
/*  Helper: create and initialize a provider                           */
/* ------------------------------------------------------------------ */

async function createInitializedProvider(): Promise<VoiceProvider> {
  const provider = createElevenLabsProvider(true);
  await provider.initialize();
  return provider;
}

/* ------------------------------------------------------------------ */
/*  Property 1: Speak sends text to TTS proxy and plays audio          */
/* ------------------------------------------------------------------ */

describe('Property 1: Speak sends text to TTS proxy and plays audio', () => {
  // **Validates: Requirements 1.1**
  test('for any valid text (1-5000 chars), speak sends fetch to TTS proxy and initiates playback', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ minLength: 1, maxLength: 5000 }), async (text) => {
        cleanupMocks();
        setupMocks();

        const provider = await createInitializedProvider();

        await provider.speak(text);

        // Assert: fetch was called with the correct URL and text
        expect(capturedFetchCalls.length).toBe(1);
        expect(capturedFetchCalls[0].url).toBe('/api/voice/elevenlabs-tts');
        expect(capturedFetchCalls[0].body.text).toBe(text);

        // Assert: audio playback was initiated
        expect(mockAudioContext.decodeAudioData).toHaveBeenCalledOnce();
        expect(mockAudioContext.createBufferSource).toHaveBeenCalledOnce();
        expect(mockSourceNode.connect).toHaveBeenCalledOnce();
        expect(mockSourceNode.start).toHaveBeenCalledOnce();

        provider.dispose();
      }),
      { numRuns: 100 },
    );
  });
});

/* ------------------------------------------------------------------ */
/*  Property 2: StopSpeaking halts playback and aborts fetch           */
/* ------------------------------------------------------------------ */

describe('Property 2: StopSpeaking halts playback and aborts fetch', () => {
  // **Validates: Requirements 1.3**
  test('for any provider currently speaking, stopSpeaking stops audio and aborts fetch', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ minLength: 1, maxLength: 500 }), async (text) => {
        cleanupMocks();
        setupMocks();

        const provider = await createInitializedProvider();

        let abortSignalAborted = false;

        // Override fetch to hang until aborted, then reject like a real fetch
        vi.stubGlobal(
          'fetch',
          vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
            return new Promise<Response>((_resolve, reject) => {
              if (init?.signal) {
                init.signal.addEventListener('abort', () => {
                  abortSignalAborted = true;
                  reject(new DOMException('The operation was aborted.', 'AbortError'));
                });
              }
            });
          }),
        );

        // Start speaking — fetch will hang until aborted
        const speakPromise = provider.speak(text);

        // Allow microtask to run so fetch is called
        await Promise.resolve();

        // Stop speaking while fetch is in-flight
        provider.stopSpeaking();

        // Assert: fetch was aborted
        expect(abortSignalAborted).toBe(true);

        // The speak promise should reject due to abort
        await expect(speakPromise).rejects.toThrow();

        provider.dispose();
      }),
      { numRuns: 100 },
    );
  });
});


/* ------------------------------------------------------------------ */
/*  Property 3: Configured voice ID is sent in TTS requests            */
/* ------------------------------------------------------------------ */

describe('Property 3: Configured voice ID is sent in TTS requests', () => {
  // **Validates: Requirements 1.4**
  test('for any non-empty voice ID set via setVoiceId, the fetch body contains that exact voice ID', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ minLength: 1, maxLength: 50 }), async (voiceId) => {
        cleanupMocks();
        setupMocks();

        setVoiceId(voiceId);
        const provider = await createInitializedProvider();

        await provider.speak('test text');

        expect(capturedFetchCalls.length).toBe(1);
        expect(capturedFetchCalls[0].body.voiceId).toBe(voiceId);

        provider.dispose();
      }),
      { numRuns: 100 },
    );
  });
});

/* ------------------------------------------------------------------ */
/*  Property 4: Recognition transcript forwarding                      */
/* ------------------------------------------------------------------ */

describe('Property 4: Recognition transcript forwarding', () => {
  // **Validates: Requirements 2.3**
  test('for any transcript string, the provider forwards it unchanged to onResult', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ minLength: 1, maxLength: 1000 }), async (transcript) => {
        cleanupMocks();
        setupMocks();

        const provider = await createInitializedProvider();

        const results: string[] = [];
        const onResult = (t: string) => {
          results.push(t);
        };
        const onError = vi.fn();

        provider.startRecognition(onResult, onError);

        // Simulate the Web Speech API producing a transcript
        if (mockRecognitionInstance.onresult) {
          mockRecognitionInstance.onresult({
            results: {
              0: {
                0: { transcript },
                length: 1,
              },
              length: 1,
            },
          });
        }

        expect(results.length).toBe(1);
        expect(results[0]).toBe(transcript);
        expect(onError).not.toHaveBeenCalled();

        provider.dispose();
      }),
      { numRuns: 100 },
    );
  });
});

/* ------------------------------------------------------------------ */
/*  Property 9: Availability reflects constructor parameter            */
/* ------------------------------------------------------------------ */

describe('Property 9: Availability reflects constructor parameter', () => {
  // **Validates: Requirements 7.1, 7.2, 7.3**
  test('for any boolean b, createElevenLabsProvider(b).isAvailable() returns exactly b', () => {
    fc.assert(
      fc.property(fc.boolean(), (b) => {
        const provider = createElevenLabsProvider(b);
        expect(provider.isAvailable()).toBe(b);
      }),
      { numRuns: 100 },
    );
  });
});

/* ------------------------------------------------------------------ */
/*  Property 10: TTS errors reject the speak promise                   */
/* ------------------------------------------------------------------ */

describe('Property 10: TTS errors reject the speak promise', () => {
  // **Validates: Requirements 8.1**
  test('for any HTTP error status (400-599), the speak promise rejects', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 400, max: 599 }), async (status) => {
        cleanupMocks();
        setupMocks();

        // Override fetch to return an error status
        vi.stubGlobal(
          'fetch',
          vi.fn().mockResolvedValue(
            new Response('Error', { status, statusText: 'Error' }),
          ),
        );

        const provider = await createInitializedProvider();

        await expect(provider.speak('hello')).rejects.toThrow('ElevenLabs TTS request failed');

        provider.dispose();
      }),
      { numRuns: 100 },
    );
  });
});

/* ------------------------------------------------------------------ */
/*  Property 12: Dispose cleans up all active resources                */
/* ------------------------------------------------------------------ */

describe('Property 12: Dispose cleans up all active resources', () => {
  // **Validates: Requirements 9.1**
  test('for any provider state (idle, speaking, recognizing), dispose cleans up all resources', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('idle', 'speaking', 'recognizing'),
        async (state) => {
          cleanupMocks();
          setupMocks();

          const provider = await createInitializedProvider();

          if (state === 'speaking') {
            // Make fetch hang until aborted, then reject properly
            vi.stubGlobal(
              'fetch',
              vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
                return new Promise<Response>((_resolve, reject) => {
                  if (init?.signal) {
                    init.signal.addEventListener('abort', () => {
                      reject(new DOMException('The operation was aborted.', 'AbortError'));
                    });
                  }
                });
              }),
            );

            const speakPromise = provider.speak('test');

            // Allow microtask so fetch is called
            await Promise.resolve();

            provider.dispose();

            // Assert: AudioContext closed
            expect(mockAudioContext.close).toHaveBeenCalled();

            await speakPromise.catch(() => {});
          } else if (state === 'recognizing') {
            const onResult = vi.fn();
            const onError = vi.fn();
            provider.startRecognition(onResult, onError);

            provider.dispose();

            // Assert: recognition was aborted, AudioContext closed
            expect(mockRecognitionInstance.abort).toHaveBeenCalled();
            expect(mockAudioContext.close).toHaveBeenCalled();
          } else {
            // idle state
            provider.dispose();

            // Assert: AudioContext closed even in idle state
            expect(mockAudioContext.close).toHaveBeenCalled();
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

/* ------------------------------------------------------------------ */
/*  Property 13: Speak after dispose is rejected                       */
/* ------------------------------------------------------------------ */

describe('Property 13: Speak after dispose is rejected', () => {
  // **Validates: Requirements 9.3**
  test('for any text, calling speak on a disposed provider rejects with "Provider has been disposed"', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ minLength: 1, maxLength: 500 }), async (text) => {
        cleanupMocks();
        setupMocks();

        const provider = await createInitializedProvider();
        provider.dispose();

        await expect(provider.speak(text)).rejects.toThrow('Provider has been disposed');
      }),
      { numRuns: 100 },
    );
  });
});
