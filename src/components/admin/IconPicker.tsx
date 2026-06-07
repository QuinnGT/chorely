'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ICON_CATALOG, groupByCategory, searchIcons, type IconEntry } from '@/lib/icon-catalog';
import { ChoreIcon } from '@/components/ChoreIcon';

interface IconPickerProps {
  open: boolean;
  /** Currently selected icon ID. */
  selected: string;
  /** Recently used icon IDs. */
  recent?: readonly string[];
  onSelect: (iconId: string) => void;
  onClose: () => void;
}

export function IconPicker({ open, selected, recent = [], onSelect, onClose }: IconPickerProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setQuery('');
      return;
    }
    // focus search when opened
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const isSearching = query.trim() !== '';
  const searchResults = useMemo<readonly IconEntry[]>(
    () => (isSearching ? searchIcons(query) : ICON_CATALOG),
    [isSearching, query]
  );
  const grouped = useMemo(() => groupByCategory(ICON_CATALOG), []);

  // Map ID → display name for the "recently used" row (which only stores IDs).
  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of ICON_CATALOG) m.set(e.iconId, e.name);
    return m;
  }, []);

  // Dedupe recent against itself, drop empties
  const recentDeduped = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const e of recent) {
      if (e && !seen.has(e)) {
        seen.add(e);
        out.push(e);
      }
    }
    return out.slice(0, 12);
  }, [recent]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      style={{ background: 'rgba(0, 0, 0, 0.4)' }}
      onClick={onClose}
      role="dialog"
      aria-label="Pick an icon"
    >
      <div
        className="animate-bounce-in flex max-h-[80vh] w-full max-w-md flex-col rounded-t-[2rem] sm:rounded-[2rem]"
        style={{
          background: 'var(--surface-container-lowest)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.24)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b p-4" style={{ borderColor: 'var(--surface-container-high)' }}>
          <h3 className="flex-1 font-headline text-lg font-bold" style={{ color: 'var(--on-surface)' }}>
            Pick an icon
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full transition-colors active:bg-gray-100"
            style={{ color: 'var(--on-surface-variant)' }}
            aria-label="Close"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>close</span>
          </button>
        </div>

        {/* Search */}
        <div className="p-4 pb-2">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search (e.g. vacuum, garage, dishes)"
            className="w-full rounded-full px-4 py-3 text-base outline-none"
            style={{
              background: 'var(--surface-container-low)',
              color: 'var(--on-surface)',
              border: '1px solid var(--outline-variant)',
              minHeight: '48px',
            }}
          />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 pt-2">
          {recentDeduped.length > 0 && !isSearching && (
            <div className="mb-4">
              <SectionLabel>Recently used</SectionLabel>
              <div className="flex flex-wrap gap-2">
                {recentDeduped.map((iconId) => (
                  <IconButton
                    key={`recent-${iconId}`}
                    iconId={iconId}
                    name={nameById.get(iconId) ?? iconId}
                    selected={selected === iconId}
                    onSelect={onSelect}
                  />
                ))}
              </div>
            </div>
          )}

          {isSearching ? (
            searchResults.length === 0 ? (
              <p className="py-8 text-center text-sm" style={{ color: 'var(--on-surface-variant)' }}>
                No matches. Try a different word.
              </p>
            ) : (
              <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
                {searchResults.map((entry, i) => (
                  <IconButton
                    key={`${entry.iconId}-${i}`}
                    iconId={entry.iconId}
                    name={entry.name}
                    selected={selected === entry.iconId}
                    onSelect={onSelect}
                  />
                ))}
              </div>
            )
          ) : (
            grouped.map((group) => (
              <div key={group.category} className="mb-4 last:mb-0">
                <SectionLabel>{group.label}</SectionLabel>
                <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
                  {group.entries.map((entry, i) => (
                    <IconButton
                      key={`${group.category}-${entry.iconId}-${i}`}
                      iconId={entry.iconId}
                      name={entry.name}
                      selected={selected === entry.iconId}
                      onSelect={onSelect}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="mb-2 block text-xs font-medium uppercase tracking-wide"
      style={{ color: 'var(--on-surface-variant)' }}
    >
      {children}
    </span>
  );
}

interface IconButtonProps {
  iconId: string;
  name: string;
  selected: boolean;
  onSelect: (iconId: string) => void;
}

function IconButton({ iconId, name, selected, onSelect }: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(iconId)}
      className="flex h-11 w-11 items-center justify-center rounded-full text-xl transition-transform active:scale-90"
      style={{
        background: selected ? 'var(--secondary-container)' : 'var(--surface-container-low)',
        color: selected ? 'var(--on-secondary-container)' : 'var(--on-surface)',
        border: selected ? '2px solid var(--secondary)' : '2px solid transparent',
      }}
      title={name}
      aria-label={name}
    >
      <ChoreIcon value={iconId} />
    </button>
  );
}
