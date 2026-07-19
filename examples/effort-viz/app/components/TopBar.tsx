'use client';

import { useTheme } from '../hooks/useTheme';
import type { LiveStatus } from '@/lib/useEffortGraphLive';

interface TopBarProps {
  status: LiveStatus;
  generation: number | null;
  nodeCount: number;
  edgeCount: number;
}

const STATUS_LABEL: Record<LiveStatus, string> = {
  connecting: 'Connecting',
  live: 'Live',
  error: 'Disconnected',
};

export function TopBar({ status, generation, nodeCount, edgeCount }: TopBarProps) {
  return (
    <header className="pointer-events-auto flex h-14 shrink-0 items-center justify-between border-b border-border bg-background/70 px-5 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <span className="text-[13px] font-semibold tracking-tight text-foreground">
          Effort Graph
        </span>
        <span className="hidden text-[11px] text-muted sm:inline">
          {nodeCount} nodes · {edgeCount} edges
        </span>
      </div>
      <div className="flex items-center gap-2">
        <StatusPill status={status} generation={generation} />
        <ThemeToggle />
      </div>
    </header>
  );
}

function StatusPill({
  status,
  generation,
}: {
  status: LiveStatus;
  generation: number | null;
}) {
  const dotClass =
    status === 'live'
      ? 'bg-emerald-500'
      : status === 'connecting'
        ? 'bg-amber-500 animate-pulse'
        : 'bg-red-500';

  return (
    <div className="flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-2.5 py-1 text-[11px] text-muted">
      <span aria-hidden className={`size-1.5 rounded-full ${dotClass}`} />
      <span className="font-medium text-foreground">
        {STATUS_LABEL[status]}
      </span>
      {generation !== null && (
        <span className="tabular-nums text-muted">· gen {generation}</span>
      )}
    </div>
  );
}

function ThemeToggle() {
  const { mode, toggle } = useTheme();
  const label = mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="inline-flex size-8 items-center justify-center rounded-full border border-border bg-background/60 text-foreground transition-colors hover:bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {mode === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2" />
      <path d="M12 19v2" />
      <path d="M4.93 4.93l1.41 1.41" />
      <path d="M17.66 17.66l1.41 1.41" />
      <path d="M3 12h2" />
      <path d="M19 12h2" />
      <path d="M4.93 19.07l1.41-1.41" />
      <path d="M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
    </svg>
  );
}
