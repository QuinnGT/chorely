import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AchievementBadges } from '../AchievementBadges';
import { MILESTONES } from '@/hooks/useAchievements';
import type { Achievement } from '@/hooks/useAchievements';
import type { ChoreRow, DayCell } from '@/hooks/useChoreGrid';
import fc from 'fast-check';
import { renderHook } from '@testing-library/react';
import { useAchievements } from '@/hooks/useAchievements';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeDay(overrides: Partial<DayCell> = {}): DayCell {
  return {
    date: '2025-01-06',
    completed: false,
    isToday: false,
    isFuture: false,
    ...overrides,
  };
}

function makeDailyRow(days: DayCell[]): ChoreRow {
  return {
    chore: { id: 'c1', name: 'Dishes', icon: '🍽️', frequency: 'daily' },
    assignmentId: 'a1',
    days,
  };
}

function makeAchievement(overrides: Partial<Achievement> = {}): Achievement {
  return {
    id: 'first-chore',
    icon: '⭐',
    label: 'First Chore',
    earned: false,
    isNew: false,
    ...overrides,
  };
}

// ─── Unit Tests ───────────────────────────────────────────────────────────────

describe('AchievementBadges', () => {
  it('renders container with correct test id', () => {
    render(<AchievementBadges achievements={[]} />);
    expect(screen.getByTestId('achievement-badges')).toBeInTheDocument();
  });

  it('renders one badge per achievement', () => {
    const achievements: Achievement[] = [
      makeAchievement({ id: 'first-chore', earned: true }),
      makeAchievement({ id: 'full-day', icon: '🌟', label: 'Full Day', earned: false }),
    ];
    render(<AchievementBadges achievements={achievements} />);
    expect(screen.getAllByTestId('achievement-badge')).toHaveLength(2);
  });

  it('earned badge has no grayscale or opacity classes', () => {
    render(
      <AchievementBadges
        achievements={[makeAchievement({ earned: true })]}
      />
    );
    const badge = screen.getByTestId('achievement-badge');
    expect(badge.className).not.toContain('grayscale');
    expect(badge.className).not.toContain('opacity-50');
  });

  it('unearned badge has grayscale and opacity-50 classes with lock icon', () => {
    render(
      <AchievementBadges
        achievements={[makeAchievement({ earned: false })]}
      />
    );
    const badge = screen.getByTestId('achievement-badge');
    expect(badge.className).toContain('grayscale');
    expect(badge.className).toContain('opacity-50');
    expect(screen.getByText('lock')).toBeInTheDocument();
  });

  it('new badge has animate-pop class', () => {
    render(
      <AchievementBadges
        achievements={[makeAchievement({ earned: true, isNew: true })]}
      />
    );
    const badge = screen.getByTestId('achievement-badge');
    expect(badge.className).toContain('animate-pop');
  });

  it('non-new badge does not have animate-pop class', () => {
    render(
      <AchievementBadges
        achievements={[makeAchievement({ earned: true, isNew: false })]}
      />
    );
    const badge = screen.getByTestId('achievement-badge');
    expect(badge.className ?? '').not.toContain('animate-pop');
  });

  it('displays Material Symbols icon and label text', () => {
    render(
      <AchievementBadges
        achievements={[makeAchievement({ id: 'full-week', label: 'Full Week' })]}
      />
    );
    const badge = screen.getByTestId('achievement-badge');
    expect(badge.querySelector('.material-symbols-outlined')).toBeInTheDocument();
    expect(badge.textContent).toContain('Full Week');
  });

  it('earned badge does not show lock icon', () => {
    render(
      <AchievementBadges
        achievements={[makeAchievement({ earned: true })]}
      />
    );
    expect(screen.queryByText('lock')).not.toBeInTheDocument();
  });
});

// ─── useAchievements hook unit tests ──────────────────────────────────────────

