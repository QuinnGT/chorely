'use client';

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

interface StoreItemCardProps {
  item: StoreItem;
  balance: number;
  index: number;
  onRedeem: (item: StoreItem) => void;
  onAddToGoals: (item: StoreItem) => void;
}

export type { StoreItem, StoreItemCardProps };

const CATEGORY_ICONS: Record<string, string> = {
  toys: 'toys',
  games: 'videogame_asset',
  experiences: 'attractions',
  books: 'menu_book',
};

const CATEGORY_LABELS: Record<string, string> = {
  toys: 'Toy',
  games: 'Game',
  experiences: 'Experience',
  books: 'Book',
};

export function StoreItemCard({ item, balance, index, onRedeem, onAddToGoals }: StoreItemCardProps) {
  const canAfford = balance >= item.price;
  const isOutOfStock = item.stock <= 0;
  const categoryIcon = CATEGORY_ICONS[item.category] || 'category';
  const categoryLabel = CATEGORY_LABELS[item.category] || item.category;

  return (
    <div
      data-testid={`store-item-${item.id}`}
      className="glass-card rounded-xl overflow-hidden flex flex-col group transition-all duration-300 hover:scale-105 hover:shadow-[0_8px_40px_rgba(0,0,0,0.12)] animate-card-entrance"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="relative aspect-[4/3] bg-surface-container-low overflow-hidden">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-surface-container-low to-surface-container">
            <span
              className="material-symbols-outlined text-6xl text-on-surface-variant/30"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {categoryIcon}
            </span>
          </div>
        )}

        <div className="absolute top-3 left-3">
          <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-white/70 backdrop-blur-xl text-on-surface-variant">
            {categoryLabel}
          </span>
        </div>

        {isOutOfStock && (
          <div className="absolute inset-0 bg-on-surface/50 flex items-center justify-center">
            <span className="bg-error text-on-error px-4 py-2 rounded-full font-bold text-sm">
              Sold Out
            </span>
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-headline font-bold text-lg leading-tight mb-1 line-clamp-2">
          {item.name}
        </h3>

        <p className="text-sm text-on-surface-variant mb-1 line-clamp-2 flex-1">
          {item.description}
        </p>

        <div className="mt-auto">
          <div className="flex items-center gap-2">
            <span
              className="material-symbols-outlined text-xl text-tertiary"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              paid
            </span>
            <span className="font-headline font-extrabold text-xl text-on-surface">
              {item.price}
            </span>
            <span className="text-xs font-bold text-on-surface-variant uppercase">
              coins
            </span>
          </div>

          {!isOutOfStock && (
            <button
              type="button"
              onClick={() => canAfford ? onRedeem(item) : onAddToGoals(item)}
              className={`mt-2 w-full px-3 py-1.5 rounded-full font-bold text-xs flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-95 ${
                canAfford
                  ? 'bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-lg hover:shadow-xl'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              <span
                className="material-symbols-outlined text-base"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {canAfford ? 'shopping_bag' : 'flag'}
              </span>
              {canAfford ? 'Redeem' : 'Add to Goals'}
            </button>
          )}

          <p className={`text-xs mt-1 font-medium ${!canAfford && !isOutOfStock ? 'text-on-surface-variant' : 'invisible'}`}>
            You need <span className="font-bold text-tertiary">{Math.max(item.price - balance, 0)} more coins</span>
          </p>
        </div>
      </div>
    </div>
  );
}
