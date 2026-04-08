'use client';

import { useState, useEffect, useCallback } from 'react';
import { getDaysOfWeek, getWeekStart, formatDate, isToday } from '@/lib/date-utils';

interface ChoreFromApi {
  id: string;
  name: string;
  icon: string;
  frequency: 'daily' | 'weekly';
  isActive: boolean;
  choreAssignments: {
    id: string;
    kidId: string;
  }[];
}

interface CompletionFromApi {
  id: string;
  assignmentId: string;
  date: string;
  completed: boolean;
  completedAt: string | null;
}

export interface DayCell {
  date: string;
  completed: boolean;
  isToday: boolean;
  isFuture: boolean;
  completionId?: string;
}

export interface ChoreRow {
  chore: { id: string; name: string; icon: string; frequency: 'daily' | 'weekly' };
  assignmentId: string;
  days: DayCell[];
}

interface UseChoreGridResult {
  rows: ChoreRow[];
  completionRate: number;
  streakDays: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useChoreGrid(kidId: string): UseChoreGridResult {
  const [rows, setRows] = useState<ChoreRow[]>([]);
  const [completionRate, setCompletionRate] = useState(0);
  const [streakDays, setStreakDays] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);

  const refetch = useCallback(() => {
    setFetchKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!kidId) return;
    let cancelled = false;

    async function fetchData() {
      setIsLoading(true);
      setError(null);

      try {
        const now = new Date();
        const weekStart = getWeekStart(now);
        const weekStartStr = formatDate(weekStart);
        const days = getDaysOfWeek(now);
        const todayStr = formatDate(now);

        const [choresRes, completionsRes] = await Promise.all([
          fetch('/api/chores'),
          fetch(`/api/completions?kidId=${kidId}&weekStart=${weekStartStr}`),
        ]);

        if (!choresRes.ok) throw new Error('Failed to fetch chores');
        if (!completionsRes.ok) throw new Error('Failed to fetch completions');

        const chores = (await choresRes.json()) as ChoreFromApi[];
        const completions = (await completionsRes.json()) as CompletionFromApi[];

        if (cancelled) return;

        // Filter chores assigned to this kid and build rows
        const completionMap = new Map<string, CompletionFromApi>();
        for (const c of completions) {
          completionMap.set(`${c.assignmentId}:${c.date}`, c);
        }

        const dailyRows: ChoreRow[] = [];
        const weeklyRows: ChoreRow[] = [];

        for (const chore of chores) {
          const assignment = chore.choreAssignments.find((a) => a.kidId === kidId);
          if (!assignment) continue;

          const dayCells: DayCell[] =
            chore.frequency === 'weekly'
              ? buildWeeklyCell(assignment.id, weekStartStr, todayStr, completionMap)
              : buildDailyCells(assignment.id, days, todayStr, completionMap);

          const row: ChoreRow = {
            chore: {
              id: chore.id,
              name: chore.name,
              icon: chore.icon,
              frequency: chore.frequency,
            },
            assignmentId: assignment.id,
            days: dayCells,
          };

          if (chore.frequency === 'daily') {
            dailyRows.push(row);
          } else {
            weeklyRows.push(row);
          }
        }

        const allRows = [...dailyRows, ...weeklyRows];
        setRows(allRows);

        // Calculate completion rate
        const allCells = allRows.flatMap((r) => r.days);
        const nonFutureCells = allCells.filter((c) => !c.isFuture);
        const completedCells = nonFutureCells.filter((c) => c.completed);
        const rate =
          nonFutureCells.length > 0 ? completedCells.length / nonFutureCells.length : 0;
        setCompletionRate(rate);

        // Streak: count consecutive past days where all daily chores were completed
        let streak = 0;
        const d = new Date(now);
        d.setHours(0, 0, 0, 0);

        while (dailyRows.length > 0) {
          const dateStr = formatDate(d);
          const allDone = dailyRows.every((row) => {
            const cell = row.days.find((c) => c.date === dateStr);
            return cell?.completed === true;
          });
          if (!allDone) break;
          streak++;
          d.setDate(d.getDate() - 1);
        }
        setStreakDays(streak);
      } catch (err: unknown) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load chore grid';
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [kidId, fetchKey]);

  return { rows, completionRate, streakDays, isLoading, error, refetch };
}

function buildDailyCells(
  assignmentId: string,
  days: Date[],
  todayStr: string,
  completionMap: Map<string, CompletionFromApi>
): DayCell[] {
  return days.map((day) => {
    const dateStr = formatDate(day);
    const key = `${assignmentId}:${dateStr}`;
    const completion = completionMap.get(key);
    return {
      date: dateStr,
      completed: completion?.completed ?? false,
      isToday: isToday(day),
      isFuture: dateStr > todayStr,
      completionId: completion?.id,
    };
  });
}

function buildWeeklyCell(
  assignmentId: string,
  weekStartStr: string,
  todayStr: string,
  completionMap: Map<string, CompletionFromApi>
): DayCell[] {
  const key = `${assignmentId}:${weekStartStr}`;
  const completion = completionMap.get(key);
  return [
    {
      date: weekStartStr,
      completed: completion?.completed ?? false,
      isToday: isToday(new Date(weekStartStr + 'T00:00:00')),
      isFuture: weekStartStr > todayStr,
      completionId: completion?.id,
    },
  ];
}
