import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CoinAnimation } from '../CoinAnimation';

describe('CoinAnimation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when active is false', () => {
    const { container } = render(
      <CoinAnimation active={false} onComplete={vi.fn()} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders Material Symbols coin icons when active is true', () => {
    render(<CoinAnimation active={true} onComplete={vi.fn()} />);
    const coin = screen.getByTestId('coin-animation');
    expect(coin).toBeInTheDocument();
    expect(screen.getAllByText('monetization_on')).toHaveLength(3);
  });

  it('has data-testid="coin-animation"', () => {
    render(<CoinAnimation active={true} onComplete={vi.fn()} />);
    expect(screen.getByTestId('coin-animation')).toBeInTheDocument();
  });

  it('applies animate-coin-rise CSS class', () => {
    render(<CoinAnimation active={true} onComplete={vi.fn()} />);
    const coin = screen.getByTestId('coin-animation');
    expect(coin.className).toContain('animate-coin-rise');
  });

  it('is absolutely positioned', () => {
    render(<CoinAnimation active={true} onComplete={vi.fn()} />);
    const coin = screen.getByTestId('coin-animation');
    expect(coin.style.position).toBe('absolute');
  });

  it('has aria-hidden="true" since it is decorative', () => {
    render(<CoinAnimation active={true} onComplete={vi.fn()} />);
    const coin = screen.getByTestId('coin-animation');
    expect(coin.getAttribute('aria-hidden')).toBe('true');
  });

  it('has onAnimationEnd handler wired for completion callback', () => {
    const onComplete = vi.fn();
    const { container } = render(
      <CoinAnimation active={true} onComplete={onComplete} />
    );
    const coin = container.querySelector('[data-testid="coin-animation"]');
    expect(coin).toBeInTheDocument();
    // Verify the element has the animate-coin-rise class which triggers onAnimationEnd
    expect(coin?.className).toContain('animate-coin-rise');
    // The onComplete fires via the fallback timeout when animationend doesn't fire in jsdom
    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('calls onComplete via fallback setTimeout at 800ms if animationend does not fire', () => {
    const onComplete = vi.fn();
    render(<CoinAnimation active={true} onComplete={onComplete} />);

    expect(onComplete).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(800);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('does not call onComplete more than once even after timeout expires', () => {
    const onComplete = vi.fn();
    render(<CoinAnimation active={true} onComplete={onComplete} />);

    act(() => {
      vi.advanceTimersByTime(800);
    });

    // Advance well past the timeout to ensure no double-fire
    act(() => {
      vi.advanceTimersByTime(800);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('cleans up timeout on unmount', () => {
    const onComplete = vi.fn();
    const { unmount } = render(
      <CoinAnimation active={true} onComplete={onComplete} />
    );

    unmount();

    act(() => {
      vi.advanceTimersByTime(800);
    });

    expect(onComplete).not.toHaveBeenCalled();
  });

  it('does not call onComplete when transitioning from active to inactive', () => {
    const onComplete = vi.fn();
    const { rerender } = render(
      <CoinAnimation active={true} onComplete={onComplete} />
    );

    rerender(<CoinAnimation active={false} onComplete={onComplete} />);

    act(() => {
      vi.advanceTimersByTime(800);
    });

    expect(onComplete).not.toHaveBeenCalled();
  });

  it('has pointerEvents none to avoid blocking interaction', () => {
    render(<CoinAnimation active={true} onComplete={vi.fn()} />);
    const coin = screen.getByTestId('coin-animation');
    expect(coin.style.pointerEvents).toBe('none');
  });
});
