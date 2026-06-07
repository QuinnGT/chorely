'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import { useChoreGrid, type ChoreRow } from '@/hooks/useChoreGrid';
import { useToggleCompletion } from '@/hooks/useToggleCompletion';
import { ChoreCheckbox } from '@/components/ChoreCheckbox';
import { ChoreIcon } from '@/components/ChoreIcon';

interface ChoreGridProps {
  kidId: string;
  onToggleSuccess?: () => void;
  rows?: ChoreRow[];
}

interface ChoreRowDisplayProps {
  row: ChoreRow;
  onToggle: (assignmentId: string, date: string, newState: boolean) => void;
  index: number;
}

const DAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function getDayInitial(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return DAY_INITIALS[date.getDay() === 0 ? 6 : date.getDay() - 1];
}

function ChoreRowDisplay({ row, onToggle, index }: ChoreRowDisplayProps) {
  const completedCount = row.days.filter(d => d.completed).length;
  const totalReward = (completedCount * 0.5).toFixed(2);

  return (
    <div 
      className="animate-card-entrance"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="flex items-center gap-4 py-4">
        <div 
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm flex-shrink-0"
          style={{ 
            backgroundColor: row.chore.frequency === 'weekly' 
              ? 'var(--tertiary-container)' 
              : 'var(--primary-container)',
            color: row.chore.frequency === 'weekly'
              ? 'var(--on-tertiary-container)'
              : 'var(--on-primary-container)'
          }}
        >
          <ChoreIcon value={row.chore.icon} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-headline font-bold text-lg text-on-surface">{row.chore.name}</p>
          <p className="text-xs uppercase font-bold tracking-tight" style={{ color: 'var(--on-surface-variant)' }}>
            + ${totalReward} {row.chore.frequency}
          </p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {row.days.map((cell) => (
            <ChoreCheckbox
              key={cell.date}
              assignmentId={row.assignmentId}
              date={cell.date}
              completed={cell.completed}
              disabled={cell.isFuture}
              onToggle={onToggle}
              dayLabel={getDayInitial(cell.date)}
              isToday={cell.isToday}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function WeeklyBigBossQuest({ row, onToggle, index }: ChoreRowDisplayProps) {
  const cell = row.days[0];

  if (!cell) return null;

  const completed = cell.completed;
  const reward = row.chore.rewardAmount.toFixed(2);

  return (
    <div 
      className="relative mt-6 flex flex-col gap-4 overflow-hidden rounded-xl p-6 text-white animate-card-entrance sm:flex-row sm:items-center sm:justify-between"
      style={{ 
        background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dim) 100%)',
        animationDelay: `${400 + index * 80}ms`,
      }}
    >
      <div className="z-10 flex min-w-0 items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-3xl shadow-sm">
          <ChoreIcon value={row.chore.icon} />
        </div>
        <div className="min-w-0">
          <p className="mb-1 text-xs font-bold uppercase opacity-80">
            Weekly Big Boss Quest
          </p>
          <h3 className="mb-1 truncate font-headline text-xl font-bold">
            {row.chore.name}
          </h3>
          <p className="line-clamp-2 text-sm opacity-85">
            {(row.chore.description?.trim() || 'Finish the weekly boss quest')} for +${reward}
          </p>
        </div>
      </div>
      <button 
        type="button"
        onClick={() => onToggle(row.assignmentId, cell.date, !completed)}
        disabled={cell.isFuture}
        className="z-10 w-full rounded-full bg-white px-6 py-3 font-headline font-black shadow-xl transition-all hover:scale-105 active:scale-[0.96] disabled:cursor-not-allowed sm:w-auto"
        style={{ 
          color: 'var(--primary)',
          minHeight: '60px',
          minWidth: '148px',
          opacity: cell.isFuture ? 0.6 : 1,
        }}
      >
        {completed ? 'QUEST DONE' : 'COMPLETE QUEST'}
      </button>
      <span 
        className="material-symbols-outlined absolute -right-4 -bottom-4 text-9xl opacity-10 rotate-12"
        style={{ fontVariationSettings: '"FILL" 1' }}
      >
        rocket_launch
      </span>
    </div>
  );
}

export function ChoreGrid({ kidId, onToggleSuccess, rows: propRows }: ChoreGridProps) {
  const { rows: serverRows, isLoading, error, refetch } = useChoreGrid(kidId);
  const { toggle, error: toggleError } = useToggleCompletion(refetch);

  const rows = propRows ?? serverRows;

  const [activeTab, setActiveTab] = useState<'main' | 'bonus'>('main');
  const [localRows, setLocalRows] = useState<ChoreRow[]>([]);

  useEffect(() => {
    setLocalRows(rows);
  }, [rows]);

  const handleToggle = useCallback(
    (assignmentId: string, date: string, newState: boolean) => {
      setLocalRows((prev) =>
        prev.map((row) => {
          if (row.assignmentId !== assignmentId) return row;
          return {
            ...row,
            days: row.days.map((cell) => {
              if (cell.date !== date) return cell;
              return { ...cell, completed: newState };
            }),
          };
        })
      );

      toggle(assignmentId, date, newState).then(() => {
        onToggleSuccess?.();
      });
    },
    [toggle, onToggleSuccess]
  );

  const dailyRows = useMemo(
    () => localRows.filter((r) => r.chore.kind === 'standard' && r.chore.frequency === 'daily'),
    [localRows]
  );
  const weeklyRows = useMemo(
    () => localRows.filter((r) => r.chore.kind === 'standard' && r.chore.frequency === 'weekly'),
    [localRows]
  );
  const bossRows = useMemo(
    () => localRows.filter((r) => r.chore.kind === 'big_boss'),
    [localRows]
  );

  if (isLoading) {
    return (
      <div 
        className="p-8 flex items-center justify-center shadow-[0_8px_24px_rgba(0,0,0,0.06)]"
        style={{ 
          backgroundColor: 'var(--surface-container-lowest)',
          borderRadius: '3rem'
        }}
      >
        <p className="text-lg" style={{ color: 'var(--on-surface-variant)' }}>Loading quests…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div 
        className="p-8 flex flex-col items-center justify-center gap-3 shadow-[0_8px_24px_rgba(0,0,0,0.06)]"
        style={{ 
          backgroundColor: 'var(--surface-container-lowest)',
          borderRadius: '3rem'
        }}
      >
        <p className="text-lg" style={{ color: 'var(--error)' }}>Couldn&apos;t load quests. Try again.</p>
        <button
          type="button"
          onClick={refetch}
          className="rounded-full font-semibold text-white px-6"
          style={{ 
            minHeight: '60px',
            backgroundColor: 'var(--primary)'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div 
      className="p-8 shadow-[0_8px_24px_rgba(0,0,0,0.06)] relative overflow-hidden"
      style={{ 
        backgroundColor: 'var(--surface-container-lowest)',
        borderRadius: '3rem'
      }}
    >
      <div 
        className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl"
        style={{ backgroundColor: 'var(--primary-container)', opacity: 0.15 }}
      />

      <div className="flex items-center justify-between mb-8 relative z-10">
        <h2 
          className="text-2xl font-headline font-bold text-on-surface flex items-center gap-2"
          style={{ color: 'var(--on-surface)' }}
        >
          <span 
            className="material-symbols-outlined text-primary"
            style={{ fontVariationSettings: '"FILL" 1' }}
          >
            calendar_view_week
          </span>
          This Week&apos;s Quests
        </h2>
        <div 
          className="flex rounded-full p-1"
          style={{ backgroundColor: 'var(--surface-container)' }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('main')}
            className="px-4 py-1.5 rounded-full text-sm font-bold transition-all"
            style={{
              backgroundColor: activeTab === 'main' ? 'var(--surface-container-lowest)' : 'transparent',
              color: activeTab === 'main' ? 'var(--on-surface)' : 'var(--on-surface-variant)',
              boxShadow: activeTab === 'main' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            Main
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bonus')}
            className="px-4 py-1.5 rounded-full text-sm font-bold transition-all"
            style={{
              backgroundColor: activeTab === 'bonus' ? 'var(--surface-container-lowest)' : 'transparent',
              color: activeTab === 'bonus' ? 'var(--on-surface)' : 'var(--on-surface-variant)',
              boxShadow: activeTab === 'bonus' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            Bonus
          </button>
        </div>
      </div>

      {toggleError && (
        <p className="mb-2 text-sm font-medium" style={{ color: 'var(--error)' }}>{toggleError}</p>
      )}

      <div className="space-y-4">
        {activeTab === 'main' ? (
          dailyRows.map((row, index) => (
            <ChoreRowDisplay 
              key={row.assignmentId} 
              row={row} 
              onToggle={handleToggle}
              index={index}
            />
          ))
        ) : weeklyRows.length > 0 ? (
          weeklyRows.map((row, index) => (
            <ChoreRowDisplay 
              key={row.assignmentId} 
              row={row} 
              onToggle={handleToggle}
              index={index}
            />
          ))
        ) : bossRows.length > 0 ? (
          null
        ) : (
          <div className="py-8 text-center">
            <span
              className="material-symbols-outlined text-5xl mb-3 block"
              style={{ color: 'var(--on-surface-variant)', fontVariationSettings: '"FILL" 1' }}
            >
              explore_off
            </span>
            <p className="font-headline font-bold text-lg" style={{ color: 'var(--on-surface-variant)' }}>
              No bonus quests this week
            </p>
          </div>
        )}
      </div>

      {bossRows.map((row, index) => (
        <WeeklyBigBossQuest
          key={row.assignmentId}
          row={row}
          onToggle={handleToggle}
          index={index}
        />
      ))}
    </div>
  );
}
