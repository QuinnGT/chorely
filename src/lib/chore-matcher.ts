/**
 * Fuzzy chore matcher — pure functions for matching spoken text
 * against a kid's assigned chores using normalized string comparison.
 *
 * No database imports — this is a matching-only module.
 *
 * Matching strategy (in priority order):
 *   1. Exact match (normalized)        → confidence 1.0
 *   2. Spoken text contains chore name  → confidence 0.8
 *   3. Chore name contains spoken text  → confidence 0.6
 *   4. Word overlap                     → confidence based on overlap ratio
 *   5. No match                         → excluded from results
 *
 * Results are sorted by confidence descending.
 * Only chores from the provided assigned list are ever returned.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AssignedChore {
  id: string;
  name: string;
  assignmentId: string;
}

export interface ChoreMatch {
  choreId: string;
  choreName: string;
  assignmentId: string;
  confidence: number; // 0-1
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Normalize a string for comparison: lowercase, trim, collapse whitespace. */
function normalize(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, ' ');
}

/** Split normalized text into unique non-empty words. */
function toWords(text: string): readonly string[] {
  if (text === '') return [];
  return text.split(' ');
}

/**
 * Calculate the confidence score for a spoken text against a chore name.
 * Returns 0 when there is no meaningful match.
 */
function calculateConfidence(
  normalizedSpoken: string,
  normalizedChore: string
): number {
  // 1. Exact match
  if (normalizedSpoken === normalizedChore) return 1.0;

  // 2. Spoken text contains the chore name
  if (normalizedSpoken.includes(normalizedChore)) return 0.8;

  // 3. Chore name contains the spoken text
  if (normalizedChore.includes(normalizedSpoken)) return 0.6;

  // 4. Word overlap
  const spokenWords = toWords(normalizedSpoken);
  const choreWords = toWords(normalizedChore);

  if (spokenWords.length === 0 || choreWords.length === 0) return 0;

  const matchingWords = choreWords.filter((word) =>
    spokenWords.includes(word)
  );

  if (matchingWords.length === 0) return 0;

  // Overlap ratio relative to the chore name's word count
  return Math.round((matchingWords.length / choreWords.length) * 0.5 * 100) / 100;
}

// ─── Main ───────────────────────────────────────────────────────────────────

/**
 * Match spoken text against a list of assigned chores.
 *
 * Returns `ChoreMatch[]` sorted by confidence descending.
 * Only includes chores with a positive confidence score.
 * Never returns chores not in the provided list.
 */
export function matchChore(
  spokenText: string,
  assignedChores: readonly AssignedChore[]
): ChoreMatch[] {
  const normalizedSpoken = normalize(spokenText);

  if (normalizedSpoken === '' || assignedChores.length === 0) return [];

  const matches: ChoreMatch[] = [];

  for (const chore of assignedChores) {
    const normalizedChore = normalize(chore.name);
    if (normalizedChore === '') continue;

    const confidence = calculateConfidence(normalizedSpoken, normalizedChore);

    if (confidence > 0) {
      matches.push({
        choreId: chore.id,
        choreName: chore.name,
        assignmentId: chore.assignmentId,
        confidence,
      });
    }
  }

  // Sort by confidence descending (stable sort preserves insertion order for ties)
  return [...matches].sort((a, b) => b.confidence - a.confidence);
}
