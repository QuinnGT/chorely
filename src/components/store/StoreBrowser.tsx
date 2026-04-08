'use client';

import { useState, useMemo } from 'react';
import { StoreItemCard, type StoreItem } from './StoreItemCard';

interface SavingsGoalItem {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  icon?: string;
}

interface StoreBrowserProps {
  items: StoreItem[];
  balance: number;
  savingsGoals?: SavingsGoalItem[];
  onRedeem: (item: StoreItem) => void;
  onAddToGoals: (item: StoreItem) => void;
}

export type { StoreBrowserProps, SavingsGoalItem };

type CategoryFilter = 'all' | 'toys' | 'games' | 'experiences' | 'books';

const CATEGORIES: { id: CategoryFilter; label: string; icon: string }[] = [
  { id: 'all', label: 'All', icon: 'apps' },
  { id: 'toys', label: 'Toys', icon: 'toys' },
  { id: 'games', label: 'Games', icon: 'videogame_asset' },
  { id: 'experiences', label: 'Experiences', icon: 'attractions' },
  { id: 'books', label: 'Books', icon: 'menu_book' },
];

const GOAL_ICONS: Record<string, string> = {
  toy: 'smart_toy',
  game: 'videogame_asset',
  book: 'menu_book',
  default: 'savings',
};

function getGoalIcon(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, icon] of Object.entries(GOAL_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return GOAL_ICONS.default;
}

export function StoreBrowser({ items, balance, savingsGoals = [], onRedeem, onAddToGoals }: StoreBrowserProps) {
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>('all');

  const filteredItems = useMemo(() => {
    if (activeFilter === 'all') return items;
    return items.filter((item) => item.category === activeFilter);
  }, [items, activeFilter]);

  const hasItems = filteredItems.length > 0;

  return (
    <div className="pb-8">
      <section className="mb-8">
        <div className="flex items-center justify-between gap-4 px-2 mt-2 mb-6">
          <div className="flex items-center gap-3">
            <span
              className="material-symbols-outlined text-3xl text-primary"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              storefront
            </span>
            <h1 className="font-headline text-3xl font-extrabold tracking-tight">
              Rewards Store
            </h1>
          </div>

          <div
            className="flex flex-col items-center gap-0.5 px-5 py-2 rounded-2xl shadow-md"
            style={{ backgroundColor: 'var(--tertiary-container)' }}
          >
            <span className="text-[10px] font-semibold text-on-tertiary-container/60 uppercase leading-none">
              My Balance
            </span>
            <div className="flex items-center gap-1.5">
              <span
                className="material-symbols-outlined text-lg text-on-tertiary-container"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                paid
              </span>
              <span className="font-headline font-extrabold text-lg text-on-tertiary-container leading-none">
                {balance}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 px-2">
          {CATEGORIES.map((cat) => {
            const isActive = activeFilter === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveFilter(cat.id)}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all duration-200 active:scale-95 ${
                  isActive
                    ? 'bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-lg'
                    : 'glass-card text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                <span
                  className="material-symbols-outlined text-lg"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {cat.icon}
                </span>
                {cat.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="mb-12">
        {hasItems ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {filteredItems.map((item, index) => (
              <StoreItemCard
                key={item.id}
                item={item}
                balance={balance}
                index={index}
                onRedeem={onRedeem}
                onAddToGoals={onAddToGoals}
              />
            ))}
          </div>
        ) : (
          <div className="glass-card rounded-xl p-12 flex flex-col items-center justify-center text-center">
            <div className="relative mb-6">
              <span
                className="material-symbols-outlined text-8xl text-primary/20 animate-float"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                storefront
              </span>
              <span
                className="material-symbols-outlined text-4xl text-tertiary absolute -top-2 -right-2 animate-bounce-in"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                add_circle
              </span>
            </div>
            <h3 className="font-headline text-xl font-bold mb-2">
              No rewards yet!
            </h3>
            <p className="text-on-surface-variant font-medium max-w-xs">
              Ask your parents to add some awesome rewards to the store!
            </p>
          </div>
        )}
      </section>

      {savingsGoals.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6 px-2">
            <span
              className="material-symbols-outlined text-2xl text-primary"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              flag
            </span>
            <h2 className="font-headline text-2xl font-extrabold tracking-tight">
              My Goals
            </h2>
          </div>

          <div className="flex overflow-x-auto gap-4 pb-4 no-scrollbar scroll-smooth">
            {savingsGoals.map((goal, index) => {
              const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
              const icon = goal.icon || getGoalIcon(goal.name);

              return (
                <div
                  key={goal.id}
                  className="flex-shrink-0 w-64 glass-card rounded-xl p-5 relative overflow-hidden group animate-card-entrance"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="absolute -top-4 -right-4 opacity-10 transition-transform duration-500 group-hover:scale-125">
                    <span
                      className="material-symbols-outlined text-8xl text-primary"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      {icon}
                    </span>
                  </div>

                  <div className="relative z-10">
                    <div className="w-10 h-10 bg-primary-container rounded-full flex items-center justify-center mb-3">
                      <span
                        className="material-symbols-outlined text-on-primary-container"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        {icon}
                      </span>
                    </div>

                    <h3 className="font-headline font-bold text-base mb-1 truncate">
                      {goal.name}
                    </h3>
                    <p className="text-xs text-on-surface-variant mb-4">
                      ${goal.currentAmount.toFixed(2)} of ${goal.targetAmount.toFixed(2)}
                    </p>

                    <div className="w-full bg-surface-container-high h-3 rounded-full overflow-hidden mb-1.5">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-primary-container rounded-full transition-all duration-700"
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    <p className="text-[10px] font-bold text-primary text-right">
                      {Math.round(progress)}% reached
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
