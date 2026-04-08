'use client';

import { useState, useCallback, useRef } from 'react';

interface StoreItem {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  price: number;
  category: 'toys' | 'games' | 'experiences' | 'books';
  stock: number;
  active: boolean;
}

interface StoreItemFormProps {
  item: StoreItem | null;
  onClose: () => void;
  onSave: () => void;
}

interface FormData {
  name: string;
  description: string;
  price: string;
  category: 'toys' | 'games' | 'experiences' | 'books';
  stock: string;
  active: boolean;
}

const CATEGORIES: { value: FormData['category']; label: string }[] = [
  { value: 'toys', label: 'Toys' },
  { value: 'games', label: 'Games' },
  { value: 'experiences', label: 'Experiences' },
  { value: 'books', label: 'Books' },
];

export function StoreItemForm({ item, onClose, onSave }: StoreItemFormProps) {
  const [formData, setFormData] = useState<FormData>({
    name: item?.name ?? '',
    description: item?.description ?? '',
    price: item ? String(item.price) : '',
    category: item?.category ?? 'toys',
    stock: item ? String(item.stock) : '',
    active: item?.active ?? true,
  });
  const [imageUrl, setImageUrl] = useState<string | null>(item?.imageUrl ?? null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validate = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Item name is required';
    }
    if (!formData.price || parseInt(formData.price, 10) <= 0) {
      errors.price = 'Price must be greater than 0';
    }
    if (formData.stock === '' || parseInt(formData.stock, 10) < 0) {
      errors.stock = 'Stock is required (0 or more)';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageUrl(e.target?.result as string);
      setError(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validate()) return;

    setIsSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        imageUrl,
        price: parseInt(formData.price, 10),
        category: formData.category,
        stock: parseInt(formData.stock, 10),
        active: formData.active,
      };

      if (item) {
        const res = await fetch(`/api/store/items/${item.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to update item');
      } else {
        const res = await fetch('/api/store/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to create item');
      }

      onSave();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  }, [formData, imageUrl, item, validate, onSave]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="animate-bounce-in w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[3rem] p-8"
        style={{
          background: 'var(--surface-container-lowest)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2
            className="font-headline text-2xl font-bold"
            style={{ color: 'var(--on-surface)' }}
          >
            {item ? 'Edit Item' : 'Add New Item'}
          </h2>
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

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Image Upload */}
          <div>
            <span
              className="mb-1 block text-sm font-medium"
              style={{ color: 'var(--on-surface-variant)' }}
            >
              Image
            </span>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className="flex cursor-pointer items-center justify-center overflow-hidden rounded-2xl transition-colors"
              style={{
                height: '160px',
                background: isDragOver ? 'var(--secondary-container)' : 'var(--surface-container-low)',
                border: `2px dashed ${isDragOver ? 'var(--secondary)' : 'var(--outline-variant)'}`,
              }}
            >
              {imageUrl ? (
                <div className="relative h-full w-full">
                  <img src={imageUrl} alt="Item preview" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImageUrl(null);
                    }}
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white transition-colors"
                    aria-label="Remove image"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: '32px', color: 'var(--outline-variant)' }}
                  >
                    add_photo_alternate
                  </span>
                  <span className="text-sm font-medium" style={{ color: 'var(--on-surface-variant)' }}>
                    Click to upload or drag & drop
                  </span>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Item Name */}
          <div>
            <label
              htmlFor="item-name"
              className="mb-1 block text-sm font-medium"
              style={{ color: 'var(--on-surface-variant)' }}
            >
              Item Name *
            </label>
            <input
              id="item-name"
              type="text"
              value={formData.name}
              onChange={(e) => {
                setFieldErrors((prev) => ({ ...prev, name: '' }));
                setFormData((prev) => ({ ...prev, name: e.target.value }));
              }}
              className="w-full rounded-full px-4 py-3 text-base outline-none"
              style={{
                background: 'var(--surface-container-low)',
                color: 'var(--on-surface)',
                border: `1px solid ${fieldErrors.name ? 'var(--error)' : 'var(--outline-variant)'}`,
                minHeight: '48px',
              }}
              placeholder="e.g. LEGO Set, Board Game"
            />
            {fieldErrors.name && (
              <p className="mt-1 text-xs" style={{ color: 'var(--error)' }}>{fieldErrors.name}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="item-description"
              className="mb-1 block text-sm font-medium"
              style={{ color: 'var(--on-surface-variant)' }}
            >
              Description
            </label>
            <textarea
              id="item-description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full resize-none rounded-2xl px-4 py-3 text-base outline-none"
              style={{
                background: 'var(--surface-container-low)',
                color: 'var(--on-surface)',
                border: '1px solid var(--outline-variant)',
              }}
              placeholder="Describe the item..."
            />
          </div>

          {/* Price and Stock Row */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label
                htmlFor="item-price"
                className="mb-1 block text-sm font-medium"
                style={{ color: 'var(--on-surface-variant)' }}
              >
                Price *
              </label>
              <input
                id="item-price"
                type="number"
                min={1}
                value={formData.price}
                onChange={(e) => {
                  setFieldErrors((prev) => ({ ...prev, price: '' }));
                  setFormData((prev) => ({ ...prev, price: e.target.value }));
                }}
                className="w-full rounded-full px-4 py-3 text-base outline-none"
                style={{
                  background: 'var(--surface-container-low)',
                  color: 'var(--on-surface)',
                  border: `1px solid ${fieldErrors.price ? 'var(--error)' : 'var(--outline-variant)'}`,
                  minHeight: '48px',
                }}
                placeholder="0"
              />
              {fieldErrors.price && (
                <p className="mt-1 text-xs" style={{ color: 'var(--error)' }}>{fieldErrors.price}</p>
              )}
            </div>
            <div className="flex-1">
              <label
                htmlFor="item-stock"
                className="mb-1 block text-sm font-medium"
                style={{ color: 'var(--on-surface-variant)' }}
              >
                Stock *
              </label>
              <input
                id="item-stock"
                type="number"
                min={0}
                value={formData.stock}
                onChange={(e) => {
                  setFieldErrors((prev) => ({ ...prev, stock: '' }));
                  setFormData((prev) => ({ ...prev, stock: e.target.value }));
                }}
                className="w-full rounded-full px-4 py-3 text-base outline-none"
                style={{
                  background: 'var(--surface-container-low)',
                  color: 'var(--on-surface)',
                  border: `1px solid ${fieldErrors.stock ? 'var(--error)' : 'var(--outline-variant)'}`,
                  minHeight: '48px',
                }}
                placeholder="0"
              />
              {fieldErrors.stock && (
                <p className="mt-1 text-xs" style={{ color: 'var(--error)' }}>{fieldErrors.stock}</p>
              )}
            </div>
          </div>

          {/* Category */}
          <div>
            <label
              htmlFor="item-category"
              className="mb-1 block text-sm font-medium"
              style={{ color: 'var(--on-surface-variant)' }}
            >
              Category
            </label>
            <select
              id="item-category"
              value={formData.category}
              onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value as FormData['category'] }))}
              className="w-full rounded-full px-4 py-3 text-base outline-none"
              style={{
                background: 'var(--surface-container-low)',
                color: 'var(--on-surface)',
                border: '1px solid var(--outline-variant)',
                minHeight: '48px',
                appearance: 'none',
              }}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--on-surface)' }}>
                Active
              </p>
              <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>
                Visible in the store
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, active: !prev.active }))}
              className="relative h-8 w-14 rounded-full transition-colors"
              style={{
                background: formData.active ? 'var(--primary)' : 'var(--surface-container-highest)',
              }}
              role="switch"
              aria-checked={formData.active}
              aria-label="Toggle active status"
            >
              <span
                className="absolute top-1 h-6 w-6 rounded-full bg-white transition-all shadow"
                style={{
                  left: formData.active ? '30px' : '4px',
                }}
              />
            </button>
          </div>

          {error && (
            <p className="text-sm font-medium" style={{ color: 'var(--error)' }} role="alert">
              {error}
            </p>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="flex flex-1 items-center justify-center rounded-full bg-action-gradient font-semibold text-white transition-transform active:scale-95 disabled:opacity-50"
              style={{ minHeight: '48px' }}
            >
              {isSaving ? 'Saving\u2026' : item ? 'Save Item' : 'Add Item'}
            </button>
            <button
              type="button"
              onClick={onClose}
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
        </form>
      </div>
    </div>
  );
}
