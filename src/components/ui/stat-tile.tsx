import type { ReactNode } from 'react';
import type { IconType } from 'react-icons';

interface StatTileProps {
  icon: IconType;
  label: string;
  value: ReactNode;
  /** Any colour token, e.g. `var(--accent)`. */
  tone?: string;
  hint?: ReactNode;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
}

/** Compact stat card: round tinted icon and label on the left, the number on the far right. */
export function StatTile({
  icon: Icon,
  label,
  value,
  tone = 'var(--accent)',
  hint,
  isActive = false,
  onClick,
  className = '',
}: StatTileProps) {
  const body = (
    <>
      <span
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full"
        style={{ backgroundColor: `color-mix(in oklab, ${tone} 16%, transparent)`, color: tone }}
      >
        <Icon size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-text-secondary">{label}</span>
        {hint && <span className="mt-0.5 block truncate text-xs text-text-muted">{hint}</span>}
      </span>
      <span className="shrink-0 pl-2 text-right font-numbers text-2xl font-semibold leading-none tracking-tight text-foreground tabular-nums">
        {value}
      </span>
    </>
  );

  const base = `flex min-w-0 items-center gap-3 rounded-[24px] bg-card p-4 text-left ${isActive ? 'ring-2 ring-accent' : ''} ${className}`;

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${base} transition-[background-color,transform] duration-150 hover:bg-foreground/[0.04] active:scale-[0.99]`}>
        {body}
      </button>
    );
  }
  return <div className={base}>{body}</div>;
}
