/**
 * Voice provider implementation using the browser-native Web Speech API.
 * Provides speech recognition (SpeechRecognition) and speech synthesis (SpeechSynthesis).
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

function getSpeechRecognitionCtor(): WebSpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as Record<string, unknown>;
  return (win['SpeechRecognition'] ?? win['webkitSpeechRecognition'] ?? null) as WebSpeechRecognitionCtor | null;
}

function getSpeechSynthesis(): SpeechSynthesis | null {
  if (typeof window === 'undefined') return null;
  return window.speechSynthesis ?? null;
}

export function createWebSpeechProvider(): VoiceProvider {
  let recognition: WebSpeechRecognition | null = null;
  let synthesis: SpeechSynthesis | null = null;
  let currentUtterance: SpeechSynthesisUtterance | null = null;

  const provider: VoiceProvider = {
    id: 'web-speech',
    name: 'Web Speech API',

    async initialize(): Promise<void> {
      const Ctor = getSpeechRecognitionCtor();
      if (!Ctor) {
        throw new Error('Web Speech API is not supported in this browser');
      }
      synthesis = getSpeechSynthesis();
    },

    startRecognition(
      onResult: OnRecognitionResult,
      onError: OnRecognitionError,
      options?: { continuous?: boolean },
    ): void {
      const Ctor = getSpeechRecognitionCtor();
      if (!Ctor) {
        onError(new Error('SpeechRecognition is not available'));
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

      // Override stopRecognition to set the stopped flag
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
      if (!synthesis) {
        return;
      }

      return new Promise<void>((resolve, reject) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        currentUtterance = utterance;

        utterance.onend = () => {
          currentUtterance = null;
          resolve();
        };

        utterance.onerror = (event) => {
          currentUtterance = null;
          reject(new Error(`Speech synthesis error: ${event.error}`));
        };

        synthesis!.speak(utterance);
      });
    },

    stopSpeaking(): void {
      if (synthesis) {
        synthesis.cancel();
      }
      currentUtterance = null;
    },

    isAvailable(): boolean {
      return getSpeechRecognitionCtor() !== null;
    },

    dispose(): void {
      provider.stopRecognition();
      provider.stopSpeaking();
      recognition = null;
      synthesis = null;
      currentUtterance = null;
    },
  };

  return provider;
}
