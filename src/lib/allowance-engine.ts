/**
 * Allowance engine — calculates weekly payout and streak bonuses.
 *
 * Rules:
 * - $5 if ALL chores completed for the week
 * - $3 if some (but not all) chores completed (partial)
 * - +$3 bonus if daily chores have a consecutive streak ≥ 7 days
 * - $0 if nothing completed
 */

interface CompletionRecord {
  date: string;
  completed: boolean;
  frequency: 'daily' | 'weekly';
}

interface AllowanceResult {
  base: number;
  bonus: number;
  total: number;
  completionRate: number;
  streakDays: number;
  isFullCompletion: boolean;
  isPartialCompletion: boolean;
}

/**
 * Calculate allowance for a given week based on completion records.
 *
 * @param completions - All completion records for the kid this week
 * @param totalExpected - Total number of expected completions (daily × 7 + weekly × 1)
 * @param streakDays - Number of consecutive days ALL daily chores were completed (across weeks)
 */
export function calculateAllowance(
  completions: readonly CompletionRecord[],
  totalExpected: number,
  streakDays: number
): AllowanceResult {
  if (totalExpected === 0) {
    return {
      base: 0,
      bonus: 0,
      total: 0,
      completionRate: 0,
      streakDays,
      isFullCompletion: false,
      isPartialCompletion: false,
    };
  }

  const completedCount = completions.filter((c) => c.completed).length;
  const completionRate = completedCount / totalExpected;

  const isFullCompletion = completedCount === totalExpected;
  const isPartialCompletion = completedCount > 0 && !isFullCompletion;

  let base = 0;
  if (isFullCompletion) {
    base = 5;
  } else if (isPartialCompletion) {
    base = 3;
  }

  const bonus = streakDays >= 7 ? 3 : 0;

  return {
    base,
    bonus,
    total: base + bonus,
    completionRate,
    streakDays,
    isFullCompletion,
    isPartialCompletion,
  };
}

/**
 * Calculate the current daily streak — how many consecutive days
 * (going backwards from today) the kid completed ALL daily chores.
 *
 * @param dailyCompletionsByDate - Map of date string → array of completion booleans for daily chores
 * @param today - Current date (for testing)
 */
export function calculateStreak(
  dailyCompletionsByDate: ReadonlyMap<string, readonly boolean[]>,
  today: Date = new Date()
): number {
  let streak = 0;
  const d = new Date(today);
  d.setHours(0, 0, 0, 0);

  for (let i = 0; i < 365; i++) {
    const dateStr = d.toISOString().split('T')[0];
    const completions = dailyCompletionsByDate.get(dateStr);

    if (!completions || completions.length === 0) {
      break;
    }

    const allDone = completions.every((c) => c === true);
    if (!allDone) {
      break;
    }

    streak++;
    d.setDate(d.getDate() - 1);
  }

  return streak;
}
