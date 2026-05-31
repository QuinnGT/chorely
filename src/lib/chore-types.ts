export const CHORE_FREQUENCIES = ['daily', 'weekly'] as const;
export const CHORE_KINDS = ['standard', 'big_boss'] as const;

export type ChoreFrequency = (typeof CHORE_FREQUENCIES)[number];
export type ChoreKind = (typeof CHORE_KINDS)[number];
