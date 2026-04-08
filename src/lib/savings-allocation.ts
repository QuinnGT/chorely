/**
 * Savings allocation module — pure functions for distributing earnings
 * across active savings goals in creation order.
 *
 * No database imports — this is a calculation-only module.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SavingsGoal {
  id: string;
  status: 'active' | 'completed' | 'archived';
  targetAmount: number;
  currentAmount: number;
  createdAt: Date;
}

export interface AllocationResult {
  updatedGoals: {
    id: string;
    currentAmount: number;
    status: 'active' | 'completed' | 'archived';
  }[];
  completedGoalIds: string[];
  remainingAmount: number;
}

// ─── Allocation ─────────────────────────────────────────────────────────────

/**
 * Allocate an earning amount across active savings goals in creation order.
 *
 * - Skips archived and completed goals
 * - Fills each active goal up to its target before moving to the next
 * - Returns updated goal states, newly completed goal IDs, and any leftover
 */
export function allocateEarnings(
  goals: readonly SavingsGoal[],
  earningAmount: number
): AllocationResult {
  // Sort active goals by creation date (oldest first)
  const sortedGoals = [...goals].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
  );

  let remaining = Math.max(0, earningAmount);
  const completedGoalIds: string[] = [];

  const updatedGoals = sortedGoals.map((goal) => {
    // Skip non-active goals — pass through unchanged
    if (goal.status !== 'active') {
      return {
        id: goal.id,
        currentAmount: goal.currentAmount,
        status: goal.status,
      };
    }

    const amountNeeded = Math.max(0, goal.targetAmount - goal.currentAmount);

    if (remaining <= 0 || amountNeeded <= 0) {
      // No funds left or goal already at/above target
      const newStatus =
        goal.currentAmount >= goal.targetAmount ? 'completed' as const : goal.status;
      if (newStatus === 'completed' && goal.status === 'active') {
        completedGoalIds.push(goal.id);
      }
      return {
        id: goal.id,
        currentAmount: goal.currentAmount,
        status: newStatus,
      };
    }

    const allocation = Math.min(remaining, amountNeeded);
    const newCurrentAmount = goal.currentAmount + allocation;
    remaining -= allocation;

    const newStatus: 'active' | 'completed' | 'archived' =
      newCurrentAmount >= goal.targetAmount ? 'completed' : 'active';

    if (newStatus === 'completed') {
      completedGoalIds.push(goal.id);
    }

    return {
      id: goal.id,
      currentAmount: newCurrentAmount,
      status: newStatus,
    };
  });

  return {
    updatedGoals,
    completedGoalIds,
    remainingAmount: remaining,
  };
}

// ─── Progress ───────────────────────────────────────────────────────────────

/**
 * Calculate progress percentage for a savings goal.
 *
 * Returns min(currentAmount / targetAmount, 1.0) * 100, clamped 0–100.
 * Returns 0 when targetAmount is 0 or negative.
 */
export function calculateProgress(
  currentAmount: number,
  targetAmount: number
): number {
  if (targetAmount <= 0) return 0;
  if (currentAmount < 0) return 0;

  const ratio = currentAmount / targetAmount;
  return Math.min(ratio, 1.0) * 100;
}
