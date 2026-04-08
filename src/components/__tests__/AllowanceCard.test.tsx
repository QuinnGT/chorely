import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AllowanceCard } from '../AllowanceCard';
import type { AllowanceHistoryEntry } from '../AllowanceCard';
import fc from 'fast-check';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeHistoryEntry(overrides: Partial<AllowanceHistoryEntry> = {}): AllowanceHistoryEntry {
  return {
    id: 'entry-1',
    weekStart: '2025-01-06',
    earned: '5.00',
    bonusEarned: '3.00',
    paid: false,
    paidAt: null,
    ...overrides,
  };
}

// ─── Unit Tests ───────────────────────────────────────────────────────────────

describe('AllowanceCard', () => {
  it('renders container with correct test id', () => {
    render(
      <AllowanceCard
        currentWeekTotal={8}
        baseEarnings={5}
        streakBonus={3}
        streakDays={7}
        history={[]}
      />
    );
    expect(screen.getByTestId('allowance-card')).toBeInTheDocument();
  });

  it('displays total earnings with large font', () => {
    render(
      <AllowanceCard
        currentWeekTotal={8}
        baseEarnings={5}
        streakBonus={3}
        streakDays={7}
        history={[]}
      />
    );
    const total = screen.getByTestId('total-earnings');
    expect(total.textContent).toContain('$8');
    expect(total.className).toContain('font-headline');
    expect(total.className).toContain('font-black');
  });

  it('displays base earnings and streak bonus as separate sections', () => {
    render(
      <AllowanceCard
        currentWeekTotal={8}
        baseEarnings={5}
        streakBonus={3}
        streakDays={7}
        history={[]}
      />
    );
    expect(screen.getByText('$5.00')).toBeInTheDocument();
    expect(screen.getByText('+$3.00')).toBeInTheDocument();
    expect(screen.getByText('Base')).toBeInTheDocument();
    expect(screen.getByText('Streak Bonus')).toBeInTheDocument();
  });

  it('shows streak bonus badge when streak >= 7', () => {
    render(
      <AllowanceCard
        currentWeekTotal={8}
        baseEarnings={5}
        streakBonus={3}
        streakDays={7}
        history={[]}
      />
    );
    expect(screen.getByText('Elite Streak Bonus Active!')).toBeInTheDocument();
  });

  it('does not show streak bonus badge when streak < 7', () => {
    render(
      <AllowanceCard
        currentWeekTotal={5}
        baseEarnings={5}
        streakBonus={0}
        streakDays={3}
        history={[]}
      />
    );
    expect(screen.queryByText('Elite Streak Bonus Active!')).not.toBeInTheDocument();
  });

  it('renders paid entry with check icon', () => {
    render(
      <AllowanceCard
        currentWeekTotal={0}
        baseEarnings={0}
        streakBonus={0}
        streakDays={0}
        history={[makeHistoryEntry({ paid: true, paidAt: '2025-01-13T00:00:00Z' })]}
      />
    );
    expect(screen.getByText('Paid')).toBeInTheDocument();
    expect(screen.getByText('check_circle')).toBeInTheDocument();
  });

  it('renders unpaid entry with pending label', () => {
    render(
      <AllowanceCard
        currentWeekTotal={0}
        baseEarnings={0}
        streakBonus={0}
        streakDays={0}
        history={[makeHistoryEntry({ paid: false })]}
      />
    );
    expect(screen.getByText('pending')).toBeInTheDocument();
  });

  it('renders mark paid button for unpaid entries when onMarkPaid provided', () => {
    const onMarkPaid = vi.fn();
    render(
      <AllowanceCard
        currentWeekTotal={0}
        baseEarnings={0}
        streakBonus={0}
        streakDays={0}
        history={[makeHistoryEntry({ id: 'abc', paid: false })]}
        onMarkPaid={onMarkPaid}
      />
    );
    const btn = screen.getByTestId('mark-paid-button');
    btn.click();
    expect(onMarkPaid).toHaveBeenCalledWith('abc');
  });

  it('does not render mark paid button for paid entries', () => {
    render(
      <AllowanceCard
        currentWeekTotal={0}
        baseEarnings={0}
        streakBonus={0}
        streakDays={0}
        history={[makeHistoryEntry({ paid: true, paidAt: '2025-01-13T00:00:00Z' })]}
        onMarkPaid={vi.fn()}
      />
    );
    expect(screen.queryByTestId('mark-paid-button')).not.toBeInTheDocument();
  });

  it('limits history to 4 entries', () => {
    const entries = Array.from({ length: 6 }, (_, i) =>
      makeHistoryEntry({
        id: `e-${i}`,
        weekStart: `2025-0${i + 1}-06`,
      })
    );
    render(
      <AllowanceCard
        currentWeekTotal={0}
        baseEarnings={0}
        streakBonus={0}
        streakDays={0}
        history={entries}
      />
    );
    expect(screen.getAllByTestId('history-entry')).toHaveLength(4);
  });
});

