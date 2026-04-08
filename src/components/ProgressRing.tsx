'use client';

import { useId, useMemo } from 'react';

interface ProgressRingProps {
  completionRate: number;
  projectedAmount: number;
  size?: number;
  strokeWidth?: number;
  showPercentage?: boolean;
  label?: string;
}

const DEFAULT_SIZE = 224;
const DEFAULT_STROKE_WIDTH = 8;
const MIN_SIZE = 120;

export function ProgressRing({
  completionRate,
  projectedAmount,
  size = DEFAULT_SIZE,
  strokeWidth = DEFAULT_STROKE_WIDTH,
  showPercentage = true,
  label,
}: ProgressRingProps) {
  const uniqueId = useId();
  const gradientId = `${uniqueId}-progress-gradient`;
  const diameter = Math.max(size, MIN_SIZE);
  const radius = (diameter - strokeWidth) / 2;
  const center = diameter / 2;

  const circumference = useMemo(() => 2 * Math.PI * radius, [radius]);

  const clampedRate = Math.min(1, Math.max(0, completionRate));
  const offset = circumference * (1 - clampedRate);
  const percentage = Math.round(clampedRate * 100);

  const isComplete = clampedRate === 1;
  const isNearComplete = clampedRate >= 0.8;

  return (
    <div
      data-testid="progress-ring"
      className="relative inline-flex items-center justify-center"
      style={{
        width: diameter,
        height: diameter,
      }}
    >
      <svg
        width={diameter}
        height={diameter}
        viewBox={`0 0 ${diameter} ${diameter}`}
        style={{ transform: 'rotate(-90deg)' }}
      >
        <defs>
          <linearGradient
            id={gradientId}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="var(--primary)" />
            <stop offset="100%" stopColor="var(--primary-container)" />
          </linearGradient>
        </defs>

        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--surface-container-high)"
          strokeWidth={strokeWidth}
        />

        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={isComplete ? 'var(--tertiary-container)' : `url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 600ms var(--spring-ease)',
            filter: isComplete ? 'drop-shadow(0 0 6px var(--tertiary-container))' : undefined,
          }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {showPercentage && (
          <>
            <span
              className={`font-headline font-black text-on-surface ${isComplete ? 'animate-pulse' : ''}`}
              style={{
                fontSize: diameter * 0.2,
                lineHeight: 1,
                color: isComplete ? 'var(--tertiary)' : 'var(--on-surface)',
              }}
            >
              {percentage}%
            </span>
            {!isComplete && (
              <span
                className="text-xs font-bold uppercase tracking-widest mt-1"
                style={{ color: 'var(--on-surface-variant)' }}
              >
                Done
              </span>
            )}
            {isComplete && (
              <span
                className="text-xs font-bold uppercase tracking-widest mt-1"
                style={{ color: 'var(--tertiary)' }}
              >
                Complete!
              </span>
            )}
          </>
        )}

        {!showPercentage && (
          <span
            className="font-headline font-black"
            style={{
              fontSize: diameter * 0.18,
              color: 'var(--on-surface)',
            }}
          >
            ${projectedAmount.toFixed(2)}
          </span>
        )}
      </div>

      {label && (
        <span
          className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-sm font-bold whitespace-nowrap"
          style={{ color: 'var(--on-surface-variant)' }}
        >
          {label}
        </span>
      )}

      {isNearComplete && !isComplete && (
        <span
          className="absolute -top-2 -right-2 w-8 h-8 flex items-center justify-center rounded-full animate-bounce-in"
          style={{ background: 'var(--tertiary-container)' }}
        >
          <span
            className="material-symbols-outlined text-sm"
            style={{
              color: 'var(--on-tertiary-container)',
              fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24",
            }}
          >
            trending_up
          </span>
        </span>
      )}
    </div>
  );
}