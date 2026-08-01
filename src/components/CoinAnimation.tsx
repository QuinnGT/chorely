'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';

interface CoinAnimationProps {
  active: boolean;
  onComplete: () => void;
  amount?: number;
  anchorRef?: RefObject<HTMLElement | null>;
}

interface CoinPosition {
  left: number;
  top: number;
}

const MAX_DURATION_MS = 800;

export function CoinAnimation({ active, onComplete, amount = 0, anchorRef }: CoinAnimationProps) {
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const hasFiredRef = useRef(false);
  const [position, setPosition] = useState<CoinPosition | null>(null);

  useEffect(() => {
    if (!active || !anchorRef?.current) {
      setPosition(null);
      return;
    }

    const rect = anchorRef.current.getBoundingClientRect();
    setPosition({
      left: rect.left + rect.width / 2,
      top: rect.top + 4,
    });
  }, [active, anchorRef]);

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

  const animation = (
    <div
      data-testid="coin-animation"
      className="animate-coin-rise"
      onAnimationEnd={handleAnimationEnd}
      style={{
        position: position ? 'relative' : 'absolute',
        top: 0,
        left: position ? undefined : '50%',
        transform: position ? undefined : 'translateX(-50%)',
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

  if (anchorRef && !position) return null;

  if (position && typeof document !== 'undefined') {
    return createPortal(
      <div
        data-testid="coin-animation-layer"
        style={{
          position: 'fixed',
          top: position.top,
          left: position.left,
          zIndex: 100,
          transform: 'translateX(-50%)',
          pointerEvents: 'none',
        }}
      >
        {animation}
      </div>,
      document.body,
    );
  }

  return animation;
}
