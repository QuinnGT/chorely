'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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

function WeeklyChoreRowDisplay({ row, onToggle, index }: ChoreRowDisplayProps) {
  const cell = row.days[0];

  if (!cell) return null;

  return (
    <div
      className="animate-card-entrance py-4"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div
            className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl text-2xl shadow-sm"
            style={{
              backgroundColor: 'var(--tertiary-container)',
              color: 'var(--on-tertiary-container)',
            }}
          >
            <ChoreIcon value={row.chore.icon} />
          </div>
          <div className="min-w-0">
            <p className="font-headline text-lg font-bold text-on-surface">
              {row.chore.name}
            </p>
            <p
              className="text-xs font-bold uppercase tracking-tight"
              style={{ color: 'var(--on-surface-variant)' }}
            >
              Once this week
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onToggle(row.assignmentId, cell.date, !cell.completed)}
          disabled={cell.isFuture}
          aria-pressed={cell.completed}
          aria-label={`${cell.completed ? 'Mark incomplete' : 'Mark done'}: ${row.chore.name}`}
          className="flex min-h-[60px] w-full items-center justify-center gap-2 rounded-full px-5 font-headline text-sm font-bold transition-all active:scale-[0.97] disabled:cursor-not-allowed sm:w-auto"
          style={{
            backgroundColor: cell.completed ? 'var(--primary)' : 'var(--surface-container)',
            color: cell.completed ? 'var(--on-primary)' : 'var(--on-surface)',
            opacity: cell.isFuture ? 0.4 : 1,
          }}
        >
          <span
            className="material-symbols-outlined text-xl"
            style={{ fontVariationSettings: cell.completed ? '"FILL" 1' : '"FILL" 0' }}
            aria-hidden="true"
          >
            {cell.completed ? 'check_circle' : 'radio_button_unchecked'}
          </span>
          {cell.completed ? 'Done' : 'Mark done'}
        </button>
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

      toggle(assignmentId, date, newState).then((saved) => {
        if (saved) {
          onToggleSuccess?.();
        }
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

  if (isLoading && localRows.length === 0) {
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

      <div className="relative z-10 mb-8 flex items-center justify-between">
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
          This Week&apos;s Chores
        </h2>
      </div>

      {toggleError && (
        <p className="mb-2 text-sm font-medium" style={{ color: 'var(--error)' }}>{toggleError}</p>
      )}

      {localRows.length === 0 ? (
        <div className="py-8 text-center">
          <span
            className="material-symbols-outlined mb-3 block text-5xl"
            style={{ color: 'var(--on-surface-variant)', fontVariationSettings: '"FILL" 1' }}
          >
            task_alt
          </span>
          <p
            className="font-headline text-lg font-bold"
            style={{ color: 'var(--on-surface-variant)' }}
          >
            No chores assigned this week
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {dailyRows.length > 0 && (
            <section aria-labelledby="daily-chores-heading">
              <div className="mb-2 flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{
                    backgroundColor: 'var(--primary-container)',
                    color: 'var(--on-primary-container)',
                  }}
                >
                  <span
                    className="material-symbols-outlined text-xl"
                    style={{ fontVariationSettings: '"FILL" 1' }}
                    aria-hidden="true"
                  >
                    today
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 id="daily-chores-heading" className="font-headline text-lg font-bold text-on-surface">
                    Daily chores
                  </h3>
                  <p className="text-xs font-medium text-on-surface-variant">
                    Check them off each day
                  </p>
                </div>
                <span
                  aria-label={`${dailyRows.length} daily chores`}
                  className="rounded-full px-3 py-1 text-xs font-bold"
                  style={{
                    backgroundColor: 'var(--surface-container)',
                    color: 'var(--on-surface-variant)',
                  }}
                >
                  {dailyRows.length}
                </span>
              </div>
              <div className="divide-y divide-outline-variant">
                {dailyRows.map((row, index) => (
                  <ChoreRowDisplay
                    key={row.assignmentId}
                    row={row}
                    onToggle={handleToggle}
                    index={index}
                  />
                ))}
              </div>
            </section>
          )}

          {(weeklyRows.length > 0 || bossRows.length > 0) && (
            <section
              aria-labelledby="weekly-chores-heading"
              className={dailyRows.length > 0 ? 'border-t pt-7' : undefined}
              style={{ borderColor: 'var(--outline-variant)' }}
            >
              <div className="mb-2 flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{
                    backgroundColor: 'var(--tertiary-container)',
                    color: 'var(--on-tertiary-container)',
                  }}
                >
                  <span
                    className="material-symbols-outlined text-xl"
                    style={{ fontVariationSettings: '"FILL" 1' }}
                    aria-hidden="true"
                  >
                    date_range
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 id="weekly-chores-heading" className="font-headline text-lg font-bold text-on-surface">
                    Weekly chores
                  </h3>
                  <p className="text-xs font-medium text-on-surface-variant">
                    Finish these anytime this week
                  </p>
                </div>
                <span
                  aria-label={`${weeklyRows.length + bossRows.length} weekly chores`}
                  className="rounded-full px-3 py-1 text-xs font-bold"
                  style={{
                    backgroundColor: 'var(--surface-container)',
                    color: 'var(--on-surface-variant)',
                  }}
                >
                  {weeklyRows.length + bossRows.length}
                </span>
              </div>

              {weeklyRows.length > 0 && (
                <div className="divide-y divide-outline-variant">
                  {weeklyRows.map((row, index) => (
                    <WeeklyChoreRowDisplay
                      key={row.assignmentId}
                      row={row}
                      onToggle={handleToggle}
                      index={index}
                    />
                  ))}
                </div>
              )}

              {bossRows.map((row, index) => (
                <WeeklyBigBossQuest
                  key={row.assignmentId}
                  row={row}
                  onToggle={handleToggle}
                  index={weeklyRows.length + index}
                />
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
