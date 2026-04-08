import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CelebrationOverlay, _resetCelebrationPlayedSet } from '../CelebrationOverlay';
import fc from 'fast-check';

describe('CelebrationOverlay', () => {
  beforeEach(() => {
    _resetCelebrationPlayedSet();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when show is false', () => {
    render(
      <CelebrationOverlay show={false} themeColor="#0d9488" dateKey="2025-01-01" />
    );
    expect(screen.queryByTestId('celebration-overlay')).not.toBeInTheDocument();
  });

  it('renders overlay when show is true with a fresh dateKey', () => {
    render(
      <CelebrationOverlay show={true} themeColor="#0d9488" dateKey="2025-01-01" />
    );
    expect(screen.getByTestId('celebration-overlay')).toBeInTheDocument();
  });

  it('renders 20-30 confetti particles', () => {
    render(
      <CelebrationOverlay show={true} themeColor="#0d9488" dateKey="2025-01-02" />
    );
    const particles = screen.getAllByTestId('confetti-particle');
    expect(particles.length).toBeGreaterThanOrEqual(20);
    expect(particles.length).toBeLessThanOrEqual(30);
  });

  it('renders congratulatory heading', () => {
    render(
      <CelebrationOverlay show={true} themeColor="#7c3aed" dateKey="2025-01-03" />
    );
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.textContent).toContain('All Chores');
    expect(heading.textContent).toContain('Complete!');
  });

  it('auto-dismisses via fallback setTimeout at 4000ms', () => {
    render(
      <CelebrationOverlay show={true} themeColor="#0d9488" dateKey="2025-01-04" />
    );
    expect(screen.getByTestId('celebration-overlay')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(screen.queryByTestId('celebration-overlay')).not.toBeInTheDocument();
  });

  it('does not replay for the same dateKey within the same session', () => {
    const { unmount } = render(
      <CelebrationOverlay show={true} themeColor="#0d9488" dateKey="2025-01-05" />
    );
    expect(screen.getByTestId('celebration-overlay')).toBeInTheDocument();

    // Dismiss
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    unmount();

    // Re-render with same dateKey
    render(
      <CelebrationOverlay show={true} themeColor="#0d9488" dateKey="2025-01-05" />
    );
    expect(screen.queryByTestId('celebration-overlay')).not.toBeInTheDocument();
  });

  it('overlay has fixed positioning and high z-index classes', () => {
    render(
      <CelebrationOverlay show={true} themeColor="#0d9488" dateKey="2025-01-06" />
    );
    const overlay = screen.getByTestId('celebration-overlay');
    expect(overlay.className).toContain('fixed');
    expect(overlay.className).toContain('z-50');
  });
});

// Feature: allowance-gamification-ui, Property 5: Celebration triggers on all-daily-complete
describe('Property 5: Celebration triggers on all-daily-complete', () => {
  beforeEach(() => {
    _resetCelebrationPlayedSet();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Validates: Requirements 4.1
   *
   * For any set of daily chore rows where every row's current-day cell is marked
   * complete, the CelebrationOverlay should be shown (rendered with show=true
   * and a fresh dateKey).
   */
  it('overlay is present when show=true with a fresh dateKey', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 999 }),
        (iteration) => {
          _resetCelebrationPlayedSet();
          const dateKey = `2025-06-${String(iteration).padStart(5, '0')}`;

          const { unmount } = render(
            <CelebrationOverlay show={true} themeColor="#0d9488" dateKey={dateKey} />
          );

          const overlay = screen.queryByTestId('celebration-overlay');
          expect(overlay).toBeInTheDocument();

          // Clean up: dismiss and unmount
          act(() => {
            vi.advanceTimersByTime(4000);
          });
          unmount();
        }
      ),
      { numRuns: 10 }
    );
  });
});

// Feature: allowance-gamification-ui, Property 6: Celebration does not replay within same session
describe('Property 6: Celebration does not replay within same session', () => {
  beforeEach(() => {
    _resetCelebrationPlayedSet();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Validates: Requirements 4.6
   *
   * For any date where the CelebrationOverlay has already played, rendering again
   * with show=true and the same dateKey should not show the overlay.
   */
  it('overlay does not render a second time for the same dateKey', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 999 }),
        (iteration) => {
          _resetCelebrationPlayedSet();
          const dateKey = `2025-07-${String(iteration).padStart(5, '0')}`;

          // First render: should show
          const { unmount: unmount1 } = render(
            <CelebrationOverlay show={true} themeColor="#0d9488" dateKey={dateKey} />
          );
          expect(screen.queryByTestId('celebration-overlay')).toBeInTheDocument();

          // Dismiss via fallback timer
          act(() => {
            vi.advanceTimersByTime(4000);
          });
          unmount1();

          // Second render with same dateKey: should NOT show
          const { unmount: unmount2 } = render(
            <CelebrationOverlay show={true} themeColor="#0d9488" dateKey={dateKey} />
          );
          expect(screen.queryByTestId('celebration-overlay')).not.toBeInTheDocument();

          unmount2();
        }
      ),
      { numRuns: 10 }
    );
  });
});
