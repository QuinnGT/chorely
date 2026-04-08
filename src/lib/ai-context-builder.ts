// ─── AI Context Builder ─────────────────────────────────────────────────────
// Pure module — no database imports. Builds a system prompt from kid context.

export interface KidContext {
  kidName: string;
  currentDate?: string;
  choreStatus: { name: string; completed: boolean; frequency: string }[];
  allowanceBalance: { base: number; bonus: number; total: number };
  streakDays: number;
  savingsGoals: { name: string; target: number; current: number }[];
  spendingCategories: { name: string; balance: number }[];
  achievements: string[];
}

export function buildSystemPrompt(context: KidContext): string {
  const sections: string[] = [];

  // Current date context
  if (context.currentDate) {
    const date = new Date(context.currentDate + 'T12:00:00');
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    const fullDate = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    sections.push(`Today is ${dayName}, ${fullDate}.`);
  }

  sections.push(
    `You are a friendly family assistant helping ${context.kidName}. ` +
    `Always respond with specific data from ${context.kidName}'s records. ` +
    `Do not give generic encouragement — use the real numbers and facts below. ` +
    `When listing chores, always list ALL incomplete chores — never skip any.`
  );

  // Chore status
  if (context.choreStatus.length > 0) {
    const choreLines = context.choreStatus.map(
      (c) => `- ${c.name} (${c.frequency}): ${c.completed ? '✅ Done' : '⬜ Not done'}`
    );
    sections.push(`Chore status for today:\n${choreLines.join('\n')}`);
  } else {
    sections.push('No chores assigned today.');
  }

  // Allowance balance
  sections.push(
    `Allowance balance: $${context.allowanceBalance.base.toFixed(2)} base + ` +
    `$${context.allowanceBalance.bonus.toFixed(2)} bonus = ` +
    `$${context.allowanceBalance.total.toFixed(2)} total.`
  );

  // Streak
  sections.push(`Current streak: ${context.streakDays} day${context.streakDays === 1 ? '' : 's'}.`);

  // Savings goals
  if (context.savingsGoals.length > 0) {
    const goalLines = context.savingsGoals.map((g) => {
      const pct = g.target > 0 ? Math.min((g.current / g.target) * 100, 100) : 0;
      return `- ${g.name}: $${g.current.toFixed(2)} / $${g.target.toFixed(2)} (${pct.toFixed(0)}%)`;
    });
    sections.push(`Savings goals:\n${goalLines.join('\n')}`);
  }

  // Spending categories
  if (context.spendingCategories.length > 0) {
    const catLines = context.spendingCategories.map(
      (c) => `- ${c.name}: $${c.balance.toFixed(2)}`
    );
    sections.push(`Spending categories:\n${catLines.join('\n')}`);
  }

  // Achievements
  if (context.achievements.length > 0) {
    sections.push(`Achievements: ${context.achievements.join(', ')}.`);
  }

  return sections.join('\n\n');
}
