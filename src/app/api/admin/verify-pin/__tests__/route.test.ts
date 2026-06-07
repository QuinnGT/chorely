import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
  },
}));

import { POST } from '../route';
import { db } from '@/db';

const originalEnv = process.env;
const mockSelect = db.select as ReturnType<typeof vi.fn>;
let requestNumber = 0;

function mockStoredPin(pin: string): void {
  const where = vi.fn().mockResolvedValue([{ value: pin }]);
  const from = vi.fn().mockReturnValue({ where });
  mockSelect.mockReturnValue({ from });
}

function createRequest(pin: string): Request {
  requestNumber += 1;
  return new Request('http://localhost/api/admin/verify-pin', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': `test-client-${requestNumber}`,
    },
    body: JSON.stringify({ pin }),
  });
}

describe('POST /api/admin/verify-pin session timeout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    mockStoredPin('1234');
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('returns the configured admin session timeout', async () => {
    process.env.ADMIN_PIN_SESSION_TIMEOUT_MINUTES = '10';

    const response = await POST(createRequest('1234'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      sessionTimeoutMs: 600_000,
    });
  });

  test('defaults the admin session timeout to five minutes', async () => {
    delete process.env.ADMIN_PIN_SESSION_TIMEOUT_MINUTES;

    const response = await POST(createRequest('1234'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      sessionTimeoutMs: 300_000,
    });
  });
});
