/**
 * Shared allowance + wallet logic.
 *
 * The "spendable balance" (a kid's wallet) is intentionally a derived value:
 *   spendableBalance = lifetime earned − total spent
 * where lifetime earned is the sum of every banked week in the allowance ledger
 * and total spent is the sum of every store order that wasn't declined.
 *
 * Because nothing else writes the ledger on a schedule, reads bank the
 * in-progress week first (idempotent per week) so the current week's earnings
 * count toward the wallet without waiting for a cron.
 */

import { eq, and, gte, lte, inArray, ne } from 'drizzle-orm';
import { db } from '@/db';
import {
  choreAssignments,
  choreCompletions,
  allowanceLedger,
  storeOrders,
  storeItems,
} from '@/db/schema';
import { calculateAllowance, calculateStreak } from '@/lib/allowance-engine';
import { loadAllowanceRules } from '@/lib/allowance-rules';
import { getWeekStart, formatDate } from '@/lib/date-utils';

// ─── Chore / completion helpers ──────────────────────────────────────────────

export async function getAssignmentsWithChores(kidId: string) {
  return db.query.choreAssignments.findMany({
    where: eq(choreAssignments.kidId, kidId),
    with: { chore: true },
  });
}

export async function getCompletionsForWeek(assignmentIds: string[], weekStart: string) {
  const endDate = new Date(weekStart);
  endDate.setDate(endDate.getDate() + 6);
  const endStr = formatDate(endDate);

  if (assignmentIds.length === 0) return [];

  return db
    .select()
    .from(choreCompletions)
    .where(
      and(
        inArray(choreCompletions.assignmentId, assignmentIds),
        eq(choreCompletions.completed, true),
        gte(choreCompletions.date, weekStart),
        lte(choreCompletions.date, endStr)
      )
    );
}

export function buildCompletionRecords(
  completions: { date: string; completed: boolean; assignmentId: string }[],
  assignments: { id: string; chore: { frequency: 'daily' | 'weekly' } }[]
) {
  const assignmentFreqMap = new Map(
    assignments.map((a) => [a.id, a.chore.frequency])
  );

  return completions.map((c) => ({
    date: c.date,
    completed: c.completed,
    frequency: assignmentFreqMap.get(c.assignmentId) ?? ('daily' as const),
  }));
}

export function computeTotalExpected(
  assignments: { chore: { frequency: 'daily' | 'weekly' } }[]
) {
  let total = 0;
  for (const a of assignments) {
    total += a.chore.frequency === 'daily' ? 7 : 1;
  }
  return total;
}

export async function buildStreakMap(kidId: string, today: Date) {
  const assignments = await getAssignmentsWithChores(kidId);
  const dailyAssignmentIds = assignments
    .filter((a) => a.chore.frequency === 'daily')
    .map((a) => a.id);

  if (dailyAssignmentIds.length === 0) {
    return new Map<string, boolean[]>();
  }

  // Query only completions for daily assignments in the last year
  const yearAgo = new Date(today);
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);
  const yearAgoStr = formatDate(yearAgo);
  const todayStr = formatDate(today);

  const dailyCompletions = await db
    .select()
    .from(choreCompletions)
    .where(
      and(
        inArray(choreCompletions.assignmentId, dailyAssignmentIds),
        eq(choreCompletions.completed, true),
        gte(choreCompletions.date, yearAgoStr),
        lte(choreCompletions.date, todayStr)
      )
    );

  // Build map: date → array of booleans (one per daily assignment)
  const dateMap = new Map<string, boolean[]>();
  const d = new Date(today);
  d.setHours(0, 0, 0, 0);

  for (let i = 0; i < 365; i++) {
    const dateStr = formatDate(d);
    const completionsForDate = dailyCompletions.filter((c) => c.date === dateStr);
    const booleans = dailyAssignmentIds.map((aId) =>
      completionsForDate.some((c) => c.assignmentId === aId)
    );
    dateMap.set(dateStr, booleans);
    d.setDate(d.getDate() - 1);
  }

  return dateMap;
}

