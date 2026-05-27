'use client';

import { useState } from 'react';
import {
  AVATAR_PRESETS,
  AVATAR_QUALITIES,
  AVATAR_STYLES,
  type PresetId,
  type QualityId,
  type StyleId,
} from '@/lib/avatar-presets';

interface Props {
  onClose: () => void;
  onSave: (url: string) => void;
}

export function GenerateAvatarModal({ onClose, onSave }: Props) {
  const [preset, setPreset] = useState<PresetId>('astronaut');
  const [style, setStyle] = useState<StyleId>('cartoon');
  const [quality, setQuality] = useState<QualityId>('fast');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/avatars/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preset, style, quality }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Generation failed' }));
        setError(err.error || 'Generation failed');
        return;
      }
      const { url } = await res.json();
      setPreviewUrl(url);
    } catch {
      setError('Failed to generate');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    if (previewUrl) {
      onSave(previewUrl);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="animate-bounce-in w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[3rem] p-8"
        style={{
          background: 'var(--surface-container-lowest)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold" style={{ color: 'var(--on-surface)' }}>
            Generate Avatar
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none"
            style={{ color: 'var(--on-surface-variant)' }}
          >
            ×
          </button>
        </div>

        <div className="mb-6">
          <div
            className="mb-2 text-sm font-medium"
            style={{ color: 'var(--on-surface-variant)' }}
          >
            Character
          </div>
          <div className="flex flex-wrap gap-2">
            {AVATAR_PRESETS.map((p) => {
              const selected = preset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPreset(p.id)}
                  className="rounded-full px-3 py-1.5 text-sm font-medium transition-transform active:scale-95"
                  style={{
                    background: selected
                      ? 'var(--primary)'
                      : 'var(--surface-container-low)',
                    color: selected ? 'var(--on-primary)' : 'var(--on-surface-variant)',
                    border: selected
                      ? '1px solid var(--primary)'
                      : '1px solid var(--outline-variant)',
                  }}
                >
                  {p.emoji} {p.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-6">
          <div
            className="mb-2 text-sm font-medium"
            style={{ color: 'var(--on-surface-variant)' }}
          >
            Style
          </div>
          <div className="flex flex-wrap gap-2">
            {AVATAR_STYLES.map((s) => {
              const selected = style === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStyle(s.id)}
                  className="rounded-full px-3 py-1.5 text-sm font-medium transition-transform active:scale-95"
                  style={{
                    background: selected
                      ? 'var(--primary)'
                      : 'var(--surface-container-low)',
                    color: selected ? 'var(--on-primary)' : 'var(--on-surface-variant)',
                    border: selected
                      ? '1px solid var(--primary)'
                      : '1px solid var(--outline-variant)',
                  }}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-6">
          <div
            className="mb-2 text-sm font-medium"
            style={{ color: 'var(--on-surface-variant)' }}
          >
            Speed
          </div>
          <div className="flex flex-wrap gap-2">
            {AVATAR_QUALITIES.map((q) => {
              const selected = quality === q.id;
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setQuality(q.id)}
                  className="rounded-full px-3 py-1.5 text-sm font-medium transition-transform active:scale-95"
                  style={{
                    background: selected
                      ? 'var(--primary)'
                      : 'var(--surface-container-low)',
                    color: selected ? 'var(--on-primary)' : 'var(--on-surface-variant)',
                    border: selected
                      ? '1px solid var(--primary)'
                      : '1px solid var(--outline-variant)',
                  }}
                  title={q.hint}
                >
                  {q.label}
                </button>
              );
            })}
          </div>
        </div>

        {previewUrl && (
          <div className="mb-6 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Generated avatar preview"
              className="h-48 w-48 rounded-3xl object-cover"
              style={{ border: '1px solid var(--outline-variant)' }}
            />
          </div>
        )}

        {error && (
          <div
            className="mb-4 rounded-2xl p-3 text-sm"
            style={{ background: 'var(--error-container)', color: 'var(--on-error-container)' }}
          >
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-transform active:scale-95 disabled:opacity-50"
            style={{
              background: 'var(--surface-container-low)',
              color: 'var(--on-surface-variant)',
              border: '1px solid var(--outline-variant)',
            }}
          >
            {isGenerating ? 'Generating…' : previewUrl ? 'Try Again' : 'Generate'}
          </button>
          {previewUrl && (
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-transform active:scale-95"
              style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}
            >
              Use This
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
