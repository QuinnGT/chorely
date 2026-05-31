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
  savingsGoals,
  spendingCategories,
} from '@/db/schema';
import { calculateAllowance, calculateStreak } from '@/lib/allowance-engine';
import { loadAllowanceRules } from '@/lib/allowance-rules';
import { getWeekStart, formatDate } from '@/lib/date-utils';
import { splitEarnings } from '@/lib/spending-categories';

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

// ─── Wallet model ─────────────────────────────────────────────────────────
//
// Everything below is DERIVED from two persisted facts — lifetime earned (the
// banked ledger) and store spend (non-declined orders) — plus each goal's
// `currentAmount`, which we treat as the kid's *manual* net contributions.
// Nothing here mutates balances, so the numbers can never drift.
//
// Two modes, chosen by whether the kid has spending categories (jars):
//   • 'wallet' (no jars): one spendable pot. Goals are funded manually and
//     subtract from the pot.
//   • 'jars'  (Save/Spend/Give…): each payout is split by % into jars.
//     The Spend jar is the store balance; the Save jar auto-fills goals
//     (overflow in creation order) and also accepts manual contributions.

const round2 = (n: number): number => Math.round(n * 100) / 100;

export type WalletMode = 'wallet' | 'jars';
export type JarKind = 'spend' | 'save' | 'give' | 'other';

export interface JarView {
  id: string;
  name: string;
  kind: JarKind;
  percentage: number;
  inflow: number;
  balance: number;
}

export interface GoalSaved {
  id: string;
  /** Money the kid explicitly put in (== savingsGoals.currentAmount). */
  manualAmount: number;
  /** Effective saved toward the goal: manual + any auto-fill from the Save jar. */
  savedAmount: number;
}

export interface Wallet {
  mode: WalletMode;
  lifetimeEarned: number;
  storeSpent: number;
  /** Everything the kid currently has = lifetimeEarned − storeSpent. */
  totalHoldings: number;
  /** Spendable in the store (whole wallet, or the Spend jar). */
  storeBalance: number;
  /** Available to move into goals (whole wallet, or the Save jar leftover). */
  goalAvailable: number;
  jars: JarView[];
  /** Per-goal saved amounts (active + completed; archived excluded). */
  goals: GoalSaved[];
  /** The in-progress week's projected allowance (computed while banking). */
  currentWeek: CurrentWeekAllowance;
}

/**
 * Infer a jar's role from its name. Used as the default when a category has no
 * explicit `kind` yet (legacy rows / inference at creation time); the stored
 * `kind` is authoritative once set.
 */
export function classifyJar(name: string): JarKind {
  const k = name.toLowerCase().trim();
  if (k.includes('spend') || k.includes('buy')) return 'spend';
  if (k.includes('save') || k.includes('bank')) return 'save';
  if (k.includes('give') || k.includes('share') || k.includes('donate')) return 'give';
  return 'other';
}

/**
 * Bank the current week, then compute the kid's full wallet picture.
 * Single source of truth for store purchases, dashboards, and the goals page.
 */
