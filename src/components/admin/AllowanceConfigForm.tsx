'use client';

import { useState, useEffect, useCallback } from 'react';

interface AllowanceConfigFormProps {
  kidId: string;
  kidName: string;
  kidColor: string;
  kidAvatarUrl?: string | null;
}

interface AllowanceConfig {
  fullCompletionAmount: number;
  partialCompletionAmount: number;
  streakBonusAmount: number;
  minStreakDays: number;
}

const DEFAULT_CONFIG: AllowanceConfig = {
  fullCompletionAmount: 5.0,
  partialCompletionAmount: 3.0,
  streakBonusAmount: 3.0,
  minStreakDays: 7,
};

export function AllowanceConfigForm({ kidId, kidName, kidColor, kidAvatarUrl }: AllowanceConfigFormProps) {
  const [config, setConfig] = useState<AllowanceConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/allowance-config?kidId=${kidId}`);
      if (!res.ok) throw new Error('Failed to load allowance config');
      const data = await res.json();
      setConfig({
        fullCompletionAmount: Number(data.fullCompletionAmount ?? DEFAULT_CONFIG.fullCompletionAmount),
        partialCompletionAmount: Number(data.partialCompletionAmount ?? DEFAULT_CONFIG.partialCompletionAmount),
        streakBonusAmount: Number(data.streakBonusAmount ?? DEFAULT_CONFIG.streakBonusAmount),
        minStreakDays: Number(data.minStreakDays ?? DEFAULT_CONFIG.minStreakDays),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load config';
      setLoadError(message);
    } finally {
      setIsLoading(false);
    }
  }, [kidId]);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const handleFieldChange = useCallback((field: keyof AllowanceConfig, raw: string) => {
    setSuccessMsg(null);
    setFormError(null);
    const num = field === 'minStreakDays' ? parseInt(raw, 10) : parseFloat(raw);
    if (!isNaN(num)) {
      setConfig((prev) => ({ ...prev, [field]: num }));
    } else if (raw === '') {
      setConfig((prev) => ({ ...prev, [field]: 0 }));
    }
  }, []);

  const handleSave = useCallback(async () => {
    setFormError(null);
    setSuccessMsg(null);

    if (config.fullCompletionAmount < 0) {
      setFormError('Full completion amount must be 0 or more');
      return;
    }
    if (config.partialCompletionAmount < 0) {
      setFormError('Partial completion amount must be 0 or more');
      return;
    }
    if (config.partialCompletionAmount > config.fullCompletionAmount) {
      setFormError('Partial completion amount cannot exceed full completion amount');
      return;
    }
    if (config.streakBonusAmount < 0) {
      setFormError('Streak bonus must be 0 or more');
      return;
    }
    if (config.minStreakDays < 1 || config.minStreakDays > 365) {
      setFormError('Streak days must be between 1 and 365');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/allowance-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kidId, ...config }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? 'Failed to save');
      }
      setSuccessMsg('Allowance config saved!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save';
      setFormError(message);
    } finally {
      setIsSaving(false);
    }
  }, [config, kidId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <span
          className="material-symbols-outlined animate-voice-spin"
          style={{ fontSize: '24px', color: 'var(--primary)' }}
        >
          progress_activity
        </span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex items-center gap-2 py-4">
        <p className="text-sm" style={{ color: 'var(--error)' }}>{loadError}</p>
        <button
          type="button"
          onClick={fetchConfig}
          className="text-sm font-medium underline"
          style={{ color: 'var(--primary)' }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div
      className="animate-card-entrance rounded-[3rem] p-6"
      style={{
        background: 'var(--surface-container-lowest)',
        border: '1px solid var(--surface-container-high)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
      }}
    >
      {/* Kid Header */}
      <div className="mb-6 flex items-center gap-3">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white shadow-md"
          style={{
            backgroundColor: kidColor,
            boxShadow: `0 4px 16px ${kidColor}40`,
          }}
        >
          {kidAvatarUrl ? (
            <img
              src={kidAvatarUrl}
              alt={kidName}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            kidName.charAt(0).toUpperCase()
          )}
        </div>
        <div>
          <h3
            className="font-headline text-lg font-bold"
            style={{ color: 'var(--on-surface)' }}
          >
            {kidName}
          </h3>
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
            style={{ background: `${kidColor}18`, color: kidColor }}
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: kidColor }}
            />
            Allowance Config
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        {/* Full Completion Amount */}
        <div>
          <label
            htmlFor={`${kidId}-full-amount`}
            className="mb-1 block text-sm font-medium"
            style={{ color: 'var(--on-surface-variant)' }}
          >
            Full Completion Amount
          </label>
          <div className="flex items-center gap-2">
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '20px', color: 'var(--tertiary)', fontVariationSettings: '"FILL" 1' }}
            >
              paid
            </span>
            <div className="flex flex-1 items-center rounded-full px-4" style={{ background: 'var(--surface-container-low)', border: '1px solid var(--outline-variant)', minHeight: '48px' }}>
              <span className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>$</span>
              <input
                id={`${kidId}-full-amount`}
                type="number"
                step="0.01"
                min="0"
                value={config.fullCompletionAmount}
                onChange={(e) => handleFieldChange('fullCompletionAmount', e.target.value)}
                className="flex-1 bg-transparent px-2 text-base outline-none"
                style={{ color: 'var(--on-surface)' }}
              />
              <span className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>/ week</span>
            </div>
          </div>
        </div>

        {/* Partial Completion Amount */}
        <div>
          <label
            htmlFor={`${kidId}-partial-amount`}
            className="mb-1 block text-sm font-medium"
            style={{ color: 'var(--on-surface-variant)' }}
          >
            Partial Completion Amount
          </label>
          <div className="flex items-center gap-2">
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '20px', color: 'var(--secondary)', fontVariationSettings: '"FILL" 1' }}
            >
              toll
            </span>
            <div className="flex flex-1 items-center rounded-full px-4" style={{ background: 'var(--surface-container-low)', border: '1px solid var(--outline-variant)', minHeight: '48px' }}>
              <span className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>$</span>
              <input
                id={`${kidId}-partial-amount`}
                type="number"
                step="0.01"
                min="0"
                value={config.partialCompletionAmount}
                onChange={(e) => handleFieldChange('partialCompletionAmount', e.target.value)}
                className="flex-1 bg-transparent px-2 text-base outline-none"
                style={{ color: 'var(--on-surface)' }}
              />
              <span className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>/ week</span>
            </div>
          </div>
        </div>

        {/* Streak Bonus Amount */}
        <div>
          <label
            htmlFor={`${kidId}-streak-bonus`}
            className="mb-1 block text-sm font-medium"
            style={{ color: 'var(--on-surface-variant)' }}
          >
            Streak Bonus
          </label>
          <div className="flex items-center gap-2">
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '20px', color: 'var(--primary)', fontVariationSettings: '"FILL" 1' }}
            >
              local_fire_department
            </span>
            <div className="flex flex-1 items-center rounded-full px-4" style={{ background: 'var(--surface-container-low)', border: '1px solid var(--outline-variant)', minHeight: '48px' }}>
              <span className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>+$</span>
              <input
                id={`${kidId}-streak-bonus`}
                type="number"
                step="0.01"
                min="0"
                value={config.streakBonusAmount}
                onChange={(e) => handleFieldChange('streakBonusAmount', e.target.value)}
                className="flex-1 bg-transparent px-2 text-base outline-none"
                style={{ color: 'var(--on-surface)' }}
              />
            </div>
          </div>
        </div>

        {/* Min Streak Days */}
        <div>
          <label
            htmlFor={`${kidId}-streak-days`}
            className="mb-1 block text-sm font-medium"
            style={{ color: 'var(--on-surface-variant)' }}
          >
            Min Streak Days
          </label>
          <div className="flex items-center gap-2">
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '20px', color: 'var(--tertiary)', fontVariationSettings: '"FILL" 1' }}
            >
              calendar_month
            </span>
            <div className="flex flex-1 items-center rounded-full px-4" style={{ background: 'var(--surface-container-low)', border: '1px solid var(--outline-variant)', minHeight: '48px' }}>
              <input
                id={`${kidId}-streak-days`}
                type="number"
                step="1"
                min="1"
                max="365"
                value={config.minStreakDays}
                onChange={(e) => handleFieldChange('minStreakDays', e.target.value)}
                className="w-16 bg-transparent text-base outline-none"
                style={{ color: 'var(--on-surface)' }}
              />
              <span className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>days</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        {formError && (
          <p className="text-sm font-medium" style={{ color: 'var(--error)' }} role="alert">
            {formError}
          </p>
        )}
        {successMsg && (
          <p className="text-sm font-medium" style={{ color: 'var(--primary)' }} role="status">
            {successMsg}
          </p>
        )}

        {/* Save Button */}
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center justify-center gap-2 rounded-full bg-action-gradient font-semibold text-white transition-transform active:scale-95 disabled:opacity-50"
          style={{ minHeight: '48px' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
            save
          </span>
          {isSaving ? 'Saving\u2026' : 'Save'}
        </button>
      </div>
    </div>
  );
}
