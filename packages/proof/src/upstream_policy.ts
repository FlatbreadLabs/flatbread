/**
 * Upstream prompt excerpt policy for child tasks and convergence `extraContext`.
 * Full parent transcripts are trimmed here with explicit, counted banners — never silent `…`.
 */

/** Default cap on upstream prose stitched into each child prompt (chars). */
export const UPSTREAM_SNIPPET_CAP = 2000;

/** Canvas / `TaskState.resultText` streaming display bound (chars). */
export const CANVAS_DISPLAY_CAP = 4000;

export type UpstreamPolicyMode = 'full' | 'summarize';

/**
 * Matches the first line emitted by the canvas display buffer when it drops
 * earlier prefix characters.
 */
export const DISPLAY_TRUNCATION_BANNER_RE =
  /^\[\.\.\.truncated (\d+) earlier chars\.\.\.\]$/;

export interface UpstreamSection {
  /** Original heading text minus the leading `## `, trimmed. */
  heading: string;
  /** Lower-cased trimmed heading for drop-priority comparisons. */
  normalized: string;
  /** Body lines below the heading (sub-headings stay attached). */
  bodyLines: string[];
}

/**
 * Drop priority used by section-aware summarization. Last entry is the last
 * one we give up — i.e. `## Proposed contract` is preserved longest.
 */
const SECTION_DROP_PRIORITY: readonly string[] = [
  'current contract',
  'validation plan',
  'human checkpoints',
  'migration impact',
  'proposed contract',
];

/** Mirrors converge_loop's heading regex: `## …` only, never `### …`. */
const UPSTREAM_HEADING_RE = /^##(?!#)\s*(.+?)\s*$/;

export interface UpstreamSummarizeStats {
  originalChars: number;
  excerptChars: number;
  droppedSectionTitles: string[];
  /** True when bytes were dropped only because of the numeric cap after section drops. */
  hardLimited: boolean;
}

function truncateWithEllipsisLegacy(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + '…';
}

/**
 * Parses `## ` sections. Preserves pre-heading text as a synthetic first
 * section so section-aware drops cannot silently discard a parent preamble.
 * When that preamble is the display-buffer truncation banner, the synthetic
 * heading makes the warning durable inside child prompts.
 */
export function parseUpstreamSections(text: string): UpstreamSection[] {
  const lines = text.split(/\r?\n/);
  const preamble: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const m = UPSTREAM_HEADING_RE.exec(line);
    if (m) break;
    preamble.push(line);
    i++;
  }

  const sections: UpstreamSection[] = [];

  const meaningfulPreamble = preamble.some((ln) => ln.trim() !== '');
  if (meaningfulPreamble) {
    const hasDisplayBanner = preamble.some((ln) =>
      DISPLAY_TRUNCATION_BANNER_RE.test(ln.trim())
    );
    sections.push({
      heading: hasDisplayBanner
        ? 'Upstream truncation notice'
        : 'Upstream preamble',
      normalized: hasDisplayBanner
        ? 'upstream truncation notice'
        : 'upstream preamble',
      bodyLines: preamble,
    });
  }

  while (i < lines.length) {
    const line = lines[i];
    const m = UPSTREAM_HEADING_RE.exec(line);
    if (m) {
      const heading = m[1].trim();
      const section: UpstreamSection = {
        heading,
        normalized: heading.toLowerCase(),
        bodyLines: [],
      };
      i++;
      while (i < lines.length) {
        const inner = lines[i];
        if (UPSTREAM_HEADING_RE.test(inner)) break;
        section.bodyLines.push(inner);
        i++;
      }
      sections.push(section);
    } else {
      i++;
    }
  }

  return sections;
}

export function renderUpstreamSections(sections: UpstreamSection[]): string {
  return sections
    .map((s) => `## ${s.heading}\n${s.bodyLines.join('\n')}`.trimEnd())
    .join('\n\n');
}

