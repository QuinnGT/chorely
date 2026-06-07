'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { IconPicker } from './IconPicker';
import { suggestIcon, DEFAULT_CHORE_ICON } from '@/lib/icon-catalog';
import { ChoreIcon } from '@/components/ChoreIcon';
import type { ChoreFrequency, ChoreKind } from '@/lib/chore-types';

interface KidRecord {
  id: string;
  name: string;
  themeColor: string;
}

interface ChoreAssignment {
  id: string;
  kidId: string;
  kid: KidRecord;
}

interface ChoreRecord {
  id: string;
  name: string;
  icon: string;
  frequency: ChoreFrequency;
  kind: ChoreKind;
  description: string | null;
  rewardAmount: number;
  isActive: boolean;
  choreAssignments: ChoreAssignment[];
}

interface ChoreFormData {
  name: string;
  icon: string;
  frequency: ChoreFrequency;
  kind: ChoreKind;
  description: string;
  rewardAmount: string;
  assignedKidIds: string[];
}

const QUICK_ICONS = [
  'mdi:broom',
  'mdi:basket',
  'mdi:vacuum',
  'mdi:silverware-clean',
  'mdi:dog',
  'mdi:sprout',
  'mdi:bed',
  'mdi:trash-can-outline',
  'mdi:gift',
  'mdi:star',
];
const DEFAULT_ICON = DEFAULT_CHORE_ICON;

const EMPTY_FORM: ChoreFormData = {
  name: '',
  icon: DEFAULT_ICON,
  frequency: 'daily',
  kind: 'standard',
  description: '',
  rewardAmount: '10.00',
  assignedKidIds: [],
};

