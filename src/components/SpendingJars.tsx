'use client';

import { useState } from 'react';

interface SpendingCategory {
  name: string;
  balance: number;
  percentage?: number;
}

interface SpendingJarsProps {
  categories: SpendingCategory[];
}

export type { SpendingCategory, SpendingJarsProps };

const JAR_CONFIG: Record<string, { icon: string; gradient: string; bgOpacity: number }> = {
  spend: { icon: 'payments', gradient: 'from-primary-container/20 to-transparent', bgOpacity: 0.1 },
  save: { icon: 'savings', gradient: 'from-primary/30 to-transparent', bgOpacity: 0.2 },
  share: { icon: 'volunteer_activism', gradient: 'from-tertiary-container/20 to-transparent', bgOpacity: 0.1 },
};

const DEFAULT_CONFIG = { icon: 'savings', gradient: 'from-primary-container/20 to-transparent', bgOpacity: 0.1 };

function getJarConfig(name: string) {
  const key = name.toLowerCase().trim();
  if (key.includes('spend') || key.includes('buy')) return JAR_CONFIG.spend;
  if (key.includes('save') || key.includes('bank')) return JAR_CONFIG.save;
  if (key.includes('share') || key.includes('give') || key.includes('donate')) return JAR_CONFIG.share;
  return DEFAULT_CONFIG;
}

function getJarColor(name: string): string {
  const key = name.toLowerCase().trim();
  if (key.includes('save')) return 'var(--primary)';
  if (key.includes('share') || key.includes('give')) return 'var(--tertiary)';
  return 'var(--primary)';
}

function getJarBgColor(name: string): string {
  const key = name.toLowerCase().trim();
  if (key.includes('save')) return 'rgba(0, 101, 113, 0.20)';
  if (key.includes('share') || key.includes('give')) return 'rgba(130, 80, 0, 0.10)';
  return 'rgba(0, 101, 113, 0.10)';
}

function getJarBadgeColor(name: string): string {
  const key = name.toLowerCase().trim();
  if (key.includes('save')) return 'bg-primary-container text-on-primary-container';
  if (key.includes('share') || key.includes('give')) return 'bg-tertiary/10 text-tertiary';
  return 'bg-primary/10 text-primary-dim';
}

export function SpendingJars({ categories }: SpendingJarsProps) {
  const [hoveredJar, setHoveredJar] = useState<string | null>(null);

  if (categories.length === 0) {
    return null;
  }

  return (
    <section className="mb-12">
      <h1 className="font-headline text-3xl font-extrabold mb-8 tracking-tight px-2 flex items-center gap-3">
        <span className="material-symbols-outlined text-3xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
          account_balance_wallet
        </span>
        My Money Jars
      </h1>
      <div className="grid grid-cols-3 gap-4 h-64">
        {categories.map((cat) => {
          const config = getJarConfig(cat.name);
          const color = getJarColor(cat.name);
          const bgOpacity = getJarBgColor(cat.name);
          const badgeColor = getJarBadgeColor(cat.name);
          const percentage = cat.percentage ?? 0;
          const isHovered = hoveredJar === cat.name;

          return (
            <div
              key={cat.name}
              data-testid={`jar-${cat.name.toLowerCase().replace(/\s+/g, '-')}`}
              className="glass-card rounded-xl p-4 flex flex-col items-center justify-end relative overflow-hidden group transition-transform duration-300 hover:scale-105"
              onMouseEnter={() => setHoveredJar(cat.name)}
              onMouseLeave={() => setHoveredJar(null)}
            >
              <div className={`absolute inset-0 bg-gradient-to-t ${config.gradient} opacity-60`} />

              <div className="z-10 text-center">
                <div
                  className={`mb-4 transition-transform duration-500 ${isHovered ? 'scale-110' : ''}`}
                >
                  <span
                    className="material-symbols-outlined text-7xl"
                    style={{
                      fontVariationSettings: "'FILL' 1",
                      color,
                    }}
                  >
                    {config.icon}
                  </span>
                </div>
                <p className="font-headline font-bold text-lg">{cat.name}</p>
                <p className="text-2xl font-black" style={{ color }}>
                  ${cat.balance.toFixed(2)}
                </p>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${badgeColor}`}>
                  {percentage}%
                </span>
              </div>

              <div
                className="absolute bottom-0 left-0 w-full transition-all duration-700"
                style={{
                  backgroundColor: bgOpacity,
                  height: `${percentage}%`,
                }}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
