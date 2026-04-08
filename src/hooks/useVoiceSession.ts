'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createProviderManager } from '@/lib/voice-providers/provider-manager';
import { createWebSpeechProvider } from '@/lib/voice-providers/web-speech-provider';
import { createElevenLabsProvider, setVoiceId } from '@/lib/voice-providers/elevenlabs-provider';
import type { VoiceProvider } from '@/lib/voice-providers/types';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking' | 'waiting-for-followup';

export interface UseVoiceSessionResult {
  state: VoiceState;
  transcript: string | null;
  response: string | null;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  toggleMute: () => void;
  isMuted: boolean;
  isSupported: boolean;
}

interface UseVoiceSessionOptions {
  wakePhrase: string;
  wakeWordEnabled: boolean;
  providerId: string;
  availableProviders: string[];
  elevenlabsVoiceId?: string;
  onSendMessage: (text: string) => Promise<string>;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const SPEECH_TIMEOUT_MS = 10_000;
const FOLLOWUP_TIMEOUT_MS = 8_000;
const SESSION_STORAGE_KEY = 'voice-interaction-mode';
const WAKE_RESTART_DELAY_MS = 1_000;
const WAKE_INIT_DELAY_MS = 500;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

export function getInteractionMode(): 'voice' | 'text' {
  if (typeof window === 'undefined') return 'text';
  try {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    return stored === 'voice' ? 'voice' : 'text';
  } catch {
    return 'text';
  }
}

function setInteractionMode(mode: 'voice' | 'text'): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, mode);
  } catch {
    // Session storage unavailable — silently ignore
  }
}

function normalizeText(text: string): string {
  return text.toLowerCase().trim();
}

