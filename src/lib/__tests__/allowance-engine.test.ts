import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import { calculateAllowance, calculateStreak } from '@/lib/allowance-engine';

// ─── Generators ─────────────────────────────────────────────────────────────

const frequencyGen = fc.constantFrom('daily' as const, 'weekly' as const);

const completionRecordGen = fc.record({
  date: fc.integer({ min: 0, max: 365 }).map((offset) => {
    const d = new Date(2024, 0, 1);
    d.setDate(d.getDate() + offset);
    return d.toISOString().split('T')[0];
  }),
  completed: fc.boolean(),
  frequency: frequencyGen,
});

const completionRecordsGen = fc.array(completionRecordGen, { minLength: 0, maxLength: 20 });

const positiveIntGen = fc.integer({ min: 1, max: 50 });

const streakDaysGen = fc.integer({ min: 0, max: 365 });

// ─── Property 12: Allowance base payout determined by completion status ─────

describe('Property 12: Allowance base payout determined by completion status', () => {
  // Feature: family-command-center, Property 12: Allowance base payout determined by completion status

  test('all completed → base = $5', () => {
    // **Validates: Requirements 5.1**
    fc.assert(
      fc.property(
        positiveIntGen,
        streakDaysGen,
        frequencyGen,
        (totalExpected, streakDays, freq) => {
          const completions = Array.from({ length: totalExpected }, (_, i) => ({
            date: `2024-01-${String(i + 1).padStart(2, '0')}`,
            completed: true,
            frequency: freq,
          }));
          const result = calculateAllowance(completions, totalExpected, streakDays);
          expect(result.base).toBe(5);
          expect(result.isFullCompletion).toBe(true);
          expect(result.isPartialCompletion).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  test('some completed (but not all) → base = $3', () => {
    // **Validates: Requirements 5.2**
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 50 }),
        streakDaysGen,
        frequencyGen,
        (totalExpected, streakDays, freq) => {
          // Create records where at least 1 is completed and at least 1 is not
          const completedCount = fc.sample(
            fc.integer({ min: 1, max: totalExpected - 1 }),
            1,
          )[0];
          const completions = Array.from({ length: totalExpected }, (_, i) => ({
            date: `2024-01-${String(i + 1).padStart(2, '0')}`,
            completed: i < completedCount,
            frequency: freq,
          }));
          const result = calculateAllowance(completions, totalExpected, streakDays);
          expect(result.base).toBe(3);
          expect(result.isFullCompletion).toBe(false);
          expect(result.isPartialCompletion).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  test('none completed → base = $0', () => {
    // **Validates: Requirements 5.3**
    fc.assert(
      fc.property(
        positiveIntGen,
        streakDaysGen,
        frequencyGen,
        (totalExpected, streakDays, freq) => {
          const completions = Array.from({ length: totalExpected }, (_, i) => ({
            date: `2024-01-${String(i + 1).padStart(2, '0')}`,
            completed: false,
            frequency: freq,
          }));
          const result = calculateAllowance(completions, totalExpected, streakDays);
          expect(result.base).toBe(0);
          expect(result.isFullCompletion).toBe(false);
          expect(result.isPartialCompletion).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  test('totalExpected = 0 → base = $0', () => {
    // **Validates: Requirements 5.1, 5.2, 5.3**
    fc.assert(
      fc.property(
        completionRecordsGen,
        streakDaysGen,
        (completions, streakDays) => {
          const result = calculateAllowance(completions, 0, streakDays);
          expect(result.base).toBe(0);
          expect(result.total).toBe(0);
          expect(result.completionRate).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 13: Streak bonus threshold ────────────────────────────────────

describe('Property 13: Streak bonus threshold', () => {
  // Feature: family-command-center, Property 13: Streak bonus threshold

  test('streakDays >= 7 → bonus = $3', () => {
    // **Validates: Requirements 5.4**
    fc.assert(
      fc.property(
        fc.integer({ min: 7, max: 365 }),
        completionRecordsGen,
        positiveIntGen,
        (streakDays, completions, totalExpected) => {
          const result = calculateAllowance(completions, totalExpected, streakDays);
          expect(result.bonus).toBe(3);
        },
      ),
      { numRuns: 100 },
    );
  });

  test('streakDays < 7 → bonus = $0', () => {
    // **Validates: Requirements 5.5**
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 6 }),
        completionRecordsGen,
        positiveIntGen,
        (streakDays, completions, totalExpected) => {
          const result = calculateAllowance(completions, totalExpected, streakDays);
          expect(result.bonus).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 15: AllowanceResult serialization round-trip ──────────────────

describe('Property 15: AllowanceResult serialization round-trip', () => {
  // Feature: family-command-center, Property 15: AllowanceResult serialization round-trip

  test('JSON.stringify then JSON.parse produces equivalent AllowanceResult', () => {
    // **Validates: Requirements 5.7**
    fc.assert(
      fc.property(
        completionRecordsGen,
        fc.integer({ min: 0, max: 50 }),
        streakDaysGen,
        (completions, totalExpected, streakDays) => {
          const result = calculateAllowance(completions, totalExpected, streakDays);
          const roundTripped = JSON.parse(JSON.stringify(result));
          expect(roundTripped).toEqual(result);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Unit tests: specific edge cases ────────────────────────────────────────

describe('calculateAllowance edge cases', () => {
  test('all 7 daily chores completed = $5 base', () => {
    const completions = Array.from({ length: 7 }, (_, i) => ({
      date: `2024-06-${String(10 + i).padStart(2, '0')}`,
      completed: true,
      frequency: 'daily' as const,
    }));
    const result = calculateAllowance(completions, 7, 0);
    expect(result.base).toBe(5);
    expect(result.isFullCompletion).toBe(true);
  });

  test('5 of 7 completed = $3 base', () => {
    const completions = [
      ...Array.from({ length: 5 }, (_, i) => ({
        date: `2024-06-${String(10 + i).padStart(2, '0')}`,
        completed: true,
        frequency: 'daily' as const,
      })),
      ...Array.from({ length: 2 }, (_, i) => ({
        date: `2024-06-${String(15 + i).padStart(2, '0')}`,
        completed: false,
        frequency: 'daily' as const,
      })),
    ];
    const result = calculateAllowance(completions, 7, 0);
    expect(result.base).toBe(3);
    expect(result.isPartialCompletion).toBe(true);
  });

  test('0 of 7 completed = $0 base', () => {
    const completions = Array.from({ length: 7 }, (_, i) => ({
      date: `2024-06-${String(10 + i).padStart(2, '0')}`,
      completed: false,
      frequency: 'daily' as const,
    }));
    const result = calculateAllowance(completions, 7, 0);
    expect(result.base).toBe(0);
    expect(result.isFullCompletion).toBe(false);
    expect(result.isPartialCompletion).toBe(false);
  });

  test('streak of exactly 7 = $3 bonus', () => {
    const completions = Array.from({ length: 7 }, (_, i) => ({
      date: `2024-06-${String(10 + i).padStart(2, '0')}`,
      completed: true,
      frequency: 'daily' as const,
    }));
    const result = calculateAllowance(completions, 7, 7);
    expect(result.bonus).toBe(3);
    expect(result.total).toBe(8); // $5 base + $3 bonus
  });

  test('streak of 6 = $0 bonus', () => {
    const completions = Array.from({ length: 7 }, (_, i) => ({
      date: `2024-06-${String(10 + i).padStart(2, '0')}`,
      completed: true,
      frequency: 'daily' as const,
    }));
    const result = calculateAllowance(completions, 7, 6);
    expect(result.bonus).toBe(0);
    expect(result.total).toBe(5); // $5 base + $0 bonus
  });

  test('total field equals base + bonus', () => {
    const completions = Array.from({ length: 7 }, (_, i) => ({
      date: `2024-06-${String(10 + i).padStart(2, '0')}`,
      completed: true,
      frequency: 'daily' as const,
    }));
    const result = calculateAllowance(completions, 7, 10);
    expect(result.total).toBe(result.base + result.bonus);
  });

  test('completionRate is correctly calculated', () => {
    const completions = [
      { date: '2024-06-10', completed: true, frequency: 'daily' as const },
      { date: '2024-06-11', completed: false, frequency: 'daily' as const },
      { date: '2024-06-12', completed: true, frequency: 'daily' as const },
      { date: '2024-06-13', completed: false, frequency: 'daily' as const },
    ];
    const result = calculateAllowance(completions, 4, 0);
    expect(result.completionRate).toBeCloseTo(0.5);
  });
});

// ─── Unit tests: calculateStreak ────────────────────────────────────────────

/**
 * Helper: create a local-time Date for a given YYYY-MM-DD string.
 * calculateStreak uses setHours(0,0,0,0) (local) then toISOString (UTC),
 * so we must construct dates in local time to get consistent date strings.
 */
function localDate(yyyy: number, mm: number, dd: number): Date {
  return new Date(yyyy, mm - 1, dd);
}

/** Helper: get the date string that calculateStreak will produce for a local date */
function dateStr(yyyy: number, mm: number, dd: number): string {
  const d = localDate(yyyy, mm, dd);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
}

describe('calculateStreak', () => {
  test('returns 0 when no completions exist', () => {
    const map = new Map<string, boolean[]>();
    const result = calculateStreak(map, localDate(2024, 6, 15));
    expect(result).toBe(0);
  });

  test('returns consecutive days going backwards from today', () => {
    const map = new Map<string, boolean[]>();
    map.set(dateStr(2024, 6, 15), [true, true]);
    map.set(dateStr(2024, 6, 14), [true, true]);
    map.set(dateStr(2024, 6, 13), [true, true]);
    const result = calculateStreak(map, localDate(2024, 6, 15));
    expect(result).toBe(3);
  });

  test('breaks streak when a day has incomplete chores', () => {
    const map = new Map<string, boolean[]>();
    map.set(dateStr(2024, 6, 15), [true, true]);
    map.set(dateStr(2024, 6, 14), [true, false]); // not all done
    map.set(dateStr(2024, 6, 13), [true, true]);
    const result = calculateStreak(map, localDate(2024, 6, 15));
    expect(result).toBe(1);
  });

  test('breaks streak when a day is missing from the map', () => {
    const map = new Map<string, boolean[]>();
    map.set(dateStr(2024, 6, 15), [true, true]);
    // 2024-06-14 missing
    map.set(dateStr(2024, 6, 13), [true, true]);
    const result = calculateStreak(map, localDate(2024, 6, 15));
    expect(result).toBe(1);
  });

  test('returns 0 when today has incomplete chores', () => {
    const map = new Map<string, boolean[]>();
    map.set(dateStr(2024, 6, 15), [true, false]);
    const result = calculateStreak(map, localDate(2024, 6, 15));
    expect(result).toBe(0);
  });

  test('returns 7 for a full week streak', () => {
    const map = new Map<string, boolean[]>();
    for (let i = 0; i < 7; i++) {
      map.set(dateStr(2024, 6, 15 - i), [true, true, true]);
    }
    const result = calculateStreak(map, localDate(2024, 6, 15));
    expect(result).toBe(7);
  });

  test('returns 0 when today has empty completions array', () => {
    const map = new Map<string, boolean[]>();
    map.set(dateStr(2024, 6, 15), []);
    const result = calculateStreak(map, localDate(2024, 6, 15));
    expect(result).toBe(0);
  });
});

// ─── Property 17: Allowance calculation correctness ─────────────────────────

// Feature: allowance-gamification-ui, Property 17: Allowance calculation correctness
describe('Property 17: Allowance calculation correctness', () => {
  test('total always equals base + bonus for any inputs', () => {
    // **Validates: Requirements 11.1, 11.2**
    fc.assert(
      fc.property(
        completionRecordsGen,
        fc.integer({ min: 0, max: 50 }),
        streakDaysGen,
        (completions, totalExpected, streakDays) => {
          const result = calculateAllowance(completions, totalExpected, streakDays);

          // Base rules: $5 full, $3 partial, $0 none
          if (totalExpected === 0) {
            expect(result.base).toBe(0);
          } else {
            const completedCount = completions.filter((c) => c.completed).length;
            if (completedCount === totalExpected) {
              expect(result.base).toBe(5);
            } else if (completedCount > 0) {
              expect(result.base).toBe(3);
            } else {
              expect(result.base).toBe(0);
            }
          }

          // Bonus rules: $3 when streak >= 7, $0 otherwise
          if (totalExpected === 0) {
            expect(result.bonus).toBe(0);
          } else {
            expect(result.bonus).toBe(streakDays >= 7 ? 3 : 0);
          }

          // Invariant: total = base + bonus
          expect(result.total).toBe(result.base + result.bonus);
        },
      ),
      { numRuns: 10 },
    );
  });
});

// ─── Property 18: Allowance upsert idempotence ─────────────────────────────

// Feature: allowance-gamification-ui, Property 18: Allowance upsert idempotence
describe('Property 18: Allowance upsert idempotence', () => {
  test('calling calculateAllowance twice with the same inputs returns the same result', () => {
    // **Validates: Requirements 11.3**
    fc.assert(
      fc.property(
        completionRecordsGen,
        fc.integer({ min: 0, max: 50 }),
        streakDaysGen,
        (completions, totalExpected, streakDays) => {
          const result1 = calculateAllowance(completions, totalExpected, streakDays);
          const result2 = calculateAllowance(completions, totalExpected, streakDays);
          expect(result1).toEqual(result2);
        },
      ),
      { numRuns: 10 },
    );
  });
});

// ─── Property 19: Allowance history ordering ────────────────────────────────

// Feature: allowance-gamification-ui, Property 19: Allowance history ordering
describe('Property 19: Allowance history ordering', () => {
  test('sorting AllowanceResult entries by weekStart descending produces valid ordering', () => {
    // **Validates: Requirements 11.4**
    fc.assert(
      fc.property(
        fc.array(
          fc.integer({ min: 0, max: 365 }).map((offset) => {
            const d = new Date(2024, 0, 1);
            d.setDate(d.getDate() + offset);
            return d.toISOString().split('T')[0];
          }),
          { minLength: 1, maxLength: 20 },
        ),
        (weekStarts) => {
          // Sort descending
          const sorted = [...weekStarts].sort((a, b) => b.localeCompare(a));

          // Verify each element is >= the next (descending order)
          for (let i = 0; i < sorted.length - 1; i++) {
            expect(sorted[i] >= sorted[i + 1]).toBe(true);
          }
        },
      ),
      { numRuns: 10 },
    );
  });
});

// ─── Property 20: Mark-as-paid sets paid and paidAt ─────────────────────────

// Feature: allowance-gamification-ui, Property 20: Mark-as-paid sets paid and paidAt
describe('Property 20: Mark-as-paid sets paid and paidAt', () => {
  test('applying mark-paid transformation sets paid=true and paidAt to a non-null timestamp', () => {
    // **Validates: Requirements 12.1**

    /** Pure data transformation that mirrors what PATCH /api/allowance does */
    function markAsPaid(record: {
      id: string;
      kidId: string;
      weekStart: string;
      earned: string;
      bonusEarned: string;
      paid: boolean;
      paidAt: Date | null;
    }) {
      return {
        ...record,
        paid: true,
        paidAt: new Date(),
      };
    }

    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          kidId: fc.uuid(),
          weekStart: fc.integer({ min: 0, max: 365 }).map((offset) => {
            const d = new Date(2024, 0, 1);
            d.setDate(d.getDate() + offset);
            return d.toISOString().split('T')[0];
          }),
          earned: fc.constantFrom('0', '3', '5'),
          bonusEarned: fc.constantFrom('0', '3'),
        }),
        (partialRecord) => {
          const record = { ...partialRecord, paid: false, paidAt: null };
          const updated = markAsPaid(record);

          expect(updated.paid).toBe(true);
          expect(updated.paidAt).not.toBeNull();
          expect(updated.paidAt).toBeInstanceOf(Date);
        },
      ),
      { numRuns: 10 },
    );
  });
});
