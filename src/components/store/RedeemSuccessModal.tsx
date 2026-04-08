'use client';

import { useMemo } from 'react';

interface StoreItem {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  price: number;
  category: string;
  stock: number;
  active: boolean;
}

interface RedeemSuccessModalProps {
  isOpen: boolean;
  item: StoreItem;
  onDismiss: () => void;
}

const CONFETTI_COLORS = [
  '#58e7fb', '#fbbdff', '#f7a01e', '#fb5151',
  '#006571', '#912da3', '#825000', '#7c3aed',
];

const PARTICLE_COUNT = 40;

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

export function RedeemSuccessModal({
  isOpen,
  item,
  onDismiss,
}: RedeemSuccessModalProps) {
  const particles: Particle[] = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 40}%`,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        animationDelay: `${Math.random() * 600}ms`,
        animationDuration: `${800 + Math.random() * 800}ms`,
        rotation: `${Math.floor(Math.random() * 720 - 360)}deg`,
        size: 6 + Math.floor(Math.random() * 8),
      })),
    []
  );

  if (!isOpen) return null;

  const now = new Date();
  const formattedDate = now.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-8 text-center overflow-hidden"
      style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
      onClick={onDismiss}
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {particles.map((p) => (
          <div
            key={p.id}
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

      <div className="relative max-w-md w-full flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
        <div className="absolute -top-12 -left-4 w-24 h-24 bg-primary-container/30 blur-3xl rounded-full" />
        <div className="absolute top-0 -right-8 w-32 h-32 bg-secondary-container/40 blur-3xl rounded-full" />

        <div className="relative mb-8 animate-bounce-in">
          <div
            className="absolute inset-0 blur-3xl opacity-30 rounded-full"
            style={{
              background: 'var(--secondary-container)',
              animation: 'pulse-glow 2s ease-in-out infinite',
            }}
          />
          <div
            className="relative w-40 h-40 bg-celebration-gradient rounded-full shadow-[0_12px_40px_rgba(145,45,163,0.3)] flex items-center justify-center border-8 border-white/40"
            style={{ boxShadow: '0 12px 40px rgba(145,45,163,0.3), inset 0 0 0 1px rgba(145,45,163,0.2)' }}
          >
            <span
              className="material-symbols-outlined text-white"
              style={{
                fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24",
                fontSize: '5rem',
              }}
            >
              trophy
            </span>
          </div>
          <div
            className="absolute -bottom-2 -right-4 bg-primary-fixed w-12 h-12 rounded-full flex items-center justify-center shadow-lg rotate-12 border-4 border-white animate-float"
            style={{ animationDelay: '0.5s' }}
          >
            <span
              className="material-symbols-outlined text-2xl"
              style={{
                fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24",
                color: 'var(--on-primary)',
              }}
            >
              star
            </span>
          </div>
        </div>

        <h1 className="font-headline font-black text-4xl text-on-surface leading-tight mb-3 tracking-tight">
          Order Placed!
        </h1>

        <p className="font-body text-lg text-on-surface-variant font-medium mb-8 max-w-xs">
          Your parents will review your order!
        </p>

        <div
          className="w-full bg-surface-container-lowest/80 rounded-2xl p-6 mb-8 flex flex-col gap-4 border border-white/50"
          style={{ backdropFilter: 'blur(10px)' }}
        >
          <div className="flex items-center gap-4">
            {item.imageUrl ? (
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-surface-container-low flex-shrink-0">
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-xl bg-surface-container-low flex items-center justify-center flex-shrink-0">
                <span
                  className="material-symbols-outlined text-3xl text-on-surface-variant"
                  style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
                >
                  shopping_bag
                </span>
              </div>
            )}
            <div className="text-left">
              <p className="font-headline font-bold text-lg text-on-surface">{item.name}</p>
              <div className="flex items-center gap-1.5">
                <span
                  className="material-symbols-outlined text-base text-tertiary-container"
                  style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
                >
                  monetization_on
                </span>
                <span className="font-headline font-extrabold text-on-surface">{item.price} coins</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-on-surface-variant">
            <span
              className="material-symbols-outlined text-base"
              style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
            >
              calendar_today
            </span>
            <span className="font-body">{formattedDate}</span>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="w-full bg-action-gradient text-white font-headline font-extrabold text-xl rounded-full shadow-lg hover:scale-95 transition-transform active:scale-90 flex items-center justify-center gap-3"
          style={{ minHeight: '60px' }}
        >
          Back to Store
          <span
            className="material-symbols-outlined"
            style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
          >
            store
          </span>
        </button>
      </div>
    </div>
  );
}
