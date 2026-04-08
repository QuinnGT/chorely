'use client';

import { useState, useEffect, useCallback } from 'react';

interface CurrentWeek {
  base: number;
  bonus: number;
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

interface UseAllowanceResult {
  currentWeek: CurrentWeek | null;
  history: AllowanceRecord[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  markPaid: (id: string) => void;
}

export function useAllowance(kidId: string): UseAllowanceResult {
  const [currentWeek, setCurrentWeek] = useState<CurrentWeek | null>(null);
  const [history, setHistory] = useState<AllowanceRecord[]>([]);
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
        };

        if (!cancelled) {
          setCurrentWeek(data.currentWeek);
          setHistory(data.history);
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

  return { currentWeek, history, isLoading, error, refetch, markPaid };
}
