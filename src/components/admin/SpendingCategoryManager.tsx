'use client';

import { useState, useEffect, useCallback } from 'react';

interface KidRecord {
  id: string;
  name: string;
  avatarUrl: string | null;
  themeColor: string;
}

interface SpendingCategory {
  id: string;
  kidId: string;
  name: string;
  balance: number;
  percentage: number;
  active: boolean;
}

interface CategoryFormItem {
  name: string;
  percentage: string;
  active: boolean;
}

const DEFAULT_CATEGORIES: CategoryFormItem[] = [
  { name: 'Save', percentage: '40', active: true },
  { name: 'Spend', percentage: '40', active: true },
  { name: 'Give', percentage: '20', active: true },
];

const JAR_ICONS: Record<string, string> = {
  save: 'savings',
  spend: 'payments',
  give: 'volunteer_activism',
  share: 'share',
  donate: 'favorite',
  invest: 'trending_up',
};

const JAR_COLORS: Record<string, { bar: string; bg: string; text: string }> = {
  save: { bar: 'var(--primary)', bg: 'var(--primary-container)', text: 'var(--on-primary-container)' },
  spend: { bar: 'var(--tertiary)', bg: 'var(--tertiary-container)', text: 'var(--on-tertiary-container)' },
  give: { bar: 'var(--secondary)', bg: 'var(--secondary-container)', text: 'var(--on-secondary-container)' },
};

