import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChoreCheckbox } from '../ChoreCheckbox';
import fc from 'fast-check';

describe('ChoreCheckbox', () => {
  const defaultProps = {
    assignmentId: 'a1',
    date: '2025-01-15',
    completed: false,
    disabled: false,
    onToggle: vi.fn(),
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders with role="checkbox"', () => {
    render(<ChoreCheckbox {...defaultProps} />);
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('shows circular outline when incomplete (border style)', () => {
    render(<ChoreCheckbox {...defaultProps} completed={false} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox.style.borderRadius).toBe('50%');
    expect(checkbox.style.border).not.toBe('none');
  });

  it('shows Material Symbols check icon when complete', () => {
    render(<ChoreCheckbox {...defaultProps} completed={true} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox.style.backgroundColor).toBe('var(--primary)');
    expect(screen.getByText('check')).toBeInTheDocument();
  });

  it('disabled state has 40% opacity', () => {
    render(<ChoreCheckbox {...defaultProps} disabled={true} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox.style.opacity).toBe('0.4');
  });

  it('aria-checked reflects completed state', () => {
    const { rerender } = render(<ChoreCheckbox {...defaultProps} completed={false} />);
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'false');

    rerender(<ChoreCheckbox {...defaultProps} completed={true} />);
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'true');
  });

  it('aria-disabled reflects disabled state', () => {
    const { rerender } = render(<ChoreCheckbox {...defaultProps} disabled={false} />);
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-disabled', 'false');

    rerender(<ChoreCheckbox {...defaultProps} disabled={true} />);
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-disabled', 'true');
  });

  it('clicking disabled checkbox does not call onToggle', () => {
    const onToggle = vi.fn();
    render(<ChoreCheckbox {...defaultProps} disabled={true} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onToggle).not.toHaveBeenCalled();
  });
});

// Feature: allowance-gamification-ui, Property 2: Coin animation does not play on uncheck
describe('Property 2: Coin animation does not play on uncheck', () => {
  /**
   * Validates: Requirements 2.5
   *
   * For any ChoreCheckbox that transitions from complete to incomplete,
   * the CoinAnimation element should not be rendered or triggered.
   */
  it('coin-animation element is not rendered when unchecking a completed chore', () => {
    vi.useFakeTimers();

    fc.assert(
      fc.property(
        fc.boolean(),
        (_randomBool) => {
          // Arrange: render a completed checkbox
          const onToggle = vi.fn();
          const { unmount } = render(
            <ChoreCheckbox
              assignmentId="test-assignment"
              date="2025-01-15"
              completed={true}
              disabled={false}
              onToggle={onToggle}
            />
          );

          // Act: click to uncheck (complete -> incomplete transition)
          fireEvent.click(screen.getByRole('checkbox'));

          // Advance all timers to ensure any pending animations resolve
          vi.advanceTimersByTime(1000);

          // Assert: no coin animation should be present
          expect(screen.queryByTestId('coin-animation')).not.toBeInTheDocument();

          // Assert: onToggle was called with newState=false (uncheck)
          expect(onToggle).toHaveBeenCalledWith('test-assignment', '2025-01-15', false);

          unmount();
        }
      ),
      { numRuns: 10 }
    );

    vi.useRealTimers();
  });
});

// Feature: allowance-gamification-ui, Property 22: Disabled checkbox ignores interaction
describe('Property 22: Disabled checkbox ignores interaction', () => {
  /**
   * Validates: Requirements 13.4
   *
   * For any ChoreCheckbox in the disabled state (future date), clicking or tapping
   * should not change the completion state, and the element should have
   * aria-disabled="true" and 40% opacity.
   */
  it('disabled checkbox does not call onToggle and has correct aria/opacity', () => {
    vi.useFakeTimers();

    fc.assert(
      fc.property(
        fc.boolean(),
        (completed) => {
          // Arrange: render a disabled checkbox with random completed state
          const onToggle = vi.fn();
          const { unmount } = render(
            <ChoreCheckbox
              assignmentId="disabled-test"
              date="2099-12-31"
              completed={completed}
              disabled={true}
              onToggle={onToggle}
            />
          );

          const checkbox = screen.getByRole('checkbox');

          // Assert: aria-disabled is "true"
          expect(checkbox).toHaveAttribute('aria-disabled', 'true');

          // Assert: opacity is 0.4 (40%)
          expect(checkbox.style.opacity).toBe('0.4');

          // Act: click the disabled checkbox
          fireEvent.click(checkbox);

          // Advance timers to ensure no deferred callbacks fire
          vi.advanceTimersByTime(1000);

          // Assert: onToggle was never called
          expect(onToggle).not.toHaveBeenCalled();

          unmount();
        }
      ),
      { numRuns: 10 }
    );

    vi.useRealTimers();
  });
});

// Feature: allowance-gamification-ui, Property 23: ARIA attributes reflect checkbox state
describe('Property 23: ARIA attributes reflect checkbox state', () => {
  /**
   * Validates: Requirements 13.6
   *
   * For any ChoreCheckbox with a given (completed, disabled) state, the element
   * should have role="checkbox", aria-checked matching the completed boolean,
   * and aria-disabled matching the disabled boolean.
   */
  it('ARIA attributes match the completed and disabled props', () => {
    vi.useFakeTimers();

    fc.assert(
      fc.property(
        fc.boolean(),
        fc.boolean(),
        (completed, disabled) => {
          // Arrange: render checkbox with random completed/disabled combination
          const onToggle = vi.fn();
          const { unmount } = render(
            <ChoreCheckbox
              assignmentId="aria-test"
              date="2025-01-15"
              completed={completed}
              disabled={disabled}
              onToggle={onToggle}
            />
          );

          const checkbox = screen.getByRole('checkbox');

          // Assert: role="checkbox" (implicit via getByRole)
          // Assert: aria-checked matches completed boolean
          expect(checkbox).toHaveAttribute('aria-checked', String(completed));

          // Assert: aria-disabled matches disabled boolean
          expect(checkbox).toHaveAttribute('aria-disabled', String(disabled));

          unmount();
        }
      ),
      { numRuns: 10 }
    );

    vi.useRealTimers();
  });
});
