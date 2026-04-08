/**
 * Voice provider manager with fallback chain logic.
 *
 * Fallback order:
 *   1. Configured provider (if available)
 *   2. Web Speech API provider (if available)
 *   3. null (text-only fallback)
 */

import type { VoiceProvider } from './types';

const WEB_SPEECH_ID = 'web-speech';

interface ProviderManager {
  /** Returns the currently active provider, or null if none available. */
  getActiveProvider(): VoiceProvider | null;
  /** Moves to the next provider in the fallback chain. Returns the new provider or null. */
  fallbackToNext(): VoiceProvider | null;
  /** Lists IDs of all providers that report themselves as available. */
  getAvailableProviderIds(): string[];
}

export function createProviderManager(
  configuredProviderId: string,
  availableProviders: VoiceProvider[],
): ProviderManager {
  const providerMap = new Map<string, VoiceProvider>();
  for (const p of availableProviders) {
    providerMap.set(p.id, p);
  }

  // Build the fallback chain: configured → web-speech → null
  const chain: VoiceProvider[] = [];

  const configured = providerMap.get(configuredProviderId);
  if (configured && configured.isAvailable()) {
    chain.push(configured);
  }

  // Always try web-speech as second fallback (unless it was already the configured one)
  if (configuredProviderId !== WEB_SPEECH_ID) {
    const webSpeech = providerMap.get(WEB_SPEECH_ID);
    if (webSpeech && webSpeech.isAvailable()) {
      chain.push(webSpeech);
    }
  }

  let chainIndex = 0;

  return {
    getActiveProvider(): VoiceProvider | null {
      return chain[chainIndex] ?? null;
    },

    fallbackToNext(): VoiceProvider | null {
      if (chainIndex < chain.length - 1) {
        chainIndex += 1;
        return chain[chainIndex] ?? null;
      }
      // No more providers — text-only
      chainIndex = chain.length;
      return null;
    },

    getAvailableProviderIds(): string[] {
      return availableProviders
        .filter((p) => p.isAvailable())
        .map((p) => p.id);
    },
  };
}
