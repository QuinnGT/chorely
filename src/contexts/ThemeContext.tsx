'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

export interface CustomTheme {
  mode: 'light' | 'dark';
  primary?: string;
  accent?: string;
  surface?: string;
  surfaceContainer?: string;
}

interface ThemeContextValue {
  mode: 'light' | 'dark';
  customTheme: CustomTheme | null;
  setMode: (mode: 'light' | 'dark', customTheme?: CustomTheme | null) => void;
  setCustomTheme: (theme: CustomTheme | null) => void;
  applyTheme: (kidThemeColor?: string) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'app-theme';

function loadTheme(): { mode: 'light' | 'dark'; customTheme: CustomTheme | null } {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { mode: 'light', customTheme: null };
    const parsed = JSON.parse(stored);
    if (parsed.mode && (parsed.mode === 'light' || parsed.mode === 'dark')) {
      return {
        mode: parsed.mode,
        customTheme: parsed.customTheme || null,
      };
    }
    return { mode: 'light', customTheme: null };
  } catch {
    return { mode: 'light', customTheme: null };
  }
}

function saveTheme(mode: 'light' | 'dark', customTheme: CustomTheme | null): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode, customTheme }));
  } catch {
    // localStorage unavailable
  }
}

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [mode, setModeState] = useState<'light' | 'dark'>('light');
  const [customTheme, setCustomThemeState] = useState<CustomTheme | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const { mode: savedMode, customTheme: savedCustom } = loadTheme();
    setModeState(savedMode);
    setCustomThemeState(savedCustom);
    setIsHydrated(true);
    applyThemeToDOM(savedMode, savedCustom);
  }, []);

  // All CSS custom properties that custom themes may override via inline styles.
  // When cleared, these are removed so the :root / [data-theme] CSS rules apply.
  const CUSTOM_OVERRIDES = [
    '--primary', '--kid-primary', '--surface-tint',
    '--primary-container', '--primary-fixed', '--primary-fixed-dim',
    '--surface', '--surface-bright', '--background',
    '--surface-container-lowest',
  ];

  function applyThemeToDOM(newMode: 'light' | 'dark', custom: CustomTheme | null): void {
    const root = document.documentElement;
    root.setAttribute('data-theme', newMode);

    if (custom) {
      // Primary/accent identity colors apply in both modes
      if (custom.primary) {
        root.style.setProperty('--primary', custom.primary);
        root.style.setProperty('--kid-primary', custom.primary);
        root.style.setProperty('--surface-tint', custom.primary);
      }
      if (custom.accent) {
        root.style.setProperty('--primary-container', custom.accent);
        root.style.setProperty('--primary-fixed', custom.accent);
        root.style.setProperty('--primary-fixed-dim', custom.accent);
      }
      // Surface overrides only apply in light mode. In dark mode the
      // [data-theme="dark"] CSS rules handle surface colors — inline
      // values would override them and break dark mode.
      if (newMode === 'light') {
        if (custom.surface) {
          root.style.setProperty('--surface', custom.surface);
          root.style.setProperty('--surface-bright', custom.surface);
          root.style.setProperty('--background', custom.surface);
        }
        if (custom.surfaceContainer) {
          root.style.setProperty('--surface-container-lowest', custom.surfaceContainer);
        }
      } else {
        // Remove any lingering light-mode surface overrides
        root.style.removeProperty('--surface');
        root.style.removeProperty('--surface-bright');
        root.style.removeProperty('--background');
        root.style.removeProperty('--surface-container-lowest');
      }
    } else {
      // Remove all inline overrides so CSS :root / [data-theme] rules take effect
      for (const prop of CUSTOM_OVERRIDES) {
        root.style.removeProperty(prop);
      }
    }
  }

  const setMode = useCallback((newMode: 'light' | 'dark', newCustom?: CustomTheme | null) => {
    const custom = newCustom !== undefined ? newCustom : customTheme;
    setModeState(newMode);
    if (newCustom !== undefined) {
      setCustomThemeState(custom);
    }
    applyThemeToDOM(newMode, custom);
    saveTheme(newMode, custom);
  }, [customTheme]);

  const setCustomTheme = useCallback((newCustom: CustomTheme | null) => {
    setCustomThemeState(newCustom);
    applyThemeToDOM(mode, newCustom);
    saveTheme(mode, newCustom);
  }, [mode]);

  const applyTheme = useCallback((kidThemeColor?: string) => {
    if (kidThemeColor) {
      const root = document.documentElement;
      root.style.setProperty('--kid-primary', kidThemeColor);
    } else if (customTheme) {
      applyThemeToDOM(mode, customTheme);
    } else {
      applyThemeToDOM(mode, null);
    }
  }, [mode, customTheme]);

  if (!isHydrated) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ mode, customTheme, setMode, setCustomTheme, applyTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
