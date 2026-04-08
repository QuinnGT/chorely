import { describe, test, expect } from 'vitest';
import {
  matchChore,
  type AssignedChore,
  type ChoreMatch,
} from '@/lib/chore-matcher';

// ─── Helpers ────────────────────────────────────────────────────────────────

const CHORES: AssignedChore[] = [
  { id: 'c1', name: 'Brush Teeth', assignmentId: 'a1' },
  { id: 'c2', name: 'Make Bed', assignmentId: 'a2' },
  { id: 'c3', name: 'Feed the Dog', assignmentId: 'a3' },
  { id: 'c4', name: 'Take Out Trash', assignmentId: 'a4' },
];

// ─── matchChore ─────────────────────────────────────────────────────────────

describe('matchChore', () => {
  // ── Exact match ─────────────────────────────────────────────────────────

  test('returns confidence 1.0 for exact match (case-insensitive)', () => {
    const result = matchChore('brush teeth', CHORES);

    expect(result[0]).toEqual({
      choreId: 'c1',
      choreName: 'Brush Teeth',
      assignmentId: 'a1',
      confidence: 1.0,
    });
  });

  test('returns confidence 1.0 for exact match with different casing', () => {
    const result = matchChore('MAKE BED', CHORES);

    expect(result[0]).toEqual({
      choreId: 'c2',
      choreName: 'Make Bed',
      assignmentId: 'a2',
      confidence: 1.0,
    });
  });

  test('returns confidence 1.0 for exact match with extra whitespace', () => {
    const result = matchChore('  brush  teeth  ', CHORES);

    expect(result[0]).toEqual({
      choreId: 'c1',
      choreName: 'Brush Teeth',
      assignmentId: 'a1',
      confidence: 1.0,
    });
  });

  // ── Spoken text contains chore name ─────────────────────────────────────

  test('returns confidence 0.8 when spoken text contains chore name', () => {
    const result = matchChore('I finished brush teeth today', CHORES);

    expect(result[0]).toEqual({
      choreId: 'c1',
      choreName: 'Brush Teeth',
      assignmentId: 'a1',
      confidence: 0.8,
    });
  });

  // ── Chore name contains spoken text ─────────────────────────────────────

  test('returns confidence 0.6 when chore name contains spoken text', () => {
    const result = matchChore('trash', CHORES);

    const trashMatch = result.find((m) => m.choreId === 'c4');
    expect(trashMatch).toBeDefined();
    expect(trashMatch!.confidence).toBe(0.6);
  });

  // ── Word overlap ────────────────────────────────────────────────────────

  test('returns word overlap confidence for partial word matches', () => {
    const result = matchChore('feed cat', CHORES);

    const feedMatch = result.find((m) => m.choreId === 'c3');
    expect(feedMatch).toBeDefined();
    // "feed" matches 1 of 3 words in "feed the dog" → 1/3 * 0.5 ≈ 0.17
    expect(feedMatch!.confidence).toBeGreaterThan(0);
    expect(feedMatch!.confidence).toBeLessThan(0.5);
  });

  // ── No match ────────────────────────────────────────────────────────────

  test('returns empty array when no chores match', () => {
    const result = matchChore('do homework', CHORES);

    expect(result).toEqual([]);
  });

  // ── Multiple matches ────────────────────────────────────────────────────

  test('returns multiple matches sorted by confidence descending', () => {
    const chores: AssignedChore[] = [
      { id: 'c1', name: 'Clean Room', assignmentId: 'a1' },
      { id: 'c2', name: 'Clean Kitchen', assignmentId: 'a2' },
      { id: 'c3', name: 'Clean', assignmentId: 'a3' },
    ];
    const result = matchChore('clean', chores);

    expect(result.length).toBeGreaterThanOrEqual(2);
    // Results should be sorted by confidence descending
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].confidence).toBeGreaterThanOrEqual(result[i].confidence);
    }
  });

  // ── Case insensitivity ──────────────────────────────────────────────────

  test('matching is case-insensitive for both spoken text and chore names', () => {
    const chores: AssignedChore[] = [
      { id: 'c1', name: 'WASH DISHES', assignmentId: 'a1' },
    ];
    const result = matchChore('wash dishes', chores);

    expect(result).toHaveLength(1);
    expect(result[0].confidence).toBe(1.0);
  });

  // ── Empty inputs ────────────────────────────────────────────────────────

  test('returns empty array for empty spoken text', () => {
    expect(matchChore('', CHORES)).toEqual([]);
  });

  test('returns empty array for whitespace-only spoken text', () => {
    expect(matchChore('   ', CHORES)).toEqual([]);
  });

  test('returns empty array for empty chores list', () => {
    expect(matchChore('brush teeth', [])).toEqual([]);
  });

  // ── Only assigned chores ────────────────────────────────────────────────

  test('never returns chores not in the provided list', () => {
    const limitedChores: AssignedChore[] = [
      { id: 'c1', name: 'Brush Teeth', assignmentId: 'a1' },
    ];
    const result = matchChore('brush teeth make bed', limitedChores);

    const choreIds = result.map((m) => m.choreId);
    expect(choreIds).not.toContain('c2');
    // Every returned match must be from the input list
    for (const match of result) {
      expect(limitedChores.some((c) => c.id === match.choreId)).toBe(true);
    }
  });

  // ── Immutability ────────────────────────────────────────────────────────

  test('does not mutate input chores array', () => {
    const chores: AssignedChore[] = [
      { id: 'c1', name: 'Brush Teeth', assignmentId: 'a1' },
      { id: 'c2', name: 'Make Bed', assignmentId: 'a2' },
    ];
    const original = chores.map((c) => ({ ...c }));

    matchChore('brush teeth', chores);

    expect(chores).toEqual(original);
  });

  // ── Confidence values are between 0 and 1 ──────────────────────────────

  test('all returned confidence values are between 0 and 1', () => {
    const result = matchChore('I need to feed the dog and brush teeth', CHORES);

    for (const match of result) {
      expect(match.confidence).toBeGreaterThan(0);
      expect(match.confidence).toBeLessThanOrEqual(1);
    }
  });
});
