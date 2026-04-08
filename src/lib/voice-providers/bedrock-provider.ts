/**
 * AWS Bedrock (Nova Sonic 2) voice provider stub.
 * Implements the VoiceProvider interface but defers full SDK integration.
 * Availability is determined server-side (via /api/voice-settings) and
 * passed in as a parameter — no secrets in the client bundle.
 */

import type { VoiceProvider, OnRecognitionResult, OnRecognitionError } from './types';

export function createBedrockProvider(available = false): VoiceProvider {
  const provider: VoiceProvider = {
    id: 'bedrock',
    name: 'Amazon Nova Sonic 2',

    async initialize(): Promise<void> {
      if (!provider.isAvailable()) {
        throw new Error('AWS Bedrock credentials are not configured');
      }
    },

    startRecognition(_onResult: OnRecognitionResult, onError: OnRecognitionError): void {
      onError(new Error('Bedrock speech recognition is not yet implemented'));
    },

    stopRecognition(): void {
      // No-op — stub
    },

    async speak(_text: string): Promise<void> {
      throw new Error('Bedrock speech synthesis is not yet implemented');
    },

    stopSpeaking(): void {
      // No-op — stub
    },

    isAvailable(): boolean {
      return available;
    },

    dispose(): void {
      // No-op — stub
    },
  };

  return provider;
}
