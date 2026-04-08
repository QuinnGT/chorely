'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ProfileSelector } from '@/components/ProfileSelector';
import { useKid, type Kid } from '@/contexts/KidContext';

export default function HomePage() {
  const router = useRouter();
  const { selectKid } = useKid();
  const [showAddToast, setShowAddToast] = useState(false);

  const handleSelectKid = useCallback(
    (kid: Kid) => {
      selectKid(kid);
      router.push('/dashboard');
    },
    [selectKid, router]
  );

  const handleParentTap = useCallback(() => {
    router.push('/admin');
  }, [router]);

  const handleAddMember = useCallback(() => {
    setShowAddToast(true);
    setTimeout(() => setShowAddToast(false), 3000);
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <ProfileSelector onSelectKid={handleSelectKid} onParentTap={handleParentTap} onAddMember={handleAddMember} />

      {showAddToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-slide-fade-in">
          <div className="glass-card px-6 py-4 rounded-xl shadow-lg flex items-center gap-3">
            <span
              className="material-symbols-outlined text-primary"
              style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
            >
              info
            </span>
            <p className="font-body font-medium text-on-surface whitespace-nowrap">
              Add kids from the Parent Admin panel
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
