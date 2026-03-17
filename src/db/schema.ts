import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  date,
  uuid,
  numeric,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─── Kids ───────────────────────────────────────────────────────────────────

export const kids = pgTable('kids', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  avatarUrl: text('avatar_url'),
  themeColor: text('theme_color').notNull().default('#0d9488'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const kidsRelations = relations(kids, ({ many }) => ({
  choreAssignments: many(choreAssignments),
  allowanceLedger: many(allowanceLedger),
}));

// ─── Chores ─────────────────────────────────────────────────────────────────

export const chores = pgTable('chores', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  icon: text('icon').notNull().default('📋'),
  frequency: text('frequency', { enum: ['daily', 'weekly'] }).notNull().default('daily'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const choresRelations = relations(chores, ({ many }) => ({
  choreAssignments: many(choreAssignments),
}));

// ─── Chore Assignments (many-to-many: kids ↔ chores) ────────────────────────

export const choreAssignments = pgTable('chore_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  choreId: uuid('chore_id').notNull().references(() => chores.id, { onDelete: 'cascade' }),
  kidId: uuid('kid_id').notNull().references(() => kids.id, { onDelete: 'cascade' }),
});

export const choreAssignmentsRelations = relations(choreAssignments, ({ one, many }) => ({
  chore: one(chores, {
    fields: [choreAssignments.choreId],
    references: [chores.id],
  }),
  kid: one(kids, {
    fields: [choreAssignments.kidId],
    references: [kids.id],
  }),
  completions: many(choreCompletions),
}));

// ─── Chore Completions ──────────────────────────────────────────────────────

export const choreCompletions = pgTable('chore_completions', {
  id: uuid('id').primaryKey().defaultRandom(),
  assignmentId: uuid('assignment_id').notNull().references(() => choreAssignments.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  completed: boolean('completed').notNull().default(false),
  completedAt: timestamp('completed_at', { withTimezone: true }),
});

export const choreCompletionsRelations = relations(choreCompletions, ({ one }) => ({
  assignment: one(choreAssignments, {
    fields: [choreCompletions.assignmentId],
    references: [choreAssignments.id],
  }),
}));

// ─── Allowance Ledger ───────────────────────────────────────────────────────

export const allowanceLedger = pgTable('allowance_ledger', {
  id: uuid('id').primaryKey().defaultRandom(),
  kidId: uuid('kid_id').notNull().references(() => kids.id, { onDelete: 'cascade' }),
  weekStart: date('week_start').notNull(),
  earned: numeric('earned', { precision: 10, scale: 2 }).notNull().default('0'),
  bonusEarned: numeric('bonus_earned', { precision: 10, scale: 2 }).notNull().default('0'),
  paid: boolean('paid').notNull().default(false),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const allowanceLedgerRelations = relations(allowanceLedger, ({ one }) => ({
  kid: one(kids, {
    fields: [allowanceLedger.kidId],
    references: [kids.id],
  }),
}));

// ─── App Settings ───────────────────────────────────────────────────────────

export const appSettings = pgTable('app_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
});
