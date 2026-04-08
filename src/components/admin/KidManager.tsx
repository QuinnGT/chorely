'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface KidRecord {
  id: string;
  name: string;
  avatarUrl: string | null;
  themeColor: string;
  tasksDone: number;
  totalEarned: number;
}

interface KidFormData {
  name: string;
  themeColor: string;
  avatarUrl: string | null;
}

const PRESET_COLORS = [
  { label: 'Teal', hex: '#006571' },
  { label: 'Purple', hex: '#7c3aed' },
  { label: 'Amber', hex: '#f59e0b' },
  { label: 'Coral', hex: '#f43f5e' },
] as const;

const EMPTY_FORM: KidFormData = { name: '', themeColor: '#006571', avatarUrl: null };

export function KidManager() {
  const [kids, setKids] = useState<KidRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<KidFormData>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchKids = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/kids');
      if (!res.ok) throw new Error('Failed to fetch kids');
      const data = (await res.json()) as KidRecord[];
      setKids(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load kids';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchKids(); }, [fetchKids]);

  const validateForm = (data: KidFormData): string | null => {
    const trimmed = data.name.trim();
    if (trimmed.length === 0) return 'Name is required';
    if (trimmed.length > 50) return 'Name must be 50 characters or fewer';
    return null;
  };

  const handleOpenAdd = useCallback(() => {
    setFormData(EMPTY_FORM);
    setEditingId(null);
    setFormError(null);
    setShowForm(true);
  }, []);

  const handleOpenEdit = useCallback((kid: KidRecord) => {
    setFormData({ name: kid.name, themeColor: kid.themeColor, avatarUrl: kid.avatarUrl });
    setEditingId(kid.id);
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
    const validationError = validateForm(formData);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      const payload = { name: formData.name.trim(), themeColor: formData.themeColor, avatarUrl: formData.avatarUrl };

      if (editingId) {
        const res = await fetch(`/api/kids/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to update kid');
      } else {
        const res = await fetch('/api/kids', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to create kid');
      }

      setShowForm(false);
      setEditingId(null);
      setFormData(EMPTY_FORM);
      await fetchKids();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save';
      setFormError(message);
    } finally {
      setIsSaving(false);
    }
  }, [formData, editingId, fetchKids]);

  const handleAvatarUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formDataUpload });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }));
        setFormError(err.error || 'Upload failed');
        return;
      }
      const { url } = await res.json();
      setFormData((prev) => ({ ...prev, avatarUrl: url }));
    } catch {
      setFormError('Failed to upload avatar');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/kids/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete kid');
      setConfirmDeleteId(null);
      await fetchKids();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete';
      setError(message);
    }
  }, [fetchKids]);

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
          onClick={fetchKids}
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: '28px',
              color: 'var(--secondary)',
              fontVariationSettings: '"FILL" 1',
            }}
          >
            child_care
          </span>
          <h2
            className="font-headline text-2xl font-bold"
            style={{ color: 'var(--on-surface)' }}
          >
            The Kids Corner
          </h2>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {kids.map((kid, index) => (
          <div
            key={kid.id}
            className="glass-card animate-card-entrance flex flex-col items-center gap-3 p-5"
            style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'backwards' }}
          >
            {/* Avatar */}
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold text-white shadow-lg md:h-20 md:w-20 md:text-2xl"
              style={{
                backgroundColor: kid.themeColor,
                border: `3px solid ${kid.themeColor}`,
                boxShadow: `0 4px 20px ${kid.themeColor}40`,
              }}
            >
              {kid.avatarUrl ? (
                <img
                  src={kid.avatarUrl}
                  alt={kid.name}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                kid.name.charAt(0).toUpperCase()
              )}
            </div>

            {/* Name & Color */}
            <div className="text-center">
              <h3
                className="font-headline text-lg font-bold"
                style={{ color: 'var(--on-surface)' }}
              >
                {kid.name}
              </h3>
              <span
                className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                style={{
                  background: `${kid.themeColor}18`,
                  color: kid.themeColor,
                }}
              >
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: kid.themeColor }}
                />
                {kid.themeColor}
              </span>
            </div>

            {/* Stats */}
            <div
              className="flex w-full justify-around rounded-xl py-2"
              style={{ background: 'var(--surface-container-low)' }}
            >
              <div className="text-center">
                <p
                  className="font-headline text-lg font-bold"
                  style={{ color: 'var(--on-surface-variant)' }}
                >
                  {kid.tasksDone}
                </p>
                <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>
                  Tasks Done
                </p>
              </div>
              <div
                style={{ borderLeft: '1px solid var(--surface-container-high)' }}
              />
              <div className="text-center">
                <p
                  className="font-headline text-lg font-bold"
                  style={{ color: 'var(--on-surface-variant)' }}
                >
                  ${kid.totalEarned.toFixed(2)}
                </p>
                <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>
                  Earned
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex w-full gap-2">
              <button
                type="button"
                onClick={() => handleOpenEdit(kid)}
                className="flex flex-1 items-center justify-center gap-1 rounded-full font-medium transition-transform active:scale-95"
                style={{
                  minHeight: '48px',
                  background: 'var(--surface-container-low)',
                  color: 'var(--on-surface-variant)',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  edit
                </span>
                Edit
              </button>

              {confirmDeleteId === kid.id ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleDelete(kid.id)}
                    className="flex flex-1 items-center justify-center gap-1 rounded-full font-semibold text-white transition-transform active:scale-95"
                    style={{
                      minHeight: '48px',
                      background: 'var(--error)',
                    }}
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(null)}
                    className="flex flex-1 items-center justify-center rounded-full font-medium transition-transform active:scale-95"
                    style={{
                      minHeight: '48px',
                      background: 'var(--surface-container-low)',
                      color: 'var(--on-surface-variant)',
                    }}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(kid.id)}
                  className="flex items-center justify-center rounded-full transition-transform active:scale-95"
                  style={{
                    minHeight: '48px',
                    minWidth: '48px',
                    background: 'var(--error-container)',
                    color: 'var(--on-error-container)',
                  }}
                  aria-label={`Delete ${kid.name}`}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                    delete
                  </span>
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Add New Kid Card */}
        <button
          type="button"
          onClick={handleOpenAdd}
          className="animate-card-entrance flex flex-col items-center justify-center gap-3 rounded-[3rem] border-2 border-dashed p-8 transition-all active:scale-95"
          style={{
            borderColor: 'var(--outline-variant)',
            background: 'var(--surface-container-low)',
            animationDelay: `${kids.length * 80}ms`,
            animationFillMode: 'backwards',
            minHeight: '200px',
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '36px', color: 'var(--primary)' }}
          >
            person_add
          </span>
          <span
            className="font-headline font-semibold"
            style={{ color: 'var(--on-surface-variant)' }}
          >
            Add New Kid
          </span>
        </button>
      </div>

      {/* Inline Form Modal */}
      {showForm && (
        <div
          className="animate-bounce-in rounded-[3rem] p-6"
          style={{
            background: 'var(--surface-container-lowest)',
            border: '1px solid var(--surface-container-high)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          }}
        >
          <h3
            className="mb-4 font-headline text-xl font-bold"
            style={{ color: 'var(--on-surface)' }}
          >
            {editingId ? 'Edit Kid' : 'Add a New Kid'}
          </h3>

          <div className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="kid-name"
                className="mb-1 block text-sm font-medium"
                style={{ color: 'var(--on-surface-variant)' }}
              >
                Name
              </label>
              <input
                id="kid-name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                maxLength={50}
                className="w-full rounded-full px-4 py-3 text-base outline-none"
                style={{
                  background: 'var(--surface-container-low)',
                  color: 'var(--on-surface)',
                  border: '1px solid var(--outline-variant)',
                  minHeight: '48px',
                }}
                placeholder="Kid's name"
              />
            </div>

            {/* Avatar Upload */}
            <div>
              <span
                className="mb-2 block text-sm font-medium"
                style={{ color: 'var(--on-surface-variant)' }}
              >
                Avatar Photo
              </span>
              <div className="flex items-center gap-4">
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-full overflow-hidden border-2"
                  style={{
                    borderColor: formData.themeColor,
                    backgroundColor: formData.avatarUrl ? 'transparent' : formData.themeColor,
                  }}
                >
                  {formData.avatarUrl ? (
                    <img
                      src={formData.avatarUrl}
                      alt="Avatar preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-xl font-bold text-white">
                      {formData.name ? formData.name.charAt(0).toUpperCase() : '?'}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleAvatarUpload}
                    className="hidden"
                    id="avatar-upload"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="rounded-full px-4 py-2 text-sm font-semibold transition-transform active:scale-95 disabled:opacity-50"
                    style={{
                      background: 'var(--surface-container-low)',
                      color: 'var(--on-surface-variant)',
                      border: '1px solid var(--outline-variant)',
                    }}
                  >
                    {isUploading ? 'Uploading...' : formData.avatarUrl ? 'Change Photo' : 'Upload Photo'}
                  </button>
                  {formData.avatarUrl && (
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, avatarUrl: null }))}
                      className="text-xs font-medium underline"
                      style={{ color: 'var(--error)' }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div>
              <span
                className="mb-2 block text-sm font-medium"
                style={{ color: 'var(--on-surface-variant)' }}
              >
                Theme Color
              </span>
              <div className="flex gap-3">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color.hex}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, themeColor: color.hex }))}
                    className="flex items-center justify-center rounded-full transition-transform active:scale-95"
                    style={{
                      height: '48px',
                      width: '48px',
                      backgroundColor: color.hex,
                      border: formData.themeColor === color.hex
                        ? `3px solid var(--on-surface)`
                        : '3px solid transparent',
                      transform: formData.themeColor === color.hex ? 'scale(1.15)' : 'scale(1)',
                    }}
                    aria-label={color.label}
                  >
                    {formData.themeColor === color.hex && (
                      <span className="material-symbols-outlined text-white" style={{ fontSize: '20px' }}>
                        check
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {formError && (
              <p className="text-sm font-medium" style={{ color: 'var(--error)' }} role="alert">
                {formError}
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSaving}
                className="rounded-full bg-action-gradient px-6 font-semibold text-white transition-transform active:scale-95 disabled:opacity-50"
                style={{ minHeight: '48px' }}
              >
                {isSaving ? 'Saving\u2026' : editingId ? 'Update' : 'Create'}
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
