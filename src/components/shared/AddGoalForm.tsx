'use client';

import { useState } from 'react';

interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  status: 'active' | 'completed' | 'archived';
}

interface AddGoalFormProps {
  onSave: (goal: Omit<SavingsGoal, 'id' | 'status'>) => void;
  onCancel: () => void;
}

export type { AddGoalFormProps };

export function AddGoalForm({ onSave, onCancel }: AddGoalFormProps) {
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
      setError('Please enter a valid target amount');
      return;
    }
    onSave({ name: name.trim(), targetAmount: amount, currentAmount: 0 });
  };

  return (
    <div className="glass-card rounded-xl p-6 animate-bounce-in max-w-md mx-auto">
      <h3 className="font-headline text-xl font-bold mb-6 flex items-center gap-2">
        <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
          add_circle
        </span>
        Add New Goal
      </h3>
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
            className="w-full min-h-[60px] px-4 rounded-xl bg-surface-container-low border-0 focus:ring-2 focus:ring-primary outline-none text-lg"
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
            className="w-full min-h-[60px] px-4 rounded-xl bg-surface-container-low border-0 focus:ring-2 focus:ring-primary outline-none text-lg"
          />
        </div>
        {error && (
          <p className="text-sm text-error font-medium flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">error</span>
            {error}
          </p>
        )}
        <div className="flex gap-3 mt-2">
          <button
            type="submit"
            className="flex-1 min-h-[60px] rounded-full bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">save</span>
            Save Goal
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 min-h-[60px] rounded-full bg-surface-container text-on-surface-variant font-bold active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">close</span>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
