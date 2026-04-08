'use client';

interface StoreItem {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  price: number;
  category: string;
  stock: number;
  active: boolean;
}

interface RedeemConfirmModalProps {
  isOpen: boolean;
  item: StoreItem;
  currentBalance: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function RedeemConfirmModal({
  isOpen,
  item,
  currentBalance,
  onConfirm,
  onCancel,
}: RedeemConfirmModalProps) {
  if (!isOpen) return null;

  const balanceAfter = currentBalance - item.price;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
      onClick={onCancel}
    >
      <div
        className="animate-bounce-in glass-card rounded-xl p-8 max-w-md w-full flex flex-col items-center gap-6"
        style={{
          background: 'var(--glass-bg)',
          border: '1px solid var(--glass-border)',
          boxShadow: 'var(--glass-shadow)',
          borderRadius: '3rem',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {item.imageUrl ? (
          <div className="w-40 h-40 rounded-2xl overflow-hidden bg-surface-container-low shadow-md">
            <img
              src={item.imageUrl}
              alt={item.name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-40 h-40 rounded-2xl bg-surface-container-low flex items-center justify-center">
            <span
              className="material-symbols-outlined text-6xl text-on-surface-variant"
              style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
            >
              shopping_bag
            </span>
          </div>
        )}

        <h2 className="font-headline font-extrabold text-2xl text-on-surface text-center">
          Are you sure?
        </h2>

        <p className="font-body text-lg text-on-surface-variant text-center">
          Redeem <span className="font-bold text-on-surface">{item.name}</span> for{' '}
          <span className="font-bold text-tertiary">{item.price} coins</span>?
        </p>

        <div className="w-full bg-surface-container-lowest/80 rounded-2xl p-5 flex flex-col gap-3 border border-white/50">
          <div className="flex items-center justify-between">
            <span className="font-body text-sm font-medium text-on-surface-variant">Your balance</span>
            <div className="flex items-center gap-2">
              <span
                className="material-symbols-outlined text-lg text-tertiary-container"
                style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
              >
                monetization_on
              </span>
              <span className="font-headline font-extrabold text-lg text-on-surface">{currentBalance}</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-body text-sm font-medium text-on-surface-variant">After redemption</span>
            <div className="flex items-center gap-2">
              <span
                className="material-symbols-outlined text-lg text-tertiary-container"
                style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
              >
                monetization_on
              </span>
              <span className="font-headline font-extrabold text-lg text-on-surface">{balanceAfter}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 w-full">
          <button
            onClick={onConfirm}
            className="bg-action-gradient text-white font-headline font-extrabold text-xl rounded-full shadow-lg hover:scale-95 transition-transform active:scale-90 flex items-center justify-center gap-3"
            style={{ minHeight: '60px' }}
          >
            Redeem Now
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
            >
              shopping_cart_checkout
            </span>
          </button>
          <button
            onClick={onCancel}
            className="bg-surface-container-high text-on-surface-variant font-headline font-bold text-lg rounded-full hover:bg-surface-container-highest transition-colors active:scale-95 border border-outline-variant/30"
            style={{ minHeight: '60px' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
