import { describe, test, expect } from 'vitest';
import {
  splitEarnings,
  type SpendingCategory,
} from '@/lib/spending-categories';

// ─── Helpers ────────────────────────────────────────────────────────────────

const DEFAULT_CATEGORIES: SpendingCategory[] = [
  { name: 'Save', percentage: 40 },
  { name: 'Spend', percentage: 40 },
  { name: 'Give', percentage: 20 },
];

// ─── splitEarnings ──────────────────────────────────────────────────────────

describe('splitEarnings', () => {
  test('returns null when categories is empty (feature disabled)', () => {
    expect(splitEarnings(10, [])).toBeNull();
  });

  test('splits evenly divisible amount across categories', () => {
    const result = splitEarnings(10, DEFAULT_CATEGORIES);

    expect(result).toEqual([
      { name: 'Save', percentage: 40, amount: 4.0 },
      { name: 'Spend', percentage: 40, amount: 4.0 },
      { name: 'Give', percentage: 20, amount: 2.0 },
    ]);
  });

  test('adds rounding remainder to first category', () => {
    // $10.01 split 40/40/20:
    //   Save:  floor(10.01 * 40 / 100 * 100) / 100 = floor(400.4) / 100 = 4.00
    //   Spend: floor(10.01 * 40 / 100 * 100) / 100 = floor(400.4) / 100 = 4.00
    //   Give:  floor(10.01 * 20 / 100 * 100) / 100 = floor(200.2) / 100 = 2.00
    //   Sum = 10.00, remainder = 0.01 → added to Save
    const result = splitEarnings(10.01, DEFAULT_CATEGORIES);

    expect(result).not.toBeNull();
    const total = result!.reduce((sum, a) => sum + a.amount, 0);
    expect(Math.round(total * 100) / 100).toBe(10.01);
    expect(result![0].amount).toBe(4.01); // remainder goes to first
  });

  test('conservation property: sum of allocations equals input amount', () => {
    const result = splitEarnings(7.33, DEFAULT_CATEGORIES);

    expect(result).not.toBeNull();
    const total = result!.reduce((sum, a) => sum + a.amount, 0);
    expect(Math.round(total * 100) / 100).toBe(7.33);
  });

  test('returns zero amounts when amount is zero', () => {
    const result = splitEarnings(0, DEFAULT_CATEGORIES);

    expect(result).toEqual([
      { name: 'Save', percentage: 40, amount: 0 },
      { name: 'Spend', percentage: 40, amount: 0 },
      { name: 'Give', percentage: 20, amount: 0 },
    ]);
  });

  test('returns zero amounts when amount is negative', () => {
    const result = splitEarnings(-5, DEFAULT_CATEGORIES);

    expect(result).toEqual([
      { name: 'Save', percentage: 40, amount: 0 },
      { name: 'Spend', percentage: 40, amount: 0 },
      { name: 'Give', percentage: 20, amount: 0 },
    ]);
  });

  test('handles single category at 100%', () => {
    const result = splitEarnings(15.75, [{ name: 'All', percentage: 100 }]);

    expect(result).toEqual([
      { name: 'All', percentage: 100, amount: 15.75 },
    ]);
  });

  test('handles two equal categories', () => {
    const result = splitEarnings(10, [
      { name: 'A', percentage: 50 },
      { name: 'B', percentage: 50 },
    ]);

    expect(result).toEqual([
      { name: 'A', percentage: 50, amount: 5.0 },
      { name: 'B', percentage: 50, amount: 5.0 },
    ]);
  });

  test('handles odd split with remainder going to first category', () => {
    // $1.00 split 33/33/34:
    //   A: floor(1 * 33 / 100 * 100) / 100 = floor(33) / 100 = 0.33
    //   B: floor(1 * 33 / 100 * 100) / 100 = floor(33) / 100 = 0.33
    //   C: floor(1 * 34 / 100 * 100) / 100 = floor(34) / 100 = 0.34
    //   Sum = 1.00, remainder = 0.00
    const result = splitEarnings(1, [
      { name: 'A', percentage: 33 },
      { name: 'B', percentage: 33 },
      { name: 'C', percentage: 34 },
    ]);

    expect(result).not.toBeNull();
    const total = result!.reduce((sum, a) => sum + a.amount, 0);
    expect(Math.round(total * 100) / 100).toBe(1.0);
  });

  test('does not mutate input categories array', () => {
    const categories: SpendingCategory[] = [
      { name: 'Save', percentage: 60 },
      { name: 'Spend', percentage: 40 },
    ];
    const original = categories.map((c) => ({ ...c }));

    splitEarnings(10, categories);

    expect(categories).toEqual(original);
  });

  test('handles large amount with many categories', () => {
    const categories: SpendingCategory[] = [
      { name: 'A', percentage: 10 },
      { name: 'B', percentage: 20 },
      { name: 'C', percentage: 30 },
      { name: 'D', percentage: 40 },
    ];
    const result = splitEarnings(999.99, categories);

    expect(result).not.toBeNull();
    const total = result!.reduce((sum, a) => sum + a.amount, 0);
    expect(Math.round(total * 100) / 100).toBe(999.99);
  });
});
