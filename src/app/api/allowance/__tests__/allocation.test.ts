import { describe, test, expect, vi, beforeEach } from 'vitest';
import { splitEarnings } from '@/lib/spending-categories';
import { allocateEarnings, type SavingsGoal } from '@/lib/savings-allocation';

// ─── Unit tests for the allocation logic used by POST /api/allowance ────────
// These test the pure functions that the route handler delegates to.

describe('spending category allocation via splitEarnings', () => {
  test('splits earnings proportionally across categories', () => {
    const categories = [
      { name: 'Save', percentage: 40 },
      { name: 'Spend', percentage: 40 },
      { name: 'Give', percentage: 20 },
    ];

    const result = splitEarnings(5.0, categories);

    expect(result).not.toBeNull();
    expect(result!.length).toBe(3);

    const total = result!.reduce((sum, a) => sum + a.amount, 0);
    expect(total).toBeCloseTo(5.0);
  });

  test('returns null when no categories exist (feature disabled)', () => {
    const result = splitEarnings(5.0, []);
    expect(result).toBeNull();
  });

  test('handles zero earning amount', () => {
    const categories = [
      { name: 'Save', percentage: 50 },
      { name: 'Spend', percentage: 50 },
    ];

    const result = splitEarnings(0, categories);

    expect(result).not.toBeNull();
    expect(result!.every((a) => a.amount === 0)).toBe(true);
  });
});

describe('savings goal allocation via allocateEarnings', () => {
  const makeGoal = (
    overrides: Partial<SavingsGoal> & { id: string }
  ): SavingsGoal => ({
    status: 'active',
    targetAmount: 10,
    currentAmount: 0,
    createdAt: new Date('2024-01-01'),
    ...overrides,
  });

  test('allocates earnings to active goals in creation order', () => {
    const goals: SavingsGoal[] = [
      makeGoal({ id: 'g1', targetAmount: 3, createdAt: new Date('2024-01-01') }),
      makeGoal({ id: 'g2', targetAmount: 5, createdAt: new Date('2024-01-02') }),
    ];

    const result = allocateEarnings(goals, 4);

    const g1 = result.updatedGoals.find((g) => g.id === 'g1')!;
    const g2 = result.updatedGoals.find((g) => g.id === 'g2')!;

    expect(g1.currentAmount).toBe(3);
    expect(g1.status).toBe('completed');
    expect(g2.currentAmount).toBe(1);
    expect(g2.status).toBe('active');
    expect(result.completedGoalIds).toContain('g1');
  });

  test('skips completed and archived goals', () => {
    const goals: SavingsGoal[] = [
      makeGoal({ id: 'g1', status: 'completed', targetAmount: 5, currentAmount: 5 }),
      makeGoal({ id: 'g2', status: 'archived', targetAmount: 5 }),
      makeGoal({ id: 'g3', status: 'active', targetAmount: 10, createdAt: new Date('2024-01-03') }),
    ];

    const result = allocateEarnings(goals, 5);

    const g3 = result.updatedGoals.find((g) => g.id === 'g3')!;
    expect(g3.currentAmount).toBe(5);
    expect(g3.status).toBe('active');
  });

  test('marks goal as completed when currentAmount reaches targetAmount', () => {
    const goals: SavingsGoal[] = [
      makeGoal({ id: 'g1', targetAmount: 5, currentAmount: 3 }),
    ];

    const result = allocateEarnings(goals, 2);

    const g1 = result.updatedGoals.find((g) => g.id === 'g1')!;
    expect(g1.currentAmount).toBe(5);
    expect(g1.status).toBe('completed');
    expect(result.completedGoalIds).toContain('g1');
  });

  test('returns empty results when no goals exist', () => {
    const result = allocateEarnings([], 5);

    expect(result.updatedGoals).toEqual([]);
    expect(result.completedGoalIds).toEqual([]);
    expect(result.remainingAmount).toBe(5);
  });

  test('handles zero earning amount', () => {
    const goals: SavingsGoal[] = [
      makeGoal({ id: 'g1', targetAmount: 10 }),
    ];

    const result = allocateEarnings(goals, 0);

    const g1 = result.updatedGoals.find((g) => g.id === 'g1')!;
    expect(g1.currentAmount).toBe(0);
    expect(g1.status).toBe('active');
  });
});
