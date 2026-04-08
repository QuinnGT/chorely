'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Kid } from '@/contexts/KidContext';

interface HeaderProps {
  kid: Kid;
  weekRange: string;
  streakDays: number;
  walletBalance?: string;
  onSwitchProfile: () => void;
  onSettingsTap?: () => void;
}

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Play' },
  { href: '/goals', label: 'Goals' },
  { href: '/store', label: 'Store' },
];

export function Header({ kid, onSwitchProfile, onSettingsTap }: HeaderProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard' || pathname === '/earnings';
    return pathname?.startsWith(href);
  };

  return (
    <header
      data-testid="header"
      className="glass-nav fixed top-0 w-full z-50 flex justify-between items-center px-6 h-20"
    >
      {/* Left: Brand */}
      <Link href="/dashboard" className="flex-shrink-0">
        <h1 className="font-headline font-extrabold text-2xl tracking-tight">
          <span className="bg-gradient-to-r from-cyan-600 to-cyan-400 bg-clip-text text-transparent">
            Family
          </span>
          <span className="bg-gradient-to-r from-cyan-600 to-cyan-400 bg-clip-text text-transparent">
            {' '}Share
          </span>
        </h1>
      </Link>

      {/* Center: Nav links (visible on md+) */}
      <nav className="hidden md:flex items-center gap-8">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`font-body text-base font-semibold transition-colors relative pb-1 ${
              isActive(item.href)
                ? 'text-primary'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {item.label}
            {isActive(item.href) && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-full" />
            )}
          </Link>
        ))}
        <button
          type="button"
          onClick={onSettingsTap}
          className={`font-body text-base font-semibold transition-colors relative pb-1 text-on-surface-variant hover:text-on-surface`}
        >
          Parent
        </button>
      </nav>

      {/* Right: Profile avatar */}
      <button
        type="button"
        onClick={onSwitchProfile}
        className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-md active:scale-95 transition-transform"
        aria-label={`Switch profile (${kid.name})`}
      >
        {kid.avatarUrl ? (
          <img
            src={kid.avatarUrl}
            alt={kid.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-sm font-bold text-white"
            style={{ backgroundColor: kid.themeColor || 'var(--kid-primary)' }}
          >
            {kid.name.charAt(0).toUpperCase()}
          </div>
        )}
      </button>
    </header>
  );
}
