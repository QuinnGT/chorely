'use client';

import { useState, useCallback, useEffect } from 'react';
import { StoreItemForm } from './StoreItemForm';

export interface StoreItem {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  price: number;
  category: 'toys' | 'games' | 'experiences' | 'books';
  stock: number;
  active: boolean;
}

export interface StoreOrder {
  id: string;
  itemId: string;
  kidId: string;
  kidName: string;
  itemName: string;
  price: number;
  status: 'pending' | 'approved' | 'shipped' | 'delivered';
  createdAt: string;
}

interface StoreSettings {
  currencyName: string;
  minimumBalance: number;
  notifyNewOrders: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  toys: 'Toys',
  games: 'Games',
  experiences: 'Experiences',
  books: 'Books',
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'var(--tertiary-container)', text: 'var(--on-tertiary-container)' },
  approved: { bg: 'var(--primary-container)', text: 'var(--on-primary-container)' },
  shipped: { bg: 'var(--secondary-container)', text: 'var(--on-secondary-container)' },
  delivered: { bg: '#d1fae5', text: '#065f46' },
};

export function InventoryTab() {
  const [items, setItems] = useState<StoreItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<StoreItem | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/store/items');
      if (!res.ok) throw new Error('Failed to fetch items');
      const data = (await res.json()) as StoreItem[];
      setItems(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load items';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleAdd = useCallback(() => {
    setEditingItem(null);
    setShowForm(true);
  }, []);

  const handleEdit = useCallback((item: StoreItem) => {
    setEditingItem(item);
    setShowForm(true);
    setOpenMenuId(null);
  }, []);

  const handleFormClose = useCallback(() => {
    setShowForm(false);
    setEditingItem(null);
  }, []);

  const handleFormSave = useCallback(async () => {
    setShowForm(false);
    setEditingItem(null);
    await fetchItems();
  }, [fetchItems]);

  const handleToggleActive = useCallback(async (item: StoreItem) => {
    try {
      const res = await fetch(`/api/store/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !item.active }),
      });
      if (!res.ok) throw new Error('Failed to update item');
      setOpenMenuId(null);
      await fetchItems();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update';
      setError(message);
    }
  }, [fetchItems]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/store/items/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete item');
      setConfirmDeleteId(null);
      setOpenMenuId(null);
      await fetchItems();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete';
      setError(message);
    }
  }, [fetchItems]);

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
          onClick={fetchItems}
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: '28px',
              color: 'var(--primary)',
              fontVariationSettings: '"FILL" 1',
            }}
          >
            inventory_2
          </span>
          <h2
            className="font-headline text-2xl font-bold"
            style={{ color: 'var(--on-surface)' }}
          >
            Inventory
          </h2>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center gap-2 rounded-full bg-action-gradient px-6 font-semibold text-white transition-transform active:scale-95"
          style={{ minHeight: '48px' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px', fontVariationSettings: '"FILL" 1' }}>
            add
          </span>
          Add New Item
        </button>
      </div>

      {items.length === 0 ? (
        <div
          className="flex flex-col items-center gap-3 rounded-[3rem] py-12"
          style={{ background: 'var(--surface-container-low)' }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '48px', color: 'var(--outline-variant)' }}
          >
            inventory_2
          </span>
          <p style={{ color: 'var(--on-surface-variant)' }}>
            No items yet. Add your first store item!
          </p>
        </div>
      ) : (
        <div
          className="overflow-hidden rounded-[3rem]"
          style={{
            background: 'var(--surface-container-low)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
          }}
        >
          <table className="w-full text-left">
            <thead>
              <tr
                className="text-[10px] uppercase tracking-[0.2em]"
                style={{ color: 'var(--on-surface-variant)' }}
              >
                <th className="px-6 py-4">Item</th>
                <th className="px-6 py-4">Price</th>
                <th className="px-6 py-4">Stock</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--surface-container)' }}>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="transition-colors hover:bg-white/50"
                  style={{ opacity: item.active ? 1 : 0.5 }}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl"
                        style={{ background: 'var(--surface-container)' }}
                      >
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                        ) : (
                          <span
                            className="material-symbols-outlined"
                            style={{ fontSize: '20px', color: 'var(--on-surface-variant)' }}
                          >
                            image
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-bold" style={{ color: 'var(--on-surface)' }}>{item.name}</p>
                        <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>
                          {CATEGORY_LABELS[item.category]}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-bold" style={{ color: 'var(--on-surface)' }}>
                      {item.price}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className="font-bold"
                      style={{ color: item.stock === 0 ? 'var(--error)' : 'var(--on-surface)' }}
                    >
                      {item.stock}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className="inline-block rounded-full px-3 py-1 text-[10px] font-bold uppercase"
                      style={{
                        background: item.active ? 'var(--primary-container)' : 'var(--surface-container)',
                        color: item.active ? 'var(--on-primary-container)' : 'var(--on-surface-variant)',
                      }}
                    >
                      {item.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="relative inline-block">
                      <button
                        type="button"
                        onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                        className="flex h-10 w-10 items-center justify-center rounded-full transition-colors active:bg-gray-100"
                        style={{ color: 'var(--on-surface-variant)' }}
                        aria-label="More options"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
                          more_vert
                        </span>
                      </button>

                      {openMenuId === item.id && (
                        <div
                          className="animate-bounce-in absolute right-0 top-12 z-10 flex w-40 flex-col rounded-2xl py-2"
                          style={{
                            background: 'var(--surface-container-lowest)',
                            border: '1px solid var(--surface-container-high)',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.16)',
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => handleEdit(item)}
                            className="flex items-center gap-3 px-4 py-3 text-left text-sm font-medium transition-colors active:bg-gray-50"
                            style={{ color: 'var(--on-surface)' }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit</span>
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleActive(item)}
                            className="flex items-center gap-3 px-4 py-3 text-left text-sm font-medium transition-colors active:bg-gray-50"
                            style={{ color: 'var(--on-surface)' }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                              {item.active ? 'visibility_off' : 'visibility'}
                            </span>
                            {item.active ? 'Deactivate' : 'Activate'}
                          </button>
                          {confirmDeleteId === item.id ? (
                            <button
                              type="button"
                              onClick={() => handleDelete(item.id)}
                              className="flex items-center gap-3 px-4 py-3 text-left text-sm font-medium transition-colors active:bg-red-50"
                              style={{ color: 'var(--error)' }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>warning</span>
                              Confirm Delete
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(item.id)}
                              className="flex items-center gap-3 px-4 py-3 text-left text-sm font-medium transition-colors active:bg-red-50"
                              style={{ color: 'var(--error)' }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                              Delete
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <StoreItemForm
          item={editingItem}
          onClose={handleFormClose}
          onSave={handleFormSave}
        />
      )}
    </div>
  );
}

export function OrdersTab() {
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/store/orders');
      if (!res.ok) throw new Error('Failed to fetch orders');
      const data = (await res.json()) as StoreOrder[];
      setOrders(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load orders';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleUpdateStatus = useCallback(async (orderId: string, status: string) => {
    try {
      const res = await fetch(`/api/store/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update order');
      await fetchOrders();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update';
      setError(message);
    }
  }, [fetchOrders]);

  const filteredOrders = statusFilter === 'all'
    ? orders
    : orders.filter((o) => o.status === statusFilter);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

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
          onClick={fetchOrders}
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: '28px',
              color: 'var(--primary)',
              fontVariationSettings: '"FILL" 1',
            }}
          >
            receipt_long
          </span>
          <h2
            className="font-headline text-2xl font-bold"
            style={{ color: 'var(--on-surface)' }}
          >
            Orders
          </h2>
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-full px-4 py-2 text-sm font-semibold outline-none"
          style={{
            minHeight: '48px',
            background: 'var(--surface-container-low)',
            color: 'var(--on-surface)',
            border: '1px solid var(--outline-variant)',
          }}
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
        </select>
      </div>

      {filteredOrders.length === 0 ? (
        <div
          className="flex flex-col items-center gap-3 rounded-[3rem] py-12"
          style={{ background: 'var(--surface-container-low)' }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '48px', color: 'var(--outline-variant)' }}
          >
            receipt_long
          </span>
          <p style={{ color: 'var(--on-surface-variant)' }}>
            {statusFilter === 'all' ? 'No orders yet.' : `No ${statusFilter} orders.`}
          </p>
        </div>
      ) : (
        <div
          className="overflow-hidden rounded-[3rem]"
          style={{
            background: 'var(--surface-container-low)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
          }}
        >
          <table className="w-full text-left">
            <thead>
              <tr
                className="text-[10px] uppercase tracking-[0.2em]"
                style={{ color: 'var(--on-surface-variant)' }}
              >
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Kid</th>
                <th className="px-6 py-4">Item</th>
                <th className="px-6 py-4">Price</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--surface-container)' }}>
              {filteredOrders.map((order) => (
                <tr key={order.id} className="transition-colors hover:bg-white/50">
                  <td className="px-6 py-4">
                    <span className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>
                      {formatDate(order.createdAt)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-bold" style={{ color: 'var(--on-surface)' }}>
                      {order.kidName}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-bold" style={{ color: 'var(--on-surface)' }}>
                      {order.itemName}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-bold" style={{ color: 'var(--on-surface)' }}>
                      {order.price}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className="inline-block rounded-full px-3 py-1 text-[10px] font-bold uppercase"
                      style={{
                        background: STATUS_COLORS[order.status]?.bg ?? 'var(--surface-container)',
                        color: STATUS_COLORS[order.status]?.text ?? 'var(--on-surface-variant)',
                      }}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {order.status === 'pending' && (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(order.id, 'approved')}
                          className="flex h-10 w-10 items-center justify-center rounded-full transition-all active:scale-90"
                          style={{ background: 'var(--primary-container)', color: 'var(--on-primary-container)' }}
                          aria-label="Approve"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '20px', fontVariationSettings: '"FILL" 1' }}>
                            check
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(order.id, 'declined')}
                          className="flex h-10 w-10 items-center justify-center rounded-full transition-all active:scale-90"
                          style={{ background: 'var(--error-container)', color: 'var(--on-error-container)' }}
                          aria-label="Decline"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '20px', fontVariationSettings: '"FILL" 1' }}>
                            close
                          </span>
                        </button>
                      </div>
                    )}
                    {order.status === 'approved' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(order.id, 'shipped')}
                        className="rounded-full px-4 text-xs font-semibold transition-all active:scale-95"
                        style={{
                          minHeight: '36px',
                          background: 'var(--secondary-container)',
                          color: 'var(--on-secondary-container)',
                        }}
                      >
                        Mark Shipped
                      </button>
                    )}
                    {order.status === 'shipped' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(order.id, 'delivered')}
                        className="rounded-full px-4 text-xs font-semibold transition-all active:scale-95"
                        style={{
                          minHeight: '36px',
                          background: '#d1fae5',
                          color: '#065f46',
                        }}
                      >
                        Mark Delivered
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function SettingsTab() {
  const [settings, setSettings] = useState<StoreSettings>({
    currencyName: 'Coins',
    minimumBalance: 10,
    notifyNewOrders: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/store/settings');
      if (!res.ok) throw new Error('Failed to fetch settings');
      const data = (await res.json()) as StoreSettings;
      setSettings(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load settings';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/store/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error('Failed to save settings');
      setSuccessMsg('Settings saved!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  }, [settings]);

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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: '28px',
            color: 'var(--primary)',
            fontVariationSettings: '"FILL" 1',
          }}
        >
          tune
        </span>
        <h2
          className="font-headline text-2xl font-bold"
          style={{ color: 'var(--on-surface)' }}
        >
          Store Settings
        </h2>
      </div>

      <div
        className="rounded-[3rem] p-6 md:max-w-lg"
        style={{
          background: 'var(--surface-container-low)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
        }}
      >
        <div className="flex flex-col gap-6">
          {/* Currency Name */}
          <div>
            <label
              htmlFor="currency-name"
              className="mb-1 block text-sm font-medium"
              style={{ color: 'var(--on-surface-variant)' }}
            >
              Currency Name
            </label>
            <input
              id="currency-name"
              type="text"
              value={settings.currencyName}
              onChange={(e) => {
                setSuccessMsg(null);
                setSettings((prev) => ({ ...prev, currencyName: e.target.value }));
              }}
              className="w-full rounded-full px-4 py-3 text-base outline-none"
              style={{
                background: 'var(--surface-container-lowest)',
                color: 'var(--on-surface)',
                border: '1px solid var(--outline-variant)',
                minHeight: '48px',
              }}
              placeholder="e.g. Coins, Stars"
            />
            <p className="mt-1 text-xs" style={{ color: 'var(--on-surface-variant)' }}>
              Name used for the store currency (e.g. &quot;Coins&quot;, &quot;Stars&quot;)
            </p>
          </div>

          {/* Minimum Balance */}
          <div>
            <label
              htmlFor="min-balance"
              className="mb-1 block text-sm font-medium"
              style={{ color: 'var(--on-surface-variant)' }}
            >
              Minimum Balance to Redeem
            </label>
            <input
              id="min-balance"
              type="number"
              min={0}
              value={settings.minimumBalance}
              onChange={(e) => {
                setSuccessMsg(null);
                setSettings((prev) => ({ ...prev, minimumBalance: parseInt(e.target.value, 10) || 0 }));
              }}
              className="w-full rounded-full px-4 py-3 text-base outline-none"
              style={{
                background: 'var(--surface-container-lowest)',
                color: 'var(--on-surface)',
                border: '1px solid var(--outline-variant)',
                minHeight: '48px',
              }}
            />
            <p className="mt-1 text-xs" style={{ color: 'var(--on-surface-variant)' }}>
              Kids must have at least this many {settings.currencyName || 'units'} to place an order
            </p>
          </div>

          {/* Notification Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--on-surface)' }}>
                New Order Notifications
              </p>
              <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>
                Get notified when a kid places a new order
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSuccessMsg(null);
                setSettings((prev) => ({ ...prev, notifyNewOrders: !prev.notifyNewOrders }));
              }}
              className="relative h-8 w-14 rounded-full transition-colors"
              style={{
                background: settings.notifyNewOrders ? 'var(--primary)' : 'var(--surface-container-highest)',
              }}
              role="switch"
              aria-checked={settings.notifyNewOrders}
              aria-label="Toggle new order notifications"
            >
              <span
                className="absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all"
                style={{
                  left: settings.notifyNewOrders ? '30px' : '4px',
                }}
              />
            </button>
          </div>

          {error && (
            <p className="text-sm font-medium" style={{ color: 'var(--error)' }} role="alert">
              {error}
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
            className="flex items-center justify-center rounded-full bg-action-gradient font-semibold text-white transition-transform active:scale-95 disabled:opacity-50"
            style={{ minHeight: '48px' }}
          >
            {isSaving ? 'Saving\u2026' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
