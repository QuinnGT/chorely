import { z } from 'zod';

// ─── Kid schemas ────────────────────────────────────────────────────────────

export const createKidSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50),
  themeColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid hex color').default('#0d9488'),
  avatarUrl: z.string().url().nullable().optional(),
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

export const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1),
  model: z.string().min(1),
  provider: z.enum(['openrouter', 'ollama']),
});

export type ChatRequestInput = z.infer<typeof chatRequestSchema>;
