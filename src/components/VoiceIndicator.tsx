'use client';

import type { VoiceState } from '@/hooks/useVoiceSession';

interface VoiceIndicatorProps {
  state: VoiceState;
  size?: number;
  showEmoji?: boolean;
  emoji?: string;
}

export function VoiceIndicator({ state, size = 48, showEmoji = false, emoji = '🎉' }: VoiceIndicatorProps) {
  const isListening = state === 'listening';
  const isProcessing = state === 'processing';
  const isSpeaking = state === 'speaking';
  const isWaiting = state === 'waiting-for-followup';

  if (showEmoji && isSpeaking) {
    return (
      <div
        className="flex items-center justify-center animate-pop"
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        <span className="text-3xl" style={{ lineHeight: 1 }}>{emoji}</span>
      </div>
    );
  }

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {isListening && (
        <>
          <span
            className="animate-voice-pulse absolute inset-0 rounded-full"
            style={{ backgroundColor: 'var(--kid-primary)', opacity: 0.3 }}
          />
          <span
            className="animate-voice-pulse absolute inset-0 rounded-full"
            style={{
              backgroundColor: 'var(--kid-primary)',
              opacity: 0.2,
              animationDelay: '0.4s',
            }}
          />
        </>
      )}

      {isProcessing && (
        <span
          className="animate-voice-spin absolute inset-0 rounded-full"
          style={{
            border: '3px solid var(--kid-primary-alpha)',
            borderTopColor: 'var(--kid-primary)',
          }}
        />
      )}

      {isWaiting && (
        <span
          className="absolute inset-0 flex items-center justify-center"
        >
          <span
            className="inline-block rounded-full animate-waveform"
            style={{
              width: '5px',
              height: '12px',
              backgroundColor: 'var(--kid-primary)',
              animationDelay: '0s',
            }}
          />
          <span
            className="inline-block rounded-full animate-waveform mx-1"
            style={{
              width: '5px',
              height: '20px',
              backgroundColor: 'var(--kid-primary)',
              animationDelay: '0.15s',
            }}
          />
          <span
            className="inline-block rounded-full animate-waveform"
            style={{
              width: '5px',
              height: '12px',
              backgroundColor: 'var(--kid-primary)',
              animationDelay: '0.3s',
            }}
          />
        </span>
      )}

      <svg
        width={size * 0.5}
        height={size * 0.5}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          color: isSpeaking ? 'var(--kid-primary-dark)' : 'var(--kid-primary)',
          transition: 'color 200ms ease',
        }}
        className={isListening || isWaiting ? 'opacity-50' : 'opacity-100'}
      >
        <path
          d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z"
          fill="currentColor"
        />
        <path
          d="M19 10v2a7 7 0 0 1-14 0v-2"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line
          x1="12"
          y1="19"
          x2="12"
          y2="23"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <line
          x1="8"
          y1="23"
          x2="16"
          y2="23"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
