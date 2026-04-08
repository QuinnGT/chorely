/**
 * ElevenLabs voice provider implementation.
 * Uses the ElevenLabs REST API (via server-side proxy) for text-to-speech
 * and delegates speech recognition to the browser-native Web Speech API.
 * Availability is determined server-side (via /api/voice-settings) and
 * passed in as a parameter — no secrets in the client bundle.
 */

import type { VoiceProvider, OnRecognitionResult, OnRecognitionError } from './types';

/* ------------------------------------------------------------------ */
/*  Web Speech API type declarations (not in all TS dom libs)         */
/* ------------------------------------------------------------------ */

interface WebSpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList;
}

interface WebSpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}

interface WebSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: WebSpeechRecognitionEvent) => void) | null;
  onerror: ((event: WebSpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type WebSpeechRecognitionCtor = new () => WebSpeechRecognition;

/* ------------------------------------------------------------------ */

const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel
const TTS_TIMEOUT_MS = 15_000;

function getSpeechRecognitionCtor(): WebSpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as Record<string, unknown>;
  return (win['SpeechRecognition'] ?? win['webkitSpeechRecognition'] ?? null) as WebSpeechRecognitionCtor | null;
}

/** Module-level voice ID shared with `setVoiceId`. */
let moduleVoiceId: string = DEFAULT_VOICE_ID;

/**
 * Set the ElevenLabs voice ID used for TTS requests.
 * This is exported separately from the VoiceProvider interface.
 */
export function setVoiceId(id: string): void {
  moduleVoiceId = id;
}

export function createElevenLabsProvider(available = false): VoiceProvider {
  let audioContext: AudioContext | null = null;
  let currentSource: AudioBufferSourceNode | null = null;
  let abortController: AbortController | null = null;
  let recognition: WebSpeechRecognition | null = null;
  let disposed = false;

  const provider: VoiceProvider = {
    id: 'elevenlabs',
    name: 'ElevenLabs',

    async initialize(): Promise<void> {
      if (!available) {
        throw new Error('ElevenLabs API key is not configured');
      }
      audioContext = new AudioContext();
      // Verify SpeechRecognition constructor exists (non-fatal — recognition is optional)
      getSpeechRecognitionCtor();
    },

    startRecognition(
      onResult: OnRecognitionResult,
      onError: OnRecognitionError,
      options?: { continuous?: boolean },
    ): void {
      const Ctor = getSpeechRecognitionCtor();
      if (!Ctor) {
        onError(new Error('Speech recognition is not supported in this browser'));
        return;
      }

      const isContinuous = options?.continuous ?? false;
      let stopped = false;

      const createAndStart = (): void => {
        const rec = new Ctor();
        rec.continuous = isContinuous;
        rec.interimResults = false;
        rec.lang = 'en-US';
        let gotResult = false;

        rec.onresult = (event: WebSpeechRecognitionEvent) => {
          gotResult = true;
          const lastResult = event.results[event.results.length - 1];
          const transcript = lastResult?.[0]?.transcript ?? '';
          if (transcript) {
            onResult(transcript);
          }
        };

        rec.onerror = (event: WebSpeechRecognitionErrorEvent) => {
          if (event.error === 'no-speech' || event.error === 'aborted') return;
          gotResult = true;
          onError(new Error(`Speech recognition error: ${event.error}`));
        };

        rec.onend = () => {
          // If this recognition was superseded or externally stopped, ignore
          if (recognition !== rec) return;
          recognition = null;
          if (stopped) return;
          if (isContinuous) {
            // Always restart continuous listening (e.g. wake word detection)
            try {
              createAndStart();
            } catch {
              onError(new Error('recognition-ended-no-result'));
            }
            return;
          }
          if (!gotResult) {
            onError(new Error('recognition-ended-no-result'));
          }
        };

        recognition = rec;
        rec.start();
      };

      // Override stopRecognition to set the per-session stopped flag
      const origStop = provider.stopRecognition.bind(provider);
      provider.stopRecognition = () => {
        stopped = true;
        origStop();
      };

      createAndStart();
    },

    stopRecognition(): void {
      if (recognition) {
        recognition.abort();
        recognition = null;
      }
    },

    async speak(text: string): Promise<void> {
      if (disposed) {
        throw new Error('Provider has been disposed');
      }

      const controller = new AbortController();
      abortController = controller;

      const timeoutId = setTimeout(() => controller.abort(), TTS_TIMEOUT_MS);

      try {
        let response: Response;
        try {
          response = await fetch('/api/voice/elevenlabs-tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, voiceId: moduleVoiceId }),
            signal: controller.signal,
          });
        } catch (err: unknown) {
          if (controller.signal.aborted) {
            throw new Error('TTS request timed out');
          }
          throw new Error('Network error during TTS request');
        } finally {
          clearTimeout(timeoutId);
        }

        if (!response.ok) {
          throw new Error('ElevenLabs TTS request failed');
        }

        const arrayBuffer = await response.arrayBuffer();

        if (!audioContext) {
          throw new Error('AudioContext not initialized');
        }

        // Handle browser autoplay policy
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }

        let audioBuffer: AudioBuffer;
        try {
          audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        } catch {
          throw new Error('Failed to decode audio response');
        }

        return new Promise<void>((resolve, reject) => {
          if (!audioContext) {
            reject(new Error('AudioContext not initialized'));
            return;
          }

          const source = audioContext.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(audioContext.destination);
          currentSource = source;

          source.onended = () => {
            currentSource = null;
            resolve();
          };

          try {
            source.start(0);
          } catch (err: unknown) {
            currentSource = null;
            const message = err instanceof Error ? err.message : 'Audio playback failed';
            reject(new Error(message));
          }
        });
      } finally {
        if (abortController === controller) {
          abortController = null;
        }
      }
    },

    stopSpeaking(): void {
      if (currentSource) {
        try {
          currentSource.stop();
        } catch {
          // Already stopped — ignore
        }
        currentSource = null;
      }
      if (abortController) {
        abortController.abort();
        abortController = null;
      }
    },

    isAvailable(): boolean {
      return available;
    },

    dispose(): void {
      disposed = true;
      provider.stopSpeaking();
      provider.stopRecognition();
      if (audioContext) {
        try {
          audioContext.close();
        } catch {
          // Already closed — ignore
        }
        audioContext = null;
      }
    },
  };

  return provider;
}
