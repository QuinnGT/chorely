'use client';

import { useMemo, useRef } from 'react';
import type { ChoreRow } from '@/hooks/useChoreGrid';

interface Achievement {
  id: string;
  icon: string;
  label: string;
  earned: boolean;
  isNew: boolean;
}

interface MilestoneDefinition {
  id: string;
  icon: string;
  label: string;
  check: (completionRate: number, streakDays: number, rows: ChoreRow[]) => boolean;
}

const MILESTONES: MilestoneDefinition[] = [
  {
    id: 'first-chore',
    icon: '⭐',
    label: 'First Chore',
    check: (_completionRate, _streakDays, rows) =>
      rows.some((row) => row.days.some((day) => day.completed)),
  },
  {
    id: 'full-day',
    icon: '🌟',
    label: 'Full Day',
    check: (_completionRate, _streakDays, rows) => {
      const dailyRows = rows.filter((r) => r.chore.frequency === 'daily');
      if (dailyRows.length === 0) return false;
      return dailyRows.every((row) => {
        const todayCell = row.days.find((d) => d.isToday);
        return todayCell?.completed === true;
      });
    },
  },
  {
    id: 'full-week',
    icon: '🏆',
    label: 'Full Week',
    check: (completionRate) => completionRate === 1,
  },
  {
    id: 'streak-7',
    icon: '🔥',
    label: '7-Day Streak',
    check: (_completionRate, streakDays) => streakDays >= 7,
  },
  {
    id: 'streak-14',
    icon: '💪',
    label: '14-Day Streak',
    check: (_completionRate, streakDays) => streakDays >= 14,
  },
  {
    id: 'streak-30',
    icon: '👑',
    label: '30-Day Streak',
    check: (_completionRate, streakDays) => streakDays >= 30,
  },
];

function useAchievements(
  kidId: string,
  completionRate: number,
  streakDays: number,
  rows: ChoreRow[]
): Achievement[] {
  const prevEarnedRef = useRef<Set<string>>(new Set());

  const achievements = useMemo(() => {
    const currentEarned = new Set<string>();

    const result: Achievement[] = MILESTONES.map((milestone) => {
      const earned = milestone.check(completionRate, streakDays, rows);
      if (earned) {
        currentEarned.add(milestone.id);
      }
      const isNew = earned && !prevEarnedRef.current.has(milestone.id);

      return {
        id: milestone.id,
        icon: milestone.icon,
        label: milestone.label,
        earned,
        isNew,
      };
    });

    prevEarnedRef.current = currentEarned;

    return result;
  }, [kidId, completionRate, streakDays, rows]);

  return achievements;
}

export { useAchievements, MILESTONES };
export type { Achievement, MilestoneDefinition };
