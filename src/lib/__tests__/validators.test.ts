import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import { z, ZodError } from 'zod';
import {
  createKidSchema,
  createChoreSchema,
  toggleCompletionSchema,
  verifyPinSchema,
} from '@/lib/validators';

// ─── Generators ─────────────────────────────────────────────────────────────

const kidGenerator = fc.record({
  name: fc.string({ minLength: 1, maxLength: 50 }),
  themeColor: fc.stringMatching(/^[0-9a-fA-F]{6}$/).map(s => `#${s}`),
});

const choreGenerator = fc.record({
  name: fc.string({ minLength: 1, maxLength: 100 }),
  icon: fc.constantFrom('🧹', '🛏️', '📚', '🦷', '🗑️', '🧽'),
  frequency: fc.constantFrom('daily' as const, 'weekly' as const),
  assignedKidIds: fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
});

const completionGenerator = fc.record({
  assignmentId: fc.uuid(),
  date: fc
    .integer({ min: 0, max: 730 })
    .map(offset => {
      const d = new Date(2024, 0, 1);
      d.setDate(d.getDate() + offset);
      return d.toISOString().split('T')[0];
    }),
  completed: fc.boolean(),
});

const pinGenerator = fc.stringMatching(/^[0-9]{4}$/);

// ─── Property 29: Zod schemas accept valid inputs and reject invalid inputs ─

describe('Property 29: Zod schemas accept valid inputs and reject invalid inputs', () => {
  // Feature: family-command-center, Property 29: Zod schemas accept valid inputs and reject invalid inputs

  test('createKidSchema accepts valid kid inputs', () => {
    fc.assert(
      fc.property(kidGenerator, (input) => {
        const result = createKidSchema.parse(input);
        expect(result.name).toBe(input.name);
        expect(result.themeColor).toBe(input.themeColor);
      }),
      { numRuns: 100 },
    );
  });

  test('createKidSchema rejects empty name', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[0-9a-fA-F]{6}$/).map(s => `#${s}`),
        (color) => {
          expect(() => createKidSchema.parse({ name: '', themeColor: color })).toThrow(ZodError);
        },
      ),
      { numRuns: 100 },
    );
  });

  test('createKidSchema rejects name exceeding 50 characters', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 51, maxLength: 100 }),
        fc.stringMatching(/^[0-9a-fA-F]{6}$/).map(s => `#${s}`),
        (name, color) => {
          expect(() => createKidSchema.parse({ name, themeColor: color })).toThrow(ZodError);
        },
      ),
      { numRuns: 100 },
    );
  });

  test('createKidSchema rejects invalid hex color', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.constantFrom('red', '#GGG', '123456', '#12345', '#1234567'),
        (name, badColor) => {
          expect(() => createKidSchema.parse({ name, themeColor: badColor })).toThrow(ZodError);
        },
      ),
      { numRuns: 100 },
    );
  });

  test('createChoreSchema accepts valid chore inputs', () => {
    fc.assert(
      fc.property(choreGenerator, (input) => {
        const result = createChoreSchema.parse(input);
        expect(result.name).toBe(input.name);
        expect(result.frequency).toBe(input.frequency);
        expect(result.assignedKidIds).toEqual(input.assignedKidIds);
      }),
      { numRuns: 100 },
    );
  });

  test('createChoreSchema rejects missing assignedKidIds', () => {
    expect(() =>
      createChoreSchema.parse({ name: 'Dishes', icon: '🧹', frequency: 'daily' }),
    ).toThrow(ZodError);
  });

  test('createChoreSchema rejects empty assignedKidIds array', () => {
    expect(() =>
      createChoreSchema.parse({
        name: 'Dishes',
        icon: '🧹',
        frequency: 'daily',
        assignedKidIds: [],
      }),
    ).toThrow(ZodError);
  });

  test('createChoreSchema rejects invalid frequency', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
        fc.constantFrom('monthly', 'yearly', 'hourly', 'biweekly'),
        (name, kidIds, badFreq) => {
          expect(() =>
            createChoreSchema.parse({
              name,
              icon: '🧹',
              frequency: badFreq,
              assignedKidIds: kidIds,
            }),
          ).toThrow(ZodError);
        },
      ),
      { numRuns: 100 },
    );
  });

  test('toggleCompletionSchema accepts valid completion inputs', () => {
    fc.assert(
      fc.property(completionGenerator, (input) => {
        const result = toggleCompletionSchema.parse(input);
        expect(result.assignmentId).toBe(input.assignmentId);
        expect(result.date).toBe(input.date);
        expect(result.completed).toBe(input.completed);
      }),
      { numRuns: 100 },
    );
  });

  test('toggleCompletionSchema rejects invalid date format', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.constantFrom('2024/01/01', '01-01-2024', 'not-a-date', '2024-1-1'),
        fc.boolean(),
        (id, badDate, completed) => {
          expect(() =>
            toggleCompletionSchema.parse({ assignmentId: id, date: badDate, completed }),
          ).toThrow(ZodError);
        },
      ),
      { numRuns: 100 },
    );
  });

  test('toggleCompletionSchema rejects non-uuid assignmentId', () => {
    expect(() =>
      toggleCompletionSchema.parse({
        assignmentId: 'not-a-uuid',
        date: '2024-06-15',
        completed: true,
      }),
    ).toThrow(ZodError);
  });

  test('verifyPinSchema accepts valid 4-digit PINs', () => {
    fc.assert(
      fc.property(pinGenerator, (pin) => {
        const result = verifyPinSchema.parse({ pin });
        expect(result.pin).toBe(pin);
      }),
      { numRuns: 100 },
    );
  });

  test('verifyPinSchema rejects non-4-digit strings', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('123', '12345', '', 'abcd', '12ab', '1'),
        (badPin) => {
          expect(() => verifyPinSchema.parse({ pin: badPin })).toThrow(ZodError);
        },
      ),
      { numRuns: 100 },
    );
  });

  test('verifyPinSchema rejects missing pin field', () => {
    expect(() => verifyPinSchema.parse({})).toThrow(ZodError);
  });
});

