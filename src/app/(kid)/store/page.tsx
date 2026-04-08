'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useKid } from '@/contexts/KidContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { StoreBrowser } from '@/components/store/StoreBrowser';
import { RedeemConfirmModal } from '@/components/store/RedeemConfirmModal';
import { RedeemSuccessModal } from '@/components/store/RedeemSuccessModal';

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

interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  status: 'active' | 'completed' | 'archived';
}

export default function StorePage() {
  const router = useRouter();
  const { selectedKid, isHydrated } = useKid();

  const [items, setItems] = useState<StoreItem[]>([]);
  const [balance, setBalance] = useState(0);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Redemption state
  const [redeemItem, setRedeemItem] = useState<StoreItem | null>(null);
  const [redeemSuccessItem, setRedeemSuccessItem] = useState<StoreItem | null>(null);
  const [redeeming, setRedeeming] = useState(false);

  useEffect(() => {
    if (isHydrated && !selectedKid) {
      router.push('/');
    }
  }, [selectedKid, isHydrated, router]);

  const kidId = selectedKid?.id ?? '';

  const fetchStoreData = useCallback(async () => {
    if (!kidId) return;
    setIsLoading(true);
    try {
      const [itemsRes, balanceRes, goalsRes] = await Promise.all([
        fetch('/api/store/items'),
        fetch(`/api/allowance?kidId=${kidId}`),
        fetch(`/api/savings-goals?kidId=${kidId}`),
      ]);

      if (itemsRes.ok) {
        const data = await itemsRes.json();
        setItems(data.filter((item: StoreItem) => item.active && item.stock > 0));
      }

      if (balanceRes.ok) {
        const data = await balanceRes.json();
        const total = parseFloat(data.currentWeek?.total ?? '0');
        setBalance(total);
      }

      if (goalsRes.ok) {
        const data = await goalsRes.json();
        setGoals(data.map((g: { id: string; name: string; targetAmount: string; currentAmount: string; status: string }) => ({
          id: g.id,
          name: g.name,
          targetAmount: parseFloat(g.targetAmount),
          currentAmount: parseFloat(g.currentAmount),
          status: g.status,
        })));
      }
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false);
    }
  }, [kidId]);

  useEffect(() => {
    fetchStoreData();
  }, [fetchStoreData]);

  const handleRedeem = useCallback(async () => {
    if (!redeemItem || !kidId) return;
    setRedeeming(true);
    try {
      const res = await fetch('/api/store/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kidId, itemId: redeemItem.id }),
      });
      if (res.ok) {
        setRedeemSuccessItem(redeemItem);
        setRedeemItem(null);
        setBalance((prev) => prev - redeemItem.price);
      }
    } catch {
      // Silently fail
    } finally {
      setRedeeming(false);
    }
  }, [redeemItem, kidId]);

  const handleAddToGoal = useCallback(async (item: StoreItem) => {
    if (!kidId) return;
    try {
      await fetch('/api/savings-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kidId,
          name: item.name,
          targetAmount: item.price,
        }),
      });
      fetchStoreData();
    } catch {
      // Silently fail
    }
  }, [kidId, fetchStoreData]);

  if (!isHydrated || !selectedKid) {
    return null;
  }

  return (
    <div className="max-w-[1024px] mx-auto">
    <ErrorBoundary>
      <StoreBrowser
        items={items}
        balance={balance}
        savingsGoals={goals}
        onRedeem={setRedeemItem}
        onAddToGoals={handleAddToGoal}
      />

      {redeemItem && (
        <RedeemConfirmModal
          isOpen={true}
          item={redeemItem}
          currentBalance={balance}
          onConfirm={handleRedeem}
          onCancel={() => setRedeemItem(null)}
        />
      )}

      {redeemSuccessItem && (
        <RedeemSuccessModal
          isOpen={true}
          item={redeemSuccessItem}
          onDismiss={() => setRedeemSuccessItem(null)}
        />
      )}
    </ErrorBoundary>
    </div>
  );
}
