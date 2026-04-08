export interface AllowanceRules {
  fullCompletionAmount: number;
  partialCompletionAmount: number;
  streakBonusAmount: number;
  minStreakDays: number;
}

export const DEFAULT_RULES: AllowanceRules = {
  fullCompletionAmount: 5.0,
  partialCompletionAmount: 3.0,
  streakBonusAmount: 3.0,
  minStreakDays: 7,
};
