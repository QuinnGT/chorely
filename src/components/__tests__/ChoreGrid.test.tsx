import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChoreRow } from '@/hooks/useChoreGrid';
import { ChoreGrid } from '../ChoreGrid';

const { toggleMock } = vi.hoisted(() => ({
  toggleMock: vi.fn(),
}));

vi.mock('@/hooks/useChoreGrid', () => ({
  useChoreGrid: () => ({
    rows: [],
    completionRate: 0,
    streakDays: 0,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/hooks/useToggleCompletion', () => ({
  useToggleCompletion: () => ({
    toggle: toggleMock,
    error: null,
  }),
}));

vi.mock('@/components/ChoreIcon', () => ({
  ChoreIcon: () => <span data-testid="chore-icon" />,
}));

function makeRow(
  assignmentId: string,
  name: string,
  frequency: 'daily' | 'weekly',
): ChoreRow {
  return {
    assignmentId,
    chore: {
      id: `chore-${assignmentId}`,
      name,
      icon: 'mdi:check',
      frequency,
      kind: 'standard',
      description: null,
      rewardAmount: 0,
    },
    days: [
      {
        date: '2026-07-27',
        completed: false,
        isToday: frequency === 'daily',
        isFuture: false,
      },
    ],
  };
}

describe('ChoreGrid', () => {
  beforeEach(() => {
    toggleMock.mockReset();
    toggleMock.mockResolvedValue(true);
  });

  it('shows daily and weekly chores together without a mode toggle', async () => {
    const rows = [
      makeRow('daily-assignment', 'Put Away Dishes', 'daily'),
      makeRow('weekly-assignment', 'Put Away Clothes', 'weekly'),
    ];

    render(<ChoreGrid kidId="kid-1" rows={rows} />);

    expect(await screen.findByRole('heading', { name: 'Daily chores' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Weekly chores' })).toBeInTheDocument();
    expect(screen.getByText('Put Away Dishes')).toBeInTheDocument();
    expect(screen.getByText('Put Away Clothes')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Main' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Bonus' })).not.toBeInTheDocument();
  });

  it('gives weekly chores a clear completion action', async () => {
    const rows = [makeRow('weekly-assignment', 'Vacuum', 'weekly')];

    render(<ChoreGrid kidId="kid-1" rows={rows} />);

    const markDoneButton = await screen.findByRole('button', { name: 'Mark done: Vacuum' });
    fireEvent.click(markDoneButton);

    expect(toggleMock).toHaveBeenCalledWith('weekly-assignment', '2026-07-27', true);
    expect(screen.getByRole('button', { name: 'Mark incomplete: Vacuum' })).toBeInTheDocument();
  });

  it('keeps chore rows mounted while several completions save', async () => {
    const rows = [
      makeRow('vacuum-assignment', 'Vacuum', 'weekly'),
      makeRow('laundry-assignment', 'Put Away Laundry', 'weekly'),
    ];
    const onToggleSuccess = vi.fn();

    render(
      <ChoreGrid
        kidId="kid-1"
        rows={rows}
        onToggleSuccess={onToggleSuccess}
      />,
    );

    const vacuumLabel = await screen.findByText('Vacuum');
    const laundryLabel = screen.getByText('Put Away Laundry');
    fireEvent.click(screen.getByRole('button', { name: 'Mark done: Vacuum' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mark done: Put Away Laundry' }));

    expect(screen.queryByText('Loading quests…')).not.toBeInTheDocument();
    expect(screen.getByText('Vacuum')).toBe(vacuumLabel);
    expect(screen.getByText('Put Away Laundry')).toBe(laundryLabel);
    expect(screen.getByRole('button', { name: 'Mark incomplete: Vacuum' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark incomplete: Put Away Laundry' })).toBeInTheDocument();
    await waitFor(() => expect(onToggleSuccess).toHaveBeenCalledTimes(2));
  });
});
