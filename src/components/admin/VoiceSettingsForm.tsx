'use client';

import { useState, useEffect, useCallback } from 'react';

/* ─── Types ─────────────────────────────────────────────────────────── */

interface KidRecord {
  id: string;
  name: string;
  avatarUrl: string | null;
  themeColor: string;
}

interface KidVoiceSettings {
  enabled: boolean;
  wakePhrase: string;
  providerId: string;
  elevenlabsVoiceId: string;
  speechOutput: boolean;
  soundEffects: boolean;
}

interface GlobalVoiceSettings {
  defaultWakePhrase: string;
  defaultProviderId: string;
  volume: number;
}

interface ElevenLabsVoice {
  voiceId: string;
  name: string;
  previewUrl: string;
}

const DEFAULT_KID_SETTINGS: KidVoiceSettings = {
  enabled: true,
  wakePhrase: 'Hey Family',
  providerId: 'web-speech',
  elevenlabsVoiceId: '',
  speechOutput: true,
  soundEffects: true,
};

const DEFAULT_GLOBAL: GlobalVoiceSettings = {
  defaultWakePhrase: 'Hey Family',
  defaultProviderId: 'web-speech',
  volume: 80,
};

const PROVIDERS = [
  { id: 'web-speech', label: 'Web Speech (Free)' },
  { id: 'elevenlabs', label: 'ElevenLabs (Premium)' },
] as const;

/* ─── Toggle Switch ─────────────────────────────────────────────────── */

function ToggleSwitch({
  checked,
  onChange,
  label,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  id: string;
}) {
  return (
    <button
      type="button"
      id={id}
      onClick={() => onChange(!checked)}
      className="relative inline-flex shrink-0 items-center rounded-full transition-colors"
      style={{
        width: '56px',
        height: '32px',
        minHeight: '32px',
        background: checked ? 'var(--primary)' : 'var(--surface-container-high)',
      }}
      role="switch"
      aria-checked={checked}
      aria-label={label}
    >
      <span
        className="absolute left-1 inline-block rounded-full bg-white shadow-md transition-transform"
        style={{
          width: '24px',
          height: '24px',
          transform: checked ? 'translateX(24px)' : 'translateX(0)',
        }}
      />
    </button>
  );
}

/* ─── Volume Slider ─────────────────────────────────────────────────── */

function VolumeSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="material-symbols-outlined"
        style={{ fontSize: '20px', color: 'var(--on-surface-variant)' }}
      >
        volume_mute
      </span>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full outline-none"
        style={{
          background: `linear-gradient(to right, var(--primary) ${value}%, var(--surface-container-high) ${value}%)`,
          accentColor: 'var(--primary)',
        }}
        aria-label="Audio volume"
      />
      <span
        className="material-symbols-outlined"
        style={{ fontSize: '20px', color: 'var(--on-surface-variant)' }}
      >
        volume_up
      </span>
      <span
        className="w-10 text-right text-sm font-semibold"
        style={{ color: 'var(--on-surface)' }}
      >
        {value}%
      </span>
    </div>
  );
}

/* ─── Kid Voice Card ────────────────────────────────────────────────── */

