'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useKid } from '@/contexts/KidContext';
import { useAllowance } from '@/hooks/useAllowance';
import { useChoreGrid } from '@/hooks/useChoreGrid';
import { useAchievements } from '@/hooks/useAchievements';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ProgressRing } from '@/components/ProgressRing';
import { AchievementBadges } from '@/components/AchievementBadges';
import type { SavingsGoal } from '@/components/SavingsGoalCard';

const EARNING_BADGES = [
  { name: 'Chore Champ', icon: 'stars', description: '10 tasks completed', bg: 'var(--secondary-container)', color: 'var(--on-secondary-container)' },
  { name: 'Early Bird', icon: 'wb_sunny', description: 'Done before 8 AM', bg: 'var(--tertiary-container)', color: 'var(--on-tertiary-container)' },
  { name: 'Helping Hand', icon: 'volunteer_activism', description: 'Helped sibling', bg: 'var(--primary-container)', color: 'var(--on-primary-container)' },
  { name: 'Fast Finisher', icon: 'speed', description: 'Quickest avg time', bg: 'var(--secondary-fixed)', color: 'var(--on-secondary-fixed-variant)' },
];

export default function EarningsPage() {
  const { selectedKid, isHydrated } = useKid();
  const kidId = selectedKid?.id ?? '';

  const { currentWeek, history } = useAllowance(kidId);
  const { rows, completionRate, streakDays } = useChoreGrid(kidId);
  const achievements = useAchievements(kidId, completionRate, streakDays, rows);

  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);

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

  useEffect(() => {
    fetchSavingsGoals();
  }, [fetchSavingsGoals]);

  const activeGoal = useMemo(() => {
    return savingsGoals.find((g) => g.status === 'active') ?? null;
  }, [savingsGoals]);

  const activeGoalProgress = useMemo(() => {
    if (!activeGoal || activeGoal.targetAmount <= 0) return 0;
    return Math.min((activeGoal.currentAmount / activeGoal.targetAmount) * 100, 100);
  }, [activeGoal]);

  const weeklyEarnings = currentWeek?.total ?? 0;
  const baseEarnings = currentWeek?.base ?? 0;
  const streakBonus = currentWeek?.bonus ?? 0;
  const streakLabel = streakDays >= 7 ? 'Elite Streak Bonus Active!' : `${streakDays} Day Streak!`;

  const formatWeekLabel = (weekStart: string): string => {
    const date = new Date(weekStart + 'T00:00:00');
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 6);
    const startStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${startStr} - ${endStr}`;
  };

  if (!isHydrated || !selectedKid) {
    return null;
  }

  return (
    <div className="max-w-[1024px] mx-auto">
      {/* Section A: Weekly Summary */}
      <section className="mb-8">
        <header className="mb-8 animate-card-entrance" style={{ animationDelay: '0ms' }}>
          <h1
            className="font-headline font-extrabold text-4xl tracking-tight mb-2"
            style={{ color: 'var(--primary)' }}
          >
            Weekly Summary
          </h1>
          <p style={{ color: 'var(--on-surface-variant)' }} className="text-lg">
            Way to go! You&apos;ve been on fire this week.
          </p>
        </header>

        {/* Hero Achievement Card */}
        <div
          className="animate-card-entrance relative rounded-xl overflow-hidden mb-8"
          style={{
            background: 'var(--surface-container-lowest)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
          }}
        >
          <div
            className="absolute -right-12 -top-12 w-64 h-64 rounded-full blur-3xl"
            style={{ background: 'var(--primary-container)', opacity: 0.2 }}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center relative z-10 p-8">
            {/* Donut Chart & Streak */}
            <div className="flex flex-col items-center justify-center space-y-6">
              <ProgressRing
                completionRate={completionRate}
                projectedAmount={weeklyEarnings}
                size={224}
                strokeWidth={20}
                showPercentage={true}
              />
              <div
                className="flex items-center gap-3 px-6 py-3 rounded-full"
                style={{
                  background: 'rgba(247, 160, 30, 0.1)',
                  color: 'var(--tertiary)',
                  border: '1.5px solid rgba(130, 80, 0, 0.15)',
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    color: 'var(--tertiary)',
                    fontVariationSettings: "'FILL' 1",
                  }}
                >
                  local_fire_department
                </span>
                <span
                  className="font-headline font-bold text-lg"
                  style={{ color: 'var(--tertiary)' }}
                >
                  {streakLabel}
                </span>
              </div>
            </div>

            {/* Earnings Callout */}
            <div className="text-center md:text-left space-y-4">
              <h2 className="font-headline font-extrabold text-3xl leading-tight">
                You earned{' '}
                <span
                  className="px-3 py-1 rounded-lg"
                  style={{ color: 'var(--primary)', background: 'rgba(88, 231, 251, 0.3)' }}
                >
                  ${weeklyEarnings.toFixed(2)}
                </span>{' '}
                this week!
              </h2>
              <p
                className="text-lg leading-relaxed"
                style={{ color: 'var(--on-surface-variant)' }}
              >
                Keep up the amazing work, {selectedKid.name}!
              </p>
              <button
                className="bg-gradient-to-br from-[var(--primary)] to-[var(--primary-container)] text-white px-8 py-4 rounded-full font-headline font-bold text-lg shadow-lg active:scale-95 transition-all duration-200"
              >
                Claim Bonus
              </button>
            </div>
          </div>
        </div>

        {/* Achievement Badges Bento Grid */}
        <div className="animate-card-entrance" style={{ animationDelay: '100ms' }}>
          <ErrorBoundary>
            <AchievementBadges achievements={achievements} />
          </ErrorBoundary>
        </div>

        {/* Custom Earning Badges Grid */}
        <div
          className="animate-card-entrance grid grid-cols-2 md:grid-cols-4 gap-4 mt-6"
          style={{ animationDelay: '200ms' }}
        >
          {EARNING_BADGES.map((badge) => (
            <div
              key={badge.name}
              className="flex flex-col items-center text-center space-y-3 p-6 rounded-xl transition-colors"
              style={{
                background: 'var(--surface-container-low)',
              }}
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-2 shadow-sm"
                style={{ backgroundColor: badge.bg }}
              >
                <span
                  className="material-symbols-outlined text-3xl"
                  style={{
                    fontVariationSettings: "'FILL' 1",
                    color: badge.color,
                  }}
                >
                  {badge.icon}
                </span>
              </div>
              <span
                className="font-headline font-bold"
                style={{ color: 'var(--on-surface)' }}
              >
                {badge.name}
              </span>
              <span className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>
                {badge.description}
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="h-8" />

      {/* Section B: Allowance Tracker */}
      <section>
        <header className="mb-8 animate-card-entrance" style={{ animationDelay: '300ms' }}>
          <h1
            className="font-headline font-extrabold text-4xl tracking-tight mb-2"
            style={{ color: 'var(--secondary)' }}
          >
            Allowance Tracker
          </h1>
          <p style={{ color: 'var(--on-surface-variant)' }} className="text-lg">
            Keep track of your savings and bonuses.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Wallet Glass Card */}
          <div
            className="animate-card-entrance md:col-span-2 relative rounded-xl overflow-hidden"
            style={{
              background: 'var(--glass-bg)',
              backdropFilter: 'blur(var(--glass-blur))',
              WebkitBackdropFilter: 'blur(var(--glass-blur))',
              border: '1px solid var(--glass-border)',
              boxShadow: 'var(--glass-shadow)',
            }}
          >
            <div
              className="absolute -left-12 -bottom-12 w-48 h-48 rounded-full blur-3xl"
              style={{ background: 'var(--secondary-container)', opacity: 0.3 }}
            />
            <div className="relative z-10 p-8">
              <span
                className="font-bold text-sm tracking-widest uppercase mb-4 block"
                style={{ color: 'var(--on-surface-variant)' }}
              >
                Available Balance
              </span>
              <div className="flex items-baseline gap-2 mb-8">
                <span
                  className="font-headline font-black text-on-surface"
                  style={{ fontSize: 'clamp(2.5rem, 8vw, 4.5rem)', lineHeight: 1 }}
                >
                  ${weeklyEarnings.toFixed(2)}
                </span>
                <span
                  className="material-symbols-outlined text-4xl"
                  style={{
                    color: 'var(--secondary)',
                    fontVariationSettings: "'FILL' 1",
                  }}
                >
                  account_balance_wallet
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div
                  className="backdrop-blur p-5 rounded-lg"
                  style={{
                    background: 'var(--surface-container-low)',
                    border: '1px solid rgba(255,255,255,0.4)',
                  }}
                >
                  <span
                    className="text-xs font-bold uppercase block mb-1"
                    style={{ color: 'var(--on-surface-variant)' }}
                  >
                    Base Earnings
                  </span>
                  <span
                    className="font-headline font-bold text-2xl"
                    style={{ color: 'var(--on-surface)' }}
                  >
                    ${baseEarnings.toFixed(2)}
                  </span>
                </div>
                <div
                  className="backdrop-blur p-5 rounded-lg"
                  style={{
                    background: 'rgba(0, 101, 113, 0.05)',
                    border: '1px solid rgba(0, 101, 113, 0.1)',
                  }}
                >
                  <span
                    className="text-xs font-bold uppercase block mb-1"
                    style={{ color: 'var(--primary)' }}
                  >
                    Streak Bonus
                  </span>
                  <span
                    className="font-headline font-bold text-2xl"
                    style={{ color: 'var(--primary)' }}
                  >
                    +${streakBonus.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
            <div style={{ animationDelay: '400ms' }} />
          </div>

          {/* Action Panel */}
          <div
            className="animate-card-entrance flex flex-col justify-between gap-6 rounded-xl p-6"
            style={{
              background: 'var(--surface-container-highest)',
              opacity: 0.3,
            }}
          >
            {activeGoal ? (
              <div className="space-y-4">
                <div
                  className="flex items-center justify-between p-4 rounded-lg"
                  style={{ background: 'var(--surface-container-lowest)' }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ background: 'var(--tertiary-container)' }}
                    >
                      <span
                        className="material-symbols-outlined text-xl"
                        style={{
                          fontVariationSettings: "'FILL' 1",
                          color: 'var(--on-tertiary-container)',
                        }}
                      >
                        savings
                      </span>
                    </div>
                    <div>
                      <p
                        className="text-sm font-bold"
                        style={{ color: 'var(--on-surface)' }}
                      >
                        Saving Goal
                      </p>
                      <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>
                        {activeGoal.name}
                      </p>
                    </div>
                  </div>
                  <span
                    className="font-headline font-bold"
                    style={{ color: 'var(--on-surface)' }}
                  >
                    {Math.round(activeGoalProgress)}%
                  </span>
                </div>
                <div
                  className="h-2 w-full rounded-full overflow-hidden"
                  style={{ background: 'var(--surface-container)' }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      background: 'var(--tertiary)',
                      width: `${activeGoalProgress}%`,
                    }}
                  />
                </div>
              </div>
            ) : (
              <div
                className="flex items-center justify-center p-4 rounded-lg text-center"
                style={{ background: 'var(--surface-container-lowest)' }}
              >
                <p className="text-sm font-bold" style={{ color: 'var(--on-surface-variant)' }}>
                  No active savings goal
                </p>
              </div>
            )}
            <button
              className="w-full py-4 rounded-full font-headline font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
              style={{
                background: 'var(--on-surface)',
                color: 'var(--surface)',
                minHeight: 'var(--touch-min)',
              }}
            >
              <span className="material-symbols-outlined">payments</span>
              Request Payout
            </button>
          </div>

          {/* History Section */}
          <div className="md:col-span-3 animate-card-entrance" style={{ animationDelay: '500ms' }}>
            <h3
              className="font-headline font-bold text-xl mb-4 px-2"
              style={{ color: 'var(--on-surface)' }}
            >
              Earning History
            </h3>
            <div className="flex overflow-x-auto gap-4 pb-4 no-scrollbar">
              {history.map((entry) => {
                const earned = parseFloat(entry.earned);
                const bonus = parseFloat(entry.bonusEarned);
                const total = earned + bonus;

                return (
                  <div
                    key={entry.id}
                    className="min-w-[200px] flex-shrink-0 p-6 rounded-xl"
                    style={{
                      background: 'var(--surface-container-lowest)',
                      border: '1px solid var(--surface-container)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    }}
                  >
                    <span
                      className="text-xs font-bold block mb-1"
                      style={{ color: 'var(--on-surface-variant)' }}
                    >
                      {formatWeekLabel(entry.weekStart)}
                    </span>
                    <p
                      className="font-headline font-bold text-xl mb-3"
                      style={{ color: 'var(--on-surface)' }}
                    >
                      ${total.toFixed(2)}
                    </p>
                    <div
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full w-fit"
                      style={{
                        background: entry.paid ? 'rgba(0, 101, 113, 0.1)' : 'var(--tertiary-container)',
                        color: entry.paid ? 'var(--primary)' : 'var(--on-tertiary-container)',
                      }}
                    >
                      {entry.paid ? (
                        <>
                          <span
                            className="material-symbols-outlined text-xs"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            check_circle
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-tighter">
                            Paid
                          </span>
                        </>
                      ) : (
                        <span className="text-[10px] font-black uppercase tracking-tighter">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
