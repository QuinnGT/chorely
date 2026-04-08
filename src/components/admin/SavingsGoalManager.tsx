'use client';

import { useState, useEffect, useCallback } from 'react';

interface KidRecord {
  id: string;
  name: string;
  avatarUrl: string | null;
  themeColor: string;
}

interface SavingsGoal {
  id: string;
  kidId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  status: 'active' | 'completed' | 'archived';
  createdAt: string;
}

interface GoalFormData {
  name: string;
  targetAmount: string;
  targetDate: string;
}

const EMPTY_FORM: GoalFormData = { name: '', targetAmount: '', targetDate: '' };

const GOAL_ICONS: Record<string, string> = {
  bike: 'pedal_bike',
  toy: 'smart_toy',
  game: 'videogame_asset',
  book: 'menu_book',
  music: 'music_note',
  sport: 'sports_soccer',
  gift: 'card_giftshop',
  trip: 'flight',
  pet: 'pets',
  art: 'palette',
  default: 'savings',
};

const GOAL_COLORS = [
  { bg: 'var(--primary-container)', text: 'var(--on-primary-container)', bar: 'var(--primary)' },
  { bg: 'var(--secondary-container)', text: 'var(--on-secondary-container)', bar: 'var(--secondary)' },
  { bg: 'var(--tertiary-container)', text: 'var(--on-tertiary-container)', bar: 'var(--tertiary)' },
];

function getGoalIcon(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, icon] of Object.entries(GOAL_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return GOAL_ICONS.default;
}

function getGoalColorSet(index: number) {
  return GOAL_COLORS[index % GOAL_COLORS.length];
}

function calculateProgress(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min((current / target) * 100, 100);
}

interface SavingsGoalManagerProps {
  kidId: string;
}

