'use client';

import { useState, useEffect } from 'react';
import type { Kid } from '@/contexts/KidContext';

interface ProfileSelectorProps {
  onSelectKid: (kid: Kid) => void;
  onParentTap: () => void;
  onAddMember?: () => void;
}

function getKidGradientStyle(themeColor: string): { bg: string; ringFrom: string; ringTo: string } {
  const color = themeColor.toLowerCase();
  if (color === '#912da3' || color === '#7c3aed' || color === '#831d96') {
    return { bg: 'var(--secondary-container)', ringFrom: 'var(--secondary-container)', ringTo: 'var(--secondary)' };
  }
  if (color === '#825000' || color === '#f7a01e' || color === '#f59e0b' || color === '#e79308' || color === '#724600') {
    return { bg: 'var(--tertiary-container)', ringFrom: 'var(--tertiary-container)', ringTo: 'var(--tertiary)' };
  }
  // Default: teal/primary
  return { bg: 'var(--primary-container)', ringFrom: 'var(--primary-container)', ringTo: 'var(--primary)' };
}

function getKidGlowColor(themeColor: string): string {
  const color = themeColor.toLowerCase();
  if (color === '#912da3' || color === '#7c3aed' || color === '#831d96') {
    return 'rgba(251,189,255,0.5)';
  }
  if (color === '#825000' || color === '#f7a01e' || color === '#f59e0b' || color === '#e79308' || color === '#724600') {
    return 'rgba(247,160,30,0.5)';
  }
  return 'rgba(88,231,251,0.5)';
}

