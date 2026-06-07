import { describe, test, expect } from 'vitest';
import { suggestIcon, searchIcons, ICON_CATALOG } from '@/lib/icon-catalog';

describe('suggestIcon', () => {
  test('returns null for empty input', () => {
    expect(suggestIcon('')).toBeNull();
    expect(suggestIcon('   ')).toBeNull();
  });

  test('returns null when nothing matches', () => {
    expect(suggestIcon('xyzzy quux')).toBeNull();
  });

  test.each([
    ['Bring in Garbage Cans', 'mdi:trash-can-outline'],
    ['Take Out Trash', 'mdi:trash-can-outline'],
    ['Brush Teeth', 'mdi:toothbrush'],
    ['Make Bed', 'mdi:bed'],
    ['Feed the Dog', 'mdi:dog'],
    ['Walk the Dog', 'mdi:dog'],
    ['Do the Dishes', 'mdi:silverware-clean'],
    ['Wash dishes', 'mdi:silverware-clean'],
    ['Vacuum the floor', 'mdi:vacuum'],
    ['Water the plants', 'mdi:watering-can'],
    ['Mow the lawn', 'mdi:grass'],
    ['Fold laundry', 'mdi:basket'],
    ['Clean the garage', 'mdi:garage-variant'],
    ['Load the dishwasher', 'mdi:dishwasher'],
    ['Read a book', 'mdi:book-open-variant'],
    ['Practice piano', 'mdi:piano'],
    ['Clean the toilet', 'mdi:toilet'],
  ])('matches "%s" → %s', (input, expected) => {
    expect(suggestIcon(input)).toBe(expected);
  });

  test('ignores stopwords like "take" and "bring" when scoring', () => {
    // "take out trash" should match trash, not anything matching "take"
    expect(suggestIcon('take out trash')).toBe('mdi:trash-can-outline');
  });

  test('is case-insensitive', () => {
    expect(suggestIcon('FEED THE DOG')).toBe(suggestIcon('feed the dog'));
  });

  test('handles punctuation', () => {
    expect(suggestIcon('Feed-the-dog!')).toBe('mdi:dog');
  });
});

describe('searchIcons', () => {
  test('returns full catalog for empty query', () => {
    expect(searchIcons('').length).toBe(ICON_CATALOG.length);
    expect(searchIcons('   ').length).toBe(ICON_CATALOG.length);
  });

  test('filters by partial keyword', () => {
    const results = searchIcons('trash');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((e) => e.keywords.includes('trash'))).toBe(true);
  });

  test('filters by name substring', () => {
    const results = searchIcons('broom');
    expect(results.some((e) => e.name === 'broom')).toBe(true);
  });

  test('ranks entries with more token matches higher', () => {
    // the spray cleaner matches both "scrub" and "clean"
    const results = searchIcons('scrub clean');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.name).toBe('spray cleaner');
  });

  test('returns empty for nonsense query', () => {
    expect(searchIcons('xyzzyquux')).toEqual([]);
  });
});

describe('catalog integrity', () => {
  test('every entry uses an mdi: icon ID', () => {
    for (const entry of ICON_CATALOG) {
      expect(entry.iconId.startsWith('mdi:')).toBe(true);
    }
  });

  test('icon IDs are unique', () => {
    const ids = ICON_CATALOG.map((e) => e.iconId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
