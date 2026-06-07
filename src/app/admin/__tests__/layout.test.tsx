import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/kids',
}));

vi.mock('@/components/PinEntry', () => ({
  PinEntry: ({ onSuccess }: { onSuccess: (sessionTimeoutMs: number) => void }) => (
    <button type="button" onClick={() => onSuccess(300_000)}>
      Unlock admin
    </button>
  ),
}));

import AdminLayout from '../layout';

describe('AdminLayout session expiration', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('locks the admin area when the PIN session expires', () => {
    render(
      <AdminLayout>
        <div>Admin content</div>
      </AdminLayout>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Unlock admin' }));
    expect(screen.getAllByText('Admin content')).toHaveLength(2);

    act(() => {
      vi.advanceTimersByTime(300_000);
    });

    expect(screen.getByRole('button', { name: 'Unlock admin' })).toBeInTheDocument();
    expect(screen.queryAllByText('Admin content')).toHaveLength(0);
    expect(sessionStorage.getItem('admin-pin-authenticated')).toBeNull();
  });

  test('does not restore the legacy never-expiring session value', () => {
    sessionStorage.setItem('admin-pin-authenticated', 'true');

    render(
      <AdminLayout>
        <div>Admin content</div>
      </AdminLayout>,
    );

    expect(screen.getByRole('button', { name: 'Unlock admin' })).toBeInTheDocument();
    expect(sessionStorage.getItem('admin-pin-authenticated')).toBeNull();
  });
});
