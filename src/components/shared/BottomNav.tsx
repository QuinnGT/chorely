'use client';

export type NavTab = 'play' | 'goals' | 'store' | 'parent';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

const TABS: { id: NavTab; label: string; icon: string }[] = [
  { id: 'play', label: 'Play', icon: 'videogame_asset' },
  { id: 'goals', label: 'Goals', icon: 'savings' },
  { id: 'store', label: 'Store', icon: 'storefront' },
  { id: 'parent', label: 'Parent', icon: 'supervisor_account' },
];

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav 
      className="lg:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-6 pt-2 shadow-[0_-8px_24px_rgba(0,0,0,0.06)] rounded-t-[3rem]"
      style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
      }}
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center justify-center p-2 transition-all duration-200 ${
              isActive 
                ? 'bg-gradient-to-br from-primary to-primary-container text-white rounded-full shadow-lg -translate-y-2' 
                : 'text-slate-400'
            }`}
            style={{
              minWidth: '64px',
              minHeight: '64px',
            }}
          >
            <span 
              className="material-symbols-outlined text-3xl"
              style={{ 
                fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24",
                transition: 'transform 200ms ease'
              }}
            >
              {tab.icon}
            </span>
            <span className="font-label text-xs font-bold uppercase tracking-wider mt-1">
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
