'use client';

import { Icon } from '@iconify/react';
import { ICON_DATA } from '@/lib/chore-icons.generated';

interface ChoreIconProps {
  /** Iconify ID (e.g. "mdi:broom") or a legacy emoji character. */
  value: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Renders a chore icon. Themed monochrome SVGs (sized to `1em`, colored via
 * `currentColor`) so they inherit the surrounding font-size and text color.
 *
 * Falls back to rendering the raw value as text, which keeps pre-migration
 * emoji values (and any unknown ID) showing instead of breaking.
 */
export function ChoreIcon({ value, className, style }: ChoreIconProps) {
  const data = ICON_DATA[value];
  if (data) {
    return <Icon icon={data} width="1em" height="1em" className={className} style={style} aria-hidden />;
  }
  return (
    <span className={className} style={style} aria-hidden>
      {value}
    </span>
  );
}
