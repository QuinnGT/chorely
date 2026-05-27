import { describe, test, expect } from 'vitest';
import { suggestEmoji, searchEmojis, EMOJI_CATALOG } from '@/lib/emoji-suggester';

describe('suggestEmoji', () => {
  test('returns null for empty input', () => {
    expect(suggestEmoji('')).toBeNull();
    expect(suggestEmoji('   ')).toBeNull();
  });

  test('returns null when nothing matches', () => {
    expect(suggestEmoji('xyzzy quux')).toBeNull();
  });

  test.each([
    ['Bring in Garbage Cans', '\u{1F5D1}\u{FE0F}'],
    ['Take Out Trash', '\u{1F5D1}\u{FE0F}'],
    ['Brush Teeth', '\u{1FAA5}'],
    ['Make Bed', '\u{1F6CF}\u{FE0F}'],
    ['Feed the Dog', '\u{1F436}'],
    ['Walk the Dog', '\u{1F436}'],
    ['Do the Dishes', '\u{1F37D}\u{FE0F}'],
    ['Wash dishes', '\u{1F37D}\u{FE0F}'],
    ['Vacuum the floor', '\u{1F9F9}'],
    ['Water the plants', '\u{1FAB4}'],
    ['Mow the lawn', '\u{1F33E}'],
    ['Fold laundry', '\u{1F9FA}'],
    ['Read a book', '\u{1F4D6}'],
    ['Practice piano', '\u{1F3B9}'],
    ['Clean the toilet', '\u{1F6BD}'],
  ])('matches "%s" → expected emoji', (input, expected) => {
    expect(suggestEmoji(input)).toBe(expected);
  });

  test('ignores stopwords like "take" and "bring" when scoring', () => {
    // "take out trash" should match trash, not anything matching "take"
    const result = suggestEmoji('take out trash');
    expect(result).toBe('\u{1F5D1}\u{FE0F}');
  });

  test('is case-insensitive', () => {
    expect(suggestEmoji('FEED THE DOG')).toBe(suggestEmoji('feed the dog'));
  });

  test('handles punctuation', () => {
    expect(suggestEmoji('Feed-the-dog!')).toBe('\u{1F436}');
  });
});

describe('searchEmojis', () => {
  test('returns full catalog for empty query', () => {
    expect(searchEmojis('').length).toBe(EMOJI_CATALOG.length);
    expect(searchEmojis('   ').length).toBe(EMOJI_CATALOG.length);
  });

  test('filters by partial keyword', () => {
    const results = searchEmojis('trash');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((e) => e.keywords.includes('trash'))).toBe(true);
  });

  test('filters by name substring', () => {
    const results = searchEmojis('broom');
    expect(results.some((e) => e.name === 'broom')).toBe(true);
  });

  test('ranks entries with more token matches higher', () => {
    // sponge has both "scrub" and "clean"; broom only matches "sweep" but not these
    const results = searchEmojis('scrub clean');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.name).toBe('sponge');
  });

  test('returns empty for nonsense query', () => {
    expect(searchEmojis('xyzzyquux')).toEqual([]);
  });
});
