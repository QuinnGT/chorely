'use client';

import { useState, useCallback } from 'react';

type AuthStatus = 'idle' | 'verifying' | 'authenticated' | 'error';

interface UseAdminAuthResult {
  status: AuthStatus;
  verify: (pin: string) => Promise<void>;
  error: string | null;
  sessionTimeoutMs: number | null;
}

export function useAdminAuth(): UseAdminAuthResult {
  const [status, setStatus] = useState<AuthStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [sessionTimeoutMs, setSessionTimeoutMs] = useState<number | null>(null);

  const verify = useCallback(async (pin: string) => {
    setStatus('verifying');
    setError(null);

    try {
      const res = await fetch('/api/admin/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        const message = data.error ?? 'Invalid PIN';
        setError(message);
        setStatus('error');
        return;
      }

      const data: unknown = await res.json();
      if (
        typeof data !== 'object' ||
        data === null ||
        !('sessionTimeoutMs' in data) ||
        typeof data.sessionTimeoutMs !== 'number' ||
        !Number.isFinite(data.sessionTimeoutMs) ||
        data.sessionTimeoutMs <= 0
      ) {
        setError('Invalid session configuration');
        setStatus('error');
        return;
      }

      setSessionTimeoutMs(data.sessionTimeoutMs);
      setStatus('authenticated');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Can't connect. Check your network.";
      setError(message);
      setStatus('error');
    }
  }, []);

  return { status, verify, error, sessionTimeoutMs };
}
