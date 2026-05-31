'use client';

import { useState } from 'react';

interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  /** Effective saved amount (manual contributions + auto-fill). */
  currentAmount: number;
  /** Money the kid put in themselves — the most they can withdraw. */
  manualAmount?: number;
  status: 'active' | 'completed' | 'archived';
}

interface SavingsGoalCardProps {
  goals: SavingsGoal[];
  /** Funds available to move into goals (wallet, or Save jar in jars mode). */
  available?: number;
  onAddGoal?: (goal: Omit<SavingsGoal, 'id' | 'status'>) => void;
  onContribute?: (goalId: string, amount: number) => void;
  onWithdraw?: (goalId: string, amount: number) => void;
}

export type { SavingsGoal, SavingsGoalCardProps };

const GOAL_ICONS: Record<string, string> = {
  bike: 'pedal_bike',
  bicycle: 'pedal_bike',
  toy: 'smart_toy',
  legos: 'smart_toy',
  lego: 'smart_toy',
  game: 'videogame_asset',
  console: 'videogame_asset',
  switch: 'videogame_asset',
  book: 'menu_book',
  music: 'music_note',
  sport: 'sports_soccer',
  default: 'savings',
};

const GOAL_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  bike: { bg: 'bg-primary-container', text: 'text-on-primary-container', bar: 'bg-primary' },
  toy: { bg: 'bg-secondary-container', text: 'text-on-secondary-container', bar: 'bg-secondary' },
  game: { bg: 'bg-tertiary-container', text: 'text-on-tertiary-container', bar: 'bg-tertiary' },
  default: { bg: 'bg-primary-container', text: 'text-on-primary-container', bar: 'bg-primary' },
};

function getGoalIcon(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, icon] of Object.entries(GOAL_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return GOAL_ICONS.default;
}

function getGoalColors(name: string) {
  const lower = name.toLowerCase();
  for (const key of Object.keys(GOAL_COLORS)) {
    if (lower.includes(key)) return GOAL_COLORS[key];
  }
  return GOAL_COLORS.default;
}

function calculateProgress(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min((current / target) * 100, 100);
}

interface AddGoalFormProps {
  onSave: (goal: Omit<SavingsGoal, 'id' | 'status'>) => void;
  onCancel: () => void;
}

