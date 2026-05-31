'use client';

import { useState, useEffect, useCallback } from 'react';

interface CurrentWeek {
  base: number;
  bonus: number;
  bigBossBonus: number;
  total: number;
  streakDays: number;
  completionRate: number;
}

interface AllowanceRecord {
  id: string;
  weekStart: string;
  earned: string;
  bonusEarned: string;
  paid: boolean;
  paidAt: string | null;
}

export interface JarInfo {
  id: string;
  name: string;
  kind: 'spend' | 'save' | 'give' | 'other';
  percentage: number;
  inflow: number;
  balance: number;
}

export interface WalletInfo {
  mode: 'wallet' | 'jars';
  lifetimeEarned: number;
  storeSpent: number;
  totalHoldings: number;
  storeBalance: number;
  goalAvailable: number;
  jars: JarInfo[];
  goals: { id: string; manualAmount: number; savedAmount: number }[];
}

interface UseAllowanceResult {
  currentWeek: CurrentWeek | null;
  history: AllowanceRecord[];
  spendableBalance: number;
  wallet: WalletInfo | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  markPaid: (id: string) => void;
}

export function useAllowance(kidId: string): UseAllowanceResult {
  const [currentWeek, setCurrentWeek] = useState<CurrentWeek | null>(null);
  const [history, setHistory] = useState<AllowanceRecord[]>([]);
  const [spendableBalance, setSpendableBalance] = useState(0);
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);

  const refetch = useCallback(() => {
    setFetchKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!kidId) return;
    let cancelled = false;

    async function fetchAllowance() {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/allowance?kidId=${kidId}`);
        if (!res.ok) throw new Error('Failed to fetch allowance');

        const data = (await res.json()) as {
          currentWeek: CurrentWeek;
          history: AllowanceRecord[];
          spendableBalance?: number;
          wallet?: WalletInfo;
        };

        if (!cancelled) {
          setCurrentWeek(data.currentWeek);
          setHistory(data.history);
          setSpendableBalance(Number(data.spendableBalance ?? 0));
          setWallet(data.wallet ?? null);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load allowance';
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchAllowance();

    return () => {
      cancelled = true;
    };
  }, [kidId, fetchKey]);

  const markPaid = useCallback(async (id: string) => {
    const previousHistory = history;

    // Optimistic update
    setHistory((prev) =>
      prev.map((entry) =>
        entry.id === id
          ? { ...entry, paid: true, paidAt: new Date().toISOString() }
          : entry
      )
    );
    setError(null);

    try {
      const res = await fetch('/api/allowance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) {
        throw new Error('Failed to mark allowance as paid');
      }
    } catch (err: unknown) {
      // Revert on failure
      setHistory(previousHistory);
      const message =
        err instanceof Error ? err.message : 'Failed to mark allowance as paid';
      setError(message);
    }
  }, [history]);

  return { currentWeek, history, spendableBalance, wallet, isLoading, error, refetch, markPaid };
}
