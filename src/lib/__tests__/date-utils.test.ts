import { describe, test, expect } from 'vitest';
import {
  getWeekStart,
  getWeekEnd,
  getDaysOfWeek,
  isToday,
  isPast,
  formatDate,
  getDayLabel,
  getDateLabel,
  getWeekRangeLabel,
} from '@/lib/date-utils';

// ─── getWeekStart ───────────────────────────────────────────────────────────

describe('getWeekStart', () => {
  test('returns a Monday for a mid-week date (Wednesday)', () => {
    const wed = new Date(2024, 2, 20); // Wed Mar 20, 2024
    const result = getWeekStart(wed);
    expect(result.getDay()).toBe(1); // Monday
    expect(result.getFullYear()).toBe(2024);
    expect(result.getMonth()).toBe(2);
    expect(result.getDate()).toBe(18);
  });

  test('returns same Monday when given a Monday', () => {
    const mon = new Date(2024, 2, 18); // Mon Mar 18, 2024
    const result = getWeekStart(mon);
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(18);
  });

  test('returns previous Monday when given a Sunday', () => {
    const sun = new Date(2024, 2, 24); // Sun Mar 24, 2024
    const result = getWeekStart(sun);
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(18);
  });

  test('Sunday midnight returns previous Monday (week boundary)', () => {
    const sunMidnight = new Date(2024, 2, 24, 0, 0, 0, 0); // Sun Mar 24 00:00:00
    const result = getWeekStart(sunMidnight);
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(18);
  });

  test('zeroes out time to midnight', () => {
    const date = new Date(2024, 2, 20, 15, 30, 45, 123);
    const result = getWeekStart(date);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
  });

  test('handles year boundary (Jan 1 2025 is a Wednesday)', () => {
    const jan1 = new Date(2025, 0, 1); // Wed Jan 1, 2025
    const result = getWeekStart(jan1);
    expect(result.getDay()).toBe(1);
    expect(result.getFullYear()).toBe(2024);
    expect(result.getMonth()).toBe(11); // December
    expect(result.getDate()).toBe(30);
  });

  test('does not mutate the input date', () => {
    const original = new Date(2024, 2, 20, 12, 0, 0);
    const originalTime = original.getTime();
    getWeekStart(original);
    expect(original.getTime()).toBe(originalTime);
  });
});

// ─── getWeekEnd ─────────────────────────────────────────────────────────────

describe('getWeekEnd', () => {
  test('returns a Sunday for a mid-week date', () => {
    const wed = new Date(2024, 2, 20); // Wed Mar 20, 2024
    const result = getWeekEnd(wed);
    expect(result.getDay()).toBe(0); // Sunday
    expect(result.getDate()).toBe(24);
  });

  test('returns same Sunday when given a Sunday', () => {
    const sun = new Date(2024, 2, 24); // Sun Mar 24, 2024
    const result = getWeekEnd(sun);
    expect(result.getDay()).toBe(0);
    expect(result.getDate()).toBe(24);
  });

  test('returns end-of-day time (23:59:59.999)', () => {
    const date = new Date(2024, 2, 20);
    const result = getWeekEnd(date);
    expect(result.getHours()).toBe(23);
    expect(result.getMinutes()).toBe(59);
    expect(result.getSeconds()).toBe(59);
    expect(result.getMilliseconds()).toBe(999);
  });

  test('handles month boundary (week spanning Jul–Aug)', () => {
    const wed = new Date(2024, 6, 31); // Wed Jul 31, 2024 → week Mon Jul 29 – Sun Aug 4
    const result = getWeekEnd(wed);
    expect(result.getDay()).toBe(0);
    expect(result.getMonth()).toBe(7); // August
    expect(result.getDate()).toBe(4);
  });

  test('handles year boundary (Dec 30 2024 is a Monday)', () => {
    const dec30 = new Date(2024, 11, 30); // Mon Dec 30, 2024
    const result = getWeekEnd(dec30);
    expect(result.getDay()).toBe(0);
    expect(result.getFullYear()).toBe(2025);
    expect(result.getMonth()).toBe(0); // January
    expect(result.getDate()).toBe(5);
  });

  test('does not mutate the input date', () => {
    const original = new Date(2024, 2, 20, 12, 0, 0);
    const originalTime = original.getTime();
    getWeekEnd(original);
    expect(original.getTime()).toBe(originalTime);
  });
});

// ─── getDaysOfWeek ──────────────────────────────────────────────────────────

describe('getDaysOfWeek', () => {
  test('returns exactly 7 dates', () => {
    const result = getDaysOfWeek(new Date(2024, 2, 20));
    expect(result).toHaveLength(7);
  });

  test('first day is Monday, last day is Sunday', () => {
    const result = getDaysOfWeek(new Date(2024, 2, 20));
    expect(result[0].getDay()).toBe(1); // Monday
    expect(result[6].getDay()).toBe(0); // Sunday
  });

  test('days are consecutive', () => {
    const result = getDaysOfWeek(new Date(2024, 2, 20));
    for (let i = 1; i < result.length; i++) {
      const diff = result[i].getTime() - result[i - 1].getTime();
      const oneDay = 24 * 60 * 60 * 1000;
      expect(diff).toBe(oneDay);
    }
  });

  test('returns Mon–Sun for a Sunday input', () => {
    const sun = new Date(2024, 2, 24); // Sun Mar 24
    const result = getDaysOfWeek(sun);
    expect(result[0].getDay()).toBe(1);
    expect(result[0].getDate()).toBe(18);
    expect(result[6].getDay()).toBe(0);
    expect(result[6].getDate()).toBe(24);
  });

  test('handles week spanning month boundary', () => {
    // Wed Jul 31, 2024 → week is Mon Jul 29 – Sun Aug 4
    const result = getDaysOfWeek(new Date(2024, 6, 31));
    expect(result[0].getMonth()).toBe(6); // July (Jul 29)
    expect(result[6].getMonth()).toBe(7); // August (Aug 4)
  });

  test('handles leap year week containing Feb 29', () => {
    const feb28 = new Date(2024, 1, 28); // Wed Feb 28, 2024 (leap year)
    const result = getDaysOfWeek(feb28);
    expect(result).toHaveLength(7);
    const dates = result.map((d) => `${d.getMonth() + 1}/${d.getDate()}`);
    expect(dates).toContain('2/29');
  });
});

