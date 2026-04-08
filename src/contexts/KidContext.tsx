'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { useTheme } from './ThemeContext';

export interface Kid {
  id: string;
  name: string;
  avatarUrl: string | null;
  themeColor: string;
}

interface KidContextValue {
  selectedKid: Kid | null;
  isHydrated: boolean;
  selectKid: (kid: Kid) => void;
  clearKid: () => void;
}

const KidContext = createContext<KidContextValue | null>(null);

const STORAGE_KEY = 'selected-kid';

const THEME_MAP: Record<string, string> = {
  '#006571': 'teal',
  '#0d9488': 'teal',
  '#7c3aed': 'purple',
  '#f59e0b': 'amber',
  '#f43f5e': 'coral',
};

function getThemeName(hexColor: string): string {
  return THEME_MAP[hexColor.toLowerCase()] ?? 'teal';
}

function loadKidFromSession(): Kid | null {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed: unknown = JSON.parse(stored);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'id' in parsed &&
      'name' in parsed &&
      'themeColor' in parsed
    ) {
      return parsed as Kid;
    }
    return null;
  } catch {
    return null;
  }
}

interface KidContextProviderProps {
  children: ReactNode;
}

export function KidContextProvider({ children }: KidContextProviderProps) {
  const [selectedKid, setSelectedKid] = useState<Kid | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const { applyTheme } = useTheme();

  useEffect(() => {
    const stored = loadKidFromSession();
    if (stored) {
      setSelectedKid(stored);
      document.body.setAttribute('data-kid-theme', getThemeName(stored.themeColor));
      applyTheme(stored.themeColor);
    }
    setIsHydrated(true);
  }, [applyTheme]);

  const selectKid = useCallback((kid: Kid) => {
    setSelectedKid(kid);
    const theme = getThemeName(kid.themeColor);
    document.body.setAttribute('data-kid-theme', theme);
    applyTheme(kid.themeColor);
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(kid));
    } catch {
      // sessionStorage unavailable — continue without persistence
    }
  }, [applyTheme]);

  const clearKid = useCallback(() => {
    setSelectedKid(null);
    document.body.removeAttribute('data-kid-theme');
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // sessionStorage unavailable — continue
    }
  }, []);

  return (
    <KidContext.Provider value={{ selectedKid, isHydrated, selectKid, clearKid }}>
      {children}
    </KidContext.Provider>
  );
}

export function useKid(): KidContextValue {
  const context = useContext(KidContext);
  if (!context) {
    throw new Error('useKid must be used within a KidContextProvider');
  }
  return context;
}
