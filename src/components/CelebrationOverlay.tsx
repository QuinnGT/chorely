'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

interface CelebrationOverlayProps {
  show: boolean;
  themeColor?: string;
  dateKey: string;
  childName?: string;
  bonusTokens?: number;
  totalEarned?: number;
  streakDays?: number;
  onClaimRewards?: () => void;
  onViewDashboard?: () => void;
}

const celebrationPlayedSet = new Set<string>();

export function _resetCelebrationPlayedSet(): void {
  celebrationPlayedSet.clear();
}

const CONFETTI_COLORS = [
  '#58e7fb', '#fbbdff', '#f7a01e', '#fb5151',
  '#006571', '#912da3', '#825000', '#7c3aed',
];

const PARTICLE_COUNT_MIN = 20;
const PARTICLE_COUNT_MAX = 30;
const ANIMATION_DURATION_MIN = 800;
const ANIMATION_DURATION_MAX = 1200;

interface Particle {
  id: number;
  left: string;
  top: string;
  color: string;
  animationDelay: string;
  animationDuration: string;
  rotation: string;
  size: number;
}

interface Toast {
  id: number;
  message: string;
  icon: string;
}

export function CelebrationOverlay({
  show,
  themeColor = 'var(--secondary)',
  dateKey,
  childName = 'Champion',
  bonusTokens = 50,
  totalEarned = 0,
  streakDays = 0,
  onClaimRewards,
  onViewDashboard,
}: CelebrationOverlayProps) {
  const [visible, setVisible] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationEndCountRef = useRef(0);

  const particleCount = useMemo(
    () => PARTICLE_COUNT_MIN + Math.floor(Math.random() * (PARTICLE_COUNT_MAX - PARTICLE_COUNT_MIN + 1)),
    []
  );

  const particles: Particle[] = useMemo(
    () =>
      Array.from({ length: particleCount }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 40}%`,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        animationDelay: `${Math.random() * 400}ms`,
        animationDuration: `${ANIMATION_DURATION_MIN + Math.random() * (ANIMATION_DURATION_MAX - ANIMATION_DURATION_MIN)}ms`,
        rotation: `${Math.floor(Math.random() * 720 - 360)}deg`,
        size: 6 + Math.floor(Math.random() * 6),
      })),
    [particleCount]
  );

  useEffect(() => {
    if (show && !celebrationPlayedSet.has(dateKey)) {
      celebrationPlayedSet.add(dateKey);
      setVisible(true);
      animationEndCountRef.current = 0;

      dismissTimerRef.current = setTimeout(() => {
        setVisible(false);
      }, 4000);
    }

    return () => {
      if (dismissTimerRef.current !== null) {
        clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
    };
  }, [show, dateKey]);

  useEffect(() => {
    if (visible && totalEarned > 0) {
      const timer = setTimeout(() => {
        setToasts([
          { id: 1, message: 'Daily bonus earned!', icon: 'stars' },
          { id: 2, message: 'Keep the streak going!', icon: 'trending_up' },
        ]);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [visible, totalEarned]);

  const handleAnimationEnd = () => {
    animationEndCountRef.current += 1;
  };

  if (!visible) {
    return null;
  }

  return (
    <div
      data-testid="celebration-overlay"
      onAnimationEnd={handleAnimationEnd}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-8 text-center overflow-hidden"
      style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {particles.map((p) => (
          <div
            key={p.id}
            data-testid="confetti-particle"
            className="animate-confetti-particle"
            style={{
              position: 'absolute',
              left: p.left,
              top: p.top,
              width: `${p.size}px`,
              height: `${p.size}px`,
              backgroundColor: p.color,
              borderRadius: '4px',
              animationDelay: p.animationDelay,
              animationDuration: p.animationDuration,
              ['--confetti-rotation' as string]: p.rotation,
            }}
          />
        ))}
      </div>

      <nav className="fixed top-0 w-full z-10 flex justify-center items-center px-6 py-4">
        <span className="text-2xl font-black bg-gradient-to-br from-cyan-600 to-cyan-400 bg-clip-text text-transparent font-headline">
          Family Share
        </span>
      </nav>

      <div className="relative max-w-lg w-full flex flex-col items-center">
        <div className="absolute -top-12 -left-4 w-24 h-24 bg-primary-container/30 blur-3xl rounded-full" />
        <div className="absolute top-0 -right-8 w-32 h-32 bg-secondary-container/40 blur-3xl rounded-full" />

        <div className="relative mb-8 group transition-transform duration-500 animate-bounce-in">
          <div
            className="absolute inset-0 bg-tertiary-container blur-3xl opacity-30 animate-pulse rounded-full"
            style={{ animationDuration: '2s' }}
          />
          <div
            className="relative w-48 h-48 bg-celebration-gradient rounded-full shadow-[0_12px_40px_rgba(145,45,163,0.3)] flex items-center justify-center border-8 border-white/40"
            style={{ boxShadow: '0 12px 40px rgba(145,45,163,0.3), inset 0 0 0 1px rgba(145,45,163,0.2)' }}
          >
            <span
              className="material-symbols-outlined text-white text-8xl"
              style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
            >
              trophy
            </span>
          </div>
          <div
            className="absolute -bottom-2 -right-4 bg-primary-fixed text-primary-dim w-14 h-14 rounded-full flex items-center justify-center shadow-lg rotate-12 border-4 border-white animate-float"
            style={{ animationDelay: '0.5s' }}
          >
            <span
              className="material-symbols-outlined text-3xl"
              style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
            >
              star
            </span>
          </div>
          <div
            className="absolute -top-2 -left-4 bg-tertiary-fixed text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg -rotate-12 border-4 border-white animate-float"
            style={{ animationDelay: '1s' }}
          >
            <span
              className="material-symbols-outlined text-2xl"
              style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
            >
              thumb_up
            </span>
          </div>
        </div>

        <h1 className="font-headline font-black text-4xl md:text-5xl text-on-surface leading-tight mb-4 tracking-tight">
          All Chores<br />Complete!
        </h1>
        <p className="font-body text-xl text-on-surface-variant font-medium mb-10 max-w-xs">
          Awesome job, {childName}! You earned{' '}
          <span className="text-secondary font-bold">+{bonusTokens} bonus tokens</span> today.
        </p>

        <div
          className="bg-surface-container-lowest/80 border border-white/50 shadow-[0_8px_30px_rgba(0,0,0,0.04)] rounded-xl p-6 w-full mb-12 flex justify-between items-center"
          style={{ backdropFilter: 'blur(10px)' }}
        >
          <div className="text-left">
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">
              Total Earned
            </p>
            <div className="flex items-center gap-2">
              <span
                className="material-symbols-outlined text-tertiary-container"
                style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
              >
                monetization_on
              </span>
              <p className="font-headline font-extrabold text-2xl">{totalEarned.toLocaleString()}</p>
            </div>
          </div>
          <div className="h-10 w-px bg-outline-variant/20" />
          <div className="text-right">
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">
              Streak
            </p>
            <div className="flex items-center gap-2 justify-end">
              <span
                className="material-symbols-outlined text-error-container"
                style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
              >
                local_fire_department
              </span>
              <p className="font-headline font-extrabold text-2xl">{streakDays} Days</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 w-full">
          <button
            onClick={onClaimRewards}
            className="bg-action-gradient text-white font-headline font-extrabold text-xl h-16 rounded-full shadow-lg hover:scale-95 transition-transform active:scale-90 flex items-center justify-center gap-3"
            style={{ minHeight: '60px' }}
          >
            Claim Rewards
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
            >
              redeem
            </span>
          </button>
          <button
            onClick={onViewDashboard}
            className="bg-surface-container-high text-on-surface-variant font-headline font-bold text-lg h-16 rounded-full hover:bg-surface-container-highest transition-colors active:scale-95"
            style={{ minHeight: '60px' }}
          >
            View My Dashboard
          </button>
        </div>
      </div>

      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-white/40 px-6 py-3 rounded-full border border-white/60">
        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
          <span
            className="material-symbols-outlined text-sm text-white"
            style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
          >
            rocket_launch
          </span>
        </div>
        <p className="text-sm font-bold text-on-surface">You're unlocking "Mars Explorer" next!</p>
      </div>

      <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="animate-slide-fade-in bg-surface-container-lowest shadow-lg rounded-xl px-5 py-3 flex items-center gap-3 border border-outline-variant/20"
          >
            <span
              className="material-symbols-outlined text-secondary"
              style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
            >
              {toast.icon}
            </span>
            <span className="font-body font-medium text-on-surface">{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