function AddGoalForm({ onSave, onCancel }: AddGoalFormProps) {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a goal name');
      return;
    }
    const amount = parseFloat(targetAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    onSave({ name: name.trim(), targetAmount: amount, currentAmount: 0 });
  };

  return (
    <div className="glass-card rounded-xl p-6 animate-bounce-in">
      <h3 className="font-headline text-xl font-bold mb-6">Add New Goal</h3>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-bold text-on-surface-variant mb-2">
            Goal Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            placeholder="What are you saving for?"
            className="w-full h-14 px-4 rounded-xl bg-surface-container-low border-0 focus:ring-2 focus:ring-primary outline-none text-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-on-surface-variant mb-2">
            Target Amount ($)
          </label>
          <input
            type="number"
            value={targetAmount}
            onChange={(e) => {
              setTargetAmount(e.target.value);
              setError('');
            }}
            placeholder="0.00"
            min="0.01"
            step="0.01"
            className="w-full h-14 px-4 rounded-xl bg-surface-container-low border-0 focus:ring-2 focus:ring-primary outline-none text-lg"
          />
        </div>
        {error && <p className="text-sm text-error font-medium">{error}</p>}
        <div className="flex gap-3 mt-2">
          <button
            type="submit"
            className="flex-1 h-14 rounded-full bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold shadow-lg active:scale-95 transition-transform"
          >
            Save Goal
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 h-14 rounded-full bg-surface-container text-on-surface-variant font-bold active:scale-95 transition-transform"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

interface FundModalProps {
  goal: SavingsGoal;
  mode: 'contribute' | 'withdraw';
  available: number;
  onConfirm: (amount: number) => void;
  onCancel: () => void;
}

function FundModal({ goal, mode, available, onConfirm, onCancel }: FundModalProps) {
  const isContribute = mode === 'contribute';
  const manual = goal.manualAmount ?? goal.currentAmount;
  const remaining = Math.max(0, Math.round((goal.targetAmount - goal.currentAmount) * 100) / 100);
  // Most you can add: limited by available funds and the room left to target.
  const max = isContribute ? Math.min(available, remaining) : manual;

  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    const amount = parseFloat(value);
    if (isNaN(amount) || amount <= 0) {
      setError('Enter an amount');
      return;
    }
    if (amount > max + 1e-9) {
      setError(
        isContribute
          ? `You can add up to $${max.toFixed(2)}`
          : `You can take out up to $${max.toFixed(2)}`
      );
      return;
    }
    onConfirm(Math.round(amount * 100) / 100);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
      onClick={onCancel}
    >
      <div
        className="animate-bounce-in glass-card w-full max-w-sm flex flex-col gap-5 p-7"
        style={{ border: '1px solid var(--glass-border)', borderRadius: '2rem' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-headline text-xl font-bold text-on-surface">
          {isContribute ? 'Add money to' : 'Take money from'}{' '}
          <span style={{ color: 'var(--primary)' }}>{goal.name}</span>
        </h3>

        <div className="flex justify-between text-sm font-medium text-on-surface-variant">
          <span>{isContribute ? 'Available to save' : 'You put in'}</span>
          <span className="font-bold text-on-surface">${max.toFixed(2)}</span>
        </div>

        <input
          type="number"
          autoFocus
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError('');
          }}
          placeholder="0.00"
          min="0.01"
          step="0.01"
          className="w-full h-14 px-4 rounded-xl bg-surface-container-low border-0 focus:ring-2 focus:ring-primary outline-none text-lg"
        />

        {max > 0 && (
          <button
            type="button"
            onClick={() => { setValue(max.toFixed(2)); setError(''); }}
            className="self-start text-xs font-bold text-primary"
          >
            {isContribute ? 'Save the max' : 'Take it all'} (${max.toFixed(2)})
          </button>
        )}

        {error && <p className="text-sm text-error font-medium">{error}</p>}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={max <= 0}
            className="flex-1 h-14 rounded-full bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold shadow-lg active:scale-95 transition-transform disabled:opacity-40"
          >
            {isContribute ? 'Add' : 'Take Out'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 h-14 rounded-full bg-surface-container text-on-surface-variant font-bold active:scale-95 transition-transform"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export function SavingsGoalCard({
  goals,
  available = 0,
  onAddGoal,
  onContribute,
  onWithdraw,
}: SavingsGoalCardProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [fundModal, setFundModal] = useState<{ goal: SavingsGoal; mode: 'contribute' | 'withdraw' } | null>(null);

  const activeGoals = goals.filter((g) => g.status === 'active');
  const completedGoals = goals.filter((g) => g.status === 'completed');
  const visibleGoals = [...activeGoals, ...completedGoals];

  const canFund = Boolean(onContribute || onWithdraw);

  const handleAddGoal = (goal: Omit<SavingsGoal, 'id' | 'status'>) => {
    onAddGoal?.(goal);
    setShowAddForm(false);
  };

  const handleFundConfirm = (amount: number) => {
    if (!fundModal) return;
    if (fundModal.mode === 'contribute') onContribute?.(fundModal.goal.id, amount);
    else onWithdraw?.(fundModal.goal.id, amount);
    setFundModal(null);
  };

  const renderGoalActions = (goal: SavingsGoal) => {
    if (!canFund || goal.status === 'archived') return null;
    const manual = goal.manualAmount ?? goal.currentAmount;
    const isComplete = goal.currentAmount + 1e-9 >= goal.targetAmount;
    return (
      <div className="relative z-10 mt-4 flex gap-2">
        {onContribute && (
          <button
            type="button"
            onClick={() => setFundModal({ goal, mode: 'contribute' })}
            disabled={isComplete || available <= 0}
            className="flex-1 h-10 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center gap-1 active:scale-95 transition-transform disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-base">add</span>
            Add
          </button>
        )}
        {onWithdraw && (
          <button
            type="button"
            onClick={() => setFundModal({ goal, mode: 'withdraw' })}
            disabled={manual <= 0}
            className="flex-1 h-10 rounded-full bg-surface-container-high text-on-surface-variant font-bold text-xs flex items-center justify-center gap-1 active:scale-95 transition-transform disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-base">remove</span>
            Take out
          </button>
        )}
      </div>
    );
  };

  if (visibleGoals.length === 0 && !showAddForm) {
    return (
      <section className="mb-12">
        <div className="flex justify-between items-end mb-6 px-2">
          <div>
            <h2 className="font-headline text-2xl font-extrabold tracking-tight">Savings Goals</h2>
            <p className="text-on-surface-variant font-medium">What are we dreaming of?</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-12 flex flex-col items-center justify-center text-center">
          <span
            className="material-symbols-outlined text-8xl text-primary/30 mb-4"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            savings
          </span>
          <h3 className="font-headline text-xl font-bold mb-2">Start Your Savings Journey</h3>
          <p className="text-on-surface-variant font-medium mb-6 max-w-xs">
            Every big goal starts with a small step. Create your first savings goal and watch your dreams come true!
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="h-14 px-8 rounded-full bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold shadow-lg active:scale-95 transition-transform flex items-center gap-2"
          >
            <span className="material-symbols-outlined">add</span>
            Add Your First Goal
          </button>
        </div>
        {showAddForm && (
          <div className="mt-6">
            <AddGoalForm onSave={handleAddGoal} onCancel={() => setShowAddForm(false)} />
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="mb-12">
      <div className="flex justify-between items-end mb-6 px-2">
        <div>
          <h2 className="font-headline text-2xl font-extrabold tracking-tight">Savings Goals</h2>
          <p className="text-on-surface-variant font-medium">What are we dreaming of?</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="h-12 px-6 rounded-full bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold flex items-center gap-2 shadow-lg active:scale-95 transition-transform"
        >
          <span className="material-symbols-outlined">add</span>
          Add Goal
        </button>
      </div>

      <div className="flex overflow-x-auto gap-6 pb-4 scroll-smooth no-scrollbar">
        {visibleGoals.map((goal, index) => {
          const progress = calculateProgress(goal.currentAmount, goal.targetAmount);
          const colors = getGoalColors(goal.name);
          const icon = getGoalIcon(goal.name);
          const isCompleted = goal.status === 'completed';

          return (
            <div
              key={goal.id}
              data-testid={`savings-goal-${goal.id}`}
              className="flex-shrink-0 w-72 glass-card rounded-xl p-6 relative overflow-hidden group animate-card-entrance"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div
                className="absolute -top-4 -right-4 opacity-10 transform transition-transform duration-500 group-hover:scale-125"
                style={{ color: colors.bar }}
              >
                <span className="material-symbols-outlined text-9xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {icon}
                </span>
              </div>

              <div className="relative z-10">
                <div className={`w-12 h-12 ${colors.bg} rounded-full flex items-center justify-center mb-4`}>
                  <span className={`material-symbols-outlined ${colors.text}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                    {icon}
                  </span>
                </div>

                <h3 className="font-headline font-bold text-xl mb-1">{goal.name}</h3>
                <p className="text-sm text-on-surface-variant mb-6">
                  ${goal.currentAmount.toFixed(2)} of ${goal.targetAmount.toFixed(2)}
                </p>

                <div className="w-full bg-surface-container-high h-4 rounded-full overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${colors.bar}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <p className={`text-xs font-bold text-right ${isCompleted ? 'text-green-600' : ''}`} style={!isCompleted ? { color: colors.bar } : undefined}>
                  {isCompleted ? 'Goal Reached!' : `${Math.round(progress)}% reached`}
                </p>
              </div>

              {renderGoalActions(goal)}
            </div>
          );
        })}
      </div>

      {showAddForm && (
        <div className="mt-6">
          <AddGoalForm onSave={handleAddGoal} onCancel={() => setShowAddForm(false)} />
        </div>
      )}

      {fundModal && (
        <FundModal
          goal={fundModal.goal}
          mode={fundModal.mode}
          available={available}
          onConfirm={handleFundConfirm}
          onCancel={() => setFundModal(null)}
        />
      )}
    </section>
  );
}
