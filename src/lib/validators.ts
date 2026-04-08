import { z } from 'zod';

// ─── Kid schemas ────────────────────────────────────────────────────────────

export const createKidSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50),
  themeColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid hex color').default('#0d9488'),
  avatarUrl: z.string().nullable().optional(),
});

export const updateKidSchema = createKidSchema.partial();

export type CreateKidInput = z.infer<typeof createKidSchema>;
export type UpdateKidInput = z.infer<typeof updateKidSchema>;

// ─── Chore schemas ──────────────────────────────────────────────────────────

export const createChoreSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  icon: z.string().min(1).max(10).default('📋'),
  frequency: z.enum(['daily', 'weekly']).default('daily'),
  assignedKidIds: z.array(z.string().uuid()).min(1, 'Must assign to at least one kid'),
});

export const updateChoreSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  icon: z.string().min(1).max(10).optional(),
  frequency: z.enum(['daily', 'weekly']).optional(),
  isActive: z.boolean().optional(),
  assignedKidIds: z.array(z.string().uuid()).optional(),
});

export type CreateChoreInput = z.infer<typeof createChoreSchema>;
export type UpdateChoreInput = z.infer<typeof updateChoreSchema>;

// ─── Completion schemas ─────────────────────────────────────────────────────

export const toggleCompletionSchema = z.object({
  assignmentId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  completed: z.boolean(),
});

export type ToggleCompletionInput = z.infer<typeof toggleCompletionSchema>;

// ─── Admin schemas ──────────────────────────────────────────────────────────

export const verifyPinSchema = z.object({
  pin: z.string().length(4, 'PIN must be 4 digits').regex(/^\d{4}$/, 'PIN must be numeric'),
});

export type VerifyPinInput = z.infer<typeof verifyPinSchema>;

// ─── AI schemas ─────────────────────────────────────────────────────────────

export const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1),
});

export const kidContextSchema = z.object({
  kidName: z.string().min(1),
  currentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  choreStatus: z.array(z.object({
    name: z.string(),
    completed: z.boolean(),
    frequency: z.string(),
  })),
  allowanceBalance: z.object({
    base: z.number(),
    bonus: z.number(),
    total: z.number(),
  }),
  streakDays: z.number().int().nonnegative(),
  savingsGoals: z.array(z.object({
    name: z.string(),
    target: z.number(),
    current: z.number(),
  })),
  spendingCategories: z.array(z.object({
    name: z.string(),
    balance: z.number(),
  })),
  achievements: z.array(z.string()),
});

export const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1),
  model: z.string().min(1).optional(),
  provider: z.enum(['openrouter', 'ollama']).optional(),
  kidId: z.string().uuid().optional(),
  kidContext: kidContextSchema.optional(),
});

export type KidContextInput = z.infer<typeof kidContextSchema>;
export type ChatRequestInput = z.infer<typeof chatRequestSchema>;

// ─── Allowance Rules ────────────────────────────────────────────────────────

export const allowanceRulesSchema = z.object({
  kidId: z.string().uuid(),
  fullCompletionAmount: z.number().nonnegative().multipleOf(0.01),
  partialCompletionAmount: z.number().nonnegative().multipleOf(0.01),
  streakBonusAmount: z.number().nonnegative().multipleOf(0.01),
  minStreakDays: z.number().int().min(1).max(365),
}).refine(
  (data) => data.partialCompletionAmount <= data.fullCompletionAmount,
  { message: 'Partial completion amount cannot exceed full completion amount', path: ['partialCompletionAmount'] }
);

export type AllowanceRulesInput = z.infer<typeof allowanceRulesSchema>;

// ─── Savings Goals ──────────────────────────────────────────────────────────

export const createSavingsGoalSchema = z.object({
  kidId: z.string().uuid(),
  name: z.string().min(1).max(100),
  targetAmount: z.number().positive().multipleOf(0.01),
});

export const updateSavingsGoalSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['active', 'completed', 'archived']).optional(),
  name: z.string().min(1).max(100).optional(),
  targetAmount: z.number().positive().multipleOf(0.01).optional(),
});

export type CreateSavingsGoalInput = z.infer<typeof createSavingsGoalSchema>;
export type UpdateSavingsGoalInput = z.infer<typeof updateSavingsGoalSchema>;

// ─── Spending Categories ────────────────────────────────────────────────────

