/**
 * Callback invoked when speech recognition produces a transcript.
 */
export type OnRecognitionResult = (transcript: string) => void;

/**
 * Callback invoked when speech recognition encounters an error.
 */
export type OnRecognitionError = (err: Error) => void;

/**
 * Common interface for all voice provider implementations.
 * Providers handle speech-to-text (recognition) and text-to-speech (synthesis).
 */
export interface VoiceProvider {
  readonly id: string;
  readonly name: string;

  /** Set up the provider (request permissions, load resources, etc.) */
  initialize(): Promise<void>;

  /** Begin listening for speech input, delivering results via callbacks. */
  startRecognition(
    onResult: OnRecognitionResult,
    onError: OnRecognitionError,
    options?: { continuous?: boolean },
  ): void;

  /** Stop an active speech recognition session. */
  stopRecognition(): void;

  /** Speak the given text aloud. Resolves when speech finishes. */
  speak(text: string): Promise<void>;

  /** Interrupt any in-progress speech output. */
  stopSpeaking(): void;

  /** Check whether this provider can run in the current environment. */
  isAvailable(): boolean;

  /** Release all resources held by the provider. */
  dispose(): void;
}
