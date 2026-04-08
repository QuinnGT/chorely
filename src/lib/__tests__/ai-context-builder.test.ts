import { describe, test, expect } from 'vitest';
import { buildSystemPrompt, type KidContext } from '@/lib/ai-context-builder';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeContext(overrides: Partial<KidContext> = {}): KidContext {
  return {
    kidName: 'Emma',
    choreStatus: [
      { name: 'Brush Teeth', completed: true, frequency: 'daily' },
      { name: 'Make Bed', completed: false, frequency: 'daily' },
    ],
    allowanceBalance: { base: 5.0, bonus: 3.0, total: 8.0 },
    streakDays: 12,
    savingsGoals: [
      { name: 'New Bike', target: 50, current: 25 },
    ],
    spendingCategories: [
      { name: 'Save', balance: 10.5 },
      { name: 'Spend', balance: 7.25 },
    ],
    achievements: ['First Streak', 'Chore Champion'],
    ...overrides,
  };
}

// ─── buildSystemPrompt ──────────────────────────────────────────────────────

describe('buildSystemPrompt', () => {
  test('contains the kid name', () => {
    const prompt = buildSystemPrompt(makeContext());
    expect(prompt).toContain('Emma');
  });

  test('contains at least one chore name from the chore status list', () => {
    const prompt = buildSystemPrompt(makeContext());
    expect(prompt).toContain('Brush Teeth');
  });

  test('contains the allowance total', () => {
    const prompt = buildSystemPrompt(makeContext());
    expect(prompt).toContain('$8.00 total');
  });

  test('contains the streak day count', () => {
    const prompt = buildSystemPrompt(makeContext());
    expect(prompt).toContain('12 days');
  });

  test('contains base and bonus amounts', () => {
    const prompt = buildSystemPrompt(makeContext());
    expect(prompt).toContain('$5.00 base');
    expect(prompt).toContain('$3.00 bonus');
  });

  test('marks completed chores with done indicator', () => {
    const prompt = buildSystemPrompt(makeContext());
    expect(prompt).toContain('Brush Teeth (daily): ✅ Done');
  });

  test('marks incomplete chores with not-done indicator', () => {
    const prompt = buildSystemPrompt(makeContext());
    expect(prompt).toContain('Make Bed (daily): ⬜ Not done');
  });

  test('includes savings goal name and progress', () => {
    const prompt = buildSystemPrompt(makeContext());
    expect(prompt).toContain('New Bike');
    expect(prompt).toContain('$25.00 / $50.00');
    expect(prompt).toContain('50%');
  });

  test('includes spending category names and balances', () => {
    const prompt = buildSystemPrompt(makeContext());
    expect(prompt).toContain('Save: $10.50');
    expect(prompt).toContain('Spend: $7.25');
  });

  test('includes achievements', () => {
    const prompt = buildSystemPrompt(makeContext());
    expect(prompt).toContain('First Streak');
    expect(prompt).toContain('Chore Champion');
  });

  test('instructs AI to use specific data, not generic encouragement', () => {
    const prompt = buildSystemPrompt(makeContext());
    expect(prompt).toContain('specific data');
    expect(prompt).toContain('Do not give generic encouragement');
  });

  // ── Optional sections omitted when empty ──────────────────────────────

  test('omits savings goals section when list is empty', () => {
    const prompt = buildSystemPrompt(makeContext({ savingsGoals: [] }));
    expect(prompt).not.toContain('Savings goals');
  });

  test('omits spending categories section when list is empty', () => {
    const prompt = buildSystemPrompt(makeContext({ spendingCategories: [] }));
    expect(prompt).not.toContain('Spending categories');
  });

  test('omits achievements section when list is empty', () => {
    const prompt = buildSystemPrompt(makeContext({ achievements: [] }));
    expect(prompt).not.toContain('Achievements');
  });

  test('shows no-chores message when chore list is empty', () => {
    const prompt = buildSystemPrompt(makeContext({ choreStatus: [] }));
    expect(prompt).toContain('No chores assigned today');
  });

  // ── Singular streak day ───────────────────────────────────────────────

  test('uses singular "day" for streak of 1', () => {
    const prompt = buildSystemPrompt(makeContext({ streakDays: 1 }));
    expect(prompt).toContain('1 day.');
    expect(prompt).not.toContain('1 days');
  });

  // ── Savings goal progress clamped at 100% ─────────────────────────────

  test('clamps savings goal progress at 100% when current exceeds target', () => {
    const prompt = buildSystemPrompt(
      makeContext({ savingsGoals: [{ name: 'Toy', target: 10, current: 15 }] })
    );
    expect(prompt).toContain('100%');
  });
});
