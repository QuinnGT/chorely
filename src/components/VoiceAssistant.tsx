'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { parseJsonEventStream, readUIMessageStream, uiMessageChunkSchema, type UIMessage } from 'ai';
import { useVoiceSession, getInteractionMode } from '@/hooks/useVoiceSession';
import { formatDate } from '@/lib/date-utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface VoiceSettings {
  wakePhrase: string;
  speechOutputEnabled: boolean;
  wakeWordEnabled: boolean;
  providerId: string;
  availableProviders: string[];
  elevenlabsVoiceId: string;
}

interface KidChore {
  id: string;
  name: string;
  assignmentId: string;
  frequency: 'daily' | 'weekly';
  completedToday: boolean;
}

interface VoiceAssistantProps {
  kidId: string;
  kidName: string;
  assignedChores: KidChore[];
  voiceSettings: VoiceSettings;
  onChoreCompleted?: () => void;
  onSavingsGoalAdded?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Emoji Toast Component                                              */
/* ------------------------------------------------------------------ */

interface EmojiToastProps {
  emoji: string;
  message: string;
  visible: boolean;
  onDismiss: () => void;
}

function EmojiToast({ emoji, message, visible, onDismiss }: EmojiToastProps) {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onDismiss, 3000);
      return () => clearTimeout(timer);
    }
  }, [visible, onDismiss]);

  if (!visible) return null;

  return (
    <div
      className="fixed top-24 left-1/2 -translate-x-1/2 z-50 animate-bounce-in"
      role="status"
      aria-live="polite"
    >
      <div
        className="glass-card flex items-center gap-3 px-5 py-3"
        style={{
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <span className="text-3xl" style={{ lineHeight: 1 }}>{emoji}</span>
        <span className="text-base font-semibold text-[var(--on-surface)] whitespace-nowrap">
          {message}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Waveform Visualization Component                                  */
/* ------------------------------------------------------------------ */

interface WaveformProps {
  barCount?: number;
  active?: boolean;
}

function Waveform({ barCount = 5, active = true }: WaveformProps) {
  return (
    <div className="flex items-center justify-center gap-1" aria-hidden="true">
      {Array.from({ length: barCount }).map((_, i) => (
        <span
          key={i}
          className="inline-block rounded-full"
          style={{
            width: '5px',
            height: '8px',
            backgroundColor: 'var(--primary)',
            animation: active ? `waveform ${0.4 + i * 0.08}s ease-in-out infinite` : 'none',
            animationDelay: `${i * 0.1}s`,
            transform: 'scaleY(1)',
          }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Listening Bubble Component                                         */
/* ------------------------------------------------------------------ */

interface ListeningBubbleProps {
  visible: boolean;
}

function ListeningBubble({ visible }: ListeningBubbleProps) {
  if (!visible) return null;

  return (
    <div
      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 animate-bounce-in"
      style={{ minWidth: '160px' }}
    >
      <div
        className="glass-card flex flex-col items-center gap-2 px-4 py-3"
        style={{
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <Waveform barCount={5} active={true} />
        <span className="text-sm font-medium text-[var(--primary)] whitespace-nowrap">
          Listening...
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Floating Mic Button Component                                      */
/* ------------------------------------------------------------------ */

interface FloatingMicButtonProps {
  state: 'idle' | 'listening' | 'processing' | 'speaking' | 'waiting-for-followup';
  onPress: () => void;
  showListeningBubble: boolean;
}

function FloatingMicButton({ state, onPress, showListeningBubble }: FloatingMicButtonProps) {
  const isListening = state === 'listening';
  const isProcessing = state === 'processing';
  const isSpeaking = state === 'speaking';
  const isWaiting = state === 'waiting-for-followup';

  return (
    <div className="fixed bottom-24 right-6 md:bottom-10 md:right-10 z-[60]">
      <ListeningBubble visible={showListeningBubble} />
      
      <button
        type="button"
        onClick={onPress}
        disabled={isProcessing || isSpeaking}
        className={`
          relative w-20 h-20 rounded-full
          bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dim)]
          text-white shadow-[0_12px_40px_rgba(0,101,113,0.3)]
          flex items-center justify-center
          transition-transform duration-150
          active:scale-90
          disabled:cursor-not-allowed
          ${isListening ? 'animate-pulse' : ''}
        `}
        style={{
          transform: isProcessing || isSpeaking ? 'scale(0.95)' : undefined,
        }}
        aria-label={
          isListening
            ? 'Listening...'
            : isProcessing
              ? 'Processing...'
              : isSpeaking
                ? 'Speaking...'
                : 'Tap to speak'
        }
      >
        {isProcessing ? (
          <span className="absolute inset-0 rounded-full border-4 border-white/30 border-t-white animate-spin" />
        ) : (
          <>
            <span className="absolute inset-0 rounded-full animate-ping opacity-20 bg-[var(--primary)]" />
            <span
              className="material-symbols-outlined text-4xl relative z-10"
              style={{ fontVariationSettings: '"FILL" 1' }}
            >
              {isListening ? 'graphic_eq' : isWaiting ? 'hearing' : 'mic'}
            </span>
          </>
        )}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  VoiceAssistant Component                                           */
/* ------------------------------------------------------------------ */

export function VoiceAssistant({
  kidId,
  kidName,
  assignedChores,
  voiceSettings,
  onChoreCompleted,
  onSavingsGoalAdded,
}: VoiceAssistantProps) {
  const [mode] = useState<'voice' | 'text'>(() => getInteractionMode());
  const [showListeningBubble, setShowListeningBubble] = useState(false);
  const [emojiToast, setEmojiToast] = useState<{ visible: boolean; emoji: string; message: string }>({
    visible: false,
    emoji: '',
    message: '',
  });
  const lastToolCallsRef = useRef<string[]>([]);

  /* ---- Message handler (AI with tool calling) ---- */

  const handleSendMessage = useCallback(
    async (text: string): Promise<string> => {
      try {
        const choreStatus = assignedChores.map((c) => ({
          name: c.name,
          completed: c.completedToday,
          frequency: c.frequency,
        }));

        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: text }],
            kidId,
            kidContext: {
              kidName,
              currentDate: formatDate(new Date()),
              choreStatus,
              allowanceBalance: { base: 0, bonus: 0, total: 0 },
              streakDays: 0,
              savingsGoals: [],
              spendingCategories: [],
              achievements: [],
            },
          }),
        });
        if (!res.ok) return 'Oops! Something went wrong. Let\'s try again!';
        if (!res.body) return 'Oops! Something went wrong. Let\'s try again!';

        // Parse the UI Message Stream using the AI SDK's own utilities
        // (same approach as DefaultChatTransport)
        const chunkStream = parseJsonEventStream({
          stream: res.body,
          schema: uiMessageChunkSchema,
        }).pipeThrough(
          new TransformStream({
            transform(chunk, controller) {
              if (chunk.success) {
                controller.enqueue(chunk.value);
              }
            },
          }),
        );

        let fullText = '';
        const toolsCalled: string[] = [];
        let lastMessage: UIMessage | undefined;

        for await (const message of readUIMessageStream({ stream: chunkStream })) {
          lastMessage = message;
        }

        if (lastMessage) {
          for (const part of lastMessage.parts) {
            if (part.type === 'text') {
              fullText += part.text;
            } else if (part.type.startsWith('tool-')) {
              // Tool parts have type 'tool-<toolName>' (e.g. 'tool-completeChore')
              const toolName = part.type.slice(5);
              if (toolName && !toolsCalled.includes(toolName)) {
                toolsCalled.push(toolName);
              }
            }
          }
        }

        lastToolCallsRef.current = toolsCalled;

        const trimmed = fullText.trim();
        if (!trimmed) {
          return 'Hmm, I didn\'t get that. Can you try again?';
        }

        // Only fire callbacks when the AI actually used the relevant tools
        if (toolsCalled.includes('completeChore')) {
          onChoreCompleted?.();
        }
        if (toolsCalled.includes('addSavingsGoal')) {
          onSavingsGoalAdded?.();
        }

        return trimmed;
      } catch {
        return 'Oops! Something went wrong. Let\'s try again!';
      }
    },
    [kidId, kidName, assignedChores, onChoreCompleted, onSavingsGoalAdded],
  );

  /* ---- Voice session ---- */

  const voice = useVoiceSession({
    wakePhrase: voiceSettings.wakePhrase,
    wakeWordEnabled: voiceSettings.wakeWordEnabled,
    providerId: voiceSettings.providerId,
    availableProviders: voiceSettings.availableProviders,
    elevenlabsVoiceId: voiceSettings.elevenlabsVoiceId,
    onSendMessage: handleSendMessage,
  });

  /* ---- Handle state changes for bubble and emoji toast ---- */

  useEffect(() => {
    if (voice.state === 'listening') {
      setShowListeningBubble(true);
    } else {
      setShowListeningBubble(false);
    }
  }, [voice.state]);

  useEffect(() => {
    if (voice.response) {
      const tools = lastToolCallsRef.current;

      if (tools.includes('completeChore')) {
        setEmojiToast({ visible: true, emoji: '🎉', message: 'Chore marked complete!' });
      } else if (tools.includes('addSavingsGoal')) {
        setEmojiToast({ visible: true, emoji: '💰', message: 'Savings goal created!' });
      }
      // No toast for informational responses — avoid false positives
    }
  }, [voice.response]);

  /* ---- Tap to speak ---- */

  const handleTapToSpeak = useCallback(() => {
    if (voice.state === 'idle' || voice.state === 'waiting-for-followup') {
      voice.startListening();
    }
  }, [voice]);

  /* ---- Determine effective mode ---- */

  const effectiveMode = voice.isSupported ? mode : 'text';

  /* ---- Render: text-only fallback ---- */

  if (effectiveMode === 'text') {
    return (
      <button
        type="button"
        onClick={handleTapToSpeak}
        className="fixed bottom-24 right-6 md:bottom-10 md:right-10 z-[60] w-20 h-20 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dim)] text-white shadow-[0_12px_40px_rgba(0,101,113,0.3)] flex items-center justify-center transition-transform active:scale-90"
        aria-label="Tap to speak"
      >
        <span
          className="material-symbols-outlined text-4xl"
          style={{ fontVariationSettings: '"FILL" 1' }}
        >
          mic
        </span>
      </button>
    );
  }

  /* ---- Render: voice mode ---- */

  return (
    <>
      <FloatingMicButton
        state={voice.state}
        onPress={handleTapToSpeak}
        showListeningBubble={showListeningBubble}
      />

      <EmojiToast
        visible={emojiToast.visible}
        emoji={emojiToast.emoji}
        message={emojiToast.message}
        onDismiss={() => setEmojiToast((prev) => ({ ...prev, visible: false }))}
      />
    </>
  );
}