export function ProfileSelector({ onSelectKid, onParentTap, onAddMember }: ProfileSelectorProps) {
  const [kids, setKids] = useState<Kid[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchKids() {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/kids');
        if (!res.ok) throw new Error('Failed to fetch kids');

        const data = (await res.json()) as Kid[];
        if (!cancelled) {
          setKids(data);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load profiles';
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchKids();

    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-lg text-gray-500">Loading profiles…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-lg text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div
      className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-x-clip"
      style={{
        padding: 'clamp(1rem, 4vw, 4rem)',
        background:
          'linear-gradient(135deg, var(--primary-container) 0%, var(--surface) 45%, var(--secondary-container) 100%)',
      }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full blur-[100px]" style={{ backgroundColor: 'var(--primary-container)', opacity: 0.6 }} />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full blur-[100px]" style={{ backgroundColor: 'var(--secondary-container)', opacity: 0.6 }} />
      </div>

      <header className="relative z-10 text-center" style={{ marginBottom: 'clamp(1rem, 2vw, 1.5rem)' }}>
        <h1
          className="font-headline font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-container mb-2"
          style={{ fontSize: 'clamp(2rem, 5vw + 0.5rem, 3.5rem)', lineHeight: 1.1 }}
        >
          Chorely
        </h1>
        <p
          className="font-label text-on-surface-variant font-medium"
          style={{ fontSize: 'clamp(0.875rem, 1vw + 0.5rem, 1.125rem)' }}
        >
          Who&apos;s playing today?
        </p>
      </header>

      <div
        className="relative z-10 w-full profile-card-wrap"
        style={{ maxWidth: 'min(100%, 52rem)', containerType: 'inline-size' }}
      >
        <div className="profile-chip profile-chip-tr absolute rotate-12 z-20" style={{ top: '-0.75rem', right: 'clamp(-1rem, -2vw, -2.5rem)' }}>
          <div
            className="font-headline font-bold shadow-lg text-white"
            style={{ backgroundColor: 'var(--tertiary)', padding: 'clamp(0.5rem, 0.5vw + 0.4rem, 0.75rem) clamp(1rem, 1vw + 0.75rem, 1.5rem)', borderRadius: '9999px', fontSize: 'clamp(0.75rem, 0.5vw + 0.625rem, 1rem)' }}
          >
            Goals Reached!
          </div>
        </div>
        <div className="profile-chip profile-chip-bl absolute -rotate-6 z-20" style={{ bottom: '-1rem', left: 'clamp(-1rem, -2vw, -2.5rem)' }}>
          <div
            className="font-headline font-bold shadow-lg text-white"
            style={{ backgroundColor: 'var(--primary)', padding: 'clamp(0.5rem, 0.5vw + 0.4rem, 0.75rem) clamp(1rem, 1vw + 0.75rem, 1.5rem)', borderRadius: '9999px', fontSize: 'clamp(0.75rem, 0.5vw + 0.625rem, 1rem)' }}
          >
            Chore Champ
          </div>
        </div>

        <div
          className="rounded-3xl"
          style={{
            padding: 'clamp(1.5rem, 2vw + 1rem, 3.5rem)',
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: 'var(--glass-shadow)',
            border: '1px solid var(--glass-border)',
          }}
        >
        <div
          className="flex flex-wrap justify-center w-full"
          style={{ gap: 'clamp(1rem, 2vw, 2rem)', marginBottom: 'clamp(1.5rem, 3vw, 2.5rem)' }}
        >
          {kids.map((kid, index) => (
            <button
              key={kid.id}
              type="button"
              onClick={() => onSelectKid(kid)}
              className="group animate-card-entrance flex flex-col items-center gap-4 active:scale-95 transition-transform duration-200 opacity-0"
              style={{
                animationDelay: `${index * 100}ms`,
                animationFillMode: 'forwards',
              }}
            >
              {(() => {
                const g = getKidGradientStyle(kid.themeColor);
                const glow = getKidGlowColor(kid.themeColor);
                return (
                  <>
                    <div
                      className="relative rounded-full p-1.5 transition-shadow"
                      style={{
                        width: 'clamp(5rem, 8vw + 2rem, 9rem)',
                        height: 'clamp(5rem, 8vw + 2rem, 9rem)',
                        background: `linear-gradient(135deg, ${g.ringFrom}, ${g.ringTo})`,
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = `0 0 30px ${glow}`; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                    >
                      <div
                        className="w-full h-full rounded-full overflow-hidden border-4 shadow-inner"
                        style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--surface-container-lowest)' }}
                      >
                        {kid.avatarUrl ? (
                          <img
                            src={kid.avatarUrl}
                            alt={kid.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center font-bold text-white"
                            style={{ backgroundColor: kid.themeColor || 'var(--primary)', fontSize: 'clamp(1.5rem, 3vw + 0.5rem, 2.5rem)' }}
                          >
                            {kid.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                    </div>
                    <span
                      className="font-headline font-bold text-on-surface group-hover:text-primary transition-colors"
                      style={{ fontSize: 'clamp(1rem, 1vw + 0.75rem, 1.35rem)' }}
                    >
                      {kid.name}
                    </span>
                  </>
                );
              })()}
            </button>
          ))}

          <button
            type="button"
            onClick={onAddMember}
            className="group animate-card-entrance flex flex-col items-center gap-4 active:scale-95 transition-transform duration-200 opacity-0"
            style={{
              animationDelay: `${kids.length * 100}ms`,
              animationFillMode: 'forwards',
            }}
          >
            <div
              className="relative rounded-full p-1.5 group-hover:bg-error-container transition-colors"
              style={{
                width: 'clamp(5rem, 8vw + 2rem, 9rem)',
                height: 'clamp(5rem, 8vw + 2rem, 9rem)',
                backgroundColor: 'var(--surface-container-highest)',
              }}
            >
              <div
                className="w-full h-full rounded-full flex items-center justify-center border-4 shadow-inner"
                style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--surface-container-lowest)' }}
              >
                <span
                  className="material-symbols-outlined text-outline-variant group-hover:text-white transition-colors"
                  style={{ fontSize: 'clamp(2rem, 3vw + 1rem, 3.25rem)', fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
                >
                  add
                </span>
              </div>
            </div>
            <span
              className="font-headline font-bold text-on-surface-variant"
              style={{ fontSize: 'clamp(1rem, 1vw + 0.75rem, 1.35rem)' }}
            >
              Add
            </span>
          </button>
        </div>

        <div className="w-full flex justify-center pt-5" style={{ borderTop: '1px solid var(--outline-variant)' }}>
          <button
            type="button"
            onClick={onParentTap}
            className="flex items-center gap-3 px-6 py-3 rounded-full shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
            style={{ background: 'var(--surface-container-low)' }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'var(--secondary-container)', color: 'var(--on-secondary-container)' }}
            >
              <span
                className="material-symbols-outlined text-lg"
                style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
              >
                lock
              </span>
            </div>
            <div className="text-left">
              <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Admin Access</p>
              <p className="font-headline text-base font-bold text-on-surface">Parent Dashboard</p>
            </div>
          </button>
        </div>
        </div>
      </div>

      <footer className="relative z-10 mt-6 opacity-50">
        <p className="font-label text-sm text-on-surface-variant">© 2025 Chorely • Safe Playground Mode</p>
      </footer>
    </div>
  );
}