// ─── Current week computation ────────────────────────────────────────────────

export interface CurrentWeekAllowance {
  base: number;
  bonus: number;
  total: number;
  completionRate: number;
  streakDays: number;
  weekStart: string;
}

/** Compute (but do not persist) the in-progress week's projected allowance. */
export async function computeCurrentWeekAllowance(
  kidId: string,
  today: Date = new Date()
): Promise<CurrentWeekAllowance> {
  const weekStartStr = formatDate(getWeekStart(today));

  const assignments = await getAssignmentsWithChores(kidId);
  const assignmentIds = assignments.map((a) => a.id);
  const completions = await getCompletionsForWeek(assignmentIds, weekStartStr);

  const completionRecords = buildCompletionRecords(completions, assignments);
  const totalExpected = computeTotalExpected(assignments);

  const streakMap = await buildStreakMap(kidId, today);
  const streakDays = calculateStreak(streakMap, today);

  const rules = await loadAllowanceRules(kidId);
  const result = calculateAllowance(completionRecords, totalExpected, streakDays, rules);

  return {
    base: result.base,
    bonus: result.bonus,
    total: result.total,
    completionRate: result.completionRate,
    streakDays: result.streakDays,
    weekStart: weekStartStr,
  };
}

// ─── Wallet (spendable balance) ──────────────────────────────────────────────

/**
 * Persist a week's earnings into the ledger. Idempotent per (kid, weekStart):
 * re-banking just refreshes the amounts and leaves `paid`/allocation state alone.
 */
export async function bankWeek(
  kidId: string,
  weekStart: string,
  base: number,
  bonus: number
): Promise<void> {
  const existing = await db
    .select({ id: allowanceLedger.id })
    .from(allowanceLedger)
    .where(and(eq(allowanceLedger.kidId, kidId), eq(allowanceLedger.weekStart, weekStart)));

  if (existing.length > 0) {
    await db
      .update(allowanceLedger)
      .set({ earned: String(base), bonusEarned: String(bonus) })
      .where(eq(allowanceLedger.id, existing[0].id));
  } else {
    await db.insert(allowanceLedger).values({
      kidId,
      weekStart,
      earned: String(base),
      bonusEarned: String(bonus),
    });
  }
}

export interface WalletSummary {
  lifetimeEarned: number;
  totalSpent: number;
  spendableBalance: number;
}

/** Sum the ledger (lifetime earned) minus non-declined store orders (spent). */
export async function summarizeWallet(kidId: string): Promise<WalletSummary> {
  const ledgerRows = await db
    .select({ earned: allowanceLedger.earned, bonusEarned: allowanceLedger.bonusEarned })
    .from(allowanceLedger)
    .where(eq(allowanceLedger.kidId, kidId));

  const lifetimeEarned = ledgerRows.reduce(
    (sum, r) => sum + Number(r.earned) + Number(r.bonusEarned),
    0
  );

  // Any order that isn't declined reserves funds (pending/approved/shipped/delivered).
  const orderRows = await db
    .select({ price: storeItems.price })
    .from(storeOrders)
    .leftJoin(storeItems, eq(storeOrders.itemId, storeItems.id))
    .where(and(eq(storeOrders.kidId, kidId), ne(storeOrders.status, 'declined')));

  const totalSpent = orderRows.reduce((sum, r) => sum + Number(r.price ?? 0), 0);

  // Round to cents to avoid floating-point drift in the displayed wallet.
  const spendableBalance = Math.round((lifetimeEarned - totalSpent) * 100) / 100;

  return { lifetimeEarned, totalSpent, spendableBalance };
}

/**
 * Bank the current week, then return the kid's spendable wallet.
 * Use this anywhere the up-to-date balance matters (store purchases, dashboards).
 */
export async function computeSpendableBalance(
  kidId: string,
  today: Date = new Date()
): Promise<WalletSummary> {
  const week = await computeCurrentWeekAllowance(kidId, today);
  await bankWeek(kidId, week.weekStart, week.base, week.bonus);
  return summarizeWallet(kidId);
}