// ─── isToday ────────────────────────────────────────────────────────────────

describe('isToday', () => {
  test('returns true for today', () => {
    expect(isToday(new Date())).toBe(true);
  });

  test('returns true for today at different times', () => {
    const now = new Date();
    const earlyToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 1);
    const lateToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    expect(isToday(earlyToday)).toBe(true);
    expect(isToday(lateToday)).toBe(true);
  });

  test('returns false for yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(isToday(yesterday)).toBe(false);
  });

  test('returns false for tomorrow', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(isToday(tomorrow)).toBe(false);
  });

  test('returns false for same day last year', () => {
    const lastYear = new Date();
    lastYear.setFullYear(lastYear.getFullYear() - 1);
    expect(isToday(lastYear)).toBe(false);
  });
});

// ─── isPast ─────────────────────────────────────────────────────────────────

describe('isPast', () => {
  test('returns true for yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(isPast(yesterday)).toBe(true);
  });

  test('returns false for today', () => {
    expect(isPast(new Date())).toBe(false);
  });

  test('returns false for tomorrow', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(isPast(tomorrow)).toBe(false);
  });

  test('returns true for a date far in the past', () => {
    expect(isPast(new Date(2000, 0, 1))).toBe(true);
  });

  test('returns true for yesterday at 23:59:59', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(23, 59, 59, 999);
    expect(isPast(yesterday)).toBe(true);
  });
});

// ─── formatDate ─────────────────────────────────────────────────────────────

describe('formatDate', () => {
  test('returns YYYY-MM-DD format', () => {
    const result = formatDate(new Date(2024, 2, 17)); // Mar 17, 2024
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('pads single-digit month and day', () => {
    const result = formatDate(new Date(2024, 0, 5)); // Jan 5, 2024
    expect(result).toContain('-01-');
    expect(result).toContain('-05');
  });

  test('handles leap year Feb 29', () => {
    const result = formatDate(new Date(2024, 1, 29));
    expect(result).toContain('02-29');
  });

  test('handles Dec 31 year boundary', () => {
    const result = formatDate(new Date(2024, 11, 31));
    expect(result).toContain('2024');
    expect(result).toContain('12-31');
  });

  test('handles Jan 1 year boundary', () => {
    const result = formatDate(new Date(2025, 0, 1));
    expect(result).toContain('2025');
    expect(result).toContain('01-01');
  });
});

// ─── getDayLabel ────────────────────────────────────────────────────────────

describe('getDayLabel', () => {
  test('returns short day name for Monday', () => {
    const mon = new Date(2024, 2, 18); // Mon Mar 18, 2024
    expect(getDayLabel(mon)).toBe('Mon');
  });

  test('returns short day name for Sunday', () => {
    const sun = new Date(2024, 2, 24); // Sun Mar 24, 2024
    expect(getDayLabel(sun)).toBe('Sun');
  });

  test('returns correct labels for all days of a week', () => {
    const days = getDaysOfWeek(new Date(2024, 2, 20));
    const labels = days.map(getDayLabel);
    expect(labels).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  });
});

// ─── getDateLabel ───────────────────────────────────────────────────────────

describe('getDateLabel', () => {
  test('returns "Mon, Day" format like "Mar 17"', () => {
    const result = getDateLabel(new Date(2024, 2, 17));
    expect(result).toBe('Mar 17');
  });

  test('handles first day of month', () => {
    const result = getDateLabel(new Date(2024, 3, 1)); // Apr 1
    expect(result).toBe('Apr 1');
  });

  test('handles last day of month', () => {
    const result = getDateLabel(new Date(2024, 0, 31)); // Jan 31
    expect(result).toBe('Jan 31');
  });

  test('handles leap year Feb 29', () => {
    const result = getDateLabel(new Date(2024, 1, 29));
    expect(result).toBe('Feb 29');
  });
});

// ─── getWeekRangeLabel ──────────────────────────────────────────────────────

describe('getWeekRangeLabel', () => {
  test('returns "Mon Day – Mon Day" format', () => {
    const result = getWeekRangeLabel(new Date(2024, 2, 20)); // Wed Mar 20
    expect(result).toBe('Mar 18 – Mar 24');
  });

  test('handles week spanning month boundary', () => {
    const result = getWeekRangeLabel(new Date(2024, 2, 29)); // Fri Mar 29
    expect(result).toContain('Mar');
    expect(result).toContain('–');
    // Week: Mon Mar 25 – Sun Mar 31
    expect(result).toBe('Mar 25 – Mar 31');
  });

  test('handles week spanning year boundary (Dec 30 2024 → Jan 5 2025)', () => {
    const result = getWeekRangeLabel(new Date(2024, 11, 31)); // Tue Dec 31, 2024
    expect(result).toContain('Dec');
    expect(result).toContain('Jan');
    expect(result).toBe('Dec 30 – Jan 5');
  });

  test('handles week containing leap day', () => {
    const result = getWeekRangeLabel(new Date(2024, 1, 29)); // Thu Feb 29, 2024
    expect(result).toBe('Feb 26 – Mar 3');
  });
});
