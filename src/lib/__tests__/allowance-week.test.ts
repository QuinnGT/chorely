import { describe, expect, test } from 'vitest';
import {
  buildCompletionRecords,
  calculateBigBossBonus,
  computeTotalExpected,
} from '@/lib/allowance-week';

const assignments = [
  {
    id: 'daily-assignment',
    chore: {
      frequency: 'daily' as const,
      kind: 'standard' as const,
      rewardAmount: '0.00',
    },
  },
  {
    id: 'weekly-assignment',
    chore: {
      frequency: 'weekly' as const,
      kind: 'standard' as const,
      rewardAmount: '0.00',
    },
  },
  {
    id: 'boss-assignment',
    chore: {
      frequency: 'weekly' as const,
      kind: 'big_boss' as const,
      rewardAmount: '10.00',
    },
  },
];

describe('Big Boss allowance handling', () => {
  test('excludes big boss chores from base expected completion count', () => {
    expect(computeTotalExpected(assignments)).toBe(8);
  });

  test('excludes big boss completions from base completion records', () => {
    const records = buildCompletionRecords(
      [
        { assignmentId: 'daily-assignment', date: '2026-05-25', completed: true },
        { assignmentId: 'weekly-assignment', date: '2026-05-25', completed: true },
        { assignmentId: 'boss-assignment', date: '2026-05-25', completed: true },
      ],
      assignments
    );

    expect(records).toEqual([
      { date: '2026-05-25', completed: true, frequency: 'daily' },
      { date: '2026-05-25', completed: true, frequency: 'weekly' },
    ]);
  });

  test('adds completed big boss rewards once per assignment', () => {
    const bonus = calculateBigBossBonus(
      [
        { assignmentId: 'boss-assignment', completed: true },
        { assignmentId: 'boss-assignment', completed: true },
        { assignmentId: 'weekly-assignment', completed: true },
      ],
      assignments
    );

    expect(bonus).toBe(10);
  });
});