function summarizeWithinCap(
  text: string,
  cap: number
): { excerpt: string; droppedSectionTitles: string[]; hardLimited: boolean } {
  const droppedSectionTitles: string[] = [];

  if (text.length <= cap) {
    return { excerpt: text, droppedSectionTitles, hardLimited: false };
  }
  const parsed = parseUpstreamSections(text);
  if (parsed.length < 2) {
    return {
      excerpt: truncateWithEllipsisLegacy(text, cap),
      droppedSectionTitles,
      hardLimited: text.length > cap,
    };
  }

  let kept = parsed.slice();

  for (const dropTarget of SECTION_DROP_PRIORITY) {
    if (renderUpstreamSections(kept).length <= cap) break;
    const idx = kept.findIndex(
      (s, idx2) => idx2 > 0 && s.normalized === dropTarget
    );
    if (idx === -1) continue;
    droppedSectionTitles.push(kept[idx]!.heading);
    kept.splice(idx, 1);
  }

  let rendered = renderUpstreamSections(kept);
  let hardLimited = false;
  if (rendered.length > cap) {
    rendered = truncateWithEllipsisLegacy(rendered, cap);
    hardLimited = true;
  }
  return { excerpt: rendered, droppedSectionTitles, hardLimited };
}

function formatUpstreamBanner(
  stats: UpstreamSummarizeStats,
  cap: number
): string {
  const parts: string[] = [
    `parent output was ${stats.originalChars} chars`,
    `excerpt is ${stats.excerptChars} chars`,
    `cap=${cap}`,
  ];
  if (stats.droppedSectionTitles.length > 0) {
    parts.push(`sections dropped: ${stats.droppedSectionTitles.join(', ')}`);
  }
  if (stats.hardLimited) {
    parts.push(
      `hard slice applied after structural trim (no silent ellipsis boundary in excerpt body)`
    );
  }
  return `[...upstream excerpt: ${parts.join('; ')}]`;
}

/** Replace trailing Unicode ellipsis from our hard slice with a visible sentence. */
function stripTrailingStructuralEllipsis(
  excerpt: string,
  hardLimited: boolean
): string {
  if (hardLimited && excerpt.endsWith('…')) {
    return (
      excerpt.slice(0, -1) + '[...truncated in excerpt body at char cap …]'
    );
  }
  return excerpt;
}

export function summarizeUpstreamForPrompt(
  fullText: string,
  cap: number
): {
  excerpt: string;
  stats: UpstreamSummarizeStats;
} {
  const originalChars = fullText.length;
  const inner = summarizeWithinCap(fullText, cap);
  const excerptCore = stripTrailingStructuralEllipsis(
    inner.excerpt,
    inner.hardLimited
  );

  const shortened =
    inner.droppedSectionTitles.length > 0 ||
    inner.hardLimited ||
    excerptCore.length < originalChars;

  if (!shortened) {
    return {
      excerpt: excerptCore,
      stats: {
        originalChars,
        excerptChars: excerptCore.length,
        droppedSectionTitles: [],
        hardLimited: false,
      },
    };
  }

  const statsForBanner: UpstreamSummarizeStats = {
    originalChars,
    excerptChars: excerptCore.length,
    droppedSectionTitles: inner.droppedSectionTitles,
    hardLimited: inner.hardLimited,
  };

  const bannered = `${formatUpstreamBanner(
    statsForBanner,
    cap
  )}\n\n${excerptCore}`;
  return {
    excerpt: bannered,
    stats: statsForBanner,
  };
}

/**
 * Applies the upstream excerpt policy used for stitch into child prompts and
 * inside convergence `extraContext`.
 */
export function excerptUpstreamForPrompt(
  fullText: string,
  mode: UpstreamPolicyMode,
  snippetCap = UPSTREAM_SNIPPET_CAP
): string {
  const trimmed = fullText.trimEnd();
  if (mode === 'full') return trimmed;

  const { excerpt } = summarizeUpstreamForPrompt(trimmed, snippetCap);
  return excerpt;
}
