import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ProgressRing } from '../ProgressRing';

describe('ProgressRing', () => {
  it('renders with data-testid="progress-ring"', () => {
    render(<ProgressRing completionRate={0.5} projectedAmount={5} />);
    expect(screen.getByTestId('progress-ring')).toBeInTheDocument();
  });

  it('displays percentage text centered', () => {
    render(<ProgressRing completionRate={0.5} projectedAmount={8} />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('renders percentage at dynamic font size based on diameter', () => {
    const diameter = 140;
    render(<ProgressRing completionRate={0.5} projectedAmount={5} size={diameter} />);
    const ring = screen.getByTestId('progress-ring');
    const amountEl = ring.querySelector('.font-headline') as HTMLElement;
    expect(amountEl).toBeInTheDocument();
    expect(amountEl.style.fontSize).toBe(`${diameter * 0.2}px`);
  });

  it('renders two SVG circles (unfilled background + filled arc)', () => {
    const { container } = render(
      <ProgressRing completionRate={0.5} projectedAmount={5} />
    );
    const circles = container.querySelectorAll('circle');
    expect(circles).toHaveLength(2);
  });

  it('sets unfilled arc stroke to var(--surface-container-high)', () => {
    const { container } = render(
      <ProgressRing completionRate={0.5} projectedAmount={5} />
    );
    const circles = container.querySelectorAll('circle');
    expect(circles[0].getAttribute('stroke')).toBe('var(--surface-container-high)');
  });

  it('sets filled arc stroke to url(#progress-gradient)', () => {
    const { container } = render(
      <ProgressRing completionRate={0.5} projectedAmount={5} />
    );
    const circles = container.querySelectorAll('circle');
    expect(circles[1].getAttribute('stroke')).toBe('url(#progress-gradient)');
  });

  it('computes correct stroke-dashoffset for 50% completion', () => {
    const size = 120;
    const strokeWidth = 10;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const expectedOffset = circumference * (1 - 0.5);

    const { container } = render(
      <ProgressRing completionRate={0.5} projectedAmount={5} size={size} strokeWidth={strokeWidth} />
    );
    const filledCircle = container.querySelectorAll('circle')[1];
    expect(filledCircle.getAttribute('stroke-dashoffset')).toBe(
      String(expectedOffset)
    );
  });

  it('computes stroke-dashoffset of 0 at 100% completion', () => {
    const { container } = render(
      <ProgressRing completionRate={1} projectedAmount={5} />
    );
    const filledCircle = container.querySelectorAll('circle')[1];
    expect(filledCircle.getAttribute('stroke-dashoffset')).toBe('0');
  });

  it('computes full circumference offset at 0% completion', () => {
    const size = 120;
    const strokeWidth = 10;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    const { container } = render(
      <ProgressRing completionRate={0} projectedAmount={0} size={size} strokeWidth={strokeWidth} />
    );
    const filledCircle = container.querySelectorAll('circle')[1];
    expect(filledCircle.getAttribute('stroke-dashoffset')).toBe(
      String(circumference)
    );
  });

  it('applies animate-pulse class when completionRate is 1', () => {
    render(<ProgressRing completionRate={1} projectedAmount={5} />);
    const ring = screen.getByTestId('progress-ring');
    const headline = ring.querySelector('.font-headline');
    expect(headline?.className).toContain('animate-pulse');
  });

  it('does not apply animate-pulse when completionRate < 1', () => {
    render(<ProgressRing completionRate={0.99} projectedAmount={5} />);
    const ring = screen.getByTestId('progress-ring');
    const headline = ring.querySelector('.font-headline');
    expect(headline?.className ?? '').not.toContain('animate-pulse');
  });

  it('enforces minimum diameter of 120px', () => {
    render(<ProgressRing completionRate={0.5} projectedAmount={5} size={80} />);
    const ring = screen.getByTestId('progress-ring');
    expect(ring.style.width).toBe('120px');
    expect(ring.style.height).toBe('120px');
  });

  it('accepts a larger custom size', () => {
    render(<ProgressRing completionRate={0.5} projectedAmount={5} size={200} />);
    const ring = screen.getByTestId('progress-ring');
    expect(ring.style.width).toBe('200px');
    expect(ring.style.height).toBe('200px');
  });

  it('clamps completionRate above 1 to 1', () => {
    const { container } = render(
      <ProgressRing completionRate={1.5} projectedAmount={5} />
    );
    const filledCircle = container.querySelectorAll('circle')[1];
    expect(filledCircle.getAttribute('stroke-dashoffset')).toBe('0');
  });

  it('clamps completionRate below 0 to 0', () => {
    const size = 120;
    const strokeWidth = 10;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    const { container } = render(
      <ProgressRing completionRate={-0.5} projectedAmount={5} size={size} strokeWidth={strokeWidth} />
    );
    const filledCircle = container.querySelectorAll('circle')[1];
    expect(filledCircle.getAttribute('stroke-dashoffset')).toBe(
      String(circumference)
    );
  });

  it('applies CSS transition on the filled arc', () => {
    const { container } = render(
      <ProgressRing completionRate={0.5} projectedAmount={5} />
    );
    const filledCircle = container.querySelectorAll('circle')[1];
    expect(filledCircle.style.transition).toContain('stroke-dashoffset');
    expect(filledCircle.style.transition).toContain('var(--spring-ease)');
  });
});

import fc from 'fast-check';

// Feature: allowance-gamification-ui, Property 1: Progress ring arc offset matches completion rate
describe('Property 1: Progress ring arc offset matches completion rate', () => {
  /**
   * Validates: Requirements 1.2
   *
   * For any completionRate 0-1, the SVG circle's stroke-dashoffset
   * should equal circumference * (1 - completionRate),
   * where circumference = 2 * pi * radius and radius = (size - strokeWidth) / 2.
   */
  it('stroke-dashoffset equals circumference * (1 - completionRate) for any rate in [0, 1]', () => {
    const STROKE_WIDTH = 10;
    const DEFAULT_SIZE = 120;
    const radius = (DEFAULT_SIZE - STROKE_WIDTH) / 2;
    const circumference = 2 * Math.PI * radius;

    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1, noNaN: true }),
        (completionRate) => {
          const { container } = render(
            <ProgressRing completionRate={completionRate} projectedAmount={5} size={DEFAULT_SIZE} strokeWidth={STROKE_WIDTH} />
          );

          const filledCircle = container.querySelectorAll('circle')[1];
          const actualOffset = Number(filledCircle.getAttribute('stroke-dashoffset'));
          const expectedOffset = circumference * (1 - completionRate);

          expect(actualOffset).toBeCloseTo(expectedOffset, 5);
        }
      ),
      { numRuns: 10 }
    );
  });
});
