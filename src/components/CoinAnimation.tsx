'use client';

import { useEffect, useRef, useState } from 'react';

interface CoinAnimationProps {
  active: boolean;
  onComplete: () => void;
  amount?: number;
}

const MAX_DURATION_MS = 800;

export function CoinAnimation({ active, onComplete, amount = 0 }: CoinAnimationProps) {
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const hasFiredRef = useRef(false);

  useEffect(() => {
    if (!active) {
      hasFiredRef.current = false;
      return;
    }

    hasFiredRef.current = false;

    const timer = setTimeout(() => {
      if (!hasFiredRef.current) {
        hasFiredRef.current = true;
        onCompleteRef.current();
      }
    }, MAX_DURATION_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [active]);

  if (!active) return null;

  const handleAnimationEnd = () => {
    if (!hasFiredRef.current) {
      hasFiredRef.current = true;
      onCompleteRef.current();
    }
  };

  return (
    <div
      data-testid="coin-animation"
      className="animate-coin-rise"
      onAnimationEnd={handleAnimationEnd}
      style={{
        position: 'absolute',
        top: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
      }}
      aria-hidden="true"
    >
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="material-symbols-outlined text-tertiary-container"
            style={{
              fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24",
              fontSize: '28px',
              animationDelay: `${i * 80}ms`,
            }}
          >
            monetization_on
          </span>
        ))}
      </div>
      {amount > 0 && (
        <span
          className="font-headline font-extrabold text-lg"
          style={{ color: 'var(--tertiary)' }}
        >
          +${amount}
        </span>
      )}
    </div>
  );
}
