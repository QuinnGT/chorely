import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useToggleCompletion } from '../useToggleCompletion';

describe('useToggleCompletion', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('keeps the optimistic state after a successful save', async () => {
    const refetch = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useToggleCompletion(refetch));
    let saved = false;

    await act(async () => {
      saved = await result.current.toggle('assignment-1', '2026-07-31', true);
    });

    expect(saved).toBe(true);
    expect(refetch).not.toHaveBeenCalled();
    expect(result.current.error).toBeNull();
    expect(result.current.isPending).toBe(false);
  });

  it('refetches server state when a save fails', async () => {
    const refetch = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue({ ok: false });
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useToggleCompletion(refetch));
    let saved = true;

    await act(async () => {
      saved = await result.current.toggle('assignment-1', '2026-07-31', true);
    });

    expect(saved).toBe(false);
    expect(refetch).toHaveBeenCalledOnce();
    expect(result.current.error).toBe('Failed to toggle completion');
    expect(result.current.isPending).toBe(false);
  });
});
