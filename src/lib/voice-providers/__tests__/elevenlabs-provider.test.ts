import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElevenLabsProvider, setVoiceId } from '../elevenlabs-provider';

/* ------------------------------------------------------------------ */
/*  Mock infrastructure (same pattern as property test file)           */
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
  vi.stubGlobal('AudioContext', function AudioContextMock() {
    return createMockAudioContext();
  });

  vi.stubGlobal('SpeechRecognition', function SpeechRecognitionMock() {
    return createMockRecognition();
  });

  capturedFetchCalls = [];

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
  setVoiceId('21m00Tcm4TlvDq8ikWAM');
  setupMocks();
});

afterEach(() => {
  cleanupMocks();
});

/* ------------------------------------------------------------------ */
/*  Test: default voice ID is Rachel when none configured (Req 1.5)   */
/* ------------------------------------------------------------------ */

describe('default voice ID', () => {
  test('default voice ID is Rachel (21m00Tcm4TlvDq8ikWAM) when none configured', async () => {
    // Arrange: setVoiceId already called with default in beforeEach
    const provider = createElevenLabsProvider(true);
    await provider.initialize();

    // Act
    await provider.speak('Hello world');

    // Assert
    expect(capturedFetchCalls.length).toBe(1);
    expect(capturedFetchCalls[0].body.voiceId).toBe('21m00Tcm4TlvDq8ikWAM');

    provider.dispose();
  });
});

/* ------------------------------------------------------------------ */
/*  Test: startRecognition creates SpeechRecognition instance (Req 2.1)*/
/* ------------------------------------------------------------------ */

describe('startRecognition', () => {
  test('startRecognition creates a browser SpeechRecognition instance', async () => {
    // Arrange
    const provider = createElevenLabsProvider(true);
    await provider.initialize();
    const onResult = vi.fn();
    const onError = vi.fn();

    // Act
    provider.startRecognition(onResult, onError);

    // Assert: recognition instance was created and started
    expect(mockRecognitionInstance.start).toHaveBeenCalledOnce();
    expect(mockRecognitionInstance.lang).toBe('en-US');

    provider.dispose();
  });

  /* ---------------------------------------------------------------- */
  /*  Test: startRecognition calls onError when Web Speech API        */
  /*        unavailable (Req 2.2)                                     */
  /* ---------------------------------------------------------------- */

  test('startRecognition calls onError when Web Speech API unavailable', async () => {
    // Arrange: remove SpeechRecognition from global
    vi.stubGlobal('SpeechRecognition', undefined);
    vi.stubGlobal('webkitSpeechRecognition', undefined);

    const provider = createElevenLabsProvider(true);
    await provider.initialize();
    const onResult = vi.fn();
    const onError = vi.fn();

    // Act
    provider.startRecognition(onResult, onError);

    // Assert
    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(onError.mock.calls[0][0].message).toBe(
      'Speech recognition is not supported in this browser',
    );
    expect(onResult).not.toHaveBeenCalled();

    provider.dispose();
  });
});

/* ------------------------------------------------------------------ */
/*  Test: stopRecognition aborts active recognition session (Req 2.4) */
/* ------------------------------------------------------------------ */

describe('stopRecognition', () => {
  test('stopRecognition aborts active recognition session', async () => {
    // Arrange
    const provider = createElevenLabsProvider(true);
    await provider.initialize();
    provider.startRecognition(vi.fn(), vi.fn());

    // Act
    provider.stopRecognition();

    // Assert
    expect(mockRecognitionInstance.abort).toHaveBeenCalledOnce();

    provider.dispose();
  });
});

/* ------------------------------------------------------------------ */
/*  Test: initialize throws when available is false (Req 7.4)         */
/* ------------------------------------------------------------------ */

describe('initialize', () => {
  test('initialize throws when available is false', async () => {
    // Arrange
    const provider = createElevenLabsProvider(false);

    // Act & Assert
    await expect(provider.initialize()).rejects.toThrow(
      'ElevenLabs API key is not configured',
    );
  });

  /* ---------------------------------------------------------------- */
  /*  Test: initialize succeeds when available is true (Req 7.5)      */
  /* ---------------------------------------------------------------- */

  test('initialize succeeds when available is true', async () => {
    // Arrange
    const provider = createElevenLabsProvider(true);

    // Act & Assert: should not throw
    await expect(provider.initialize()).resolves.toBeUndefined();

    provider.dispose();
  });
});

/* ------------------------------------------------------------------ */
/*  Test: audio playback failure rejects speak promise (Req 8.2)      */
/* ------------------------------------------------------------------ */

describe('audio playback failure', () => {
  test('audio playback failure rejects speak promise', async () => {
    // Arrange
    const provider = createElevenLabsProvider(true);
    await provider.initialize();

    // Override createBufferSource to return a node whose start() throws
    mockAudioContext.createBufferSource.mockImplementation(() => {
      const failingNode = {
        connect: vi.fn(),
        start: vi.fn().mockImplementation(() => {
          throw new Error('Audio playback failed');
        }),
        stop: vi.fn(),
        onended: null,
        buffer: null,
      };
      return failingNode;
    });

    // Act & Assert
    await expect(provider.speak('test audio failure')).rejects.toThrow(
      'Audio playback failed',
    );

    provider.dispose();
  });
});

/* ------------------------------------------------------------------ */
/*  Test: 15-second timeout rejects speak promise (Req 8.5)           */
/* ------------------------------------------------------------------ */

describe('speak timeout', () => {
  test('15-second timeout rejects speak promise', async () => {
    // Arrange
    vi.useFakeTimers();

    const provider = createElevenLabsProvider(true);
    await provider.initialize();

    // Override fetch to return a promise that never resolves but rejects on abort.
    // We track the reject function so the promise is properly settled.
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
        return new Promise<Response>((_resolve, reject) => {
          const onAbort = () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          };
          if (init?.signal?.aborted) {
            onAbort();
          } else {
            init?.signal?.addEventListener('abort', onAbort);
          }
        });
      }),
    );

    // Act: start speak and prevent unhandled rejection warning during timer advance
    const speakPromise = provider.speak('this will time out');
    // Attach a no-op catch so the rejection is "handled" before advanceTimers settles it
    const safePromise = speakPromise.catch(() => {});

    // Advance time by 15 seconds to trigger the abort
    await vi.advanceTimersByTimeAsync(15_000);
    await safePromise;

    // Assert
    await expect(speakPromise).rejects.toThrow('TTS request timed out');

    provider.dispose();
    vi.useRealTimers();
  });
});

/* ------------------------------------------------------------------ */
/*  Test: resumes suspended AudioContext before playback (Req 10.3)   */
/* ------------------------------------------------------------------ */

describe('suspended AudioContext', () => {
  test('resumes suspended AudioContext before playback', async () => {
    // Arrange
    const provider = createElevenLabsProvider(true);
    await provider.initialize();

    // Set AudioContext to suspended state
    mockAudioContext.state = 'suspended';

    // Act
    await provider.speak('resume test');

    // Assert
    expect(mockAudioContext.resume).toHaveBeenCalledOnce();

    provider.dispose();
  });
});