// ─── Property-Based Tests ─────────────────────────────────────────────────────

// Feature: allowance-gamification-ui, Property 10: Allowance card shows base and bonus separately
describe('Property 10: Allowance card shows base and bonus separately', () => {
  /**
   * Validates: Requirements 7.2
   *
   * For any AllowanceCard rendered with a base amount and bonus amount,
   * the rendered output should contain both values as distinct labeled elements.
   */
  it('base and bonus are rendered as distinct labeled elements', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 50 }),
        fc.integer({ min: 0, max: 30 }),
        (base, bonus, streakDays) => {
          const total = base + bonus;

          const { unmount } = render(
            <AllowanceCard
              currentWeekTotal={total}
              baseEarnings={base}
              streakBonus={bonus}
              streakDays={streakDays}
              history={[]}
            />
          );

          // Labels are present
          expect(screen.getByText('Base')).toBeInTheDocument();
          expect(screen.getByText('Streak Bonus')).toBeInTheDocument();

          // Formatted values appear somewhere in the rendered output
          const card = screen.getByTestId('allowance-card');
          expect(card.textContent).toContain(`$${base}.00`);
          expect(card.textContent).toContain(`+$${bonus}.00`);

          unmount();
        }
      ),
      { numRuns: 10 }
    );
  });
});

// Feature: allowance-gamification-ui, Property 11: Bonus badge visibility follows streak threshold
describe('Property 11: Bonus badge visibility follows streak threshold', () => {
  /**
   * Validates: Requirements 7.3
   *
   * For any streak count, the AllowanceCard should display the streak bonus badge
   * if and only if the streak is 7 or more days.
   */
  it('bonus badge visible iff streak >= 7', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 60 }),
        (streakDays) => {
          const { unmount } = render(
            <AllowanceCard
              currentWeekTotal={5}
              baseEarnings={5}
              streakBonus={streakDays >= 7 ? 3 : 0}
              streakDays={streakDays}
              history={[]}
            />
          );

          const badge = screen.queryByText('Elite Streak Bonus Active!');

          if (streakDays >= 7) {
            expect(badge).toBeInTheDocument();
          } else {
            expect(badge).not.toBeInTheDocument();
          }

          unmount();
        }
      ),
      { numRuns: 10 }
    );
  });
});

// Feature: allowance-gamification-ui, Property 12: History display limited to 4 most recent weeks
describe('Property 12: History display limited to 4 most recent weeks', () => {
  /**
   * Validates: Requirements 7.4
   *
   * For any history array of length N, the AllowanceCard should render
   * at most min(N, 4) entries, and those entries should be the 4 most recent
   * by weekStart date.
   */
  it('renders at most min(N, 4) history entries from the front of the array', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 12 }),
        (historyLength) => {
          const entries: AllowanceHistoryEntry[] = Array.from(
            { length: historyLength },
            (_, i) => makeHistoryEntry({
              id: `entry-${i}`,
              weekStart: `2025-01-${String(6 + i * 7).padStart(2, '0')}`,
              paid: i % 2 === 0,
              paidAt: i % 2 === 0 ? '2025-01-13T00:00:00Z' : null,
            })
          );

          const { unmount } = render(
            <AllowanceCard
              currentWeekTotal={0}
              baseEarnings={0}
              streakBonus={0}
              streakDays={0}
              history={entries}
            />
          );

          const expectedCount = Math.min(historyLength, 4);
          const rendered = screen.queryAllByTestId('history-entry');
          expect(rendered).toHaveLength(expectedCount);

          unmount();
        }
      ),
      { numRuns: 10 }
    );
  });
});

// Feature: allowance-gamification-ui, Property 13: Paid/unpaid status display
describe('Property 13: Paid/unpaid status display', () => {
  /**
   * Validates: Requirements 7.5, 7.6
   *
   * For any history entry, the AllowanceCard should display "Paid" with a
   * check_circle icon if paid is true, and "pending" if paid is false.
   */
  it('paid entries show Paid with check_circle, unpaid entries show pending', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        (paid) => {
          const entry = makeHistoryEntry({
            id: `entry-${paid ? 'paid' : 'unpaid'}`,
            paid,
            paidAt: paid ? '2025-01-13T00:00:00Z' : null,
          });

          const { unmount } = render(
            <AllowanceCard
              currentWeekTotal={0}
              baseEarnings={0}
              streakBonus={0}
              streakDays={0}
              history={[entry]}
            />
          );

          if (paid) {
            expect(screen.getByText('Paid')).toBeInTheDocument();
            expect(screen.getByText('check_circle')).toBeInTheDocument();
          } else {
            expect(screen.getByText('pending')).toBeInTheDocument();
          }

          unmount();
        }
      ),
      { numRuns: 10 }
    );
  });
});
