'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ProfileSelector } from '@/components/ProfileSelector';
import { useKid, type Kid } from '@/contexts/KidContext';

export default function HomePage() {
  const router = useRouter();
  const { selectKid } = useKid();

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

  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <ProfileSelector onSelectKid={handleSelectKid} onParentTap={handleParentTap} />
    </main>
  );
}
