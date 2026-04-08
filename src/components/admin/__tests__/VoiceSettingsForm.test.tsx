import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VoiceSettingsForm } from '../VoiceSettingsForm';

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface MockKid {
  id: string;
  name: string;
  avatarUrl: string | null;
  themeColor: string;
}

interface MockVoice {
  voiceId: string;
  name: string;
  previewUrl: string;
}

const SAMPLE_KIDS: MockKid[] = [
  { id: 'kid-1', name: 'Alice', avatarUrl: null, themeColor: '#0d9488' },
];

const SAMPLE_VOICES: MockVoice[] = [
  { voiceId: 'abc', name: 'Rachel', previewUrl: 'https://example.com/rachel.mp3' },
  { voiceId: 'def', name: 'Adam', previewUrl: 'https://example.com/adam.mp3' },
];

function createFetchMock(
  options: {
    kids?: MockKid[];
    settings?: Record<string, unknown>;
    voices?: { voices: MockVoice[] } | 'error';
    elevenlabsEnabled?: boolean;
  } = {}
) {
  const {
    kids = SAMPLE_KIDS,
    settings = {},
    voices,
    elevenlabsEnabled = false,
  } = options;

  const putCalls: { url: string; body: unknown }[] = [];

  const mockFetch = vi.fn(async (url: string, init?: RequestInit) => {
    if (url === '/api/kids') {
      return new Response(JSON.stringify(kids), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url === '/api/voice-settings' && (!init || init.method !== 'PUT')) {
      return new Response(JSON.stringify(settings), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url === '/api/voice/elevenlabs-voices') {
      if (voices === 'error') {
        return new Response(JSON.stringify({ error: 'Failed to fetch voice list' }), {
          status: 502,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify(voices ?? { voices: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url === '/api/voice-settings' && init?.method === 'PUT') {
      const body = JSON.parse(init.body as string);
      putCalls.push({ url, body });
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not found', { status: 404 });
  });

  return { mockFetch: mockFetch as unknown as typeof global.fetch, putCalls };
}

// ─── Unit Tests ───────────────────────────────────────────────────────────────

describe('VoiceSettingsForm – Admin Voice Picker', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  // Req 6.1
  it('shows voice dropdown when ElevenLabs provider is selected', async () => {
    const { mockFetch } = createFetchMock({
      settings: {
        global: { defaultWakePhrase: 'Hey Family', defaultProviderId: 'elevenlabs', volume: 80 },
        perKid: {
          'kid-1': {
            enabled: true,
            wakePhrase: 'Hey Family',
            providerId: 'elevenlabs',
            elevenlabsVoiceId: '',
            speechOutput: true,
            soundEffects: true,
          },
        },
      },
      voices: { voices: SAMPLE_VOICES },
    });
    global.fetch = mockFetch;

    render(<VoiceSettingsForm />);

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Rachel')).toBeInTheDocument();
      expect(screen.getByText('Adam')).toBeInTheDocument();
    });
  });

  // Req 6.2
  it('hides voice dropdown when provider is not ElevenLabs', async () => {
    const { mockFetch } = createFetchMock({
      settings: {
        global: { defaultWakePhrase: 'Hey Family', defaultProviderId: 'web-speech', volume: 80 },
        perKid: {},
      },
    });
    global.fetch = mockFetch;

    render(<VoiceSettingsForm />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Voice Assistant' })).toBeInTheDocument();
    });

    expect(screen.queryByText('ElevenLabs Voice')).not.toBeInTheDocument();
  });

  // Req 6.3
  it('saves settings when Save button is clicked', async () => {
    const { mockFetch, putCalls } = createFetchMock({
      settings: {
        global: { defaultWakePhrase: 'Hey Family', defaultProviderId: 'web-speech', volume: 80 },
        perKid: {},
      },
    });
    global.fetch = mockFetch;

    const user = userEvent.setup();
    render(<VoiceSettingsForm />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Voice Assistant' })).toBeInTheDocument();
    });

    const saveButton = screen.getByRole('button', { name: /save all settings/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(putCalls.length).toBeGreaterThanOrEqual(1);
    });
  });

  // Req 6.4
  it('displays kid voice settings on load', async () => {
    const { mockFetch } = createFetchMock({
      settings: {
        global: { defaultWakePhrase: 'Hey Family', defaultProviderId: 'elevenlabs', volume: 80 },
        perKid: {
          'kid-1': {
            enabled: true,
            wakePhrase: 'Hey Family',
            providerId: 'elevenlabs',
            elevenlabsVoiceId: 'abc',
            speechOutput: true,
            soundEffects: true,
          },
        },
      },
      voices: { voices: SAMPLE_VOICES },
    });
    global.fetch = mockFetch;

    render(<VoiceSettingsForm />);

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    await waitFor(() => {
      const dropdown = screen.getByLabelText('ElevenLabs Voice') as HTMLSelectElement;
      expect(dropdown.value).toBe('abc');
    });
  });

  // Req 6.5
  it('shows error message and retry button on voice fetch failure', async () => {
    const { mockFetch } = createFetchMock({
      kids: [{ id: 'kid-1', name: 'Alice', avatarUrl: null, themeColor: '#0d9488' }],
      settings: {
        global: { defaultWakePhrase: 'Hey Family', defaultProviderId: 'elevenlabs', volume: 80 },
        perKid: {
          'kid-1': {
            enabled: true,
            wakePhrase: 'Hey Family',
            providerId: 'elevenlabs',
            elevenlabsVoiceId: '',
            speechOutput: true,
            soundEffects: true,
          },
        },
      },
      voices: 'error',
    });
    global.fetch = mockFetch;

    render(<VoiceSettingsForm />);

    // Wait for error message to appear
    await waitFor(() => {
      expect(screen.getByText('Failed to load voices')).toBeInTheDocument();
    });

    // Verify retry button is visible
    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();
  });
});
