'use client';

interface AchievementBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  bgColor: string;
  iconColor: string;
  isLocked?: boolean;
}

interface WeeklySummaryProps {
  completionRate: number;
  streakDays: number;
  projectedAllowance: number;
}

const ACHIEVEMENT_BADGES: AchievementBadge[] = [
  { id: 'chore-champ', name: 'Chore Champ', description: '10 tasks completed', icon: 'stars', bgColor: 'var(--secondary-container)', iconColor: 'var(--on-secondary-container)' },
  { id: 'early-bird', name: 'Early Bird', description: 'Done before 8 AM', icon: 'wb_sunny', bgColor: 'var(--tertiary-container)', iconColor: 'var(--on-tertiary-container)' },
  { id: 'helping-hand', name: 'Helping Hand', description: 'Helped sibling', icon: 'volunteer_activism', bgColor: 'var(--primary-container)', iconColor: 'var(--on-primary-container)' },
  { id: 'fast-finisher', name: 'Fast Finisher', description: 'Quickest avg time', icon: 'speed', bgColor: 'var(--secondary-fixed)', iconColor: 'var(--on-secondary-fixed-variant)' },
];

function getMotivationalMessage(rate: number, streakDays: number): string {
  const pct = Math.round(rate * 100);
  if (pct === 100) return 'All done! Amazing! 🎉';
  if (pct >= 76) return 'Almost there! 🏆';
  if (pct >= 51) return streakDays > 0 ? 'Great momentum! Keep it up! 🌟' : 'Solid progress! Keep going! 🌟';
  if (pct >= 26) return 'Nice work, keep going! ⭐';
  return "Let's get started! 💪";
}

function DonutChart({ percentage }: { percentage: number }) {
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative w-56 h-56 flex items-center justify-center">
      <svg className="w-full h-full transform -rotate-90">
        <circle
          className="text-surface-container-high"
          cx="112"
          cy="112"
          fill="transparent"
          r={radius}
          stroke="currentColor"
          strokeWidth="20"
        />
        <circle
          className="text-primary rounded-full transition-all duration-500"
          cx="112"
          cy="112"
          fill="transparent"
          r={radius}
          stroke="currentColor"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeWidth="20"
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-headline font-black text-5xl text-on-surface animate-number-count">{percentage}%</span>
        <span className="text-on-surface-variant font-bold text-sm tracking-widest uppercase">Done</span>
      </div>
    </div>
  );
}

function StreakDisplay({ days }: { days: number }) {
  return (
    <div 
      className="flex items-center gap-3 px-6 py-3 rounded-full"
      style={{ 
        backgroundColor: 'rgba(247, 160, 30, 0.1)',
        border: '1.5px solid rgba(130, 80, 0, 0.15)'
      }}
    >
      <span 
        className="material-symbols-outlined animate-streak-flame"
        style={{ 
          color: 'var(--tertiary)',
          fontVariationSettings: '"FILL" 1'
        }}
      >
        local_fire_department
      </span>
      <span className="font-headline font-bold text-lg" style={{ color: 'var(--tertiary)' }}>{days} Day Streak!</span>
    </div>
  );
}

function AchievementBadgeCard({ badge }: { badge: AchievementBadge }) {
  if (badge.isLocked) {
    return (
      <div 
        className="flex flex-col items-center gap-2 p-4 rounded-xl opacity-40 grayscale cursor-not-allowed"
        style={{ backgroundColor: 'var(--surface-container-low)' }}
      >
        <div 
          className="w-14 h-14 rounded-full flex items-center justify-center border-2 border-dashed"
          style={{ borderColor: 'var(--outline)' }}
        >
          <span className="material-symbols-outlined text-outline" style={{ fontVariationSettings: '"FILL" 1' }}>lock</span>
        </div>
        <span className="text-xs font-bold text-center leading-tight" style={{ color: 'var(--on-surface-variant)' }}>Secret Quest</span>
      </div>
    );
  }

  return (
    <div 
      className="flex flex-col items-center gap-2 p-4 rounded-xl cursor-pointer transition-all hover:scale-105"
      style={{ backgroundColor: 'var(--surface-container-low)' }}
    >
      <div 
        className="w-14 h-14 rounded-full flex items-center justify-center shadow-sm"
        style={{ backgroundColor: badge.bgColor }}
      >
        <span 
          className="material-symbols-outlined text-2xl"
          style={{ 
            color: badge.iconColor,
            fontVariationSettings: '"FILL" 1'
          }}
        >
          {badge.icon}
        </span>
      </div>
      <span className="font-headline font-bold text-sm text-on-surface">{badge.name}</span>
      <span className="text-xs text-center leading-tight" style={{ color: 'var(--on-surface-variant)' }}>{badge.description}</span>
    </div>
  );
}

export function WeeklySummary({
  completionRate,
  streakDays,
  projectedAllowance,
}: WeeklySummaryProps) {
  const pct = Math.round(completionRate * 100);
  const formattedAllowance = projectedAllowance.toFixed(2);

  return (
    <div 
      className="p-8 shadow-[0_8px_24px_rgba(0,0,0,0.06)] relative overflow-hidden"
      style={{ 
        backgroundColor: 'var(--surface-container-lowest)',
        borderRadius: '1.5rem'
      }}
    >
      <div 
        className="absolute -right-12 -top-12 w-64 h-64 rounded-full blur-3xl transition-all duration-500"
        style={{ backgroundColor: 'var(--primary-container)', opacity: 0.2 }}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center relative z-10">
        <div className="flex flex-col items-center justify-center space-y-6">
          <DonutChart percentage={pct} />
          <StreakDisplay days={streakDays} />
        </div>

        <div className="text-center md:text-left space-y-4">
          <h2 className="font-headline font-extrabold text-3xl leading-tight" style={{ color: 'var(--on-surface)' }}>
            You earned <span className="px-3 py-1 rounded-lg" style={{ backgroundColor: 'var(--primary-container)', color: 'var(--on-primary-container)' }}>${formattedAllowance}</span> this week!
          </h2>
          <p className="text-lg leading-relaxed" style={{ color: 'var(--on-surface-variant)' }}>
            {getMotivationalMessage(completionRate, streakDays)}
          </p>
          <button 
            className="bg-gradient-to-br text-white px-8 py-4 rounded-full font-headline font-bold text-lg shadow-lg hover:scale-95 active:scale-90 transition-all"
            style={{ 
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)',
              minHeight: '60px'
            }}
          >
            Claim Bonus
          </button>
        </div>
      </div>

      <div className="mt-8 pt-8" style={{ borderTop: '1px solid var(--surface-container-high)' }}>
        <h3 className="font-headline font-bold text-lg mb-6 flex items-center gap-2" style={{ color: 'var(--on-surface)' }}>
          <span className="material-symbols-outlined text-tertiary" style={{ fontVariationSettings: '"FILL" 1' }}>military_tech</span>
          Your Hall of Fame
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {ACHIEVEMENT_BADGES.map((badge) => (
            <AchievementBadgeCard key={badge.id} badge={badge} />
          ))}
        </div>
      </div>
    </div>
  );
}
