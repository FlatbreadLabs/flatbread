import { useTheme } from '../hooks/useTheme';
import type { GraphSummary } from '@/presets/effort-graph/lifecycle';
import {
  liveStatusLabel,
  type LiveStatus,
} from '@/presets/effort-graph/useEffortGraphLive';

interface TopBarProps {
  status: LiveStatus;
  generation: number | null;
  summary: GraphSummary;
}

export function TopBar({ status, generation, summary }: TopBarProps) {
  return (
    <header className="pointer-events-auto flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-background/70 px-4 safe-area-x sm:px-5">
      <div className="flex min-w-0 items-baseline gap-3">
        <h1 className="shrink-0 text-[14px] font-semibold tracking-tight text-foreground">
          Effort Graph
        </h1>
        {/*
          Counts are phrased in primitives, not nodes and edges: roughly half of
          the "edges" are synthesised membership spokes, and "173 nodes" tells a
          reader a dot appeared where "2 proposed Decisions" tells them someone
          still owes a call.
        */}
        <p className="hidden min-w-0 truncate text-[12px] tabular-nums text-muted sm:block">
          <Count value={summary.efforts} label="Effort" />
          {' · '}
          <Count value={summary.openIssues} label="open Issue" />
          {' · '}
          <Count value={summary.proposedDecisions} label="proposed Decision" />
          {summary.liveRisks > 0 && (
            <>
              {' · '}
              <Count value={summary.liveRisks} label="live Risk" />
            </>
          )}
          {summary.retired > 0 && (
            <>
              {' · '}
              <span className="text-muted/80">
                <Count
                  value={summary.retired}
                  label="retired"
                  plural="retired"
                />
              </span>
            </>
          )}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <StatusPill status={status} generation={generation} />
        <ThemeToggle />
      </div>
    </header>
  );
}

function Count({
  value,
  label,
  plural,
}: {
  value: number;
  label: string;
  plural?: string;
}) {
  return (
    <>
      {value} {value === 1 ? label : plural ?? `${label}s`}
    </>
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
      ? 'bg-amber-500 motion-safe:animate-pulse'
      : status === 'partial'
      ? 'bg-amber-500'
      : 'bg-red-500';

  return (
    <div
      role="status"
      title={
        status === 'partial'
          ? 'Records loaded, but relationship fields could not be confirmed — retirement links may be missing.'
          : undefined
      }
      /* Fixed width so switching between labels can't shift the toggle. */
      className="flex w-[7.5rem] items-center justify-center gap-1.5 rounded-full border border-border bg-background/60 px-2.5 py-1 text-[12px] text-muted"
    >
      <span
        aria-hidden
        className={`size-1.5 shrink-0 rounded-full ${dotClass}`}
      />
      <span className="font-medium text-foreground">
        {liveStatusLabel(status)}
      </span>
      <span className="tabular-nums text-muted">
        {generation !== null ? `· gen ${generation}` : ''}
      </span>
    </div>
  );
}

function ThemeToggle() {
  const { mode, toggle } = useTheme();
  const label =
    mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="inline-flex size-11 items-center justify-center rounded-full text-foreground transition-colors duration-150 ease-out hover:bg-muted/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent motion-reduce:transition-none"
    >
      {mode === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
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
      width="16"
      height="16"
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
