'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';

interface PinEntryProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const PIN_LENGTH = 4;
const KEYPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'] as const;

export function PinEntry({ onSuccess, onCancel }: PinEntryProps) {
  const [digits, setDigits] = useState<string[]>([]);
  const [shaking, setShaking] = useState(false);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const { status, verify, error } = useAdminAuth();

  // Handle auth status changes
  useEffect(() => {
    if (status === 'authenticated') {
      onSuccess();
    }

    if (status === 'error' && error) {
      // Distinguish network errors from wrong PIN
      if (
        error.toLowerCase().includes('connect') ||
        error.toLowerCase().includes('network') ||
        error.toLowerCase().includes('fetch')
      ) {
        setNetworkError("Can't connect. Check your network.");
      } else {
        // Wrong PIN — shake and clear
        setShaking(true);
        setTimeout(() => {
          setShaking(false);
          setDigits([]);
        }, 400);
      }
    }
  }, [status, error, onSuccess]);

  const handleKeyPress = useCallback(
    (key: string) => {
      if (status === 'verifying') return;

      setNetworkError(null);

      if (key === '⌫') {
        setDigits((prev) => prev.slice(0, -1));
        return;
      }

      if (key === '') return;

      setDigits((prev) => {
        if (prev.length >= PIN_LENGTH) return prev;
        const next = [...prev, key];

        // Auto-submit on 4th digit
        if (next.length === PIN_LENGTH) {
          verify(next.join(''));
        }

        return next;
      });
    },
    [status, verify]
  );

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Lock Icon & Title */}
      <div className="flex flex-col items-center gap-3 mb-2">
        <div className="w-16 h-16 rounded-full bg-celebration-gradient flex items-center justify-center shadow-glow-secondary">
          <span className="material-symbols-outlined text-3xl text-white" style={{ fontVariationSettings: "'FILL' 1" }}>
            lock
          </span>
        </div>
        <h2 className="font-headline text-2xl font-black text-on-surface">Parent Access</h2>
        <p className="font-body text-sm text-on-surface-variant">Enter your 4-digit PIN to unlock</p>
      </div>

      {/* Dot indicators */}
      <div
        className={`flex gap-4 ${shaking ? 'animate-shake' : ''}`}
        role="status"
        aria-label={`${digits.length} of ${PIN_LENGTH} digits entered`}
      >
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <div
            key={i}
            className="h-5 w-5 rounded-full border-2"
            style={{
              borderColor: i < digits.length ? 'var(--primary)' : 'var(--outline-variant)',
              backgroundColor: i < digits.length ? 'var(--primary)' : 'var(--surface-container-highest)',
              boxShadow: i < digits.length ? '0 0 15px rgba(0,101,113,0.3)' : 'none',
            }}
            aria-hidden="true"
          />
        ))}
      </div>

      {/* Network error message */}
      {networkError && (
        <p
          className="text-sm"
          style={{ color: 'var(--error)' }}
          role="alert"
        >
          {networkError}
        </p>
      )}

      {/* Numeric keypad */}
      <div
        className="grid grid-cols-3"
        style={{ gap: '16px', width: '100%' }}
      >
        {KEYPAD_KEYS.map((key, index) => {
          if (key === '') {
            return <div key={index} />;
          }

          return (
            <button
              key={index}
              type="button"
              onClick={() => handleKeyPress(key)}
              disabled={status === 'verifying'}
              className="flex items-center justify-center rounded-full font-headline text-2xl font-bold transition-colors disabled:opacity-50"
              style={{
                height: '64px',
                background: 'var(--surface-container-low)',
                color: 'var(--on-surface)',
              }}
              aria-label={key === '⌫' ? 'Backspace' : `Digit ${key}`}
            >
              {key === '⌫' ? (
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '24px' }}
                >
                  backspace
                </span>
              ) : key}
            </button>
          );
        })}
      </div>

      {/* Bottom actions */}
      <div className="flex w-full items-center justify-between px-2 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full px-6 py-3 font-semibold transition-colors"
          style={{ color: 'var(--on-surface-variant)' }}
        >
          Cancel
        </button>
        <div
          className="flex h-14 w-14 items-center justify-center rounded-full shadow-lg"
          style={{
            background: 'linear-gradient(135deg, var(--primary), var(--primary-container))',
            color: 'white',
            boxShadow: '0 8px 20px rgba(0,101,113,0.3)',
          }}
        >
          <span
            className="material-symbols-outlined text-2xl font-bold"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            arrow_forward
          </span>
        </div>
      </div>

      {/* Forgot PIN link */}
      <button
        type="button"
        className="mt-4 text-xs font-medium underline decoration-current underline-offset-4 transition-colors"
        style={{ color: 'var(--on-surface-variant)' }}
      >
        Forgot parent PIN?
      </button>
    </div>
  );
}
