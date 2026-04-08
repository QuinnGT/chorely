import { describe, test, expect } from 'vitest';
import {
  allocateEarnings,
  calculateProgress,
  type SavingsGoal,
} from '@/lib/savings-allocation';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeGoal(overrides: Partial<SavingsGoal> & { id: string }): SavingsGoal {
  return {
    status: 'active',
    targetAmount: 100,
    currentAmount: 0,
    createdAt: new Date('2024-01-01'),
    ...overrides,
  };
}

// ─── allocateEarnings ───────────────────────────────────────────────────────

describe('allocateEarnings', () => {
  test('allocates to single active goal up to target', () => {
    const goals = [makeGoal({ id: 'g1', targetAmount: 50, currentAmount: 0 })];
    const result = allocateEarnings(goals, 30);

    expect(result.updatedGoals).toEqual([
      { id: 'g1', currentAmount: 30, status: 'active' },
    ]);
    expect(result.completedGoalIds).toEqual([]);
    expect(result.remainingAmount).toBe(0);
  });

  test('completes goal when earning fills remaining target', () => {
    const goals = [makeGoal({ id: 'g1', targetAmount: 50, currentAmount: 40 })];
    const result = allocateEarnings(goals, 10);

    expect(result.updatedGoals).toEqual([
      { id: 'g1', currentAmount: 50, status: 'completed' },
    ]);
    expect(result.completedGoalIds).toEqual(['g1']);
    expect(result.remainingAmount).toBe(0);
  });

  test('completes goal and returns remaining when earning exceeds target', () => {
    const goals = [makeGoal({ id: 'g1', targetAmount: 50, currentAmount: 40 })];
    const result = allocateEarnings(goals, 20);

    expect(result.updatedGoals).toEqual([
      { id: 'g1', currentAmount: 50, status: 'completed' },
    ]);
    expect(result.completedGoalIds).toEqual(['g1']);
    expect(result.remainingAmount).toBe(10);
  });

  test('allocates in creation order — oldest first', () => {
    const goals = [
      makeGoal({ id: 'g2', targetAmount: 30, createdAt: new Date('2024-02-01') }),
      makeGoal({ id: 'g1', targetAmount: 20, createdAt: new Date('2024-01-01') }),
    ];
    const result = allocateEarnings(goals, 25);

    const g1 = result.updatedGoals.find((g) => g.id === 'g1');
    const g2 = result.updatedGoals.find((g) => g.id === 'g2');

    // g1 (oldest) gets filled first: 20 → completed
    expect(g1).toEqual({ id: 'g1', currentAmount: 20, status: 'completed' });
    // g2 gets remaining 5
    expect(g2).toEqual({ id: 'g2', currentAmount: 5, status: 'active' });
    expect(result.completedGoalIds).toEqual(['g1']);
    expect(result.remainingAmount).toBe(0);
  });

  test('skips archived goals during allocation', () => {
    const goals = [
      makeGoal({ id: 'g1', targetAmount: 20, status: 'archived', createdAt: new Date('2024-01-01') }),
      makeGoal({ id: 'g2', targetAmount: 30, createdAt: new Date('2024-02-01') }),
    ];
    const result = allocateEarnings(goals, 25);

    const g1 = result.updatedGoals.find((g) => g.id === 'g1');
    const g2 = result.updatedGoals.find((g) => g.id === 'g2');

    expect(g1).toEqual({ id: 'g1', currentAmount: 0, status: 'archived' });
    expect(g2).toEqual({ id: 'g2', currentAmount: 25, status: 'active' });
  });

  test('skips completed goals during allocation', () => {
    const goals = [
      makeGoal({ id: 'g1', targetAmount: 20, currentAmount: 20, status: 'completed', createdAt: new Date('2024-01-01') }),
      makeGoal({ id: 'g2', targetAmount: 30, createdAt: new Date('2024-02-01') }),
    ];
    const result = allocateEarnings(goals, 15);

    const g1 = result.updatedGoals.find((g) => g.id === 'g1');
    const g2 = result.updatedGoals.find((g) => g.id === 'g2');

    expect(g1).toEqual({ id: 'g1', currentAmount: 20, status: 'completed' });
    expect(g2).toEqual({ id: 'g2', currentAmount: 15, status: 'active' });
  });

  test('returns all remaining when no active goals exist', () => {
    const goals = [
      makeGoal({ id: 'g1', status: 'archived' }),
      makeGoal({ id: 'g2', status: 'completed', currentAmount: 100 }),
    ];
    const result = allocateEarnings(goals, 50);

    expect(result.remainingAmount).toBe(50);
    expect(result.completedGoalIds).toEqual([]);
  });

  test('handles empty goals array', () => {
    const result = allocateEarnings([], 50);

    expect(result.updatedGoals).toEqual([]);
    expect(result.completedGoalIds).toEqual([]);
    expect(result.remainingAmount).toBe(50);
  });

  test('handles zero earning amount', () => {
    const goals = [makeGoal({ id: 'g1', targetAmount: 50 })];
    const result = allocateEarnings(goals, 0);

    expect(result.updatedGoals).toEqual([
      { id: 'g1', currentAmount: 0, status: 'active' },
    ]);
    expect(result.remainingAmount).toBe(0);
  });

  test('handles negative earning amount as zero', () => {
    const goals = [makeGoal({ id: 'g1', targetAmount: 50 })];
    const result = allocateEarnings(goals, -10);

    expect(result.updatedGoals).toEqual([
      { id: 'g1', currentAmount: 0, status: 'active' },
    ]);
    expect(result.remainingAmount).toBe(0);
  });

  test('does not mutate input goals array', () => {
    const goals = [makeGoal({ id: 'g1', targetAmount: 50 })];
    const originalGoals = goals.map((g) => ({ ...g }));

    allocateEarnings(goals, 30);

    expect(goals[0].currentAmount).toBe(originalGoals[0].currentAmount);
    expect(goals[0].status).toBe(originalGoals[0].status);
  });

  test('completes multiple goals in one allocation', () => {
    const goals = [
      makeGoal({ id: 'g1', targetAmount: 10, createdAt: new Date('2024-01-01') }),
      makeGoal({ id: 'g2', targetAmount: 15, createdAt: new Date('2024-02-01') }),
    ];
    const result = allocateEarnings(goals, 30);

    expect(result.completedGoalIds).toEqual(['g1', 'g2']);
    expect(result.remainingAmount).toBe(5);
  });
});

// ─── calculateProgress ─────────────────────────────────────────────────────

describe('calculateProgress', () => {
  test('returns 0 for zero current amount', () => {
    expect(calculateProgress(0, 100)).toBe(0);
  });

  test('returns 50 for half progress', () => {
    expect(calculateProgress(50, 100)).toBe(50);
  });

  test('returns 100 when current equals target', () => {
    expect(calculateProgress(100, 100)).toBe(100);
  });

  test('caps at 100 when current exceeds target', () => {
    expect(calculateProgress(150, 100)).toBe(100);
  });

  test('returns 0 when target is zero', () => {
    expect(calculateProgress(50, 0)).toBe(0);
  });

  test('returns 0 when target is negative', () => {
    expect(calculateProgress(50, -10)).toBe(0);
  });

  test('returns 0 when current is negative', () => {
    expect(calculateProgress(-10, 100)).toBe(0);
  });

  test('handles small fractional progress', () => {
    expect(calculateProgress(1, 3)).toBeCloseTo(33.33, 1);
  });
});
