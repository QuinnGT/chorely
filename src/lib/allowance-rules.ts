import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { allowanceRules } from '@/db/schema';

// Re-export types and defaults from the client-safe module
export type { AllowanceRules } from '@/lib/allowance-rules-types';
export { DEFAULT_RULES } from '@/lib/allowance-rules-types';

import { type AllowanceRules, DEFAULT_RULES } from '@/lib/allowance-rules-types';

/** Loads per-kid allowance rules from DB, returns defaults if none exist. */
export async function loadAllowanceRules(kidId: string): Promise<AllowanceRules> {
  const row = await db.query.allowanceRules.findFirst({
    where: eq(allowanceRules.kidId, kidId),
  });

  if (!row) {
    return { ...DEFAULT_RULES };
  }

  return {
    fullCompletionAmount: Number(row.fullCompletionAmount),
    partialCompletionAmount: Number(row.partialCompletionAmount),
    streakBonusAmount: Number(row.streakBonusAmount),
    minStreakDays: row.minStreakDays,
  };
}
