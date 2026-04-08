import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StreakFlame } from '../StreakFlame';
import fc from 'fast-check';

describe('StreakFlame', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when streakDays is 0', () => {
    const { container } = render(<StreakFlame streakDays={0} />);
    expect(screen.queryByTestId('streak-flame')).not.toBeInTheDocument();
    expect(container.innerHTML).toBe('');
  });

  it('renders Material Symbols fire icon and streak count when streakDays >= 1', () => {
    render(<StreakFlame streakDays={3} />);
    expect(screen.getByTestId('streak-flame')).toBeInTheDocument();
    expect(screen.getByTestId('streak-count')).toHaveTextContent('3');
    expect(screen.getByText('local_fire_department')).toBeInTheDocument();
  });

  it('does not apply scale transform for streak 1-6', () => {
    render(<StreakFlame streakDays={5} />);
    const flame = screen.getByTestId('streak-flame');
    expect(flame.style.transform ?? '').not.toContain('scale(1.3)');
  });

  it('does not apply scale(1.3) transform for streak >= 7', () => {
    render(<StreakFlame streakDays={7} />);
    const flame = screen.getByTestId('streak-flame');
    expect(flame.style.transform ?? '').not.toContain('scale(1.3)');
  });

  it('applies animate-streak-flame class for streak >= 7 in idle state', () => {
    render(<StreakFlame streakDays={10} />);
    const flame = screen.getByTestId('streak-flame');
    expect(flame.className).toContain('animate-streak-flame');
  });

  it('does not apply animate-streak-flame class for streak 1-6', () => {
    render(<StreakFlame streakDays={4} />);
    const flame = screen.getByTestId('streak-flame');
    expect(flame.className ?? '').not.toContain('animate-streak-flame');
  });

  it('applies animate-pop on streak increment', () => {
    const { rerender } = render(<StreakFlame streakDays={3} />);
    rerender(<StreakFlame streakDays={4} />);
    const flame = screen.getByTestId('streak-flame');
    expect(flame.className).toContain('animate-pop');
  });

  it('clears animate-pop after 300ms on increment', () => {
    const { rerender } = render(<StreakFlame streakDays={3} />);
    rerender(<StreakFlame streakDays={4} />);

    act(() => {
      vi.advanceTimersByTime(300);
    });

    const flame = screen.getByTestId('streak-flame');
    expect(flame.className ?? '').not.toContain('animate-pop');
  });

  it('applies animate-fade-out when streak resets to 0', () => {
    const { rerender } = render(<StreakFlame streakDays={3} />);
    rerender(<StreakFlame streakDays={0} />);
    const flame = screen.getByTestId('streak-flame');
    expect(flame.className).toContain('animate-fade-out');
  });

  it('hides element after fade-out completes (300ms)', () => {
    const { rerender } = render(<StreakFlame streakDays={3} />);
    rerender(<StreakFlame streakDays={0} />);

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.queryByTestId('streak-flame')).not.toBeInTheDocument();
  });

  it('displays streak count with tabular-nums font variant', () => {
    render(<StreakFlame streakDays={5} />);
    const count = screen.getByTestId('streak-count');
    expect(count.style.fontVariantNumeric).toBe('tabular-nums');
  });
});

// Feature: allowance-gamification-ui, Property 3: Streak flame scale follows threshold
describe('Property 3: Streak flame scale follows threshold', () => {
  /**
   * Validates: Requirements 3.2, 3.3
   *
   * For any streak count >= 1, the StreakFlame component should apply
   * the animate-streak-flame class when streak is 7 or more, and not apply it
   * when streak is between 1 and 6.
   */
  it('no big-scale for 1-6, animate-streak-flame for 7+', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 200 }),
        (streakDays) => {
          const { unmount } = render(<StreakFlame streakDays={streakDays} />);
          const flame = screen.getByTestId('streak-flame');

          if (streakDays >= 1 && streakDays <= 6) {
            expect(flame.className ?? '').not.toContain('animate-streak-flame');
          } else {
            // streakDays >= 7
            expect(flame.className).toContain('animate-streak-flame');
          }

          unmount();
        }
      ),
      { numRuns: 10 }
    );
  });
});

// Feature: allowance-gamification-ui, Property 4: Streak count displayed as text
describe('Property 4: Streak count displayed as text', () => {
  /**
   * Validates: Requirements 3.4
   *
   * For any streak count >= 1, the rendered output should contain the numeric
   * streak value as visible text.
   */
  it('rendered output contains the numeric streak value as visible text', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 500 }),
        (streakDays) => {
          const { unmount } = render(<StreakFlame streakDays={streakDays} />);
          const count = screen.getByTestId('streak-count');

          expect(count.textContent).toBe(String(streakDays));

          unmount();
        }
      ),
      { numRuns: 10 }
    );
  });
});
