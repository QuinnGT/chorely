'use client';

import { useState, useEffect, useCallback } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AllowanceConfigForm } from '@/components/admin/AllowanceConfigForm';
import { SavingsGoalManager } from '@/components/admin/SavingsGoalManager';
import { SpendingCategoryManager } from '@/components/admin/SpendingCategoryManager';

interface KidRecord {
  id: string;
  name: string;
  themeColor: string;
}

export function AllowanceTabContent() {
  const [kids, setKids] = useState<KidRecord[]>([]);
  const [kidsLoading, setKidsLoading] = useState(true);

  const fetchKids = useCallback(async () => {
    setKidsLoading(true);
    try {
      const res = await fetch('/api/kids');
      if (!res.ok) throw new Error('Failed to fetch kids');
      const data = (await res.json()) as KidRecord[];
      setKids(data);
    } catch (err: unknown) {
      console.error('Failed to fetch kids for allowance tab:', err);
    } finally {
      setKidsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKids();
  }, [fetchKids]);

  if (kidsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span
          className="material-symbols-outlined animate-voice-spin"
          style={{ fontSize: '32px', color: 'var(--primary)' }}
        >
          progress_activity
        </span>
      </div>
    );
  }

  if (kids.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12">
        <span
          className="material-symbols-outlined"
          style={{ fontSize: '48px', color: 'var(--outline-variant)' }}
        >
          savings
        </span>
        <p className="text-lg" style={{ color: 'var(--on-surface-variant)' }}>
          No kids configured. Add kids in the Kids tab first.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: '28px',
            color: 'var(--primary)',
            fontVariationSettings: '"FILL" 1',
          }}
        >
          savings
        </span>
        <h2
          className="font-headline text-2xl font-bold"
          style={{ color: 'var(--on-surface)' }}
        >
          Allowance Manager
        </h2>
      </div>

      {kids.map((kid, index) => (
        <div
          key={kid.id}
          className="glass-card animate-card-entrance flex flex-col gap-5 p-5"
          style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'backwards' }}
        >
          <div className="flex items-center gap-3">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ backgroundColor: kid.themeColor }}
            >
              {kid.name.charAt(0).toUpperCase()}
            </span>
            <span
              className="font-headline text-lg font-semibold"
              style={{ color: 'var(--on-surface)' }}
            >
              {kid.name}
            </span>
          </div>

          <ErrorBoundary>
            <AllowanceConfigForm kidId={kid.id} kidName={kid.name} kidColor={kid.themeColor} />
          </ErrorBoundary>

          <div style={{ borderTop: '1px solid var(--surface-container-high)' }} className="pt-4">
            <ErrorBoundary>
              <SavingsGoalManager kidId={kid.id} />
            </ErrorBoundary>
          </div>

          <div style={{ borderTop: '1px solid var(--surface-container-high)' }} className="pt-4">
            <ErrorBoundary>
              <SpendingCategoryManager kidId={kid.id} />
            </ErrorBoundary>
          </div>
        </div>
      ))}
    </div>
  );
}
