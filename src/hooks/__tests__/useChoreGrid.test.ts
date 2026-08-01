import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useChoreGrid } from '../useChoreGrid';

const CHORES_RESPONSE = [
  {
    id: 'chore-1',
    name: 'Make Bed',
    icon: 'mdi:bed',
    frequency: 'daily',
    kind: 'standard',
    description: null,
    rewardAmount: 0,
    isActive: true,
    choreAssignments: [
      {
        id: 'assignment-1',
        kidId: 'kid-1',
      },
    ],
  },
];

describe('useChoreGrid', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('keeps existing rows visible during a background refresh', async () => {
    let holdRefresh = false;
    let releaseRefresh: (() => void) | undefined;
    const refreshGate = new Promise<void>((resolve) => {
      releaseRefresh = resolve;
    });
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (holdRefresh) {
        await refreshGate;
      }

      const data = String(input).startsWith('/api/chores') ? CHORES_RESPONSE : [];
      return {
        ok: true,
        json: async () => data,
      };
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useChoreGrid('kid-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.rows).toHaveLength(1);
    const initialRows = result.current.rows;

    holdRefresh = true;
    act(() => result.current.refetch());
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.rows).toBe(initialRows);

    releaseRefresh?.();
    await waitFor(() => expect(result.current.rows).not.toBe(initialRows));
  });
});
