import { z } from 'zod';

const DEFAULT_ADMIN_SESSION_TIMEOUT_MINUTES = 5;
const MILLISECONDS_PER_MINUTE = 60_000;

const adminSessionSchema = z.object({
  expiresAt: z.number().finite().positive(),
});

export function getAdminSessionTimeoutMs(configuredMinutes: string | undefined): number {
  const minutes = Number(configuredMinutes);
  const timeoutMs = minutes * MILLISECONDS_PER_MINUTE;

  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return DEFAULT_ADMIN_SESSION_TIMEOUT_MINUTES * MILLISECONDS_PER_MINUTE;
  }

  return timeoutMs;
}

export function serializeAdminSession(expiresAt: number): string {
  return JSON.stringify({ expiresAt });
}

export function readAdminSessionExpiration(
  storedSession: string | null,
  now: number = Date.now(),
): number | null {
  if (!storedSession) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(storedSession);
    const { expiresAt } = adminSessionSchema.parse(parsed);
    return expiresAt > now ? expiresAt : null;
  } catch {
    return null;
  }
}
