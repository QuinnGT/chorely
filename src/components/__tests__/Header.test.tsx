import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Header } from '../Header';
import type { Kid } from '@/contexts/KidContext';
import fc from 'fast-check';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeKid(overrides: Partial<Kid> = {}): Kid {
  return {
    id: 'kid-1',
    name: 'Alice',
    avatarUrl: null,
    themeColor: 'teal',
    ...overrides,
  };
}

const defaultProps = {
  kid: makeKid(),
  weekRange: 'Jan 6 – Jan 12',
  streakDays: 3,
  onSwitchProfile: vi.fn(),
  onSettingsTap: vi.fn(),
};

// ─── Unit Tests ───────────────────────────────────────────────────────────────

describe('Header', () => {
  it('renders with data-testid="header"', () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByTestId('header')).toBeInTheDocument();
  });

  it('renders kid name', () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('renders StreakFlame component instead of inline emoji', () => {
    render(<Header {...defaultProps} streakDays={5} />);
    expect(screen.getByTestId('streak-flame')).toBeInTheDocument();
    expect(screen.getByTestId('streak-count')).toHaveTextContent('5');
  });

  it('has fixed positioning with frosted glass background', () => {
    render(<Header {...defaultProps} />);
    const header = screen.getByTestId('header');
    expect(header.className).toContain('fixed');
    expect(header.style.backdropFilter).toContain('blur');
    expect(header.style.background).toContain('rgba');
  });

  it('renders week range text', () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByText('Jan 6 – Jan 12')).toBeInTheDocument();
  });

  it('renders Switch Profile and Settings buttons', () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByText('Switch Profile')).toBeInTheDocument();
    expect(screen.getByLabelText('Settings')).toBeInTheDocument();
  });

  it('calls onSwitchProfile when Switch Profile button is clicked', () => {
    const onSwitchProfile = vi.fn();
    render(<Header {...defaultProps} onSwitchProfile={onSwitchProfile} />);
    screen.getByText('Switch Profile').click();
    expect(onSwitchProfile).toHaveBeenCalledOnce();
  });

  it('calls onSettingsTap when Settings button is clicked', () => {
    const onSettingsTap = vi.fn();
    render(<Header {...defaultProps} onSettingsTap={onSettingsTap} />);
    screen.getByLabelText('Settings').click();
    expect(onSettingsTap).toHaveBeenCalledOnce();
  });
});

// ─── Property-Based Tests ─────────────────────────────────────────────────────

// Feature: allowance-gamification-ui, Property 8: Spring animation on all interactive buttons
describe('Property 8: Spring animation on all interactive buttons', () => {
  /**
   * Validates: Requirements 6.3
   *
   * For any button element in the Header, the element should use the
   * --spring-ease CSS custom property for its transition timing function.
   */
  it('all buttons have transition containing var(--spring-ease)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 30 }),
        (streakDays) => {
          const { unmount } = render(
            <Header
              kid={makeKid()}
              weekRange="Jan 6 – Jan 12"
              streakDays={streakDays}
              onSwitchProfile={vi.fn()}
              onSettingsTap={vi.fn()}
            />
          );

          const buttons = screen.getAllByRole('button');
          for (const button of buttons) {
            expect(button.style.transition).toContain('var(--spring-ease)');
          }

          unmount();
        }
      ),
      { numRuns: 10 }
    );
  });
});

// Feature: allowance-gamification-ui, Property 9: Minimum touch target size
describe('Property 9: Minimum touch target size', () => {
  /**
   * Validates: Requirements 6.5
   *
   * For any interactive button element in the Header, the element's
   * minHeight should be at least 48px.
   */
  it('all buttons have minHeight of at least 48px', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 30 }),
        (streakDays) => {
          const { unmount } = render(
            <Header
              kid={makeKid()}
              weekRange="Jan 6 – Jan 12"
              streakDays={streakDays}
              onSwitchProfile={vi.fn()}
              onSettingsTap={vi.fn()}
            />
          );

          const buttons = screen.getAllByRole('button');
          for (const button of buttons) {
            const minHeight = parseInt(button.style.minHeight, 10);
            expect(minHeight).toBeGreaterThanOrEqual(48);
          }

          unmount();
        }
      ),
      { numRuns: 10 }
    );
  });
});