describe('useAchievements', () => {
  it('returns 6 milestones', () => {
    const { result } = renderHook(() =>
      useAchievements('kid-1', 0, 0, [])
    );
    expect(result.current).toHaveLength(6);
  });

  it('first-chore earned when any day is completed', () => {
    const rows: ChoreRow[] = [
      makeDailyRow([makeDay({ completed: true })]),
    ];
    const { result } = renderHook(() =>
      useAchievements('kid-1', 0.5, 0, rows)
    );
    const firstChore = result.current.find((a) => a.id === 'first-chore');
    expect(firstChore?.earned).toBe(true);
  });

  it('first-chore not earned when no days completed', () => {
    const rows: ChoreRow[] = [
      makeDailyRow([makeDay({ completed: false })]),
    ];
    const { result } = renderHook(() =>
      useAchievements('kid-1', 0, 0, rows)
    );
    const firstChore = result.current.find((a) => a.id === 'first-chore');
    expect(firstChore?.earned).toBe(false);
  });

  it('full-day earned when all daily rows have today completed', () => {
    const rows: ChoreRow[] = [
      makeDailyRow([makeDay({ isToday: true, completed: true })]),
    ];
    const { result } = renderHook(() =>
      useAchievements('kid-1', 0.5, 0, rows)
    );
    const fullDay = result.current.find((a) => a.id === 'full-day');
    expect(fullDay?.earned).toBe(true);
  });

  it('full-week earned when completionRate is 1', () => {
    const { result } = renderHook(() =>
      useAchievements('kid-1', 1, 0, [])
    );
    const fullWeek = result.current.find((a) => a.id === 'full-week');
    expect(fullWeek?.earned).toBe(true);
  });

  it('streak milestones earned at correct thresholds', () => {
    const { result } = renderHook(() =>
      useAchievements('kid-1', 0, 14, [])
    );
    expect(result.current.find((a) => a.id === 'streak-7')?.earned).toBe(true);
    expect(result.current.find((a) => a.id === 'streak-14')?.earned).toBe(true);
    expect(result.current.find((a) => a.id === 'streak-30')?.earned).toBe(false);
  });

  it('flags isNew for newly earned milestones', () => {
    const { result, rerender } = renderHook(
      ({ streak }) => useAchievements('kid-1', 0, streak, []),
      { initialProps: { streak: 0 } }
    );
    expect(result.current.find((a) => a.id === 'streak-7')?.isNew).toBe(false);

    rerender({ streak: 7 });
    expect(result.current.find((a) => a.id === 'streak-7')?.isNew).toBe(true);
  });
});

// ─── Property-Based Tests ─────────────────────────────────────────────────────

// Feature: allowance-gamification-ui, Property 14: Achievement milestone evaluation
describe('Property 14: Achievement milestone evaluation', () => {
  /**
   * Validates: Requirements 9.1
   *
   * For any combination of (hasCompletedFirstChore, hasCompletedFullDay,
   * hasCompletedFullWeek, streakDays), the useAchievements hook should return
   * the correct earned/unearned state for each of the 6 milestones.
   */
  it('returns correct earned state for all 6 milestones given arbitrary inputs', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        fc.integer({ min: 0, max: 60 }),
        (hasFirstChore, hasFullDay, hasFullWeek, streakDays) => {
          const completionRate = hasFullWeek ? 1 : 0.5;

          // Build rows that reflect the boolean flags
          const todayCell = makeDay({ isToday: true, completed: hasFullDay });
          const pastCell = makeDay({
            date: '2025-01-05',
            isToday: false,
            completed: hasFirstChore,
          });
          const rows: ChoreRow[] = [
            makeDailyRow([pastCell, todayCell]),
          ];

          const { result, unmount } = renderHook(() =>
            useAchievements('kid-1', completionRate, streakDays, rows)
          );

          const achievements = result.current;
          const byId = (id: string) => achievements.find((a) => a.id === id);

          // first-chore: any completed day cell
          const expectFirstChore = hasFirstChore || hasFullDay;
          expect(byId('first-chore')?.earned).toBe(expectFirstChore);

          // full-day: all daily rows have today completed
          expect(byId('full-day')?.earned).toBe(hasFullDay);

          // full-week: completionRate === 1
          expect(byId('full-week')?.earned).toBe(hasFullWeek);

          // streak milestones
          expect(byId('streak-7')?.earned).toBe(streakDays >= 7);
          expect(byId('streak-14')?.earned).toBe(streakDays >= 14);
          expect(byId('streak-30')?.earned).toBe(streakDays >= 30);

          unmount();
        }
      ),
      { numRuns: 10 }
    );
  });
});

// Feature: allowance-gamification-ui, Property 15: Achievement badge labels within character limit
describe('Property 15: Achievement badge labels within character limit', () => {
  /**
   * Validates: Requirements 9.3
   *
   * For all achievement milestone definitions, the label string should be
   * at most 20 characters long.
   */
  it('all milestone labels are at most 20 characters', () => {
    for (const milestone of MILESTONES) {
      expect(milestone.label.length).toBeLessThanOrEqual(20);
    }
  });
});

// Feature: allowance-gamification-ui, Property 16: Achievement badge opacity reflects earned state
describe('Property 16: Achievement badge opacity reflects earned state', () => {
  /**
   * Validates: Requirements 9.5, 9.6
   *
   * For any achievement badge, the rendered element should have full opacity
   * when earned is true, and grayscale with 50% opacity when earned is false.
   */
  it('earned badges have no grayscale, unearned have grayscale with lock icon', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.constantFrom('star', 'verified', 'emoji_events', 'local_fire_department', 'rocket_launch', 'diamond'),
        fc.string({ minLength: 1, maxLength: 20 }),
        (earned, icon, label) => {
          const achievement = makeAchievement({ earned, icon, label, isNew: false });

          const { unmount } = render(
            <AchievementBadges achievements={[achievement]} />
          );

          const badge = screen.getByTestId('achievement-badge');

          if (earned) {
            expect(badge.className).not.toContain('grayscale');
            expect(screen.queryByText('lock')).not.toBeInTheDocument();
          } else {
            expect(badge.className).toContain('grayscale');
            expect(screen.getByText('lock')).toBeInTheDocument();
          }

          unmount();
        }
      ),
      { numRuns: 10 }
    );
  });
});
