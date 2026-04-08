'use client';

import { useState, useCallback } from 'react';

interface UseToggleCompletionResult {
  toggle: (assignmentId: string, date: string, newState: boolean) => Promise<void>;
  error: string | null;
  isPending: boolean;
}

export function useToggleCompletion(refetch: () => void): UseToggleCompletionResult {
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const toggle = useCallback(
    async (assignmentId: string, date: string, newState: boolean) => {
      setError(null);
      setIsPending(true);

      // Optimistic: caller should update local state before calling toggle.
      // On failure we call refetch to revert to server truth.
      try {
        const res = await fetch('/api/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assignmentId, date, completed: newState }),
        });

        if (!res.ok) {
          throw new Error('Failed to toggle completion');
        }

        // Refetch to sync server state after successful toggle
        refetch();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to save. Try again.';
        setError(message);
        // Revert by refetching server state
        refetch();
      } finally {
        setIsPending(false);
      }
    },
    [refetch]
  );

  return { toggle, error, isPending };
}
