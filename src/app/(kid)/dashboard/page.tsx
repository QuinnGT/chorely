'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useKid } from '@/contexts/KidContext';
import { useChoreGrid } from '@/hooks/useChoreGrid';
import { useAllowance } from '@/hooks/useAllowance';
import { useAchievements } from '@/hooks/useAchievements';
import { formatDate } from '@/lib/date-utils';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ChoreGrid } from '@/components/ChoreGrid';
import { AllowanceCard } from '@/components/AllowanceCard';
import { ProgressRing } from '@/components/ProgressRing';
import { AchievementBadges } from '@/components/AchievementBadges';
import { CelebrationOverlay } from '@/components/CelebrationOverlay';
import { VoiceAssistant } from '@/components/VoiceAssistant';

export default function DashboardPage() {
  const router = useRouter();
  const { selectedKid, isHydrated } = useKid();

  const [voiceSettingsRaw, setVoiceSettingsRaw] = useState<{
    global?: { defaultWakePhrase?: string; defaultProviderId?: string; volume?: number };
    perKid?: Record<string, { enabled?: boolean; wakePhrase?: string; providerId?: string; elevenlabsVoiceId?: string; speechOutput?: boolean }>;
    availableProviders?: string[];
  } | null>(null);
  const [showCelebration, setShowCelebration] = useState(true);

  useEffect(() => {
    if (isHydrated && !selectedKid) {
      router.push('/');
    }
  }, [selectedKid, isHydrated, router]);

  useEffect(() => {
    let cancelled = false;
    async function fetchVoiceSettings() {
      try {
        const res = await fetch('/api/voice-settings');
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setVoiceSettingsRaw(data);
        }
      } catch { /* Use defaults */ }
    }
    fetchVoiceSettings();
    return () => { cancelled = true; };
  }, []);

  const kidId = selectedKid?.id ?? '';

  const voiceSettings = useMemo(() => {
    const defaults = {
      wakePhrase: 'Hey Family',
      speechOutputEnabled: true,
      wakeWordEnabled: true,
      providerId: 'web-speech',
      availableProviders: ['web-speech'] as string[],
      elevenlabsVoiceId: '',
    };
    if (!voiceSettingsRaw) return defaults;

    const kidOverrides = kidId ? voiceSettingsRaw.perKid?.[kidId] : undefined;
    return {
      wakePhrase: kidOverrides?.wakePhrase ?? voiceSettingsRaw.global?.defaultWakePhrase ?? defaults.wakePhrase,
      speechOutputEnabled: kidOverrides?.speechOutput ?? defaults.speechOutputEnabled,
      wakeWordEnabled: defaults.wakeWordEnabled,
      providerId: kidOverrides?.providerId ?? voiceSettingsRaw.global?.defaultProviderId ?? defaults.providerId,
      availableProviders: voiceSettingsRaw.availableProviders ?? defaults.availableProviders,
      elevenlabsVoiceId: kidOverrides?.elevenlabsVoiceId ?? defaults.elevenlabsVoiceId,
    };
  }, [voiceSettingsRaw, kidId]);

  const { rows, completionRate, streakDays, refetch: refetchChores } = useChoreGrid(kidId);
  const { currentWeek, history, markPaid, refetch: refetchAllowance } = useAllowance(kidId);
  const achievements = useAchievements(kidId, completionRate, streakDays, rows);

  const allDailyComplete = useMemo(() => {
    const dailyRows = rows.filter((r) => r.chore.frequency === 'daily');
    if (dailyRows.length === 0) return false;
    return dailyRows.every((r) => {
      const todayCell = r.days.find((d) => d.isToday);
      return todayCell?.completed === true;
    });
  }, [rows]);

  const celebrationDateKey = useMemo(() => formatDate(new Date()), []);

  const voiceAssistantChores = useMemo(() => {
    return rows.map((r) => {
      const todayCell = r.days.find((d) => d.isToday);
      const completedThisWeek = r.days.some((d) => d.completed);
      return {
        id: r.chore.id,
        name: r.chore.name,
        assignmentId: r.assignmentId,
        frequency: r.chore.frequency as 'daily' | 'weekly',
        completedToday: r.chore.frequency === 'weekly' ? completedThisWeek : (todayCell?.completed ?? false),
      };
    });
  }, [rows]);

  const handleChoreCompletedViaVoice = useCallback(() => {
    refetchChores();
    refetchAllowance();
  }, [refetchChores, refetchAllowance]);

  if (!isHydrated || !selectedKid) {
    return null;
  }

  const allowanceTotal = currentWeek ? currentWeek.total : 0;
  const allowanceBase = currentWeek ? currentWeek.base : 0;
  const allowanceBonus = currentWeek ? currentWeek.bonus : 0;
  const allowanceHistory = history.map((h) => ({
    id: h.id,
    weekStart: h.weekStart,
    earned: h.earned,
    bonusEarned: h.bonusEarned,
    paid: h.paid,
    paidAt: h.paidAt,
  }));

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  })();

  return (
    <div className="max-w-[1440px] mx-auto h-[calc(100dvh-6rem)] flex flex-col overflow-hidden">
      {/* Top row: Greeting + Wallet */}
      <div className="flex items-start justify-between mb-4 flex-shrink-0">
        <div>
          <p className="font-label text-xs font-bold uppercase tracking-widest text-primary">
            {greeting}, {selectedKid.name}!
          </p>
          <h2 className="font-headline text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface">
            Ready to Level Up?
          </h2>
        </div>
        <div className="flex items-center gap-3 bg-surface-container-low p-2 pr-6 rounded-full shadow-card">
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-tertiary to-tertiary-fixed">
            <span className="material-symbols-outlined text-white text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              monetization_on
            </span>
          </div>
          <div>
            <p className="font-label text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Your Wallet</p>
            <p className="font-headline text-lg font-black text-on-surface">${allowanceTotal.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Main 2-column bento grid */}
      <div className="grid grid-cols-1 md:grid-cols-10 gap-6 flex-1 min-h-0">
        {/* Left column - 60%: Chore Grid */}
        <section className="md:col-span-6 min-h-0 overflow-y-auto no-scrollbar">
          <div className="animate-card-entrance">
            <ErrorBoundary>
              <ChoreGrid kidId={selectedKid.id} onToggleSuccess={refetchAllowance} />
            </ErrorBoundary>
          </div>
        </section>

        {/* Right column - 40%: Stats bento */}
        <aside className="md:col-span-4 flex flex-col gap-4 min-h-0 overflow-y-auto no-scrollbar">
          {/* Stats row: Weekly Goal + Day Streak */}
          <div className="grid grid-cols-2 gap-4 flex-shrink-0 animate-card-entrance" style={{ animationDelay: '100ms' }}>
            {/* Weekly Goal */}
            <div className="bg-surface-container-lowest rounded-xl p-5 shadow-card flex flex-col items-center justify-center">
              <ErrorBoundary>
                <ProgressRing completionRate={completionRate} projectedAmount={allowanceTotal} size={100} />
              </ErrorBoundary>
              <p className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mt-2">Weekly Goal</p>
            </div>
            {/* Day Streak */}
            <div className="bg-surface-container-lowest rounded-xl p-5 shadow-card flex flex-col items-center justify-center border-b-4 border-error-container">
              <div className="w-14 h-14 rounded-full bg-error-container/20 flex items-center justify-center mb-2">
                <span className="material-symbols-outlined text-3xl text-error" style={{ fontVariationSettings: "'FILL' 1" }}>
                  local_fire_department
                </span>
              </div>
              <p className="font-headline text-3xl font-black text-on-surface">{streakDays}</p>
              <p className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Day Streak</p>
            </div>
          </div>

          {/* Allowance Card */}
          <div className="animate-card-entrance flex-shrink-0" style={{ animationDelay: '200ms' }}>
            <ErrorBoundary>
              <AllowanceCard
                currentWeekTotal={allowanceTotal}
                baseEarnings={allowanceBase}
                streakBonus={allowanceBonus}
                streakDays={streakDays}
                history={allowanceHistory}
                markPaid={markPaid}
              />
            </ErrorBoundary>
          </div>

          {/* Hall of Fame */}
          <div className="animate-card-entrance flex-shrink-0" style={{ animationDelay: '300ms' }}>
            <ErrorBoundary>
              <AchievementBadges achievements={achievements} />
            </ErrorBoundary>
          </div>
        </aside>
      </div>

      {/* Celebration overlay */}
      <ErrorBoundary>
        <CelebrationOverlay
          show={allDailyComplete && showCelebration}
          themeColor="var(--kid-primary)"
          dateKey={celebrationDateKey}
          childName={selectedKid.name}
          bonusTokens={50}
          totalEarned={allowanceTotal}
          streakDays={streakDays}
          onClaimRewards={() => router.push('/store')}
          onViewDashboard={() => setShowCelebration(false)}
        />
      </ErrorBoundary>

      {/* Voice Assistant */}
      <ErrorBoundary>
        <VoiceAssistant
          kidId={selectedKid.id}
          kidName={selectedKid.name}
          assignedChores={voiceAssistantChores}
          voiceSettings={voiceSettings}
          onChoreCompleted={handleChoreCompletedViaVoice}
          onSavingsGoalAdded={() => {}}
        />
      </ErrorBoundary>
    </div>
  );
}