export function ChoreManager() {
  const [chores, setChores] = useState<ChoreRecord[]>([]);
  const [kids, setKids] = useState<KidRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<ChoreFormData>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  // Which way the row's "more" menu opens, so it stays on-screen near the page bottom.
  const [openMenuDir, setOpenMenuDir] = useState<'down' | 'up'>('down');
  const [pickerOpen, setPickerOpen] = useState(false);
  // Tracks whether the user has picked an icon explicitly; if so, we stop
  // auto-suggesting from the name. Reset on Add / set on Edit.
  const iconManuallySetRef = useRef(false);

  const recentIcons = useMemo(() => {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const c of chores) {
      if (c.icon && !seen.has(c.icon)) {
        seen.add(c.icon);
        out.push(c.icon);
      }
    }
    return out;
  }, [chores]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [choresRes, kidsRes] = await Promise.all([
        fetch('/api/chores?includeInactive=true'),
        fetch('/api/kids'),
      ]);
      if (!choresRes.ok) throw new Error('Failed to fetch chores');
      if (!kidsRes.ok) throw new Error('Failed to fetch kids');
      const choresData = (await choresRes.json()) as ChoreRecord[];
      const kidsData = (await kidsRes.json()) as KidRecord[];
      setChores(choresData);
      setKids(kidsData);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load data';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleOpenEdit = useCallback((chore: ChoreRecord) => {
    setFormData({
      name: chore.name,
      icon: chore.icon,
      frequency: chore.frequency,
      kind: chore.kind,
      description: chore.description ?? '',
      rewardAmount: chore.rewardAmount.toFixed(2),
      assignedKidIds: chore.choreAssignments.map((a) => a.kidId),
    });
    setEditingId(chore.id);
    setFormError(null);
    setOpenMenuId(null);
    iconManuallySetRef.current = true;
  }, []);

  const handleNameChange = useCallback((nextName: string) => {
    setFormData((prev) => {
      const next = { ...prev, name: nextName };
      if (!iconManuallySetRef.current) {
        const suggestion = suggestIcon(nextName);
        if (suggestion) next.icon = suggestion;
        else next.icon = DEFAULT_ICON;
      }
      return next;
    });
  }, []);

  const handlePickIcon = useCallback((icon: string) => {
    iconManuallySetRef.current = true;
    setFormData((prev) => ({ ...prev, icon }));
    setPickerOpen(false);
  }, []);

  // Toggle the row menu, opening it upward when there isn't room below the button.
  const handleToggleMenu = useCallback((choreId: string, btn: HTMLElement) => {
    if (openMenuId === choreId) {
      setOpenMenuId(null);
      return;
    }
    const rect = btn.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const MENU_HEIGHT = 200; // approx height of the 3-item menu
    setOpenMenuDir(spaceBelow < MENU_HEIGHT && rect.top > spaceBelow ? 'up' : 'down');
    setConfirmDeleteId(null);
    setOpenMenuId(choreId);
  }, [openMenuId]);

  const handleKindChange = useCallback((kind: ChoreKind) => {
    setFormData((prev) => ({
      ...prev,
      kind,
      frequency: kind === 'big_boss' ? 'weekly' : prev.frequency,
      rewardAmount: kind === 'big_boss' && Number(prev.rewardAmount) <= 0
        ? '10.00'
        : prev.rewardAmount,
    }));
  }, []);

  const handleCancel = useCallback(() => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setFormError(null);
  }, []);

  const handleToggleKid = useCallback((kidId: string) => {
    setFormData((prev) => {
      const has = prev.assignedKidIds.includes(kidId);
      return {
        ...prev,
        assignedKidIds: has
          ? prev.assignedKidIds.filter((id) => id !== kidId)
          : [...prev.assignedKidIds, kidId],
      };
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!formData.name.trim()) {
      setFormError('Name is required');
      return;
    }
    if (!formData.icon.trim()) {
      setFormError('Pick an emoji');
      return;
    }
    if (formData.assignedKidIds.length === 0) {
      setFormError('Assign to at least one kid');
      return;
    }
    const rewardAmount = Number(formData.rewardAmount);
    if (
      formData.kind === 'big_boss' &&
      (!Number.isFinite(rewardAmount) || rewardAmount <= 0)
    ) {
      setFormError('Big Boss reward must be greater than 0');
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      const payload = {
        name: formData.name.trim(),
        icon: formData.icon.trim(),
        frequency: formData.kind === 'big_boss' ? 'weekly' : formData.frequency,
        kind: formData.kind,
        description: formData.kind === 'big_boss'
          ? formData.description.trim() || null
          : null,
        rewardAmount: formData.kind === 'big_boss'
          ? Math.round(rewardAmount * 100) / 100
          : 0,
        assignedKidIds: formData.assignedKidIds,
      };

      if (editingId) {
        const res = await fetch(`/api/chores/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to update chore');
      } else {
        const res = await fetch('/api/chores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to create chore');
      }

      setEditingId(null);
      setFormData(EMPTY_FORM);
      await fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save';
      setFormError(message);
    } finally {
      setIsSaving(false);
    }
  }, [formData, editingId, fetchData]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/chores/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete chore');
      setConfirmDeleteId(null);
      setOpenMenuId(null);
      await fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete';
      setError(message);
    }
  }, [fetchData]);

  const handleToggleActive = useCallback(async (chore: ChoreRecord) => {
    try {
      const res = await fetch(`/api/chores/${chore.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !chore.isActive }),
      });
      if (!res.ok) throw new Error('Failed to update chore');
      setOpenMenuId(null);
      await fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update';
      setError(message);
    }
  }, [fetchData]);

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

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <span
          className="material-symbols-outlined"
          style={{ fontSize: '40px', color: 'var(--error)' }}
        >
          error
        </span>
        <p style={{ color: 'var(--error)' }}>{error}</p>
        <button
          type="button"
          onClick={fetchData}
          className="rounded-full bg-action-gradient px-6 font-semibold text-white transition-transform active:scale-95"
          style={{ minHeight: '48px' }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: '28px',
            color: 'var(--primary)',
            fontVariationSettings: '"FILL" 1',
          }}
        >
          assignment
        </span>
        <h2
          className="font-headline text-2xl font-bold"
          style={{ color: 'var(--on-surface)' }}
        >
          Chore Manager
        </h2>
      </div>

      {/* Two-Column Layout */}
      <div className="flex flex-col gap-6 md:flex-row">
        {/* Left Column: Quick Add Form */}
        <div className="md:w-2/5 md:shrink-0">
          <div
            className="rounded-[3rem] p-6"
            style={{
              background: 'var(--surface-container-lowest)',
              border: '1px solid var(--surface-container-high)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
            }}
          >
            <h3
              className="mb-4 font-headline text-lg font-bold"
              style={{ color: 'var(--on-surface)' }}
            >
              {editingId ? 'Edit Chore' : 'Quick Add Task'}
            </h3>

            <div className="flex flex-col gap-4">
              {/* Emoji Picker */}
              <div>
                <div className="mb-2 flex items-baseline justify-between">
                  <span
                    className="block text-sm font-medium"
                    style={{ color: 'var(--on-surface-variant)' }}
                  >
                    Emoji
                  </span>
                  {!iconManuallySetRef.current && formData.name.trim() !== '' && (
                    <span
                      className="text-xs"
                      style={{ color: 'var(--on-surface-variant)' }}
                    >
                      Auto-picked
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="no-scrollbar flex flex-1 gap-2 overflow-x-auto pb-1">
                    {/* Current selection always pinned first if not in quick set */}
                    {!QUICK_ICONS.includes(formData.icon) && (
                      <button
                        key={`current-${formData.icon}`}
                        type="button"
                        onClick={() => setPickerOpen(true)}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl"
                        style={{
                          background: 'var(--secondary-container)',
                          color: 'var(--on-secondary-container)',
                          border: '2px solid var(--secondary)',
                        }}
                        aria-label="Current icon — tap to change"
                      >
                        <ChoreIcon value={formData.icon} />
                      </button>
                    )}
                    {QUICK_ICONS.map((iconId) => (
                      <button
                        key={iconId}
                        type="button"
                        onClick={() => handlePickIcon(iconId)}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl transition-transform active:scale-90"
                        style={{
                          background: formData.icon === iconId
                            ? 'var(--secondary-container)'
                            : 'var(--surface-container-low)',
                          color: formData.icon === iconId
                            ? 'var(--on-secondary-container)'
                            : 'var(--on-surface)',
                          border: formData.icon === iconId
                            ? '2px solid var(--secondary)'
                            : '2px solid transparent',
                        }}
                      >
                        <ChoreIcon value={iconId} />
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setPickerOpen(true)}
                    className="flex h-10 shrink-0 items-center gap-1 rounded-full px-3 text-sm font-medium transition-transform active:scale-95"
                    style={{
                      background: 'var(--surface-container-low)',
                      color: 'var(--on-surface-variant)',
                      border: '1px solid var(--outline-variant)',
                    }}
                    aria-label="Browse all icons"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                      search
                    </span>
                    More
                  </button>
                </div>
              </div>

              {/* Name Input */}
              <div>
                <label
                  htmlFor="chore-name"
                  className="mb-1 block text-sm font-medium"
                  style={{ color: 'var(--on-surface-variant)' }}
                >
                  Chore Name
                </label>
                <input
                  id="chore-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full rounded-full px-4 py-3 text-base outline-none"
                  style={{
                    background: 'var(--surface-container-low)',
                    color: 'var(--on-surface)',
                    border: '1px solid var(--outline-variant)',
                    minHeight: '48px',
                  }}
                  placeholder="e.g. Clean your room"
                />
              </div>

              {/* Chore Type */}
              <div>
                <span
                  className="mb-2 block text-sm font-medium"
                  style={{ color: 'var(--on-surface-variant)' }}
                >
                  Chore Type
                </span>
                <div
                  className="grid grid-cols-2 gap-1 rounded-full p-1"
                  style={{ background: 'var(--surface-container-low)' }}
                >
                  {([
                    { kind: 'standard' as const, label: 'Standard', icon: 'checklist' },
                    { kind: 'big_boss' as const, label: 'Big Boss', icon: 'workspace_premium' },
                  ]).map((option) => (
                    <button
                      key={option.kind}
                      type="button"
                      onClick={() => handleKindChange(option.kind)}
                      className="flex items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition-all"
                      style={{
                        minHeight: '48px',
                        color: formData.kind === option.kind
                          ? 'var(--on-primary)'
                          : 'var(--on-surface-variant)',
                        background: formData.kind === option.kind
                          ? 'var(--primary)'
                          : 'transparent',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                        {option.icon}
                      </span>
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Frequency Toggle */}
              <div>
                <span
                  className="mb-2 block text-sm font-medium"
                  style={{ color: 'var(--on-surface-variant)' }}
                >
                  Frequency
                </span>
                {formData.kind === 'big_boss' ? (
                  <div
                    className="flex min-h-12 items-center gap-2 rounded-full px-4 text-sm font-semibold"
                    style={{
                      background: 'var(--tertiary-container)',
                      color: 'var(--on-tertiary-container)',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                      event_repeat
                    </span>
                    Weekly
                  </div>
                ) : (
                  <div
                    className="flex rounded-full p-1"
                    style={{ background: 'var(--surface-container-low)' }}
                  >
                    {(['daily', 'weekly'] as const).map((freq) => (
                      <button
                        key={freq}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, frequency: freq }))}
                        className="flex-1 rounded-full py-2 text-sm font-semibold transition-all"
                        style={{
                          minHeight: '48px',
                          color: formData.frequency === freq
                            ? 'var(--on-primary)'
                            : 'var(--on-surface-variant)',
                          background: formData.frequency === freq
                            ? 'var(--primary)'
                            : 'transparent',
                        }}
                      >
                        {freq.charAt(0).toUpperCase() + freq.slice(1)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {formData.kind === 'big_boss' && (
                <>
                  <div>
                    <label
                      htmlFor="boss-description"
                      className="mb-1 block text-sm font-medium"
                      style={{ color: 'var(--on-surface-variant)' }}
                    >
                      Quest Details
                    </label>
                    <textarea
                      id="boss-description"
                      value={formData.description}
                      onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                      className="w-full resize-none rounded-3xl px-4 py-3 text-base outline-none"
                      style={{
                        background: 'var(--surface-container-low)',
                        color: 'var(--on-surface)',
                        border: '1px solid var(--outline-variant)',
                        minHeight: '92px',
                      }}
                      maxLength={240}
                      placeholder="e.g. Clean the garage with Dad"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="boss-reward"
                      className="mb-1 block text-sm font-medium"
                      style={{ color: 'var(--on-surface-variant)' }}
                    >
                      Bonus Reward
                    </label>
                    <div className="relative">
                      <span
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-semibold"
                        style={{ color: 'var(--on-surface-variant)' }}
                      >
                        $
                      </span>
                      <input
                        id="boss-reward"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={formData.rewardAmount}
                        onChange={(e) => setFormData((prev) => ({ ...prev, rewardAmount: e.target.value }))}
                        className="w-full rounded-full py-3 pl-8 pr-4 text-base outline-none"
                        style={{
                          background: 'var(--surface-container-low)',
                          color: 'var(--on-surface)',
                          border: '1px solid var(--outline-variant)',
                          minHeight: '48px',
                        }}
                        placeholder="10.00"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Assign To */}
              <div>
                <span
                  className="mb-2 block text-sm font-medium"
                  style={{ color: 'var(--on-surface-variant)' }}
                >
                  Assign To
                </span>
                <div className="flex flex-wrap gap-2">
                  {kids.map((kid) => {
                    const selected = formData.assignedKidIds.includes(kid.id);
                    return (
                      <button
                        key={kid.id}
                        type="button"
                        onClick={() => handleToggleKid(kid.id)}
                        className="flex items-center gap-2 rounded-full px-4 font-medium transition-all active:scale-95"
                        style={{
                          minHeight: '48px',
                          color: selected ? 'white' : 'var(--on-surface-variant)',
                          background: selected ? kid.themeColor : 'var(--surface-container-low)',
                        }}
                      >
                        {selected && (
                          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                            check
                          </span>
                        )}
                        {kid.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {formError && (
                <p className="text-sm font-medium" style={{ color: 'var(--error)' }} role="alert">
                  {formError}
                </p>
              )}

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSaving}
                  className="flex flex-1 items-center justify-center rounded-full bg-action-gradient font-semibold text-white transition-transform active:scale-95 disabled:opacity-50"
                  style={{ minHeight: '48px' }}
                >
                  {isSaving ? 'Saving\u2026' : editingId ? 'Update Chore' : 'Add Chore'}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="rounded-full px-6 font-semibold transition-transform active:scale-95"
                    style={{
                      minHeight: '48px',
                      background: 'var(--surface-container-low)',
                      color: 'var(--on-surface-variant)',
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Active Chores List */}
        <div className="flex-1">
          <h3
            className="mb-3 font-headline text-lg font-semibold"
            style={{ color: 'var(--on-surface-variant)' }}
          >
            Active Chores ({chores.filter((c) => c.isActive).length})
          </h3>

          {chores.length === 0 && (
            <div
              className="flex flex-col items-center gap-3 rounded-[3rem] py-12"
              style={{ background: 'var(--surface-container-low)' }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '40px', color: 'var(--outline-variant)' }}
              >
                assignment
              </span>
              <p style={{ color: 'var(--on-surface-variant)' }}>
                No chores yet. Add one to get started!
              </p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {chores.map((chore, index) => (
              <div
                key={chore.id}
                className="glass-card animate-card-entrance relative flex items-start gap-4 p-4"
                style={{
                  opacity: chore.isActive ? 1 : 0.5,
                  animationDelay: `${index * 60}ms`,
                  animationFillMode: 'backwards',
                }}
              >
                {/* Icon */}
                <span className="mt-1 text-2xl" style={{ color: 'var(--on-surface)' }}>
                  <ChoreIcon value={chore.icon} />
                </span>

                {/* Info */}
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4
                      className="font-headline text-base font-bold"
                      style={{ color: 'var(--on-surface)' }}
                    >
                      {chore.name}
                    </h4>
                    {chore.kind === 'big_boss' && (
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold"
                        style={{
                          background: 'var(--tertiary-container)',
                          color: 'var(--on-tertiary-container)',
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                          workspace_premium
                        </span>
                        Big Boss
                      </span>
                    )}
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{
                        background: 'var(--secondary-container)',
                        color: 'var(--on-secondary-container)',
                      }}
                    >
                      {chore.frequency}
                    </span>
                    {chore.kind === 'big_boss' && (
                      <span
                        className="rounded-full px-2 py-0.5 text-xs font-bold"
                        style={{
                          background: 'var(--primary-container)',
                          color: 'var(--on-primary-container)',
                        }}
                      >
                        ${chore.rewardAmount.toFixed(2)}
                      </span>
                    )}
                  </div>

                  {chore.kind === 'big_boss' && chore.description && (
                    <p
                      className="mt-1 text-sm"
                      style={{ color: 'var(--on-surface-variant)' }}
                    >
                      {chore.description}
                    </p>
                  )}

                  {/* Assigned Kids */}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {chore.choreAssignments.map((a) => (
                      <span
                        key={a.id}
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white"
                        style={{ backgroundColor: a.kid.themeColor }}
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: '12px', fontVariationSettings: '"FILL" 1' }}
                        >
                          person
                        </span>
                        {a.kid.name}
                      </span>
                    ))}
                  </div>
                </div>

                {/* More Menu */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => handleToggleMenu(chore.id, e.currentTarget)}
                    className="flex h-10 w-10 items-center justify-center rounded-full transition-colors active:bg-gray-100"
                    style={{ color: 'var(--on-surface-variant)' }}
                    aria-label="More options"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
                      more_vert
                    </span>
                  </button>

                  {openMenuId === chore.id && (
                    <div
                      className={`animate-bounce-in absolute right-0 z-20 flex w-40 flex-col rounded-2xl py-2 ${
                        openMenuDir === 'up' ? 'bottom-12' : 'top-12'
                      }`}
                      style={{
                        background: 'var(--surface-container-lowest)',
                        border: '1px solid var(--surface-container-high)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.16)',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(chore)}
                        className="flex items-center gap-3 px-4 py-3 text-left text-sm font-medium transition-colors active:bg-gray-50"
                        style={{ color: 'var(--on-surface)' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                          edit
                        </span>
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(chore)}
                        className="flex items-center gap-3 px-4 py-3 text-left text-sm font-medium transition-colors active:bg-gray-50"
                        style={{ color: 'var(--on-surface)' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                          {chore.isActive ? 'pause' : 'play_arrow'}
                        </span>
                        {chore.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      {confirmDeleteId === chore.id ? (
                        <button
                          type="button"
                          onClick={() => handleDelete(chore.id)}
                          className="flex items-center gap-3 px-4 py-3 text-left text-sm font-medium transition-colors active:bg-red-50"
                          style={{ color: 'var(--error)' }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                            warning
                          </span>
                          Confirm Delete
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(chore.id)}
                          className="flex items-center gap-3 px-4 py-3 text-left text-sm font-medium transition-colors active:bg-red-50"
                          style={{ color: 'var(--error)' }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                            delete
                          </span>
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <IconPicker
        open={pickerOpen}
        selected={formData.icon}
        recent={recentIcons}
        onSelect={handlePickIcon}
        onClose={() => setPickerOpen(false)}
      />
    </div>
  );
}
