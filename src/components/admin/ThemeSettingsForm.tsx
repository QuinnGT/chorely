'use client';

import { useState, useCallback, useEffect } from 'react';
import { useTheme, type CustomTheme } from '@/contexts/ThemeContext';

/* ─── Types ─────────────────────────────────────────────────────────── */

interface ThemePreset {
  id: string;
  name: string;
  colors: {
    primary: string;
    accent: string;
    background: string;
    surface: string;
  };
  icon: string;
}

const PRESETS: ThemePreset[] = [
  {
    id: 'ocean',
    name: 'Ocean Blue',
    icon: 'waves',
    colors: {
      primary: '#006571',
      accent: '#58e7fb',
      background: '#f0f7fa',
      surface: '#ffffff',
    },
  },
  {
    id: 'sunset',
    name: 'Sunset Purple',
    icon: 'wb_twilight',
    colors: {
      primary: '#912da3',
      accent: '#fbbdff',
      background: '#faf0fc',
      surface: '#ffffff',
    },
  },
  {
    id: 'forest',
    name: 'Forest Green',
    icon: 'forest',
    colors: {
      primary: '#15803d',
      accent: '#86efac',
      background: '#f0fdf4',
      surface: '#ffffff',
    },
  },
  {
    id: 'candy',
    name: 'Candy Pink',
    icon: 'favorite',
    colors: {
      primary: '#db2777',
      accent: '#fbcfe8',
      background: '#fdf2f8',
      surface: '#ffffff',
    },
  },
];

const DARK_DEFAULTS = {
  background: '#0b0f11',
  surface: '#1a1f23',
};

/* ─── Color Swatch Input ────────────────────────────────────────────── */

function ColorInput({
  label,
  value,
  onChange,
  id,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  id: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <label
        htmlFor={id}
        className="w-28 shrink-0 text-sm font-medium"
        style={{ color: 'var(--on-surface-variant)' }}
      >
        {label}
      </label>
      <div
        className="relative flex flex-1 items-center gap-2 rounded-full px-3"
        style={{
          background: 'var(--surface-container-low)',
          border: '1px solid var(--outline-variant)',
          minHeight: '48px',
        }}
      >
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-8 shrink-0 cursor-pointer appearance-none rounded-full border-0 p-0"
          style={{ background: 'transparent' }}
          aria-label={`${label} color picker`}
        />
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            if (/^#[0-9a-fA-F]{0,6}$/.test(v)) {
              onChange(v);
            }
          }}
          className="flex-1 bg-transparent text-sm font-mono outline-none"
          style={{ color: 'var(--on-surface)' }}
          maxLength={7}
          placeholder="#000000"
        />
        <div
          className="h-8 w-8 shrink-0 rounded-full shadow-inner"
          style={{
            backgroundColor: value,
            border: '2px solid var(--surface-container-high)',
          }}
        />
      </div>
    </div>
  );
}

/* ─── Preset Card ───────────────────────────────────────────────────── */

