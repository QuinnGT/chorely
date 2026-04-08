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

export const kidsRelations = relations(kids, ({ many, one }) => ({
  choreAssignments: many(choreAssignments),
  allowanceLedger: many(allowanceLedger),
  allowanceRules: one(allowanceRules),
  savingsGoals: many(savingsGoals),
  spendingCategories: many(spendingCategories),
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
  paidVia: text('paid_via'),
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

// ─── Allowance Rules (per-kid configurable amounts) ─────────────────────────

export const allowanceRules = pgTable('allowance_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  kidId: uuid('kid_id').notNull().references(() => kids.id, { onDelete: 'cascade' }).unique(),
  fullCompletionAmount: numeric('full_completion_amount', { precision: 10, scale: 2 }).notNull().default('5.00'),
  partialCompletionAmount: numeric('partial_completion_amount', { precision: 10, scale: 2 }).notNull().default('3.00'),
  streakBonusAmount: numeric('streak_bonus_amount', { precision: 10, scale: 2 }).notNull().default('3.00'),
  minStreakDays: integer('min_streak_days').notNull().default(7),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const allowanceRulesRelations = relations(allowanceRules, ({ one }) => ({
  kid: one(kids, { fields: [allowanceRules.kidId], references: [kids.id] }),
}));

// ─── Savings Goals ──────────────────────────────────────────────────────────

export const savingsGoals = pgTable('savings_goals', {
  id: uuid('id').primaryKey().defaultRandom(),
  kidId: uuid('kid_id').notNull().references(() => kids.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  targetAmount: numeric('target_amount', { precision: 10, scale: 2 }).notNull(),
  currentAmount: numeric('current_amount', { precision: 10, scale: 2 }).notNull().default('0.00'),
  status: text('status', { enum: ['active', 'completed', 'archived'] }).notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
});

export const savingsGoalsRelations = relations(savingsGoals, ({ one }) => ({
  kid: one(kids, { fields: [savingsGoals.kidId], references: [kids.id] }),
}));

// ─── Spending Categories (jars) ─────────────────────────────────────────────

export const spendingCategories = pgTable('spending_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  kidId: uuid('kid_id').notNull().references(() => kids.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  percentage: integer('percentage').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const spendingCategoriesRelations = relations(spendingCategories, ({ one, many }) => ({
  kid: one(kids, { fields: [spendingCategories.kidId], references: [kids.id] }),
  balances: many(categoryBalances),
}));

// ─── Category Balances ──────────────────────────────────────────────────────

export const categoryBalances = pgTable('category_balances', {
  id: uuid('id').primaryKey().defaultRandom(),
  categoryId: uuid('category_id').notNull().references(() => spendingCategories.id, { onDelete: 'cascade' }),
  kidId: uuid('kid_id').notNull().references(() => kids.id, { onDelete: 'cascade' }),
  balance: numeric('balance', { precision: 10, scale: 2 }).notNull().default('0.00'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const categoryBalancesRelations = relations(categoryBalances, ({ one }) => ({
  category: one(spendingCategories, { fields: [categoryBalances.categoryId], references: [spendingCategories.id] }),
  kid: one(kids, { fields: [categoryBalances.kidId], references: [kids.id] }),
}));

// ─── Store Items ─────────────────────────────────────────────────────────────

export const storeItems = pgTable('store_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  imageUrl: text('image_url'),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  category: text('category', { enum: ['toys', 'games', 'experiences', 'books'] }).notNull().default('toys'),
  stock: integer('stock').notNull().default(0),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const storeItemsRelations = relations(storeItems, ({ many }) => ({
  orders: many(storeOrders),
}));

// ─── Store Orders ────────────────────────────────────────────────────────────

export const storeOrders = pgTable('store_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  kidId: uuid('kid_id').notNull().references(() => kids.id, { onDelete: 'cascade' }),
  itemId: uuid('item_id').notNull().references(() => storeItems.id, { onDelete: 'cascade' }),
  status: text('status', { enum: ['pending', 'approved', 'shipped', 'delivered'] }).notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const storeOrdersRelations = relations(storeOrders, ({ one }) => ({
  kid: one(kids, { fields: [storeOrders.kidId], references: [kids.id] }),
  item: one(storeItems, { fields: [storeOrders.itemId], references: [storeItems.id] }),
}));
