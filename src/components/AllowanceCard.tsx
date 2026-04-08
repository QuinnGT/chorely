'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface AllowanceHistoryEntry {
  id: string;
  weekStart: string;
  earned: string;
  bonusEarned: string;
  paid: boolean;
  paidAt: string | null;
}

interface AllowanceCardProps {
  currentWeekTotal: number;
  baseEarnings: number;
  streakBonus: number;
  streakDays: number;
  history: AllowanceHistoryEntry[];
  payoutThreshold?: number;
  onRequestPayout?: () => void;
  onMarkPaid?: (id: string) => void;
  markPaid?: (id: string) => void;
}

export type { AllowanceHistoryEntry, AllowanceCardProps };

export function AllowanceCard({
  currentWeekTotal,
  streakDays,
}: AllowanceCardProps) {
  const router = useRouter();
  const prevTotalRef = useRef(currentWeekTotal);
  const [animateTotal, setAnimateTotal] = useState(false);

  useEffect(() => {
    if (currentWeekTotal !== prevTotalRef.current) {
      setAnimateTotal(true);
      const timer = setTimeout(() => setAnimateTotal(false), 400);
      prevTotalRef.current = currentWeekTotal;
      return () => clearTimeout(timer);
    }
  }, [currentWeekTotal]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleMarkPaid = useCallback(() => {}, []);
  void handleMarkPaid;

  return (
    <div
      className="relative rounded-xl overflow-hidden p-6"
      style={{
        background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dim) 100%)',
      }}
      data-testid="allowance-card"
    >
      {/* Decorative piggy bank icon */}
      <div className="absolute -right-4 -top-2 opacity-20">
        <span className="material-symbols-outlined text-7xl text-white" style={{ fontVariationSettings: "'FILL' 1" }}>
          savings
        </span>
      </div>

      <div className="relative z-10">
        <p className="font-label text-[10px] font-bold uppercase tracking-widest text-white/70 mb-1">
          Total Allowance
        </p>
        <div className="flex items-baseline gap-2 mb-4">
          <span
            data-testid="total-earnings"
            className={`font-headline font-black text-white ${animateTotal ? 'animate-number-count' : ''}`}
            style={{ fontSize: 'clamp(2rem, 6vw, 3rem)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}
          >
            {formatCurrency(currentWeekTotal)}
          </span>
          {streakDays > 0 && (
            <span className="material-symbols-outlined text-xl text-tertiary-container" style={{ fontVariationSettings: "'FILL' 1" }}>
              trending_up
            </span>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.push('/earnings')}
            className="flex-1 flex items-center justify-center gap-2 rounded-full py-2.5 font-label text-xs font-bold uppercase tracking-wider bg-white/20 text-white border border-white/30 active:scale-95 transition-transform"
            style={{ backdropFilter: 'blur(8px)' }}
          >
            View History
          </button>
          <button
            type="button"
            onClick={() => router.push('/store')}
            className="flex-1 flex items-center justify-center gap-2 rounded-full py-2.5 font-label text-xs font-bold uppercase tracking-wider bg-white/20 text-white border border-white/30 active:scale-95 transition-transform"
            style={{ backdropFilter: 'blur(8px)' }}
          >
            Go to Store
          </button>
        </div>
      </div>
    </div>
  );
}
