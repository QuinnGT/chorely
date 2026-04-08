import { describe, it, expect } from 'vitest';
import { createProviderManager } from '../provider-manager';
import type { VoiceProvider } from '../types';

/** Creates a minimal mock VoiceProvider for testing. */
function mockProvider(id: string, available: boolean, overrides?: Partial<VoiceProvider>): VoiceProvider {
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

describe('createProviderManager', () => {
  it('returns configured provider when it is available', () => {
    const elevenlabs = mockProvider('elevenlabs', true);
    const webSpeech = mockProvider('web-speech', true);
    const mgr = createProviderManager('elevenlabs', [elevenlabs, webSpeech]);

    expect(mgr.getActiveProvider()?.id).toBe('elevenlabs');
  });

  it('falls back to web-speech when configured provider is unavailable', () => {
    const elevenlabs = mockProvider('elevenlabs', false);
    const webSpeech = mockProvider('web-speech', true);
    const mgr = createProviderManager('elevenlabs', [elevenlabs, webSpeech]);

    expect(mgr.getActiveProvider()?.id).toBe('web-speech');
  });

  it('returns null when no providers are available', () => {
    const elevenlabs = mockProvider('elevenlabs', false);
    const webSpeech = mockProvider('web-speech', false);
    const mgr = createProviderManager('elevenlabs', [elevenlabs, webSpeech]);

    expect(mgr.getActiveProvider()).toBeNull();
  });

  it('falls back from configured to web-speech via fallbackToNext', () => {
    const elevenlabs = mockProvider('elevenlabs', true);
    const webSpeech = mockProvider('web-speech', true);
    const mgr = createProviderManager('elevenlabs', [elevenlabs, webSpeech]);

    expect(mgr.getActiveProvider()?.id).toBe('elevenlabs');
    const next = mgr.fallbackToNext();
    expect(next?.id).toBe('web-speech');
    expect(mgr.getActiveProvider()?.id).toBe('web-speech');
  });

  it('returns null from fallbackToNext when at end of chain', () => {
    const webSpeech = mockProvider('web-speech', true);
    const mgr = createProviderManager('web-speech', [webSpeech]);

    expect(mgr.getActiveProvider()?.id).toBe('web-speech');
    const next = mgr.fallbackToNext();
    expect(next).toBeNull();
    expect(mgr.getActiveProvider()).toBeNull();
  });

  it('does not duplicate web-speech in chain when it is the configured provider', () => {
    const webSpeech = mockProvider('web-speech', true);
    const mgr = createProviderManager('web-speech', [webSpeech]);

    expect(mgr.getActiveProvider()?.id).toBe('web-speech');
    // Only one entry in chain, so fallback goes to null
    expect(mgr.fallbackToNext()).toBeNull();
  });

  it('returns only available provider IDs from getAvailableProviderIds', () => {
    const elevenlabs = mockProvider('elevenlabs', false);
    const webSpeech = mockProvider('web-speech', true);
    const bedrock = mockProvider('bedrock', true);
    const mgr = createProviderManager('elevenlabs', [elevenlabs, webSpeech, bedrock]);

    expect(mgr.getAvailableProviderIds()).toEqual(['web-speech', 'bedrock']);
  });

  it('returns empty array from getAvailableProviderIds when none available', () => {
    const mgr = createProviderManager('web-speech', []);

    expect(mgr.getAvailableProviderIds()).toEqual([]);
  });

  it('handles bedrock as configured provider with full fallback chain', () => {
    const bedrock = mockProvider('bedrock', true);
    const webSpeech = mockProvider('web-speech', true);
    const mgr = createProviderManager('bedrock', [bedrock, webSpeech]);

    expect(mgr.getActiveProvider()?.id).toBe('bedrock');
    expect(mgr.fallbackToNext()?.id).toBe('web-speech');
    expect(mgr.fallbackToNext()).toBeNull();
  });

  it('skips unavailable configured provider and unavailable web-speech', () => {
    const bedrock = mockProvider('bedrock', false);
    const webSpeech = mockProvider('web-speech', false);
    const mgr = createProviderManager('bedrock', [bedrock, webSpeech]);

    expect(mgr.getActiveProvider()).toBeNull();
  });

  // Requirement 8.4: Falls back to text-only when both providers fail
  it('falls back to text-only when both providers fail', async () => {
    const elevenlabs = mockProvider('elevenlabs', true, {
      speak: async () => {
        throw new Error('ElevenLabs TTS request failed');
      },
    });
    const webSpeech = mockProvider('web-speech', true, {
      speak: async () => {
        throw new Error('Web Speech synthesis failed');
      },
    });

    const mgr = createProviderManager('elevenlabs', [elevenlabs, webSpeech]);

    // Primary provider is elevenlabs
    expect(mgr.getActiveProvider()?.id).toBe('elevenlabs');

    // Primary speak fails — fallback to web-speech
    const primary = mgr.getActiveProvider()!;
    await expect(primary.speak('hello')).rejects.toThrow();
    const fallback = mgr.fallbackToNext();
    expect(fallback?.id).toBe('web-speech');

    // Fallback speak also fails — fallback to text-only (null)
    await expect(fallback!.speak('hello')).rejects.toThrow();
    const textOnly = mgr.fallbackToNext();
    expect(textOnly).toBeNull();

    // Active provider is now null (text-only mode)
    expect(mgr.getActiveProvider()).toBeNull();
  });
});
