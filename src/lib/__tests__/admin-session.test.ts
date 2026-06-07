import { describe, expect, test } from 'vitest';
import {
  getAdminSessionTimeoutMs,
  readAdminSessionExpiration,
  serializeAdminSession,
} from '@/lib/admin-session';

describe('admin session helpers', () => {
  test('defaults to five minutes when the timeout is not configured', () => {
    expect(getAdminSessionTimeoutMs(undefined)).toBe(300_000);
  });

  test('converts configured timeout minutes to milliseconds', () => {
    expect(getAdminSessionTimeoutMs('10')).toBe(600_000);
  });

  test('falls back to five minutes for invalid timeout values', () => {
    expect(getAdminSessionTimeoutMs('0')).toBe(300_000);
    expect(getAdminSessionTimeoutMs('-1')).toBe(300_000);
    expect(getAdminSessionTimeoutMs('not-a-number')).toBe(300_000);
    expect(getAdminSessionTimeoutMs('1e308')).toBe(300_000);
  });

  test('returns the expiration for an active stored session', () => {
    expect(readAdminSessionExpiration(serializeAdminSession(400_000), 100_000)).toBe(400_000);
  });

  test('rejects expired, malformed, and legacy stored sessions', () => {
    expect(readAdminSessionExpiration(serializeAdminSession(100_000), 100_000)).toBeNull();
    expect(readAdminSessionExpiration('not-json', 100_000)).toBeNull();
    expect(readAdminSessionExpiration('true', 100_000)).toBeNull();
  });
});