function KidVoiceCard({
  kid,
  settings,
  onSettingsChange,
  onTestVoice,
  testing,
}: {
  kid: KidRecord;
  settings: KidVoiceSettings;
  onSettingsChange: (s: KidVoiceSettings) => void;
  onTestVoice: () => void;
  testing: boolean;
}) {
  const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
  const [voicesLoading, setVoicesLoading] = useState(false);
  const [voicesError, setVoicesError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fetchVoices = useCallback(async () => {
    setVoicesLoading(true);
    setVoicesError(null);
    try {
      const res = await fetch('/api/voice/elevenlabs-voices');
      if (!res.ok) throw new Error('Failed to load voices');
      const data = await res.json();
      setVoices(data.voices as ElevenLabsVoice[]);
    } catch (err: unknown) {
      setVoicesError(err instanceof Error ? err.message : 'Failed to load voices');
    } finally {
      setVoicesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (settings.providerId === 'elevenlabs' && settings.enabled) {
      fetchVoices();
    }
  }, [settings.providerId, settings.enabled, fetchVoices]);

  useEffect(() => {
    const voice = voices.find((v) => v.voiceId === settings.elevenlabsVoiceId);
    setPreviewUrl(voice?.previewUrl ?? null);
  }, [settings.elevenlabsVoiceId, voices]);

  const update = (patch: Partial<KidVoiceSettings>) => {
    onSettingsChange({ ...settings, ...patch });
  };

  return (
    <div
      className="glass-card animate-card-entrance flex flex-col gap-5 overflow-hidden rounded-[3rem] p-6"
      style={{ background: 'var(--surface-container-lowest)' }}
    >
      {/* Kid Header */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white shadow-lg"
          style={{
            backgroundColor: kid.themeColor,
            boxShadow: `0 4px 16px ${kid.themeColor}40`,
          }}
        >
          {kid.avatarUrl ? (
            <img src={kid.avatarUrl} alt={kid.name} className="h-full w-full rounded-full object-cover" />
          ) : (
            kid.name.charAt(0).toUpperCase()
          )}
        </div>
        <div>
          <h3
            className="font-headline text-lg font-bold"
            style={{ color: 'var(--on-surface)' }}
          >
            {kid.name}
          </h3>
          <span
            className="text-xs font-medium"
            style={{ color: 'var(--on-surface-variant)' }}
          >
            Voice Assistant
          </span>
        </div>
        <div className="ml-auto">
          <ToggleSwitch
            id={`voice-enabled-${kid.id}`}
            checked={settings.enabled}
            onChange={(v) => update({ enabled: v })}
            label={`Enable voice assistant for ${kid.name}`}
          />
        </div>
      </div>

      {settings.enabled && (
        <div className="flex flex-col gap-5">
          {/* Wake Phrase */}
          <div>
            <label
              htmlFor={`wake-phrase-${kid.id}`}
              className="mb-1 block text-sm font-medium"
              style={{ color: 'var(--on-surface-variant)' }}
            >
              Wake Phrase
            </label>
            <input
              id={`wake-phrase-${kid.id}`}
              type="text"
              value={settings.wakePhrase}
              onChange={(e) => update({ wakePhrase: e.target.value })}
              className="w-full rounded-full px-4 py-3 text-base outline-none transition-shadow focus:ring-2"
              style={{
                background: 'var(--surface-container-low)',
                color: 'var(--on-surface)',
                border: '1px solid var(--outline-variant)',
                minHeight: '48px',
                '--tw-ring-color': 'var(--primary)',
              } as React.CSSProperties}
              placeholder="Hey Family"
            />
            <p className="mt-1 text-xs" style={{ color: 'var(--on-surface-variant)' }}>
              2-5 words, letters only (e.g. &quot;Hey Liesl&quot;)
            </p>
          </div>

          {/* Voice Provider */}
          <div>
            <label
              htmlFor={`provider-${kid.id}`}
              className="mb-1 block text-sm font-medium"
              style={{ color: 'var(--on-surface-variant)' }}
            >
              Voice Provider
            </label>
            <select
              id={`provider-${kid.id}`}
              value={settings.providerId}
              onChange={(e) => update({ providerId: e.target.value, elevenlabsVoiceId: '' })}
              className="w-full rounded-full px-4 py-3 text-base outline-none"
              style={{
                background: 'var(--surface-container-low)',
                color: 'var(--on-surface)',
                border: '1px solid var(--outline-variant)',
                minHeight: '48px',
              }}
            >
              {PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* ElevenLabs Voice ID + Preview */}
          {settings.providerId === 'elevenlabs' && (
            <div className="flex flex-col gap-3">
              <div>
                <label
                  htmlFor={`el-voice-${kid.id}`}
                  className="mb-1 block text-sm font-medium"
                  style={{ color: 'var(--on-surface-variant)' }}
                >
                  ElevenLabs Voice
                </label>
                {voicesLoading && (
                  <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>Loading voices…</p>
                )}
                {voicesError && (
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium" style={{ color: 'var(--error)' }}>{voicesError}</p>
                    <button
                      type="button"
                      onClick={fetchVoices}
                      className="text-sm font-semibold underline"
                      style={{ color: 'var(--primary)' }}
                    >
                      Retry
                    </button>
                  </div>
                )}
                {!voicesLoading && !voicesError && (
                  <select
                    id={`el-voice-${kid.id}`}
                    value={settings.elevenlabsVoiceId}
                    onChange={(e) => update({ elevenlabsVoiceId: e.target.value })}
                    className="w-full rounded-full px-4 py-3 text-base outline-none"
                    style={{
                      background: 'var(--surface-container-low)',
                      color: 'var(--on-surface)',
                      border: '1px solid var(--outline-variant)',
                      minHeight: '48px',
                    }}
                  >
                    <option value="">Select a voice…</option>
                    {voices.map((v) => (
                      <option key={v.voiceId} value={v.voiceId}>{v.name}</option>
                    ))}
                  </select>
                )}
              </div>
              {previewUrl && (
                <button
                  type="button"
                  onClick={() => {
                    const audio = new Audio(previewUrl);
                    audio.volume = 0.8;
                    audio.play();
                  }}
                  className="flex items-center gap-2 self-start rounded-full px-4 py-2 text-sm font-semibold transition-transform active:scale-95"
                  style={{
                    background: 'var(--surface-container-low)',
                    color: 'var(--primary)',
                    minHeight: '40px',
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: '18px', fontVariationSettings: '"FILL" 1' }}
                  >
                    play_circle
                  </span>
                  Preview Voice
                </button>
              )}
            </div>
          )}

          {/* Speech Output Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium" style={{ color: 'var(--on-surface)' }}>
                Speech Output
              </span>
              <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>
                Read chores aloud
              </p>
            </div>
            <ToggleSwitch
              id={`speech-output-${kid.id}`}
              checked={settings.speechOutput}
              onChange={(v) => update({ speechOutput: v })}
              label={`Speech output for ${kid.name}`}
            />
          </div>

          {/* Sound Effects Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium" style={{ color: 'var(--on-surface)' }}>
                Sound Effects
              </span>
              <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>
                Celebration sounds on completion
              </p>
            </div>
            <ToggleSwitch
              id={`sound-fx-${kid.id}`}
              checked={settings.soundEffects}
              onChange={(v) => update({ soundEffects: v })}
              label={`Sound effects for ${kid.name}`}
            />
          </div>

          {/* Test Voice Button */}
          <button
            type="button"
            onClick={onTestVoice}
            disabled={testing}
            className="flex items-center justify-center gap-2 self-start rounded-full bg-action-gradient px-6 font-semibold text-white transition-transform active:scale-95 disabled:opacity-50"
            style={{ minHeight: '48px' }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '20px', fontVariationSettings: '"FILL" 1' }}
            >
              {testing ? 'progress_activity' : 'play_arrow'}
            </span>
            {testing ? 'Testing…' : 'Test Voice'}
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Main Component ────────────────────────────────────────────────── */

export function VoiceSettingsForm() {
  const [kids, setKids] = useState<KidRecord[]>([]);
  const [kidSettings, setKidSettings] = useState<Record<string, KidVoiceSettings>>({});
  const [globalSettings, setGlobalSettings] = useState<GlobalVoiceSettings>(DEFAULT_GLOBAL);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [testingKidId, setTestingKidId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [kidsRes, settingsRes] = await Promise.all([
        fetch('/api/kids'),
        fetch('/api/voice-settings'),
      ]);
      if (!kidsRes.ok) throw new Error('Failed to load kids');
      const kidsData = (await kidsRes.json()) as KidRecord[];
      setKids(kidsData);

      if (settingsRes.ok) {
        const voiceData = await settingsRes.json();
        if (voiceData.global) {
          setGlobalSettings({
            defaultWakePhrase: voiceData.global.defaultWakePhrase ?? DEFAULT_GLOBAL.defaultWakePhrase,
            defaultProviderId: voiceData.global.defaultProviderId ?? DEFAULT_GLOBAL.defaultProviderId,
            volume: voiceData.global.volume ?? DEFAULT_GLOBAL.volume,
          });
        }
        if (voiceData.perKid) {
          const map: Record<string, KidVoiceSettings> = {};
          for (const [id, s] of Object.entries(voiceData.perKid as Record<string, KidVoiceSettings>)) {
            map[id] = { ...DEFAULT_KID_SETTINGS, ...s };
          }
          setKidSettings(map);
        }
      }
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const getKidSettings = (kidId: string): KidVoiceSettings => {
    return kidSettings[kidId] ?? { ...DEFAULT_KID_SETTINGS, wakePhrase: globalSettings.defaultWakePhrase, providerId: globalSettings.defaultProviderId };
  };

  const updateKidSettings = (kidId: string, patch: KidVoiceSettings) => {
    setKidSettings((prev) => ({ ...prev, [kidId]: patch }));
    setSuccessMsg(null);
    setSaveError(null);
  };

  const handleTestVoice = useCallback(async (kidId: string) => {
    setTestingKidId(kidId);
    try {
      const s = getKidSettings(kidId);
      const kid = kids.find((k) => k.id === kidId);
      const testPhrase = `${s.wakePhrase}, ${kid?.name ?? 'there'}! Your chores are ready.`;

      if (s.providerId === 'elevenlabs' && s.elevenlabsVoiceId) {
        const res = await fetch('/api/voice/elevenlabs-tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: testPhrase, voiceId: s.elevenlabsVoiceId }),
        });
        if (res.ok) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audio.volume = globalSettings.volume / 100;
          audio.play();
          audio.onended = () => URL.revokeObjectURL(url);
        }
      } else if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(testPhrase);
        utterance.volume = globalSettings.volume / 100;
        utterance.rate = 0.95;
        utterance.pitch = 1.1;
        speechSynthesis.speak(utterance);
      }
    } catch {
      // Voice test failed silently
    } finally {
      setTimeout(() => setTestingKidId(null), 1000);
    }
  }, [kids, kidSettings, globalSettings.volume]);

  const handleSave = useCallback(async () => {
    setSuccessMsg(null);
    setSaveError(null);
    setIsSaving(true);
    try {
      const res = await fetch('/api/voice-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ global: globalSettings, perKid: kidSettings }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null) as { error?: string; details?: Record<string, string[]> } | null;
        if (data?.details) {
          const messages = Object.values(data.details).flat();
          throw new Error(messages.join('. '));
        }
        throw new Error(data?.error ?? 'Failed to save');
      }
      setSuccessMsg('Voice settings saved!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save';
      setSaveError(message);
      console.error('Save failed:', err);
    } finally {
      setIsSaving(false);
    }
  }, [globalSettings, kidSettings]);

  /* ─── Loading State ─────────────────────────────────────────────── */

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span
          className="material-symbols-outlined animate-voice-spin"
          style={{ fontSize: '32px', color: 'var(--primary)' }}
        >
          progress_activity
        </span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <span
          className="material-symbols-outlined"
          style={{ fontSize: '40px', color: 'var(--error)' }}
        >
          error
        </span>
        <p style={{ color: 'var(--error)' }}>{loadError}</p>
        <button
          type="button"
          onClick={loadData}
          className="rounded-full bg-action-gradient px-6 font-semibold text-white transition-transform active:scale-95"
          style={{ minHeight: '48px' }}
        >
          Retry
        </button>
      </div>
    );
  }

  /* ─── Render ────────────────────────────────────────────────────── */

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: '28px',
            color: 'var(--primary)',
            fontVariationSettings: '"FILL" 1',
          }}
        >
          mic
        </span>
        <h2
          className="font-headline text-2xl font-bold"
          style={{ color: 'var(--on-surface)' }}
        >
          Voice Assistant
        </h2>
      </div>

      {/* Per-Kid Section */}
      <div className="flex flex-col gap-5">
        <h3
          className="font-headline text-lg font-semibold"
          style={{ color: 'var(--on-surface)' }}
        >
          Per-Kid Configuration
        </h3>

        {kids.length === 0 ? (
          <div
            className="flex flex-col items-center gap-3 rounded-[3rem] p-8"
            style={{ background: 'var(--surface-container-low)' }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '40px', color: 'var(--outline-variant)' }}
            >
              child_care
            </span>
            <p style={{ color: 'var(--on-surface-variant)' }}>
              No kids configured. Add kids in the Kids tab first.
            </p>
          </div>
        ) : (
          kids.map((kid, index) => (
            <KidVoiceCard
              key={kid.id}
              kid={kid}
              settings={getKidSettings(kid.id)}
              onSettingsChange={(s) => updateKidSettings(kid.id, s)}
              onTestVoice={() => handleTestVoice(kid.id)}
              testing={testingKidId === kid.id}
            />
          ))
        )}
      </div>

      {/* Global Settings */}
      <div
        className="glass-card flex flex-col gap-6 rounded-[3rem] p-6"
        style={{ background: 'var(--surface-container-lowest)' }}
      >
        <div className="flex items-center gap-3">
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: '24px',
              color: 'var(--secondary)',
              fontVariationSettings: '"FILL" 1',
            }}
          >
            settings
          </span>
          <h3
            className="font-headline text-lg font-semibold"
            style={{ color: 'var(--on-surface)' }}
          >
            Global Defaults
          </h3>
        </div>

        {/* Default Wake Phrase */}
        <div>
          <label
            htmlFor="global-wake-phrase"
            className="mb-1 block text-sm font-medium"
            style={{ color: 'var(--on-surface-variant)' }}
          >
            Default Wake Phrase
          </label>
          <p className="mb-2 text-xs" style={{ color: 'var(--on-surface-variant)' }}>
            Applied to new kids automatically
          </p>
          <input
            id="global-wake-phrase"
            type="text"
            value={globalSettings.defaultWakePhrase}
            onChange={(e) => {
              setSuccessMsg(null);
              setSaveError(null);
              setGlobalSettings((prev) => ({ ...prev, defaultWakePhrase: e.target.value }));
            }}
            className="w-full rounded-full px-4 py-3 text-base outline-none"
            style={{
              background: 'var(--surface-container-low)',
              color: 'var(--on-surface)',
              border: '1px solid var(--outline-variant)',
              minHeight: '48px',
            }}
            placeholder="Hey Family"
          />
        </div>

        {/* Default Provider */}
        <div>
          <label
            htmlFor="global-provider"
            className="mb-1 block text-sm font-medium"
            style={{ color: 'var(--on-surface-variant)' }}
          >
            Default Provider
          </label>
          <select
            id="global-provider"
            value={globalSettings.defaultProviderId}
            onChange={(e) => {
              setSuccessMsg(null);
              setSaveError(null);
              setGlobalSettings((prev) => ({ ...prev, defaultProviderId: e.target.value }));
            }}
            className="w-full rounded-full px-4 py-3 text-base outline-none"
            style={{
              background: 'var(--surface-container-low)',
              color: 'var(--on-surface)',
              border: '1px solid var(--outline-variant)',
              minHeight: '48px',
            }}
          >
            {PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </div>

        {/* Volume Slider */}
        <div>
          <label
            className="mb-2 block text-sm font-medium"
            style={{ color: 'var(--on-surface-variant)' }}
          >
            Audio Volume
          </label>
          <VolumeSlider
            value={globalSettings.volume}
            onChange={(v) => {
              setSuccessMsg(null);
              setSaveError(null);
              setGlobalSettings((prev) => ({ ...prev, volume: v }));
            }}
          />
        </div>
      </div>

      {/* Status Messages */}
      {successMsg && (
        <p className="text-sm font-medium" style={{ color: 'var(--primary)' }} role="status">
          {successMsg}
        </p>
      )}
      {saveError && (
        <p className="text-sm font-medium" style={{ color: 'var(--error)' }} role="alert">
          {saveError}
        </p>
      )}

      {/* Save Button */}
      <button
        type="button"
        onClick={handleSave}
        disabled={isSaving}
        className="self-start rounded-full bg-action-gradient px-8 font-semibold text-white shadow-lg transition-transform active:scale-95 disabled:opacity-50"
        style={{ minHeight: '48px' }}
      >
        {isSaving ? 'Saving…' : 'Save All Settings'}
      </button>
    </div>
  );
}
