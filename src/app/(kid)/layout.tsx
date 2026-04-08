'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useKid } from '@/contexts/KidContext';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/shared/BottomNav';
import type { NavTab } from '@/components/shared/BottomNav';

export default function KidLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { selectedKid, isHydrated, clearKid } = useKid();
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    if (isHydrated && !selectedKid) {
      router.push('/');
    }
  }, [selectedKid, isHydrated, router]);

  const activeTab: NavTab = pathname?.includes('/store') ? 'store' : pathname?.includes('/goals') ? 'goals' : pathname?.includes('/earnings') ? 'goals' : 'play';

  const handleSwitchProfile = useCallback(() => {
    setTransitioning(true);
    setTimeout(() => {
      clearKid();
      router.push('/');
    }, 250);
  }, [clearKid, router]);

  const handleSettingsTap = useCallback(() => {
    router.push('/admin');
  }, [router]);

  const handleTabChange = useCallback(
    (tab: NavTab) => {
      if (tab === 'parent') {
        router.push('/admin');
        return;
      }

      if (tab === 'play') {
        router.push('/dashboard');
      } else if (tab === 'store') {
        router.push('/store');
      } else if (tab === 'goals') {
        router.push('/goals');
      }
    },
    [router],
  );

  if (!isHydrated || !selectedKid) {
    return null;
  }

  return (
    <div className={`min-h-dvh overflow-hidden ${transitioning ? 'animate-slide-fade-out' : 'animate-slide-fade-in'}`}>
      <Header
        kid={selectedKid}
        weekRange=""
        streakDays={0}
        onSwitchProfile={handleSwitchProfile}
        onSettingsTap={handleSettingsTap}
      />

      <div className="pt-20 pb-24 lg:pb-4 px-4">
        {children}
      </div>

      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
}
