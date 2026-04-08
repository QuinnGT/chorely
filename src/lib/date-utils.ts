/**
 * Pure date utility functions for week/day calculations.
 * All functions are side-effect free and return new Date objects.
 */

/** Get the Monday of the current week (or any given date's week) */
export function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Get the Sunday of the current week */
export function getWeekEnd(date: Date = new Date()): Date {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

/** Get all 7 days of the week as Date objects (Mon–Sun) */
export function getDaysOfWeek(date: Date = new Date()): Date[] {
  const start = getWeekStart(date);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

/** Check if a date is today */
export function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

/** Check if a date is in the past (before today) */
export function isPast(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d < today;
}

/** Format a date as YYYY-MM-DD string for DB storage (uses local timezone) */
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Format a date as a friendly display string (e.g., "Mon", "Tue") */
export function getDayLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

/** Format a date as "Mar 17" */
export function getDateLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Get a human-readable week range (e.g., "Mar 17 – Mar 23") */
export function getWeekRangeLabel(date: Date = new Date()): string {
  const start = getWeekStart(date);
  const end = getWeekEnd(date);
  return `${getDateLabel(start)} – ${getDateLabel(end)}`;
}
