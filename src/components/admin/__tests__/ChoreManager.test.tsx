import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChoreManager } from '../ChoreManager';

const CHORES = [
  {
    id: 'chore-1',
    name: 'Put Away Dishes',
    icon: 'mdi:silverware-clean',
    frequency: 'daily',
    kind: 'standard',
    description: null,
    rewardAmount: 0,
    isActive: true,
    choreAssignments: [],
  },
  {
    id: 'chore-2',
    name: 'Bring In Garbage Bins',
    icon: 'mdi:trash-can-outline',
    frequency: 'daily',
    kind: 'standard',
    description: null,
    rewardAmount: 0,
    isActive: true,
    choreAssignments: [],
  },
];

describe('ChoreManager', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = vi.fn(async (url: string | URL | Request) => {
      const path = url.toString();
      const body = path === '/api/chores?includeInactive=true' ? CHORES : [];
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('raises the chore card above sibling cards while its menu is open', async () => {
    const user = userEvent.setup();
    render(<ChoreManager />);

    await waitFor(() => {
      expect(screen.getByText('Put Away Dishes')).toBeInTheDocument();
    });

    const firstCard = screen.getByTestId('chore-card-chore-1');
    const secondCard = screen.getByTestId('chore-card-chore-2');
    const [firstMenuButton] = screen.getAllByRole('button', { name: 'More options' });

    expect(firstCard).toHaveStyle({ zIndex: '0' });
    expect(secondCard).toHaveStyle({ zIndex: '0' });

    await user.click(firstMenuButton);

    expect(firstCard).toHaveStyle({ zIndex: '10' });
    expect(secondCard).toHaveStyle({ zIndex: '0' });
    expect(screen.getByText('Edit')).toBeInTheDocument();

    await user.click(firstMenuButton);

    expect(firstCard).toHaveStyle({ zIndex: '0' });
  });
});
