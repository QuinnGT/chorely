// Feature: elevenlabs-voice-integration, Property 11: Provider manager fallback on speak failure

import { describe, test, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import { createProviderManager } from '../provider-manager';
import type { VoiceProvider } from '../types';

/* ------------------------------------------------------------------ */
/*  Mock infrastructure                                                */
/* ------------------------------------------------------------------ */

function mockProvider(
  id: string,
  available: boolean,
  overrides?: Partial<VoiceProvider>,
): VoiceProvider {
  return {
    id,
    name: `Mock ${id}`,
    initialize: async () => {},
    startRecognition: () => {},
    stopRecognition: () => {},
    speak: async () => {},
    stopSpeaking: () => {},
    isAvailable: () => available,
    dispose: () => {},
    ...overrides,
  };
}

/* ------------------------------------------------------------------ */
/*  Property 11: Provider manager fallback on speak failure            */
/* ------------------------------------------------------------------ */

describe('Property 11: Provider manager fallback on speak failure', () => {
  // **Validates: Requirements 8.3**
  test('for any text, if primary provider speak rejects, fallbackToNext enables the fallback provider to speak with the same text', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ minLength: 1, maxLength: 500 }), async (text) => {
        const fallbackSpeakCalls: string[] = [];

        const elevenlabs = mockProvider('elevenlabs', true, {
          speak: async () => {
            throw new Error('ElevenLabs TTS request failed');
          },
        });

        const webSpeech = mockProvider('web-speech', true, {
          speak: async (t: string) => {
            fallbackSpeakCalls.push(t);
          },
        });

        const mgr = createProviderManager('elevenlabs', [elevenlabs, webSpeech]);

        // Active provider is elevenlabs
        expect(mgr.getActiveProvider()?.id).toBe('elevenlabs');

        // Primary speak fails
        const primary = mgr.getActiveProvider()!;
        await expect(primary.speak(text)).rejects.toThrow();

        // Fallback to next provider
        const fallback = mgr.fallbackToNext();
        expect(fallback).not.toBeNull();
        expect(fallback!.id).toBe('web-speech');

        // Speak with the same text on the fallback provider
        await fallback!.speak(text);

        // Assert: fallback provider's speak was called with the same text
        expect(fallbackSpeakCalls.length).toBe(1);
        expect(fallbackSpeakCalls[0]).toBe(text);
      }),
      { numRuns: 100 },
    );
  });
});
