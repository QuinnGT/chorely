import { describe, test, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ChoreIcon } from '@/components/ChoreIcon';
import { ICON_DATA } from '@/lib/chore-icons.generated';

describe('ChoreIcon', () => {
  test('renders a bundled MDI id as an inline SVG (offline, no API fetch)', () => {
    const { container } = render(<ChoreIcon value="mdi:broom" />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    // currentColor so it inherits the surrounding text color / theme
    expect(container.innerHTML).toContain('currentColor');
  });

  test('falls back to rendering a legacy emoji as text', () => {
    const { container } = render(<ChoreIcon value="🧹" />);
    expect(container.querySelector('svg')).toBeNull();
    expect(container.textContent).toBe('🧹');
  });

  test('falls back to text for an unknown id', () => {
    const { container } = render(<ChoreIcon value="mdi:does-not-exist" />);
    expect(container.querySelector('svg')).toBeNull();
    expect(container.textContent).toBe('mdi:does-not-exist');
  });

  test('the default chore icon is present in the bundled data', () => {
    expect(ICON_DATA['mdi:clipboard-text']).toBeDefined();
  });
});