function getJarIcon(name: string): string {
  const lower = name.toLowerCase().trim();
  for (const [key, icon] of Object.entries(JAR_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return 'account_balance_wallet';
}

function getJarColor(name: string, index: number) {
  const lower = name.toLowerCase().trim();
  for (const [key, colors] of Object.entries(JAR_COLORS)) {
    if (lower.includes(key)) return colors;
  }
  const fallback = [
    JAR_COLORS.save,
    JAR_COLORS.spend,
    JAR_COLORS.give,
  ];
  return fallback[index % fallback.length];
}

interface SpendingCategoryManagerProps {
  kidId: string;
}

export function SpendingCategoryManager({ kidId }: SpendingCategoryManagerProps) {
  const [kid, setKid] = useState<KidRecord | null>(null);
  const [categories, setCategories] = useState<SpendingCategory[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formItems, setFormItems] = useState<CategoryFormItem[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [kidsRes, catsRes] = await Promise.all([
        fetch('/api/kids'),
        fetch(`/api/spending-categories?kidId=${kidId}`),
      ]);
      if (!kidsRes.ok) throw new Error('Failed to load kids');
      if (!catsRes.ok) throw new Error('Failed to load categories');
      const kidsData = (await kidsRes.json()) as KidRecord[];
      const catsData = await catsRes.json();
      const cats = (catsData.categories ?? []) as SpendingCategory[];
      setKid(kidsData.find((k) => k.id === kidId) ?? null);
      setCategories(cats);
      setEnabled(cats.length > 0);
      setFormItems(cats.length > 0
        ? cats.map((c) => ({ name: c.name, percentage: String(c.percentage), active: c.active !== false }))
        : DEFAULT_CATEGORIES
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [kidId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleToggleEnabled = useCallback(async () => {
    const newEnabled = !enabled;
    setSuccessMsg(null);
    setFormError(null);
    setIsSaving(true);
    try {
      if (!newEnabled) {
        const res = await fetch('/api/spending-categories', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kidId, enabled: false, categories: [] }),
        });
        if (!res.ok) throw new Error('Failed to disable categories');
        setEnabled(false);
        setCategories([]);
        setSuccessMsg('Spending categories disabled');
      } else {
        const res = await fetch('/api/spending-categories', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kidId, enabled: true, categories: [] }),
        });
        if (!res.ok) throw new Error('Failed to enable categories');
        setSuccessMsg('Spending categories enabled with defaults');
      }
      await fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save';
      setFormError(message);
    } finally {
      setIsSaving(false);
    }
  }, [enabled, kidId, fetchData]);

  const handleUpdateItem = useCallback((index: number, field: keyof CategoryFormItem, value: string | boolean) => {
    setSuccessMsg(null);
    setFormError(null);
    setFormItems((prev) => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  }, []);

  const handleAddItem = useCallback(() => {
    setFormItems((prev) => [...prev, { name: '', percentage: '', active: true }]);
  }, []);

  const handleRemoveItem = useCallback((index: number) => {
    setFormItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleAutoBalance = useCallback(() => {
    const count = formItems.length;
    if (count === 0) return;
    const base = Math.floor(100 / count);
    const remainder = 100 - base * count;
    setFormItems((prev) => prev.map((item, i) => ({
      ...item,
      percentage: String(i === 0 ? base + remainder : base),
    })));
    setFormError(null);
    setSuccessMsg(null);
  }, [formItems.length]);

  const handleSaveCategories = useCallback(async () => {
    setSuccessMsg(null);
    setFormError(null);

    const parsed = formItems.map((item) => ({
      name: item.name.trim(),
      percentage: parseInt(item.percentage, 10),
      active: item.active,
    }));

    for (const cat of parsed) {
      if (!cat.name || cat.name.length > 50) {
        setFormError('Each category needs a name (1-50 chars)');
        return;
      }
      if (isNaN(cat.percentage) || cat.percentage < 1 || cat.percentage > 100) {
        setFormError('Each percentage must be 1-100');
        return;
      }
    }

    const total = parsed.reduce((sum, c) => sum + c.percentage, 0);
    if (total !== 100) {
      setFormError(`Percentages must total 100% (currently ${total}%)`);
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/spending-categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kidId, enabled: true, categories: parsed }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? 'Failed to save categories');
      }
      setSuccessMsg('Categories saved!');
      setIsEditing(false);
      await fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save';
      setFormError(message);
    } finally {
      setIsSaving(false);
    }
  }, [formItems, kidId, fetchData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <span
          className="material-symbols-outlined animate-voice-spin"
          style={{ fontSize: '28px', color: 'var(--primary)' }}
        >
          progress_activity
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <span
          className="material-symbols-outlined"
          style={{ fontSize: '32px', color: 'var(--error)' }}
        >
          error
        </span>
        <p className="text-sm font-medium" style={{ color: 'var(--error)' }}>{error}</p>
        <button
          type="button"
          onClick={fetchData}
          className="rounded-full bg-action-gradient px-6 text-sm font-semibold text-white transition-transform active:scale-95"
          style={{ minHeight: '48px' }}
        >
          Retry
        </button>
      </div>
    );
  }

  const percentageTotal = formItems.reduce((sum, item) => {
    const n = parseInt(item.percentage, 10);
    return sum + (isNaN(n) ? 0 : n);
  }, 0);
  const totalBalance = categories.reduce((sum, c) => sum + c.balance, 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Kid Header */}
      {kid && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{
                backgroundColor: kid.themeColor,
                boxShadow: `0 2px 12px ${kid.themeColor}40`,
              }}
            >
              {kid.avatarUrl ? (
                <img src={kid.avatarUrl} alt={kid.name} className="h-full w-full rounded-full object-cover" />
              ) : (
                kid.name.charAt(0).toUpperCase()
              )}
            </span>
            <h3
              className="font-headline text-lg font-bold"
              style={{ color: 'var(--on-surface)' }}
            >
              {kid.name}&apos;s Spending Jars
            </h3>
          </div>
          <button
            type="button"
            onClick={handleToggleEnabled}
            disabled={isSaving}
            className="rounded-full px-4 text-sm font-semibold transition-transform active:scale-95 disabled:opacity-50"
            style={{
              minHeight: '48px',
              color: enabled ? 'var(--on-error-container)' : 'var(--on-primary)',
              background: enabled ? 'var(--error-container)' : 'var(--primary)',
            }}
          >
            {isSaving ? 'Saving\u2026' : enabled ? 'Disable' : 'Enable'}
          </button>
        </div>
      )}

      {/* Disabled State */}
      {!enabled && (
        <div
          className="flex flex-col items-center gap-3 rounded-[3rem] py-8"
          style={{ background: 'var(--surface-container-low)' }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '40px', color: 'var(--outline-variant)', fontVariationSettings: '"FILL" 1' }}
          >
            account_balance_wallet
          </span>
          <p className="text-sm font-medium" style={{ color: 'var(--on-surface-variant)' }}>
            Categories disabled — all earnings go to a unified balance.
          </p>
        </div>
      )}

      {/* Enabled: Visual Jar Summary */}
      {enabled && !isEditing && categories.length > 0 && (
        <>
          {/* Stacked Bar Visualization */}
          <div
            className="rounded-[3rem] p-5"
            style={{
              background: 'var(--surface-container-lowest)',
              border: '1px solid var(--surface-container-high)',
              boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold" style={{ color: 'var(--on-surface-variant)' }}>
                Allocation Overview
              </p>
              {totalBalance > 0 && (
                <p className="font-headline text-lg font-bold" style={{ color: 'var(--on-surface)' }}>
                  ${totalBalance.toFixed(2)}
                </p>
              )}
            </div>

            {/* Stacked Bar */}
            <div className="flex h-6 w-full overflow-hidden rounded-full" style={{ background: 'var(--surface-container-high)' }}>
              {categories.map((cat, index) => {
                const colors = getJarColor(cat.name, index);
                return (
                  <div
                    key={cat.id}
                    className="h-full transition-all duration-500"
                    style={{
                      width: `${cat.percentage}%`,
                      background: colors.bar,
                      opacity: cat.active ? 1 : 0.4,
                    }}
                    title={`${cat.name}: ${cat.percentage}%`}
                  />
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-3 flex flex-wrap gap-3">
              {categories.map((cat, index) => {
                const colors = getJarColor(cat.name, index);
                return (
                  <div key={cat.id} className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ background: colors.bar }}
                    />
                    <span className="text-xs font-medium" style={{ color: 'var(--on-surface-variant)' }}>
                      {cat.name} ({cat.percentage}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Category Cards */}
          <div className="flex flex-col gap-3">
            {categories.map((cat, index) => {
              const colors = getJarColor(cat.name, index);
              const icon = getJarIcon(cat.name);

              return (
                <div
                  key={cat.id}
                  className="animate-card-entrance flex items-center gap-4 rounded-[3rem] p-4"
                  style={{
                    background: 'var(--surface-container-lowest)',
                    border: '1px solid var(--surface-container-high)',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                    opacity: cat.active ? 1 : 0.5,
                    animationDelay: `${index * 60}ms`,
                    animationFillMode: 'backwards',
                  }}
                >
                  {/* Jar Icon */}
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
                    style={{ background: colors.bg }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: '24px', color: colors.text, fontVariationSettings: '"FILL" 1' }}
                    >
                      {icon}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h4
                      className="font-headline text-base font-bold"
                      style={{ color: 'var(--on-surface)' }}
                    >
                      {cat.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-sm font-medium" style={{ color: 'var(--on-surface-variant)' }}>
                        {cat.percentage}% allocation
                      </span>
                      <span
                        className="inline-block h-1 w-1 rounded-full"
                        style={{ background: 'var(--outline-variant)' }}
                      />
                      <span className="text-sm font-bold" style={{ color: colors.bar }}>
                        ${cat.balance.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Percentage Badge */}
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-headline text-sm font-bold"
                    style={{ background: colors.bg, color: colors.text }}
                  >
                    {cat.percentage}%
                  </div>
                </div>
              );
            })}
          </div>

          {/* Edit Button */}
          <button
            type="button"
            onClick={() => { setIsEditing(true); setFormError(null); setSuccessMsg(null); }}
            className="flex items-center justify-center gap-2 rounded-full font-semibold transition-transform active:scale-95"
            style={{
              minHeight: '48px',
              background: 'var(--surface-container-low)',
              color: 'var(--on-surface-variant)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              edit
            </span>
            Edit Categories
          </button>
        </>
      )}

      {/* Edit Mode */}
      {enabled && isEditing && (
        <div
          className="animate-bounce-in rounded-[3rem] p-5"
          style={{
            background: 'var(--surface-container-lowest)',
            border: '1px solid var(--surface-container-high)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          }}
        >
          <h4
            className="mb-4 font-headline text-lg font-bold"
            style={{ color: 'var(--on-surface)' }}
          >
            Edit Categories
          </h4>

          <div className="flex flex-col gap-3">
            {formItems.map((item, index) => {
              const colors = getJarColor(item.name || 'default', index);
              return (
                <div
                  key={index}
                  className="flex items-center gap-3 rounded-2xl p-3"
                  style={{ background: 'var(--surface-container-low)' }}
                >
                  {/* Color Indicator */}
                  <span
                    className="inline-block h-8 w-1 shrink-0 rounded-full"
                    style={{ background: colors.bar }}
                  />

                  {/* Name Input */}
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => handleUpdateItem(index, 'name', e.target.value)}
                    maxLength={50}
                    placeholder="Category name"
                    className="flex-1 rounded-full px-3 py-2 text-sm outline-none"
                    style={{
                      background: 'var(--surface-container-lowest)',
                      color: 'var(--on-surface)',
                      border: '1px solid var(--outline-variant)',
                      minHeight: '48px',
                    }}
                  />

                  {/* Percentage Input */}
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={item.percentage}
                      onChange={(e) => handleUpdateItem(index, 'percentage', e.target.value)}
                      min="1"
                      max="100"
                      className="w-16 rounded-full px-2 py-2 text-center text-sm outline-none"
                      style={{
                        background: 'var(--surface-container-lowest)',
                        color: 'var(--on-surface)',
                        border: '1px solid var(--outline-variant)',
                        minHeight: '48px',
                      }}
                    />
                    <span className="text-sm font-medium" style={{ color: 'var(--on-surface-variant)' }}>%</span>
                  </div>

                  {/* Active Toggle */}
                  <button
                    type="button"
                    onClick={() => handleUpdateItem(index, 'active', !item.active)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-transform active:scale-90"
                    style={{
                      background: item.active ? 'var(--primary-container)' : 'var(--surface-container-high)',
                      color: item.active ? 'var(--on-primary-container)' : 'var(--outline)',
                    }}
                    aria-label={`${item.active ? 'Deactivate' : 'Activate'} ${item.name || 'category'}`}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: '20px', fontVariationSettings: '"FILL" 1' }}
                    >
                      {item.active ? 'toggle_on' : 'toggle_off'}
                    </span>
                  </button>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95"
                    style={{
                      background: 'var(--error-container)',
                      color: 'var(--on-error-container)',
                    }}
                    aria-label={`Remove ${item.name || 'category'}`}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                      close
                    </span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Add + Auto-Balance + Total */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1 rounded-full px-4 text-sm font-semibold transition-transform active:scale-95"
                style={{
                  minHeight: '48px',
                  background: 'var(--surface-container-low)',
                  color: 'var(--on-surface-variant)',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  add
                </span>
                Add
              </button>
              <button
                type="button"
                onClick={handleAutoBalance}
                className="flex items-center gap-1 rounded-full px-4 text-sm font-semibold transition-transform active:scale-95"
                style={{
                  minHeight: '48px',
                  background: 'var(--secondary-container)',
                  color: 'var(--on-secondary-container)',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  balance
                </span>
                Auto-Balance
              </button>
            </div>
            <span
              className="font-headline text-lg font-bold"
              style={{ color: percentageTotal === 100 ? 'var(--primary)' : 'var(--error)' }}
            >
              {percentageTotal}%
            </span>
          </div>

          {/* Validation Warning */}
          {percentageTotal !== 100 && (
            <div
              className="mt-3 flex items-center gap-2 rounded-2xl px-4 py-3"
              style={{ background: 'var(--error-container)', color: 'var(--on-error-container)' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px', fontVariationSettings: '"FILL" 1' }}>
                warning
              </span>
              <p className="text-sm font-medium">
                Total must equal 100% (currently {percentageTotal}%)
              </p>
            </div>
          )}

          {/* Form Error */}
          {formError && (
            <p className="mt-2 text-sm font-medium" style={{ color: 'var(--error)' }} role="alert">
              {formError}
            </p>
          )}

          {/* Success Message */}
          {successMsg && (
            <p className="mt-2 text-sm font-medium" style={{ color: 'var(--primary)' }} role="status">
              {successMsg}
            </p>
          )}

          {/* Action Buttons */}
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={handleSaveCategories}
              disabled={isSaving || percentageTotal !== 100}
              className="flex flex-1 items-center justify-center rounded-full bg-action-gradient font-semibold text-white transition-transform active:scale-95 disabled:opacity-50"
              style={{ minHeight: '48px' }}
            >
              {isSaving ? 'Saving\u2026' : 'Save Categories'}
            </button>
            <button
              type="button"
              onClick={() => { setIsEditing(false); setFormError(null); setSuccessMsg(null); }}
              className="rounded-full px-6 font-semibold transition-transform active:scale-95"
              style={{
                minHeight: '48px',
                background: 'var(--surface-container-low)',
                color: 'var(--on-surface-variant)',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Success toast (view mode) */}
      {successMsg && !isEditing && (
        <div
          className="flex items-center gap-2 rounded-2xl px-4 py-3"
          style={{ background: 'var(--primary-container)', color: 'var(--on-primary-container)' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px', fontVariationSettings: '"FILL" 1' }}>
            check_circle
          </span>
          <p className="text-sm font-semibold" role="status">{successMsg}</p>
        </div>
      )}
    </div>
  );
}