export async function computeWallet(
  kidId: string,
  today: Date = new Date()
): Promise<Wallet> {
  // Make sure the in-progress week is reflected before we read the ledger.
  const week = await computeCurrentWeekAllowance(kidId, today);
  await bankWeek(kidId, week.weekStart, week.base, week.bonus);

  // ── Persisted facts ──
  const ledgerRows = await db
    .select({ earned: allowanceLedger.earned, bonusEarned: allowanceLedger.bonusEarned })
    .from(allowanceLedger)
    .where(eq(allowanceLedger.kidId, kidId));
  const lifetimeEarned = round2(
    ledgerRows.reduce((sum, r) => sum + Number(r.earned) + Number(r.bonusEarned), 0)
  );

  const orderRows = await db
    .select({ price: storeItems.price })
    .from(storeOrders)
    .leftJoin(storeItems, eq(storeOrders.itemId, storeItems.id))
    .where(and(eq(storeOrders.kidId, kidId), ne(storeOrders.status, 'declined')));
  const storeSpent = round2(orderRows.reduce((sum, r) => sum + Number(r.price ?? 0), 0));

  const totalHoldings = round2(lifetimeEarned - storeSpent);

  // Goals that hold money — active and completed, in creation order. Archived
  // goals release their funds back to the wallet/Save jar.
  const goalRows = await db
    .select()
    .from(savingsGoals)
    .where(eq(savingsGoals.kidId, kidId))
    .orderBy(savingsGoals.createdAt);
  const fundable = goalRows.filter((g) => g.status !== 'archived');
  const manualSum = round2(fundable.reduce((sum, g) => sum + Number(g.currentAmount), 0));

  // ── Mode selection ──
  const cats = await db
    .select()
    .from(spendingCategories)
    .where(eq(spendingCategories.kidId, kidId))
    .orderBy(spendingCategories.sortOrder);

  // ── Wallet mode (no jars) ──
  if (cats.length === 0) {
    const spendable = round2(lifetimeEarned - storeSpent - manualSum);
    return {
      mode: 'wallet',
      lifetimeEarned,
      storeSpent,
      totalHoldings,
      storeBalance: Math.max(0, spendable),
      goalAvailable: Math.max(0, spendable),
      jars: [],
      goals: fundable.map((g) => ({
        id: g.id,
        manualAmount: Number(g.currentAmount),
        savedAmount: Number(g.currentAmount),
      })),
      currentWeek: week,
    };
  }

  // ── Jars mode ──
  // Split lifetime earnings into jars by %; sum any save/spend categories.
  const inflows =
    splitEarnings(
      lifetimeEarned,
      cats.map((c) => ({ name: c.name, percentage: c.percentage }))
    ) ?? [];
  const inflowByName = new Map(inflows.map((a) => [a.name, a.amount]));

  let saveInflow = 0;
  let spendInflow = 0;
  const classified = cats.map((c) => {
    // Trust the stored role; fall back to name inference only for legacy rows
    // that predate the `kind` column (default 'other').
    const kind: JarKind = c.kind && c.kind !== 'other' ? c.kind : classifyJar(c.name);
    const inflow = inflowByName.get(c.name) ?? 0;
    if (kind === 'save') saveInflow = round2(saveInflow + inflow);
    if (kind === 'spend') spendInflow = round2(spendInflow + inflow);
    return { cat: c, kind, inflow };
  });

  // Auto-fill goals from the Save jar (after manual contributions already in
  // them), overflowing in creation order. The leftover stays in the Save jar.
  let pool = Math.max(0, round2(saveInflow - manualSum));
  const goals: GoalSaved[] = fundable.map((g) => {
    const manual = Number(g.currentAmount);
    const target = Number(g.targetAmount);
    const need = Math.max(0, round2(target - manual));
    const auto = Math.min(pool, need);
    pool = round2(pool - auto);
    return { id: g.id, manualAmount: manual, savedAmount: Math.min(target, round2(manual + auto)) };
  });

  const savedSum = round2(goals.reduce((sum, g) => sum + g.savedAmount, 0));
  const saveJar = round2(saveInflow - savedSum);
  const spendJar = round2(spendInflow - storeSpent);

  const jars: JarView[] = classified.map(({ cat, kind, inflow }) => {
    let balance = inflow;
    if (kind === 'spend') balance = spendJar;
    else if (kind === 'save') balance = saveJar;
    return {
      id: cat.id,
      name: cat.name,
      kind,
      percentage: cat.percentage,
      inflow,
      balance: Math.max(0, balance),
    };
  });

  return {
    mode: 'jars',
    lifetimeEarned,
    storeSpent,
    totalHoldings,
    storeBalance: Math.max(0, spendJar),
    goalAvailable: Math.max(0, saveJar),
    jars,
    goals,
    currentWeek: week,
  };
}