function PresetCard({
  preset,
  active,
  isDark,
  onClick,
}: {
  preset: ThemePreset;
  active: boolean;
  isDark: boolean;
  onClick: () => void;
}) {
  const bg = isDark ? DARK_DEFAULTS.background : preset.colors.background;
  const surface = isDark ? DARK_DEFAULTS.surface : preset.colors.surface;

  return (
    <button
      type="button"
      onClick={onClick}
      className="animate-card-entrance flex flex-col items-center gap-3 rounded-[3rem] p-5 transition-all active:scale-95"
      style={{
        background: 'var(--surface-container-low)',
        border: active
          ? `3px solid ${preset.colors.primary}`
          : '3px solid transparent',
        boxShadow: active
          ? `0 4px 20px ${preset.colors.primary}30`
          : 'none',
      }}
    >
      {/* Preview Swatch */}
      <div
        className="relative flex h-20 w-full flex-col overflow-hidden rounded-2xl"
        style={{ background: bg }}
      >
        {/* Surface bar */}
        <div
          className="absolute bottom-0 left-0 right-0 h-10 rounded-t-xl"
          style={{
            background: surface,
            boxShadow: '0 -2px 8px rgba(0,0,0,0.06)',
          }}
        />
        {/* Accent dot */}
        <div
          className="absolute right-2 top-2 h-4 w-4 rounded-full"
          style={{
            background: preset.colors.accent,
            boxShadow: `0 2px 8px ${preset.colors.accent}60`,
          }}
        />
        {/* Primary bar */}
        <div
          className="absolute left-2 top-2 h-4 w-10 rounded-full"
          style={{
            background: preset.colors.primary,
            boxShadow: `0 2px 8px ${preset.colors.primary}40`,
          }}
        />
        {active && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className="material-symbols-outlined rounded-full p-1 text-white"
              style={{
                fontSize: '24px',
                fontVariationSettings: '"FILL" 1',
                background: preset.colors.primary,
                boxShadow: `0 2px 8px ${preset.colors.primary}80`,
              }}
            >
              check
            </span>
          </div>
        )}
      </div>

      <span
        className="font-headline text-sm font-semibold"
        style={{ color: 'var(--on-surface)' }}
      >
        {preset.name}
      </span>
      <div className="flex gap-1.5">
        {[preset.colors.primary, preset.colors.accent].map((c) => (
          <span
            key={c}
            className="inline-block h-3 w-3 rounded-full"
            style={{
              backgroundColor: c,
              border: '1px solid var(--surface-container-high)',
            }}
          />
        ))}
      </div>
    </button>
  );
}

/* ─── Mini Preview ──────────────────────────────────────────────────── */

