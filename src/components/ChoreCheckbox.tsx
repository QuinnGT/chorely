'use client';

import { useState, useCallback } from 'react';
import { CoinAnimation } from './CoinAnimation';

interface ChoreCheckboxProps {
  assignmentId: string;
  date: string;
  completed: boolean;
  disabled: boolean;
  onToggle: (assignmentId: string, date: string, newState: boolean) => void;
  dayLabel?: string;
  isToday?: boolean;
}

export function ChoreCheckbox({
  assignmentId,
  date,
  completed,
  disabled,
  onToggle,
  dayLabel,
  isToday = false,
}: ChoreCheckboxProps) {
  const [showPop, setShowPop] = useState(false);
  const [showCoin, setShowCoin] = useState(false);

  const handleClick = useCallback(() => {
    if (disabled) return;

    if (!completed) {
      setShowPop(true);
      setShowCoin(true);
      setTimeout(() => setShowPop(false), 300);
    }

    onToggle(assignmentId, date, !completed);
  }, [disabled, completed, onToggle, assignmentId, date]);

  const handleCoinComplete = useCallback(() => {
    setShowCoin(false);
  }, []);

  return (
    <div
      role="checkbox"
      aria-checked={completed}
      aria-disabled={disabled}
      data-testid="chore-checkbox"
      tabIndex={disabled ? -1 : 0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          handleClick();
        }
      }}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '40px',
        height: '40px',
        minWidth: '40px',
        minHeight: '40px',
        borderRadius: '50%',
        border: completed ? 'none' : isToday 
          ? '2px solid var(--primary)' 
          : '2px solid var(--surface-container-high)',
        backgroundColor: completed ? 'var(--primary)' : 'transparent',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: `transform 300ms var(--spring-ease), background-color 200ms ease, border-color 200ms ease, opacity 200ms ease`,
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        boxShadow: isToday && !completed ? `0 0 0 3px var(--kid-primary-alpha)` : 'none',
      }}
      className={showPop ? 'animate-pop' : ''}
    >
      {completed ? (
        <span
          className="material-symbols-outlined"
          style={{
            color: '#ffffff',
            fontSize: '18px',
            fontWeight: 700,
            lineHeight: 1,
            pointerEvents: 'none',
            fontVariationSettings: '"FILL" 1',
          }}
          aria-hidden="true"
        >
          check
        </span>
      ) : dayLabel ? (
        <span
          style={{
            color: isToday ? 'var(--primary)' : 'var(--on-surface-variant)',
            fontSize: '12px',
            fontWeight: 700,
            lineHeight: 1,
            pointerEvents: 'none',
            fontFamily: 'var(--font-headline)',
          }}
        >
          {dayLabel}
        </span>
      ) : null}
      <CoinAnimation active={showCoin} onComplete={handleCoinComplete} />
    </div>
  );
}