// ─── Property 30: Zod schema serialization round-trip ───────────────────────

describe('Property 30: Zod schema serialization round-trip', () => {
  // Feature: family-command-center, Property 30: Zod schema serialization round-trip

  test('valid kid input survives JSON round-trip', () => {
    fc.assert(
      fc.property(kidGenerator, (input) => {
        const parsed = createKidSchema.parse(input);
        const roundTripped = createKidSchema.parse(JSON.parse(JSON.stringify(parsed)));
        expect(roundTripped).toEqual(parsed);
      }),
      { numRuns: 100 },
    );
  });

  test('valid chore input survives JSON round-trip', () => {
    fc.assert(
      fc.property(choreGenerator, (input) => {
        const parsed = createChoreSchema.parse(input);
        const roundTripped = createChoreSchema.parse(JSON.parse(JSON.stringify(parsed)));
        expect(roundTripped).toEqual(parsed);
      }),
      { numRuns: 100 },
    );
  });

  test('valid completion input survives JSON round-trip', () => {
    fc.assert(
      fc.property(completionGenerator, (input) => {
        const parsed = toggleCompletionSchema.parse(input);
        const roundTripped = toggleCompletionSchema.parse(JSON.parse(JSON.stringify(parsed)));
        expect(roundTripped).toEqual(parsed);
      }),
      { numRuns: 100 },
    );
  });

  test('valid PIN input survives JSON round-trip', () => {
    fc.assert(
      fc.property(pinGenerator, (pin) => {
        const parsed = verifyPinSchema.parse({ pin });
        const roundTripped = verifyPinSchema.parse(JSON.parse(JSON.stringify(parsed)));
        expect(roundTripped).toEqual(parsed);
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 21: UUID validation rejects non-UUID strings ──────────────────

// Feature: allowance-gamification-ui, Property 21: UUID validation rejects non-UUID strings
describe('Property 21: UUID validation rejects non-UUID strings', () => {
  test('any non-UUID string fails z.string().uuid() validation', () => {
    // **Validates: Requirements 12.4**
    const uuidSchema = z.string().uuid();

    // Generator for strings that are NOT valid UUIDs
    const nonUuidGen = fc
      .string({ minLength: 1, maxLength: 100 })
      .filter((s) => {
        // UUID v4 pattern: 8-4-4-4-12 hex chars
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return !uuidRegex.test(s);
      });

    fc.assert(
      fc.property(nonUuidGen, (input) => {
        const result = uuidSchema.safeParse(input);
        expect(result.success).toBe(false);
      }),
      { numRuns: 10 },
    );
  });
});
