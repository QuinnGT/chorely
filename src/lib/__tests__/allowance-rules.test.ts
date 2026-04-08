import { describe, test, expect, vi, beforeEach } from 'vitest';
import { DEFAULT_RULES } from '@/lib/allowance-rules';

// Mock the db module
vi.mock('@/db', () => ({
  db: {
    query: {
      allowanceRules: {
        findFirst: vi.fn(),
      },
    },
  },
}));

import { db } from '@/db';
import { loadAllowanceRules } from '@/lib/allowance-rules';

const mockFindFirst = db.query.allowanceRules.findFirst as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockFindFirst.mockReset();
});

describe('DEFAULT_RULES', () => {
  test('has expected default values ($5/$3/$3/7 days)', () => {
    expect(DEFAULT_RULES).toEqual({
      fullCompletionAmount: 5.0,
      partialCompletionAmount: 3.0,
      streakBonusAmount: 3.0,
      minStreakDays: 7,
    });
  });
});

describe('loadAllowanceRules', () => {
  test('returns default rules when no database record exists', async () => {
    mockFindFirst.mockResolvedValue(undefined);

    const rules = await loadAllowanceRules('some-kid-id');

    expect(rules).toEqual(DEFAULT_RULES);
    expect(mockFindFirst).toHaveBeenCalledOnce();
  });

  test('returns a new object (not the same reference) for defaults', async () => {
    mockFindFirst.mockResolvedValue(undefined);

    const rules = await loadAllowanceRules('kid-1');

    expect(rules).toEqual(DEFAULT_RULES);
    expect(rules).not.toBe(DEFAULT_RULES);
  });

  test('returns rules from database when record exists', async () => {
    mockFindFirst.mockResolvedValue({
      id: 'rule-1',
      kidId: 'kid-1',
      fullCompletionAmount: '10.00',
      partialCompletionAmount: '6.00',
      streakBonusAmount: '4.50',
      minStreakDays: 14,
      updatedAt: new Date(),
    });

    const rules = await loadAllowanceRules('kid-1');

    expect(rules).toEqual({
      fullCompletionAmount: 10.0,
      partialCompletionAmount: 6.0,
      streakBonusAmount: 4.5,
      minStreakDays: 14,
    });
  });

  test('converts numeric string columns to numbers', async () => {
    mockFindFirst.mockResolvedValue({
      id: 'rule-2',
      kidId: 'kid-2',
      fullCompletionAmount: '7.25',
      partialCompletionAmount: '2.50',
      streakBonusAmount: '1.75',
      minStreakDays: 3,
      updatedAt: new Date(),
    });

    const rules = await loadAllowanceRules('kid-2');

    expect(typeof rules.fullCompletionAmount).toBe('number');
    expect(typeof rules.partialCompletionAmount).toBe('number');
    expect(typeof rules.streakBonusAmount).toBe('number');
    expect(typeof rules.minStreakDays).toBe('number');
    expect(rules.fullCompletionAmount).toBe(7.25);
    expect(rules.partialCompletionAmount).toBe(2.5);
    expect(rules.streakBonusAmount).toBe(1.75);
    expect(rules.minStreakDays).toBe(3);
  });

  test('queries with the provided kidId', async () => {
    mockFindFirst.mockResolvedValue(undefined);

    await loadAllowanceRules('specific-kid-id');

    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.anything() }),
    );
  });
});
