'use client';

import type { Achievement } from '@/hooks/useAchievements';

interface AchievementBadgesProps {
  achievements: Achievement[];
}

const BADGE_CONFIG: Record<string, { color: string; bgClass: string; icon: string }> = {
  'first-chore': { color: 'var(--on-primary-container)', bgClass: 'var(--primary-container)', icon: 'star' },
  'full-day': { color: 'var(--on-secondary-container)', bgClass: 'var(--secondary-container)', icon: 'verified' },
  'full-week': { color: 'var(--on-tertiary-container)', bgClass: 'var(--tertiary-container)', icon: 'emoji_events' },
  'streak-7': { color: 'var(--on-primary)', bgClass: 'var(--primary)', icon: 'local_fire_department' },
  'streak-14': { color: 'var(--on-secondary)', bgClass: 'var(--secondary)', icon: 'rocket_launch' },
  'streak-30': { color: 'var(--on-tertiary)', bgClass: 'var(--tertiary)', icon: 'diamond' },
};

function AchievementBadgeItem({ achievement }: { achievement: Achievement }) {
  const config = BADGE_CONFIG[achievement.id] || {
    color: 'var(--on-surface-variant)',
    bgClass: 'var(--surface-container-high)',
    icon: 'star',
  };

  const isLocked = !achievement.earned;

  return (
    <div
      data-testid="achievement-badge"
      className={`
        flex flex-col items-center gap-1.5
        transition-all duration-200
        active:scale-95
        ${achievement.isNew ? 'animate-pop' : ''}
        ${isLocked ? 'grayscale opacity-40' : ''}
      `}
    >
      <div
        className={`
          relative w-14 h-14 rounded-full
          flex items-center justify-center
          ${isLocked ? 'border-2 border-dashed' : 'border-3 border-white shadow-sm'}
        `}
        style={{
          backgroundColor: config.bgClass,
          borderColor: isLocked ? 'var(--outline-variant)' : undefined,
        }}
      >
        <span
          className="material-symbols-outlined text-2xl"
          style={{
            fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24",
            color: config.color,
          }}
        >
          {config.icon}
        </span>
        {isLocked && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-full">
            <span
              className="material-symbols-outlined text-sm"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              lock
            </span>
          </div>
        )}
      </div>
      <span
        className="font-label text-[10px] font-bold text-center leading-tight"
        style={{ color: isLocked ? 'var(--on-surface-variant)' : 'var(--on-surface)' }}
      >
        {achievement.label}
      </span>
    </div>
  );
}

export function AchievementBadges({ achievements }: AchievementBadgesProps) {
  return (
    <div
      data-testid="achievement-badges"
      className="bg-surface-container-lowest rounded-xl p-5 shadow-card"
    >
      <h3 className="font-headline text-base font-bold text-on-surface mb-3 flex items-center gap-2">
        <span className="material-symbols-outlined text-lg text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>
          military_tech
        </span>
        Your Hall of Fame
      </h3>
      <div className="flex gap-4 overflow-x-auto no-scrollbar">
        {achievements.map((achievement) => (
          <AchievementBadgeItem key={achievement.id} achievement={achievement} />
        ))}
      </div>
    </div>
  );
}