export const spendingCategorySchema = z.object({
  name: z.string().min(1).max(50),
  percentage: z.number().int().min(1).max(100),
});

export const spendingCategoriesConfigSchema = z.object({
  kidId: z.string().uuid(),
  enabled: z.boolean(),
  categories: z.array(spendingCategorySchema),
}).refine(
  (data) => !data.enabled || data.categories.reduce((sum, c) => sum + c.percentage, 0) === 100,
  { message: 'Category percentages must total exactly 100%', path: ['categories'] }
).refine(
  (data) => !data.enabled || data.categories.length > 0,
  { message: 'At least one category is required when enabled', path: ['categories'] }
);

export type SpendingCategoryInput = z.infer<typeof spendingCategorySchema>;
export type SpendingCategoriesConfigInput = z.infer<typeof spendingCategoriesConfigSchema>;

// ─── Voice Settings ─────────────────────────────────────────────────────────

const wakePhraseRegex = /^[a-zA-Z]+(\s[a-zA-Z]+){1,4}$/;
const wakePhraseMessage = 'Wake phrase must be 2-5 alphabetic words';
const providerIdEnum = z.enum(['web-speech', 'elevenlabs', 'bedrock']);

export const kidVoiceSettingsSchema = z.object({
  enabled: z.boolean(),
  wakePhrase: z.string().regex(wakePhraseRegex, wakePhraseMessage),
  providerId: providerIdEnum,
  elevenlabsVoiceId: z.string().max(50).default(''),
  speechOutput: z.boolean(),
  soundEffects: z.boolean(),
});

export const globalVoiceSettingsSchema = z.object({
  defaultWakePhrase: z.string().regex(wakePhraseRegex, wakePhraseMessage),
  defaultProviderId: providerIdEnum,
  volume: z.number().int().min(0).max(100),
});

export const voiceSettingsSchema = z.object({
  global: globalVoiceSettingsSchema,
  perKid: z.record(z.string(), kidVoiceSettingsSchema),
});

export type KidVoiceSettingsInput = z.infer<typeof kidVoiceSettingsSchema>;
export type GlobalVoiceSettingsInput = z.infer<typeof globalVoiceSettingsSchema>;
export type VoiceSettingsInput = z.infer<typeof voiceSettingsSchema>;

// ─── ElevenLabs TTS ─────────────────────────────────────────────────────────

export const elevenlabsTtsSchema = z.object({
  text: z.string().min(1).max(5000),
  voiceId: z.string().max(50).optional(),
});

export type ElevenLabsTtsInput = z.infer<typeof elevenlabsTtsSchema>;

export interface ElevenLabsVoiceItem {
  voiceId: string;
  name: string;
  previewUrl: string;
}

// ─── Voice Chore Completion ─────────────────────────────────────────────────

export const voiceChoreCompleteSchema = z.object({
  kidId: z.string().uuid(),
  spokenText: z.string().min(1).max(500),
});

export type VoiceChoreCompleteInput = z.infer<typeof voiceChoreCompleteSchema>;

// ─── Store Items ─────────────────────────────────────────────────────────────

export const createStoreItemSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).default(''),
  imageUrl: z.string().url().nullable().optional(),
  price: z.number().positive().multipleOf(0.01),
  category: z.enum(['toys', 'games', 'experiences', 'books']).default('toys'),
  stock: z.number().int().nonnegative().default(0),
  active: z.boolean().default(true),
});

export const updateStoreItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  imageUrl: z.string().url().nullable().optional(),
  price: z.number().positive().multipleOf(0.01).optional(),
  category: z.enum(['toys', 'games', 'experiences', 'books']).optional(),
  stock: z.number().int().nonnegative().optional(),
  active: z.boolean().optional(),
});

export type CreateStoreItemInput = z.infer<typeof createStoreItemSchema>;
export type UpdateStoreItemInput = z.infer<typeof updateStoreItemSchema>;

// ─── Store Orders ────────────────────────────────────────────────────────────

export const createStoreOrderSchema = z.object({
  kidId: z.string().uuid(),
  itemId: z.string().uuid(),
});

export const updateStoreOrderSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['pending', 'approved', 'shipped', 'delivered']),
});

export type CreateStoreOrderInput = z.infer<typeof createStoreOrderSchema>;
export type UpdateStoreOrderInput = z.infer<typeof updateStoreOrderSchema>;