function MiniPreview({
  mode,
  custom,
}: {
  mode: 'light' | 'dark';
  custom: CustomTheme;
}) {
  const bg = custom.surface ?? (mode === 'dark' ? DARK_DEFAULTS.background : '#f0f7fa');
  const cardBg = custom.surfaceContainer ?? (mode === 'dark' ? DARK_DEFAULTS.surface : '#ffffff');
  const primary = custom.primary ?? '#006571';
  const accent = custom.accent ?? '#58e7fb';
  const textColor = mode === 'dark' ? '#e2e4e6' : '#2c2f32';
  const subText = mode === 'dark' ? '#9a9da0' : '#595c5e';

  return (
    <div
      className="overflow-hidden rounded-[1.5rem] shadow-lg"
      style={{ background: bg, border: `1px solid ${mode === 'dark' ? '#333a40' : '#e5e8ec'}` }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3">
        <div className="h-5 w-5 rounded-full" style={{ background: primary }} />
        <div className="h-2.5 w-20 rounded-full" style={{ background: subText, opacity: 0.4 }} />
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 px-3 pb-3">
        <div
          className="rounded-xl p-3"
          style={{ background: cardBg, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        >
          <div className="mb-2 h-2 w-24 rounded-full" style={{ background: textColor, opacity: 0.2 }} />
          <div className="flex gap-2">
            <div className="h-6 flex-1 rounded-lg" style={{ background: primary, opacity: 0.9 }} />
            <div className="h-6 flex-1 rounded-lg" style={{ background: accent, opacity: 0.7 }} />
          </div>
        </div>
        <div className="flex gap-2">
          <div
            className="flex-1 rounded-xl p-3"
            style={{ background: cardBg, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
          >
            <div className="mb-1 h-2 w-12 rounded-full" style={{ background: subText, opacity: 0.3 }} />
            <div className="h-3 w-16 rounded-full" style={{ background: primary, opacity: 0.7 }} />
          </div>
          <div
            className="flex-1 rounded-xl p-3"
            style={{ background: cardBg, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
          >
            <div className="mb-1 h-2 w-12 rounded-full" style={{ background: subText, opacity: 0.3 }} />
            <div className="h-3 w-16 rounded-full" style={{ background: accent, opacity: 0.7 }} />
          </div>
        </div>
        {/* Button bar */}
        <div className="flex justify-center pt-1">
          <div
            className="h-7 w-24 rounded-full"
            style={{
              background: `linear-gradient(135deg, ${primary}, ${accent})`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ────────────────────────────────────────────────── */

export function ThemeSettingsForm() {
  const { mode, customTheme, setMode, setCustomTheme } = useTheme();
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [customColors, setCustomColors] = useState<CustomTheme>({
    mode: 'light',
    primary: '#006571',
    accent: '#58e7fb',
    surface: '#ffffff',
    surfaceContainer: '#eef1f4',
  });

  useEffect(() => {
    if (customTheme) {
      setCustomColors((prev) => ({
        ...prev,
        ...customTheme,
        mode,
      }));
      // Detect matching preset so the active indicator persists across page loads
      const matchingPreset = PRESETS.find(
        (p) => p.colors.primary === customTheme.primary,
      );
      setActivePreset(matchingPreset?.id ?? null);
    }
  }, [customTheme, mode]);

  const handlePresetSelect = useCallback(
    (preset: ThemePreset) => {
      setActivePreset(preset.id);
      const newCustom: CustomTheme = {
        mode,
        primary: preset.colors.primary,
        accent: preset.colors.accent,
        surface: mode === 'dark' ? DARK_DEFAULTS.background : preset.colors.background,
        surfaceContainer: mode === 'dark' ? DARK_DEFAULTS.surface : preset.colors.surface,
      };
      setCustomColors(newCustom);
      setCustomTheme(newCustom);
    },
    [mode, setCustomTheme],
  );

  const handleModeToggle = useCallback(() => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    const preset = activePreset
      ? PRESETS.find((p) => p.id === activePreset)
      : null;
    // Build the custom theme with mode-appropriate surface colors.
    // Primary/accent stay the same; surfaces swap between light preset
    // values and dark defaults.
    const newCustom: CustomTheme = {
      ...customColors,
      mode: newMode,
      surface: newMode === 'dark'
        ? DARK_DEFAULTS.background
        : (preset?.colors.background ?? '#f0f7fa'),
      surfaceContainer: newMode === 'dark'
        ? DARK_DEFAULTS.surface
        : (preset?.colors.surface ?? '#ffffff'),
    };
    setCustomColors(newCustom);
    // Pass both mode and custom theme together to avoid stale closures
    setMode(newMode, newCustom);
  }, [mode, activePreset, customColors, setMode]);

  const handleCustomColorChange = useCallback(
    (field: keyof CustomTheme, value: string) => {
      setActivePreset(null);
      setCustomColors((prev) => {
        const next = { ...prev, [field]: value, mode };
        setCustomTheme(next);
        return next;
      });
    },
    [mode, setCustomTheme],
  );

  const handleResetDefaults = useCallback(() => {
    setActivePreset('ocean');
    const preset = PRESETS[0];
    const newCustom: CustomTheme = {
      mode: 'light',
      primary: preset.colors.primary,
      accent: preset.colors.accent,
      surface: preset.colors.background,
      surfaceContainer: preset.colors.surface,
    };
    setCustomColors(newCustom);
    setMode('light', newCustom);
  }, [setMode]);

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: '28px',
            color: 'var(--secondary)',
            fontVariationSettings: '"FILL" 1',
          }}
        >
          palette
        </span>
        <h2
          className="font-headline text-2xl font-bold"
          style={{ color: 'var(--on-surface)' }}
        >
          Theme & Appearance
        </h2>
      </div>

      {/* Mode Toggle */}
      <div
        className="glass-card flex items-center justify-between rounded-[3rem] p-6"
        style={{ background: 'var(--surface-container-lowest)' }}
      >
        <div className="flex items-center gap-3">
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: '24px',
              color: mode === 'light' ? '#f59e0b' : '#6366f1',
              fontVariationSettings: '"FILL" 1',
            }}
          >
            {mode === 'light' ? 'light_mode' : 'dark_mode'}
          </span>
          <div>
            <span
              className="font-headline text-base font-semibold"
              style={{ color: 'var(--on-surface)' }}
            >
              {mode === 'light' ? 'Light Mode' : 'Dark Mode'}
            </span>
            <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>
              Toggle between light and dark appearance
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleModeToggle}
          className="relative flex items-center gap-1 rounded-full p-1 transition-colors"
          style={{
            width: '80px',
            height: '40px',
            background: mode === 'light'
              ? 'linear-gradient(135deg, #fbbdff, #f59e0b20)'
              : 'linear-gradient(135deg, #1a1f23, #333a40)',
            border: '1px solid var(--outline-variant)',
          }}
          role="switch"
          aria-checked={mode === 'dark'}
          aria-label="Toggle dark mode"
        >
          <span
            className="absolute flex items-center justify-center rounded-full bg-white shadow-md transition-all"
            style={{
              width: '32px',
              height: '32px',
              left: mode === 'light' ? '4px' : '44px',
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: '18px',
                color: mode === 'light' ? '#f59e0b' : '#6366f1',
                fontVariationSettings: '"FILL" 1',
              }}
            >
              {mode === 'light' ? 'light_mode' : 'dark_mode'}
            </span>
          </span>
        </button>
      </div>

      {/* Preset Themes */}
      <div className="flex flex-col gap-4">
        <h3
          className="font-headline text-lg font-semibold"
          style={{ color: 'var(--on-surface)' }}
        >
          Preset Themes
        </h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {PRESETS.map((preset, index) => (
            <PresetCard
              key={preset.id}
              preset={preset}
              active={activePreset === preset.id}
              isDark={mode === 'dark'}
              onClick={() => handlePresetSelect(preset)}
            />
          ))}
        </div>
      </div>

      {/* Custom Color Picker */}
      <div
        className="glass-card flex flex-col gap-5 rounded-[3rem] p-6"
        style={{ background: 'var(--surface-container-lowest)' }}
      >
        <div className="flex items-center gap-3">
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: '22px',
              color: 'var(--tertiary)',
              fontVariationSettings: '"FILL" 1',
            }}
          >
            tune
          </span>
          <h3
            className="font-headline text-lg font-semibold"
            style={{ color: 'var(--on-surface)' }}
          >
            Custom Colors
          </h3>
          {activePreset && (
            <span
              className="rounded-full px-2 py-0.5 text-xs font-medium"
              style={{
                background: 'var(--primary-container)',
                color: 'var(--on-primary-container)',
              }}
            >
              Using {PRESETS.find((p) => p.id === activePreset)?.name}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <ColorInput
            id="custom-primary"
            label="Primary"
            value={customColors.primary ?? '#006571'}
            onChange={(v) => handleCustomColorChange('primary', v)}
          />
          <ColorInput
            id="custom-accent"
            label="Accent"
            value={customColors.accent ?? '#58e7fb'}
            onChange={(v) => handleCustomColorChange('accent', v)}
          />
          <ColorInput
            id="custom-bg"
            label="Background"
            value={customColors.surface ?? '#f0f7fa'}
            onChange={(v) => handleCustomColorChange('surface', v)}
          />
          <ColorInput
            id="custom-card"
            label="Card BG"
            value={customColors.surfaceContainer ?? '#ffffff'}
            onChange={(v) => handleCustomColorChange('surfaceContainer', v)}
          />
        </div>

        <button
          type="button"
          onClick={handleResetDefaults}
          className="flex items-center gap-2 self-start rounded-full px-5 py-2.5 text-sm font-semibold transition-transform active:scale-95"
          style={{
            background: 'var(--surface-container-low)',
            color: 'var(--on-surface-variant)',
            border: '1px solid var(--outline-variant)',
            minHeight: '40px',
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '18px' }}
          >
            restart_alt
          </span>
          Reset to Defaults
        </button>
      </div>

      {/* Real-time Preview */}
      <div className="flex flex-col gap-4">
        <h3
          className="font-headline text-lg font-semibold"
          style={{ color: 'var(--on-surface)' }}
        >
          Live Preview
        </h3>
        <div className="max-w-xs">
          <MiniPreview mode={mode} custom={customColors} />
        </div>
      </div>
    </div>
  );
}
