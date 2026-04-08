// ─── AI Tool Definitions ────────────────────────────────────────────────────
// Server-only module — defines tools the AI can invoke during chat.
// Uses Drizzle ORM for database operations. Never import in client components.

import { z } from 'zod';
import { tool } from 'ai';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import {
  choreAssignments,
  choreCompletions,
  chores,
  savingsGoals,
} from '@/db/schema';
import { formatDate } from '@/lib/date-utils';

// ─── Internal executors ─────────────────────────────────────────────────────

async function executeCompleteChore(
  kidId: string,
  choreName: string
): Promise<{ success: boolean; message: string }> {
  try {
    const assignments = await db
      .select({
        assignmentId: choreAssignments.id,
        choreName: chores.name,
      })
      .from(choreAssignments)
      .innerJoin(chores, eq(choreAssignments.choreId, chores.id))
      .where(
        and(
          eq(choreAssignments.kidId, kidId),
          eq(chores.isActive, true)
        )
      );

    console.error('[completeChore] Found assignments:', assignments.length, 'for kidId:', kidId);

    const lowerName = choreName.toLowerCase();
    const match =
      assignments.find((a) => a.choreName.toLowerCase() === lowerName) ??
      assignments.find((a) => a.choreName.toLowerCase().includes(lowerName)) ??
      assignments.find((a) => lowerName.includes(a.choreName.toLowerCase()));

    if (!match) {
      const available = assignments.map((a) => a.choreName).join(', ');
      return {
        success: false,
        message: `Chore "${choreName}" not found. Available chores: ${available}`,
      };
    }

    console.error('[completeChore] Matched:', match.choreName, 'assignmentId:', match.assignmentId);

    const today = formatDate(new Date());

    const existing = await db
      .select()
      .from(choreCompletions)
      .where(
        and(
          eq(choreCompletions.assignmentId, match.assignmentId),
          eq(choreCompletions.date, today)
        )
      );

    if (existing.length > 0 && existing[0].completed) {
      return {
        success: true,
        message: `"${match.choreName}" is already marked as done for today.`,
      };
    }

    if (existing.length > 0) {
      const [updated] = await db
        .update(choreCompletions)
        .set({ completed: true, completedAt: new Date() })
        .where(eq(choreCompletions.id, existing[0].id))
        .returning();

      if (!updated) {
        return { success: false, message: 'Failed to update the completion record.' };
      }
    } else {
      const [created] = await db
        .insert(choreCompletions)
        .values({
          assignmentId: match.assignmentId,
          date: today,
          completed: true,
          completedAt: new Date(),
        })
        .returning();

      if (!created) {
        return { success: false, message: 'Failed to create the completion record.' };
      }
    }

    return {
      success: true,
      message: `Marked "${match.choreName}" as done for today.`,
    };
  } catch (error: unknown) {
    console.error('completeChore tool error:', error);
    return { success: false, message: 'Something went wrong marking the chore as done.' };
  }
}

async function executeAddSavingsGoal(
  kidId: string,
  name: string,
  targetAmount: number
): Promise<{ success: boolean; message: string }> {
  try {
    const [goal] = await db
      .insert(savingsGoals)
      .values({
        kidId,
        name,
        targetAmount: String(targetAmount),
        status: 'active',
      })
      .returning();

    return {
      success: true,
      message: `Created savings goal "${goal.name}" with a target of $${Number(goal.targetAmount).toFixed(2)}.`,
    };
  } catch (error: unknown) {
    console.error('addSavingsGoal tool error:', error);
    return { success: false, message: 'Something went wrong creating the savings goal.' };
  }
}

// ─── Input schemas ──────────────────────────────────────────────────────────

const completeChoreInput = z.object({
  choreName: z.string().describe('The chore name to mark as done (match from the chore list in context)'),
});

const addSavingsGoalInput = z.object({
  name: z.string().min(1).max(100).describe('What the kid is saving for (e.g. "New bike")'),
  targetAmount: z.number().positive().describe('The target amount in dollars (e.g. 25.00)'),
});

type CompleteChoreInput = z.infer<typeof completeChoreInput>;
type AddSavingsGoalInput = z.infer<typeof addSavingsGoalInput>;

// ─── Tool factory — kidId bound via closure ─────────────────────────────────

export function buildAiTools(kidId: string) {
  return {
    completeChore: tool<CompleteChoreInput, { success: boolean; message: string }>({
      description:
        'Mark a chore as completed for the current kid. Use this when the kid says they finished a chore. ' +
        'Match the chore name from the chore list in the context (e.g. if the list says "Make Bed" and the kid says "I made my bed", pass "Make Bed").',
      inputSchema: completeChoreInput,
      execute: async ({ choreName }) => executeCompleteChore(kidId, choreName),
    }),

    addSavingsGoal: tool<AddSavingsGoalInput, { success: boolean; message: string }>({
      description:
        'Create a new savings goal for the current kid. Use this when the kid wants to save up for something. ' +
        'Ask for the item name and target amount if not provided.',
      inputSchema: addSavingsGoalInput,
      execute: async ({ name, targetAmount }) => executeAddSavingsGoal(kidId, name, targetAmount),
    }),
  };
}
