'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useKid } from '@/contexts/KidContext';
import { useAllowance } from '@/hooks/useAllowance';
import { SpendingJars } from '@/components/SpendingJars';
import { SavingsGoalCard } from '@/components/SavingsGoalCard';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import type { SpendingCategory } from '@/components/SpendingJars';
import type { SavingsGoal } from '@/components/SavingsGoalCard';

export default function GoalsPage() {
  const { selectedKid, isHydrated } = useKid();
  const kidId = selectedKid?.id ?? '';

  const { currentWeek, history } = useAllowance(kidId);

  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [spendingCategories, setSpendingCategories] = useState<SpendingCategory[]>([]);

  const fetchSavingsGoals = useCallback(async () => {
    if (!kidId) return;
    try {
      const res = await fetch(`/api/savings-goals?kidId=${kidId}`);
      if (res.ok) {
        const data = await res.json();
        const mapped = data.map((g: { id: string; name: string; targetAmount: string; currentAmount: string; status: string }) => ({
          id: g.id,
          name: g.name,
          targetAmount: parseFloat(g.targetAmount),
          currentAmount: parseFloat(g.currentAmount),
          status: g.status as 'active' | 'completed' | 'archived',
        }));
        setSavingsGoals(mapped);
      }
    } catch {
      // Silently fail
    }
  }, [kidId]);

  const fetchSpendingCategories = useCallback(async () => {
    if (!kidId) return;
    try {
      const res = await fetch(`/api/spending-categories?kidId=${kidId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.enabled && Array.isArray(data.categories)) {
          const parsed: Array<{ name: string; balance: number; percentage: number }> = data.categories.map(
            (c: { name: string; balance: string | number }) => ({
              name: c.name,
              balance: typeof c.balance === 'string' ? parseFloat(c.balance) : c.balance,
              percentage: 0,
            })
          );
          const totalBalance = parsed.reduce((sum: number, c) => sum + c.balance, 0);
          if (totalBalance > 0) {
            for (const c of parsed) {
              c.percentage = Math.round((c.balance / totalBalance) * 100);
            }
          }
          setSpendingCategories(parsed);
        } else {
          setSpendingCategories([]);
        }
      }
    } catch {
      // Silently fail
    }
  }, [kidId]);

  useEffect(() => {
    fetchSavingsGoals();
    fetchSpendingCategories();
  }, [fetchSavingsGoals, fetchSpendingCategories]);

  const handleCreateGoal = useCallback(
    async (goal: { name: string; targetAmount: number }) => {
      if (!kidId) return;
      try {
        const res = await fetch('/api/savings-goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kidId, name: goal.name, targetAmount: goal.targetAmount }),
        });
        if (res.ok) {
          fetchSavingsGoals();
        }
      } catch {
        // Silently fail
      }
    },
    [kidId, fetchSavingsGoals],
  );

  const weeklyTotal = currentWeek?.total ?? 0;
  const baseEarnings = currentWeek?.base ?? 0;
  const bonusEarnings = currentWeek?.bonus ?? 0;
  const streakDays = currentWeek?.streakDays ?? 0;

  const avgDaily = useMemo(() => {
    return streakDays > 0 ? weeklyTotal / streakDays : 0;
  }, [weeklyTotal, streakDays]);

  const formatWeekLabel = (weekStart: string): string => {
    const date = new Date(weekStart + 'T00:00:00');
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 6);
    const startStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${startStr} - ${endStr}`;
  };

  const recentHistory = history.slice(0, 4);

  if (!isHydrated || !selectedKid) {
    return null;
  }

  return (
    <div className="max-w-[1024px] mx-auto">
      {/* Section A: My Money Jars */}
      {spendingCategories.length > 0 && (
        <section className="mb-12 animate-card-entrance" style={{ animationDelay: '0ms' }}>
          <ErrorBoundary>
            <SpendingJars categories={spendingCategories} />
          </ErrorBoundary>
        </section>
      )}

      {/* Section B: Savings Goals */}
      <section className="mb-12 animate-card-entrance" style={{ animationDelay: '100ms' }}>
        <ErrorBoundary>
          <SavingsGoalCard goals={savingsGoals} onAddGoal={handleCreateGoal} />
        </ErrorBoundary>
      </section>

      {/* Section C: Allowance Summary */}
      <section className="animate-card-entrance grid lg:grid-cols-2 gap-8" style={{ animationDelay: '200ms' }}>
          <div
            className="animate-card-entrance flex flex-col justify-between gap-6 rounded-xl p-6"
            style={{
              background: 'var(--surface-container-highest)',
            }}
          >
          <div>
            <div className="flex items-center gap-3 mb-6">
              <span
                className="material-symbols-outlined text-3xl"
                style={{
                  color: 'var(--primary)',
                  fontVariationSettings: "'FILL' 1",
                }}
              >
                account_balance_wallet
              </span>
              <h2
                className="font-headline text-2xl font-extrabold tracking-tight"
                style={{ color: 'var(--on-surface)' }}
              >
                Allowance
              </h2>
            </div>
            <div className="mb-8">
              <p
                className="uppercase text-xs font-bold tracking-widest mb-1"
                style={{ color: 'var(--on-surface-variant)' }}
              >
                This Week&apos;s Total
              </p>
              <p
                className="text-5xl font-black tracking-tight"
                style={{ color: 'var(--on-surface)' }}
              >
                ${weeklyTotal.toFixed(2)}
              </p>
            </div>
            <div className="space-y-4">
              <div
                className="flex justify-between items-center p-4 rounded-2xl"
                style={{ background: 'var(--surface-container-low)' }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="material-symbols-outlined"
                    style={{ color: 'var(--primary-dim)' }}
                  >
                    schedule
                  </span>
                  <span className="font-bold" style={{ color: 'var(--on-surface)' }}>
                    Base Earnings
                  </span>
                </div>
                <span
                  className="font-headline font-black text-xl"
                  style={{ color: 'var(--on-surface)' }}
                >
                  ${baseEarnings.toFixed(2)}
                </span>
              </div>
              <div
                className="flex justify-between items-center p-4 rounded-2xl"
                style={{ background: 'rgba(0, 101, 113, 0.05)' }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="material-symbols-outlined"
                    style={{ color: 'var(--primary)' }}
                  >
                    star
                  </span>
                  <span className="font-bold" style={{ color: 'var(--on-surface)' }}>
                    Chore Bonuses
                  </span>
                </div>
                <span
                  className="font-headline font-black text-xl"
                  style={{ color: 'var(--primary)' }}
                >
                  ${bonusEarnings.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
          <div
            className="mt-6 flex gap-4"
          >
            <div
              className="flex-1 p-4 rounded-2xl text-center"
              style={{ background: 'var(--surface-container)' }}
            >
              <p
                className="text-[10px] font-bold uppercase tracking-tighter"
                style={{ color: 'var(--on-surface-variant)' }}
              >
                Avg. Daily
              </p>
              <p className="text-lg font-black" style={{ color: 'var(--on-surface)' }}>
                ${avgDaily.toFixed(2)}
              </p>
            </div>
            <div
              className="flex-1 p-4 rounded-2xl text-center"
              style={{ background: 'var(--surface-container)' }}
            >
              <p
                className="text-[10px] font-bold uppercase tracking-tighter"
                style={{ color: 'var(--on-surface-variant)' }}
              >
                Streak
              </p>
              <p className="text-lg font-black" style={{ color: 'var(--tertiary)' }}>
                {streakDays} Days
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-8">
          <h3
            className="font-headline font-bold text-lg mb-6 flex items-center gap-2"
            style={{ color: 'var(--on-surface)' }}
          >
            <span
              className="material-symbols-outlined"
              style={{
                color: 'var(--on-surface-variant)',
                fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
              }}
            >
              history
            </span>
            Past 4 Weeks
          </h3>
          <div className="space-y-4 max-h-[340px] overflow-y-auto no-scrollbar pr-2">
            {recentHistory.length === 0 && (
              <p className="text-center py-8" style={{ color: 'var(--on-surface-variant)' }}>
                No history yet
              </p>
            )}
            {recentHistory.map((entry) => {
              const earned = parseFloat(entry.earned);
              const bonus = parseFloat(entry.bonusEarned);
              const total = earned + bonus;

              return (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-4 rounded-2xl"
                  style={{
                    background: 'var(--surface-container-lowest)',
                    border: '1px solid var(--outline-variant)',
                  }}
                >
                  <div>
                    <p className="font-bold" style={{ color: 'var(--on-surface)' }}>
                      {formatWeekLabel(entry.weekStart)}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>
                      Completed chores
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className="font-headline font-black text-lg"
                      style={{ color: 'var(--on-surface)' }}
                    >
                      ${total.toFixed(2)}
                    </p>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase"
                      style={{
                        background: entry.paid ? 'rgba(0, 101, 113, 0.1)' : 'var(--tertiary-container)',
                        color: entry.paid ? 'var(--primary)' : 'var(--on-tertiary-container)',
                      }}
                    >
                      {entry.paid ? 'Paid' : 'Pending'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
