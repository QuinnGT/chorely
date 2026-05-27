'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { EMOJI_CATALOG, groupByCategory, searchEmojis, type EmojiEntry } from '@/lib/emoji-suggester';

interface EmojiPickerProps {
  open: boolean;
  selected: string;
  recent?: readonly string[];
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export function EmojiPicker({ open, selected, recent = [], onSelect, onClose }: EmojiPickerProps) {
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
  const searchResults = useMemo<readonly EmojiEntry[]>(
    () => (isSearching ? searchEmojis(query) : EMOJI_CATALOG),
    [isSearching, query]
  );
  const grouped = useMemo(() => groupByCategory(EMOJI_CATALOG), []);

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
      aria-label="Pick an emoji"
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
            Pick an emoji
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
            placeholder="Search (e.g. trash, dog, dishes)"
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
                {recentDeduped.map((emoji) => (
                  <EmojiButton
                    key={`recent-${emoji}`}
                    emoji={emoji}
                    name={emoji}
                    selected={selected === emoji}
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
                  <EmojiButton
                    key={`${entry.emoji}-${i}`}
                    emoji={entry.emoji}
                    name={entry.name}
                    selected={selected === entry.emoji}
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
                    <EmojiButton
                      key={`${group.category}-${entry.emoji}-${i}`}
                      emoji={entry.emoji}
                      name={entry.name}
                      selected={selected === entry.emoji}
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

interface EmojiButtonProps {
  emoji: string;
  name: string;
  selected: boolean;
  onSelect: (emoji: string) => void;
}

function EmojiButton({ emoji, name, selected, onSelect }: EmojiButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(emoji)}
      className="flex h-11 w-11 items-center justify-center rounded-full text-xl transition-transform active:scale-90"
      style={{
        background: selected ? 'var(--secondary-container)' : 'var(--surface-container-low)',
        border: selected ? '2px solid var(--secondary)' : '2px solid transparent',
      }}
      title={name}
      aria-label={name}
    >
      {emoji}
    </button>
  );
}
