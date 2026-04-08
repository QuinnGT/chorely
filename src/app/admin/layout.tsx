'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PinEntry } from '@/components/PinEntry';

const SESSION_KEY = 'admin-pin-authenticated';

interface AdminTab {
  key: string;
  label: string;
  icon: string;
  href: string;
}

const TABS: AdminTab[] = [
  { key: 'kids', label: 'Kids', icon: 'child_care', href: '/admin/kids' },
  { key: 'chores', label: 'Chores', icon: 'assignment', href: '/admin/chores' },
  { key: 'allowance', label: 'Allowance', icon: 'savings', href: '/admin/allowance' },
  { key: 'store', label: 'Store', icon: 'storefront', href: '/admin/store' },
  { key: 'voice', label: 'Voice', icon: 'mic', href: '/admin/voice' },
  { key: 'themes', label: 'Themes', icon: 'palette', href: '/admin/themes' },
];

function isTabActive(pathname: string, tab: AdminTab): boolean {
  if (tab.key === 'store') {
    return pathname.startsWith('/admin/store');
  }
  return pathname === tab.href;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (stored === 'true') {
        setIsAuthenticated(true);
      }
    } catch {
      // sessionStorage unavailable
    }
    setIsHydrated(true);
  }, []);

  const handleAuthSuccess = useCallback(() => {
    setIsAuthenticated(true);
    try {
      sessionStorage.setItem(SESSION_KEY, 'true');
    } catch {
      // sessionStorage unavailable
    }
  }, []);

  // Show nothing during hydration to avoid flash
  if (!isHydrated) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: 'var(--background)' }}
      />
    );
  }

  if (!isAuthenticated) {
    return (
      <div
        className="relative flex min-h-screen items-center justify-center overflow-hidden"
        style={{ background: 'var(--background)' }}
      >
        {/* Decorative gradient orbs */}
        <div
          className="pointer-events-none absolute"
          style={{
            top: '25%',
            left: '25%',
            width: '256px',
            height: '256px',
            background: 'var(--primary-fixed)',
            opacity: 0.2,
            borderRadius: '9999px',
            filter: 'blur(100px)',
          }}
        />
        <div
          className="pointer-events-none absolute"
          style={{
            bottom: '25%',
            right: '25%',
            width: '320px',
            height: '320px',
            background: 'var(--secondary-fixed)',
            opacity: 0.2,
            borderRadius: '9999px',
            filter: 'blur(120px)',
          }}
        />

        {/* Glassmorphic card */}
        <div
          className="glass-card relative z-10 flex max-w-sm flex-col items-center rounded-xl p-8 text-center shadow-2xl"
          style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(40px)',
            WebkitBackdropFilter: 'blur(40px)',
          }}
        >
          <PinEntry
            onSuccess={handleAuthSuccess}
            onCancel={() => window.history.back()}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--background)' }}>
      {/* Desktop Sidebar */}
      <aside
        className="hidden lg:flex lg:flex-col"
        style={{
          width: '256px',
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          background: 'var(--surface-container-lowest)',
          borderRight: '1px solid var(--surface-container-high)',
          zIndex: 40,
        }}
      >
        <div className="px-6 pb-6">
          <h1
            className="font-headline text-xl font-bold"
            style={{ color: 'var(--on-surface)' }}
          >
            Family Admin
          </h1>
          <p
            className="text-xs"
            style={{ color: 'var(--on-surface-variant)' }}
          >
            Managing the playground
          </p>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3">
          {TABS.map((tab) => (
            <Link
              key={tab.key}
              href={tab.href}
              className="flex items-center gap-3 px-4 py-3 text-left font-semibold transition-all active:scale-95"
              style={{
                minHeight: '48px',
                borderRadius: '1rem',
                color: isTabActive(pathname, tab) ? 'var(--on-primary-container)' : 'var(--on-surface-variant)',
                background: isTabActive(pathname, tab) ? 'var(--primary-container)' : 'transparent',
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: '22px',
                  fontVariationSettings: '"FILL" 1',
                }}
              >
                {tab.icon}
              </span>
              {tab.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto px-3 pb-4">
          <div
            className="mb-2 flex items-center gap-3 rounded-2xl p-3"
            style={{ background: 'var(--surface-container-low)' }}
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold"
              style={{
                background: 'var(--primary-container)',
                color: 'var(--on-primary-container)',
              }}
            >
              P
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--on-surface)' }}>Parent Profile</p>
              <p
                className="text-[10px] uppercase tracking-widest"
                style={{ color: 'var(--on-surface-variant)' }}
              >
                Admin Mode
              </p>
            </div>
          </div>
          <Link
            href="/"
            className="flex items-center gap-2 rounded-full px-4 py-3 font-semibold transition-colors"
            style={{
              minHeight: '48px',
              color: 'var(--on-surface-variant)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
              arrow_back
            </span>
            Back to Home
          </Link>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <div className="flex w-full flex-col lg:hidden">
        <div
          className="flex items-center justify-between px-6"
          style={{
            height: '80px',
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
          }}
        >
          <span
            className="font-headline text-2xl font-black tracking-tight"
            style={{
              background: 'linear-gradient(to right, #0891b2, #22d3ee)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Family Share
          </span>
          <Link
            href="/"
            className="material-symbols-outlined transition-colors"
            style={{ color: 'var(--primary)', fontSize: '28px' }}
          >
            account_circle
          </Link>
        </div>

        <div
          className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-2"
          style={{ background: 'var(--surface-container-lowest)' }}
        >
          {TABS.map((tab) => (
            <Link
              key={tab.key}
              href={tab.href}
              className="flex shrink-0 items-center gap-2 rounded-full px-4 py-2 font-semibold transition-all active:scale-95"
              style={{
                minHeight: '48px',
                color: isTabActive(pathname, tab) ? 'var(--on-primary-container)' : 'var(--on-surface-variant)',
                background: isTabActive(pathname, tab) ? 'var(--primary-container)' : 'var(--surface-container-low)',
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: '20px',
                  fontVariationSettings: '"FILL" 1',
                }}
              >
                {tab.icon}
              </span>
              {tab.label}
            </Link>
          ))}
        </div>

        {/* Mobile Tab Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {children}
        </div>
      </div>

      {/* Desktop Main Content */}
      <main
        className="hidden flex-1 overflow-y-auto lg:block"
        style={{ marginLeft: '256px', padding: '32px' }}
      >
        {children}
      </main>
    </div>
  );
}