export function SavingsGoalManager({ kidId }: SavingsGoalManagerProps) {
  const [kid, setKid] = useState<KidRecord | null>(null);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<GoalFormData>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [kidsRes, goalsRes] = await Promise.all([
        fetch('/api/kids'),
        fetch(`/api/savings-goals?kidId=${kidId}`),
      ]);
      if (!kidsRes.ok) throw new Error('Failed to load kids');
      if (!goalsRes.ok) throw new Error('Failed to load savings goals');
      const kidsData = (await kidsRes.json()) as KidRecord[];
      const goalsData = (await goalsRes.json()) as SavingsGoal[];
      setKid(kidsData.find((k) => k.id === kidId) ?? null);
      setGoals(goalsData);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load data';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [kidId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleOpenAdd = useCallback(() => {
    setFormData(EMPTY_FORM);
    setEditingId(null);
    setFormError(null);
    setShowForm(true);
  }, []);

  const handleOpenEdit = useCallback((goal: SavingsGoal) => {
    setFormData({
      name: goal.name,
      targetAmount: String(goal.targetAmount),
      targetDate: '',
    });
    setEditingId(goal.id);
    setFormError(null);
    setShowForm(true);
  }, []);

  const handleCancel = useCallback(() => {
    setShowForm(false);
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setFormError(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    const trimmedName = formData.name.trim();
    if (!trimmedName) { setFormError('Name is required'); return; }
    if (trimmedName.length > 100) { setFormError('Name must be 100 characters or fewer'); return; }
    const amount = parseFloat(formData.targetAmount);
    if (isNaN(amount) || amount <= 0) { setFormError('Target amount must be a positive number'); return; }

    setIsSaving(true);
    setFormError(null);

    try {
      if (editingId) {
        const res = await fetch('/api/savings-goals', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, name: trimmedName, targetAmount: amount }),
        });
        if (!res.ok) throw new Error('Failed to update goal');
      } else {
        const res = await fetch('/api/savings-goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kidId, name: trimmedName, targetAmount: amount }),
        });
        if (!res.ok) throw new Error('Failed to create goal');
      }
      setShowForm(false);
      setEditingId(null);
      setFormData(EMPTY_FORM);
      await fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save';
      setFormError(message);
    } finally {
      setIsSaving(false);
    }
  }, [formData, editingId, kidId, fetchData]);

  const handleUpdateStatus = useCallback(async (goalId: string, status: SavingsGoal['status']) => {
    try {
      const res = await fetch('/api/savings-goals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: goalId, status }),
      });
      if (!res.ok) throw new Error('Failed to update goal');
      await fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update';
      setError(message);
    }
  }, [fetchData]);

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

  const activeGoals = goals.filter((g) => g.status === 'active');
  const completedGoals = goals.filter((g) => g.status === 'completed');
  const archivedGoals = goals.filter((g) => g.status === 'archived');

  const statusBadge = (status: SavingsGoal['status']) => {
    const config: Record<string, { icon: string; bg: string; color: string; label: string }> = {
      active: { icon: 'radio_button_checked', bg: 'var(--primary-container)', color: 'var(--on-primary-container)', label: 'Active' },
      completed: { icon: 'check_circle', bg: 'var(--tertiary-container)', color: 'var(--on-tertiary-container)', label: 'Completed' },
      archived: { icon: 'archive', bg: 'var(--surface-container-high)', color: 'var(--on-surface-variant)', label: 'Archived' },
    };
    const c = config[status];
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
        style={{ background: c.bg, color: c.color }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '14px', fontVariationSettings: '"FILL" 1' }}>
          {c.icon}
        </span>
        {c.label}
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Kid Header */}
      {kid && (
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
          <div>
            <h3
              className="font-headline text-lg font-bold"
              style={{ color: 'var(--on-surface)' }}
            >
              {kid.name}&apos;s Savings Goals
            </h3>
          </div>
        </div>
      )}

      {/* Empty State */}
      {goals.length === 0 && !showForm && (
        <div
          className="flex flex-col items-center gap-3 rounded-[3rem] py-8"
          style={{ background: 'var(--surface-container-low)' }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '40px', color: 'var(--outline-variant)', fontVariationSettings: '"FILL" 1' }}
          >
            savings
          </span>
          <p className="text-sm font-medium" style={{ color: 'var(--on-surface-variant)' }}>
            No savings goals yet. Add one to get started!
          </p>
        </div>
      )}

      {/* Active Goals */}
      {activeGoals.length > 0 && (
        <div className="flex flex-col gap-3">
          {activeGoals.map((goal, index) => {
            const progress = calculateProgress(goal.currentAmount, goal.targetAmount);
            const colors = getGoalColorSet(index);
            const icon = getGoalIcon(goal.name);

            return (
              <div
                key={goal.id}
                className="animate-card-entrance rounded-[3rem] p-5"
                style={{
                  background: 'var(--surface-container-lowest)',
                  border: '1px solid var(--surface-container-high)',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                  animationDelay: `${index * 60}ms`,
                  animationFillMode: 'backwards',
                }}
              >
                <div className="flex items-start gap-4">
                  {/* Goal Icon */}
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

                  {/* Goal Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4
                        className="font-headline text-base font-bold truncate"
                        style={{ color: 'var(--on-surface)' }}
                      >
                        {goal.name}
                      </h4>
                      {statusBadge(goal.status)}
                    </div>

                    <p className="text-sm font-medium mb-3" style={{ color: 'var(--on-surface-variant)' }}>
                      ${goal.currentAmount.toFixed(2)} / ${goal.targetAmount.toFixed(2)}
                    </p>

                    {/* Progress Bar */}
                    <div
                      className="h-3 w-full overflow-hidden rounded-full"
                      style={{ background: 'var(--surface-container-high)' }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${progress}%`,
                          background: colors.bar,
                        }}
                      />
                    </div>

                    <p
                      className="mt-1 text-right text-xs font-bold"
                      style={{ color: colors.bar }}
                    >
                      {Math.round(progress)}% reached
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(goal)}
                      className="flex h-10 w-10 items-center justify-center rounded-full transition-transform active:scale-95"
                      style={{ background: 'var(--surface-container-low)', color: 'var(--on-surface-variant)' }}
                      aria-label={`Edit ${goal.name}`}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                        edit
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(goal.id, 'completed')}
                      className="flex h-10 w-10 items-center justify-center rounded-full transition-transform active:scale-95"
                      style={{ background: 'var(--tertiary-container)', color: 'var(--on-tertiary-container)' }}
                      aria-label={`Mark ${goal.name} as completed`}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '20px', fontVariationSettings: '"FILL" 1' }}>
                        check_circle
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(goal.id, 'archived')}
                      className="flex h-10 w-10 items-center justify-center rounded-full transition-transform active:scale-95"
                      style={{ background: 'var(--surface-container-low)', color: 'var(--on-surface-variant)' }}
                      aria-label={`Archive ${goal.name}`}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                        archive
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--on-surface-variant)' }}>
            Completed
          </p>
          {completedGoals.map((goal) => (
            <div
              key={goal.id}
              className="flex items-center justify-between rounded-2xl px-4 py-3"
              style={{ background: 'var(--surface-container-low)', opacity: 0.7 }}
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--tertiary)', fontVariationSettings: '"FILL" 1' }}>
                  check_circle
                </span>
                <span className="text-sm font-medium" style={{ color: 'var(--on-surface-variant)' }}>
                  {goal.name}
                </span>
              </div>
              <span className="text-xs font-medium" style={{ color: 'var(--on-surface-variant)' }}>
                ${Number(goal.currentAmount).toFixed(2)} / ${Number(goal.targetAmount).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Archived Goals */}
      {archivedGoals.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--on-surface-variant)' }}>
            Archived
          </p>
          {archivedGoals.map((goal) => (
            <div
              key={goal.id}
              className="flex items-center justify-between rounded-2xl px-4 py-3"
              style={{ background: 'var(--surface-container-low)', opacity: 0.5 }}
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--outline-variant)' }}>
                  archive
                </span>
                <span className="text-sm font-medium" style={{ color: 'var(--outline)' }}>
                  {goal.name}
                </span>
              </div>
              <span className="text-xs font-medium" style={{ color: 'var(--outline-variant)' }}>
                ${Number(goal.currentAmount).toFixed(2)} / ${Number(goal.targetAmount).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Add Goal Button */}
      {!showForm && (
        <button
          type="button"
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 rounded-full bg-action-gradient font-semibold text-white transition-transform active:scale-95"
          style={{ minHeight: '48px' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px', fontVariationSettings: '"FILL" 1' }}>
            add
          </span>
          Add Goal
        </button>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
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
            {editingId ? 'Edit Goal' : 'New Savings Goal'}
          </h4>

          <div className="flex flex-col gap-4">
            {/* Goal Name */}
            <div>
              <label
                htmlFor={`${kidId}-goal-name`}
                className="mb-1 block text-sm font-medium"
                style={{ color: 'var(--on-surface-variant)' }}
              >
                Goal Name
              </label>
              <input
                id={`${kidId}-goal-name`}
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                maxLength={100}
                className="w-full rounded-full px-4 py-3 text-base outline-none"
                style={{
                  background: 'var(--surface-container-low)',
                  color: 'var(--on-surface)',
                  border: '1px solid var(--outline-variant)',
                  minHeight: '48px',
                }}
                placeholder="e.g. New Bike"
              />
            </div>

            {/* Target Amount */}
            <div>
              <label
                htmlFor={`${kidId}-goal-amount`}
                className="mb-1 block text-sm font-medium"
                style={{ color: 'var(--on-surface-variant)' }}
              >
                Target Amount ($)
              </label>
              <input
                id={`${kidId}-goal-amount`}
                type="number"
                step="0.01"
                min="0.01"
                value={formData.targetAmount}
                onChange={(e) => setFormData((prev) => ({ ...prev, targetAmount: e.target.value }))}
                className="w-full rounded-full px-4 py-3 text-base outline-none"
                style={{
                  background: 'var(--surface-container-low)',
                  color: 'var(--on-surface)',
                  border: '1px solid var(--outline-variant)',
                  minHeight: '48px',
                }}
                placeholder="50.00"
              />
            </div>

            {/* Target Date (Optional) */}
            <div>
              <label
                htmlFor={`${kidId}-goal-date`}
                className="mb-1 block text-sm font-medium"
                style={{ color: 'var(--on-surface-variant)' }}
              >
                Target Date <span style={{ color: 'var(--outline-variant)' }}>(optional)</span>
              </label>
              <input
                id={`${kidId}-goal-date`}
                type="date"
                value={formData.targetDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, targetDate: e.target.value }))}
                className="w-full rounded-full px-4 py-3 text-base outline-none"
                style={{
                  background: 'var(--surface-container-low)',
                  color: 'var(--on-surface)',
                  border: '1px solid var(--outline-variant)',
                  minHeight: '48px',
                }}
              />
            </div>

            {/* Error */}
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
                {isSaving ? 'Saving\u2026' : editingId ? 'Update Goal' : 'Create Goal'}
              </button>
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
