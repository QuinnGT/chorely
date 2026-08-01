import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProfileSelector } from '../ProfileSelector';

describe('ProfileSelector', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('shows existing profiles without an Add profile control', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: 'kid-1',
          name: 'Gideon',
          avatarUrl: null,
          themeColor: '#006571',
        },
      ],
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <ProfileSelector
        onSelectKid={vi.fn()}
        onParentTap={vi.fn()}
      />,
    );

    expect(await screen.findByRole('button', { name: /Gideon/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Parent Dashboard/i })).toBeInTheDocument();
  });
});
