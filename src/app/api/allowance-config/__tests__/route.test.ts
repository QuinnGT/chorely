import { describe, test, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing the route
vi.mock('@/lib/allowance-rules', () => ({
  loadAllowanceRules: vi.fn(),
}));

vi.mock('@/db', () => ({
  db: {
    insert: vi.fn(),
  },
}));

import { GET, PUT } from '../route';
import { loadAllowanceRules } from '@/lib/allowance-rules';
import { db } from '@/db';

const mockLoadAllowanceRules = loadAllowanceRules as ReturnType<typeof vi.fn>;
const mockInsert = db.insert as ReturnType<typeof vi.fn>;

function createRequest(url: string, options?: RequestInit): Request {
  return new Request(url, options);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/allowance-config', () => {
  test('returns 400 when kidId is missing', async () => {
    const request = createRequest('http://localhost/api/allowance-config');
    const response = await GET(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('kidId is required');
  });

  test('returns default rules when no custom rules exist', async () => {
    const defaults = {
      fullCompletionAmount: 5.0,
      partialCompletionAmount: 3.0,
      streakBonusAmount: 3.0,
      minStreakDays: 7,
    };
    mockLoadAllowanceRules.mockResolvedValue(defaults);

    const request = createRequest(
      'http://localhost/api/allowance-config?kidId=550e8400-e29b-41d4-a716-446655440000'
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(defaults);
    expect(mockLoadAllowanceRules).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440000'
    );
  });

  test('returns custom rules from database', async () => {
    const customRules = {
      fullCompletionAmount: 10.0,
      partialCompletionAmount: 6.0,
      streakBonusAmount: 4.5,
      minStreakDays: 14,
    };
    mockLoadAllowanceRules.mockResolvedValue(customRules);

    const request = createRequest(
      'http://localhost/api/allowance-config?kidId=550e8400-e29b-41d4-a716-446655440000'
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(customRules);
  });

  test('returns 500 on database error', async () => {
    mockLoadAllowanceRules.mockRejectedValue(new Error('DB connection failed'));

    const request = createRequest(
      'http://localhost/api/allowance-config?kidId=550e8400-e29b-41d4-a716-446655440000'
    );
    const response = await GET(request);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Failed to fetch allowance config');
  });
});

describe('PUT /api/allowance-config', () => {
  const validPayload = {
    kidId: '550e8400-e29b-41d4-a716-446655440000',
    fullCompletionAmount: 8.0,
    partialCompletionAmount: 4.0,
    streakBonusAmount: 2.5,
    minStreakDays: 10,
  };

  function setupMockInsert(returnRecord: Record<string, unknown>) {
    const mockReturning = vi.fn().mockResolvedValue([returnRecord]);
    const mockOnConflict = vi.fn().mockReturnValue({ returning: mockReturning });
    const mockValues = vi.fn().mockReturnValue({ onConflictDoUpdate: mockOnConflict });
    mockInsert.mockReturnValue({ values: mockValues });
    return { mockValues, mockOnConflict, mockReturning };
  }

  test('upserts valid rules and returns numeric values', async () => {
    setupMockInsert({
      id: 'rule-1',
      kidId: validPayload.kidId,
      fullCompletionAmount: '8.00',
      partialCompletionAmount: '4.00',
      streakBonusAmount: '2.50',
      minStreakDays: 10,
      updatedAt: new Date(),
    });

    const request = createRequest('http://localhost/api/allowance-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPayload),
    });
    const response = await PUT(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      fullCompletionAmount: 8.0,
      partialCompletionAmount: 4.0,
      streakBonusAmount: 2.5,
      minStreakDays: 10,
    });
  });

  test('returns 400 with field errors when partial exceeds full', async () => {
    const request = createRequest('http://localhost/api/allowance-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...validPayload,
        partialCompletionAmount: 20.0,
        fullCompletionAmount: 5.0,
      }),
    });
    const response = await PUT(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Validation failed');
    expect(body.details).toHaveProperty('partialCompletionAmount');
    expect(body.details.partialCompletionAmount).toContain(
      'Partial completion amount cannot exceed full completion amount'
    );
  });

  test('returns 400 when kidId is missing', async () => {
    const { kidId, ...noKidId } = validPayload;
    const request = createRequest('http://localhost/api/allowance-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(noKidId),
    });
    const response = await PUT(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Validation failed');
    expect(body.details).toHaveProperty('kidId');
  });

  test('returns 400 when monetary amount is negative', async () => {
    const request = createRequest('http://localhost/api/allowance-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...validPayload,
        fullCompletionAmount: -1.0,
      }),
    });
    const response = await PUT(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Validation failed');
    expect(body.details).toHaveProperty('fullCompletionAmount');
  });

  test('returns 400 when minStreakDays is out of range', async () => {
    const request = createRequest('http://localhost/api/allowance-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...validPayload,
        minStreakDays: 0,
      }),
    });
    const response = await PUT(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Validation failed');
    expect(body.details).toHaveProperty('minStreakDays');
  });

  test('returns 400 when monetary amount has more than 2 decimal places', async () => {
    const request = createRequest('http://localhost/api/allowance-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...validPayload,
        fullCompletionAmount: 5.123,
      }),
    });
    const response = await PUT(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Validation failed');
  });

  test('returns 500 on database error during upsert', async () => {
    const mockValues = vi.fn().mockReturnValue({
      onConflictDoUpdate: vi.fn().mockReturnValue({
        returning: vi.fn().mockRejectedValue(new Error('DB write failed')),
      }),
    });
    mockInsert.mockReturnValue({ values: mockValues });

    const request = createRequest('http://localhost/api/allowance-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPayload),
    });
    const response = await PUT(request);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Failed to save allowance config');
  });
});
