/**
 * Spending categories module — pure functions for splitting earnings
 * across spending categories (jars) based on percentage allocations.
 *
 * No database imports — this is a calculation-only module.
 *
 * Rounding strategy:
 *   Each share = Math.floor(earning * percentage / 100 * 100) / 100
 *   Remainder  = total - sum(shares)  →  added to first category
 *
 * This guarantees the conservation property: sum of allocations === input amount.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SpendingCategory {
  name: string;
  percentage: number;
}

export interface CategoryAllocation {
  name: string;
  percentage: number;
  amount: number;
}

// ─── Splitting ──────────────────────────────────────────────────────────────

/**
 * Split an earning amount across spending categories.
 *
 * Returns `null` when categories is empty (feature disabled → unified balance).
 * Returns allocations with 0 amounts when amount is 0 or negative.
 */
export function splitEarnings(
  amount: number,
  categories: readonly SpendingCategory[]
): CategoryAllocation[] | null {
  if (categories.length === 0) return null;

  const safeAmount = Math.max(0, amount);

  // Calculate each category's floored share
  const allocations: CategoryAllocation[] = categories.map((cat) => ({
    name: cat.name,
    percentage: cat.percentage,
    amount: Math.floor(safeAmount * cat.percentage / 100 * 100) / 100,
  }));

  // Compute remainder and add to first category to preserve conservation
  const sumOfShares = allocations.reduce((sum, a) => sum + a.amount, 0);
  const remainder = Math.round((safeAmount - sumOfShares) * 100) / 100;

  if (remainder > 0 && allocations.length > 0) {
    allocations[0] = {
      ...allocations[0],
      amount: Math.round((allocations[0].amount + remainder) * 100) / 100,
    };
  }

  return allocations;
}
