'use client';

import { useEffect, useRef, useState } from 'react';

interface StreakFlameProps {
  streakDays: number;
  size?: 'small' | 'medium' | 'large';
  showTooltip?: boolean;
}

type AnimationState = 'idle' | 'pop' | 'fade-out' | 'hidden';

const SIZE_MAP = {
  small: { icon: 20, text: 14, padding: '4px 8px' },
  medium: { icon: 28, text: 18, padding: '6px 12px' },
  large: { icon: 36, text: 24, padding: '8px 16px' },
};

export function StreakFlame({
  streakDays,
  size = 'medium',
  showTooltip = true,
}: StreakFlameProps) {
  const prevStreakRef = useRef(streakDays);
  const [animState, setAnimState] = useState<AnimationState>(
    streakDays === 0 ? 'hidden' : 'idle'
  );
  const [showLabel, setShowLabel] = useState(false);

  useEffect(() => {
    const prev = prevStreakRef.current;
    prevStreakRef.current = streakDays;

    if (streakDays === prev) return;

    if (streakDays === 0) {
      setAnimState('fade-out');
      const timer = setTimeout(() => {
        setAnimState('hidden');
      }, 300);
      return () => clearTimeout(timer);
    }

    if (prev === 0) {
      setAnimState('pop');
      const timer = setTimeout(() => {
        setAnimState('idle');
      }, 300);
      return () => clearTimeout(timer);
    }

    if (streakDays > prev) {
      setAnimState('pop');
      const timer = setTimeout(() => {
        setAnimState('idle');
      }, 300);
      return () => clearTimeout(timer);
    }

    setAnimState('idle');
  }, [streakDays]);

  if (animState === 'hidden' && streakDays === 0) {
    return null;
  }

  const isHighStreak = streakDays >= 7;
  const sizeConfig = SIZE_MAP[size];
  const iconSize = isHighStreak ? sizeConfig.icon * 1.2 : sizeConfig.icon;

  const animationClass =
    animState === 'pop'
      ? 'animate-pop'
      : animState === 'fade-out'
        ? 'animate-fade-out'
        : isHighStreak
          ? 'animate-streak-flame'
          : '';

  return (
    <div className="relative inline-flex items-center">
      <span
        data-testid="streak-flame"
        className={`inline-flex items-center gap-1.5 rounded-full transition-all duration-200 ${animationClass || ''}`}
        style={{
          background: isHighStreak ? 'rgba(251, 81, 81, 0.15)' : 'rgba(130, 80, 0, 0.1)',
          padding: sizeConfig.padding,
        }}
        onMouseEnter={() => showTooltip && setShowLabel(true)}
        onMouseLeave={() => showTooltip && setShowLabel(false)}
        onFocus={() => showTooltip && setShowLabel(true)}
        onBlur={() => showTooltip && setShowLabel(false)}
      >
        <span
          className="material-symbols-outlined animate-streak-flame"
          style={{
            fontSize: `${iconSize}px`,
            color: isHighStreak ? 'var(--error-container)' : 'var(--tertiary)',
            fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24",
            filter: isHighStreak
              ? 'drop-shadow(0 0 8px var(--error-container))'
              : 'drop-shadow(0 0 4px var(--tertiary-container))',
          }}
        >
          local_fire_department
        </span>
        <span
          data-testid="streak-count"
          className="font-headline font-bold"
          style={{
            fontSize: `${sizeConfig.text}px`,
            color: isHighStreak ? 'var(--error)' : 'var(--tertiary)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {streakDays}
        </span>
      </span>

      {showLabel && (
        <span
          className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap animate-bounce-in z-50"
          style={{
            background: 'var(--inverse-surface)',
            color: 'var(--inverse-on-surface)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          {streakDays} day streak!
        </span>
      )}
    </div>
  );
}