function containsWakePhrase(transcript: string, wakePhrase: string): boolean {
  return normalizeText(transcript).includes(normalizeText(wakePhrase));
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useVoiceSession({
  wakePhrase,
  wakeWordEnabled,
  providerId,
  availableProviders,
  elevenlabsVoiceId,
  onSendMessage,
}: UseVoiceSessionOptions): UseVoiceSessionResult {
  const [state, setState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState<string | null>(null);
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [providerGeneration, setProviderGeneration] = useState(0);

  const providerRef = useRef<VoiceProvider | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wakeListeningRef = useRef(false);
  const stateRef = useRef<VoiceState>('idle');
  const isMutedRef = useRef(false);
  const onSendMessageRef = useRef(onSendMessage);
  const inConversationRef = useRef(false);
  const wakePhraseRef = useRef(wakePhrase);

  // Keep refs in sync
  stateRef.current = state;
  isMutedRef.current = isMuted;
  onSendMessageRef.current = onSendMessage;
  wakePhraseRef.current = wakePhrase;

  useEffect(() => {
    if (isSupported) setInteractionMode('voice');
  }, [isSupported]);

  const clearSpeechTimeout = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Refs for internal actions — avoids stale closures between       */
  /*  callbacks that need to call each other.                         */
  /* ---------------------------------------------------------------- */

  const startWakeWordListeningRef = useRef<() => void>(() => {});
  const startActiveListeningRef = useRef<() => void>(() => {});
  const processTranscriptRef = useRef<(text: string) => void>(() => {});
  const startFollowupListeningRef = useRef<() => void>(() => {});

  /** Shared error handler for active/follow-up listening sessions. */
  const handleListeningError = (err: Error): void => {
    clearSpeechTimeout();
    inConversationRef.current = false;
    // Sentinel means recognition ended without speech — show friendly message
    const message = err.message === 'recognition-ended-no-result'
      ? 'No speech detected. Please try again.'
      : err.message;
    setError(message);
    setState('idle');
  };

  /* ---- Wake word detection ---- */

  startWakeWordListeningRef.current = () => {
    const provider = providerRef.current;
    if (!provider || wakeListeningRef.current) return;
    if (stateRef.current !== 'idle') return;

    wakeListeningRef.current = true;

    provider.startRecognition(
      (text: string) => {
        // Don't stop wake listening flag here — continuous mode keeps firing
        if (stateRef.current !== 'idle') return;

        if (containsWakePhrase(text, wakePhraseRef.current)) {
          // Wake word detected — stop continuous listening, start active session
          wakeListeningRef.current = false;
          provider.stopRecognition();
          inConversationRef.current = true;
          setError(null);
          setTranscript(null);
          setResponse(null);
          setState('listening');
          startActiveListeningRef.current();
        }
        // Not a wake phrase — continuous mode keeps listening automatically
      },
      () => {
        wakeListeningRef.current = false;
        // Restart if still idle (continuous mode ended unexpectedly)
        if (stateRef.current === 'idle') {
          setTimeout(() => startWakeWordListeningRef.current(), WAKE_RESTART_DELAY_MS);
        }
      },
      { continuous: true },
    );
  };

  /* ---- Active listening (after wake word or tap) ---- */

  startActiveListeningRef.current = () => {
    const provider = providerRef.current;
    if (!provider) return;

    if (wakeListeningRef.current) {
      provider.stopRecognition();
      wakeListeningRef.current = false;
    }

    clearSpeechTimeout();
    timeoutRef.current = setTimeout(() => {
      provider.stopRecognition();
      inConversationRef.current = false;
      setError('No speech detected. Please try again.');
      setState('idle');
    }, SPEECH_TIMEOUT_MS);

    provider.startRecognition(
      (text: string) => {
        clearSpeechTimeout();
        setTranscript(text);
        setState('processing');
        processTranscriptRef.current(text);
      },
      handleListeningError,
    );
  };

  /* ---- Process transcript through AI ---- */

  processTranscriptRef.current = async (text: string) => {
    try {
      const aiResponse = await onSendMessageRef.current(text);
      setResponse(aiResponse);

      if (!isMutedRef.current && providerRef.current) {
        setState('speaking');
        try {
          await providerRef.current.speak(aiResponse);
        } catch {
          // Speech synthesis failed — still show text response
        }
      }

      if (inConversationRef.current) {
        setState('waiting-for-followup');
        startFollowupListeningRef.current();
      } else {
        setState('idle');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to process request';
      setError(message);
      inConversationRef.current = false;
      setState('idle');
    }
  };

  /* ---- Follow-up listening (after AI response in conversation) ---- */

  startFollowupListeningRef.current = () => {
    const provider = providerRef.current;
    if (!provider) return;

    clearSpeechTimeout();
    timeoutRef.current = setTimeout(() => {
      inConversationRef.current = false;
      provider.stopRecognition();
      setState('idle');
    }, FOLLOWUP_TIMEOUT_MS);

    provider.startRecognition(
      (text: string) => {
        clearSpeechTimeout();
        setTranscript(text);
        setState('processing');
        processTranscriptRef.current(text);
      },
      handleListeningError,
    );
  };

  /* ---- Provider initialization ---- */

  useEffect(() => {
    let disposed = false;

    async function initProvider() {
      try {
        if (elevenlabsVoiceId) {
          setVoiceId(elevenlabsVoiceId);
        }

        const webSpeech = createWebSpeechProvider();
        const elevenlabs = createElevenLabsProvider(availableProviders.includes('elevenlabs'));
        const manager = createProviderManager(providerId, [elevenlabs, webSpeech]);
        const active = manager.getActiveProvider();

        if (!active) {
          if (!disposed) {
            setIsSupported(false);
            setInteractionMode('text');
          }
          return;
        }

        await active.initialize();

        if (!disposed) {
          providerRef.current = active;
          setIsSupported(true);
          setProviderGeneration((g) => g + 1);
        }
      } catch {
        if (!disposed) {
          setIsSupported(false);
          setInteractionMode('text');
        }
      }
    }

    initProvider();

    return () => {
      disposed = true;
      wakeListeningRef.current = false;
      if (providerRef.current) {
        providerRef.current.dispose();
        providerRef.current = null;
      }
    };
  }, [providerId, availableProviders, elevenlabsVoiceId]);

  /* ---- Resume wake word listening when returning to idle ---- */

  useEffect(() => {
    if (state === 'idle' && isSupported && providerRef.current && !inConversationRef.current && wakeWordEnabled) {
      const timer = setTimeout(() => startWakeWordListeningRef.current(), WAKE_INIT_DELAY_MS);
      return () => clearTimeout(timer);
    }
  }, [state, isSupported, wakeWordEnabled, providerGeneration]);

  /* ---- Cleanup on unmount ---- */

  useEffect(() => {
    return () => {
      clearSpeechTimeout();
      if (providerRef.current) {
        providerRef.current.stopRecognition();
        providerRef.current.stopSpeaking();
      }
    };
  }, [clearSpeechTimeout]);

  /* ---- Public API ---- */

  const startListening = useCallback(() => {
    if (stateRef.current !== 'idle' && stateRef.current !== 'waiting-for-followup') return;

    const provider = providerRef.current;
    if (!provider) return;

    if (wakeListeningRef.current) {
      provider.stopRecognition();
      wakeListeningRef.current = false;
    }

    if (stateRef.current === 'waiting-for-followup') {
      inConversationRef.current = true;
    }

    setError(null);
    setTranscript(null);
    setResponse(null);
    setState('listening');
    startActiveListeningRef.current();
  }, []);

  const stopListening = useCallback(() => {
    clearSpeechTimeout();
    const provider = providerRef.current;
    if (provider) {
      provider.stopRecognition();
      provider.stopSpeaking();
    }
    wakeListeningRef.current = false;
    inConversationRef.current = false;
    setState('idle');
  }, [clearSpeechTimeout]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (next && providerRef.current) {
        providerRef.current.stopSpeaking();
      }
      return next;
    });
  }, []);

  return {
    state,
    transcript,
    response,
    error,
    startListening,
    stopListening,
    toggleMute,
    isMuted,
    isSupported,
  };
}
