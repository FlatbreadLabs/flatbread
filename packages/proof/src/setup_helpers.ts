import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, relative, resolve } from 'node:path';

import type { DAG, RawTask } from './dag.js';

export type ExpectedGuidelineCategory =
  | 'workspace-rule'
  | 'workspace-contract'
  | 'package-readme'
  | 'skill';

export interface ExpectedGuideline {
  id: string;
  title: string;
  category: ExpectedGuidelineCategory;
  absolutePath: string;
  relativePath: string;
  exists: boolean;
  content?: string;
  sha256?: string;
  sizeBytes?: number;
  mtimeMs?: number;
}

export interface OwnedGuidelineManifestSource {
  id: string;
  title: string;
  category: ExpectedGuidelineCategory;
  path: string;
  sha256: string;
  sizeBytes: number;
  mtimeMs: number;
}

export interface OwnedGuidelinesManifest {
  version: 2;
  generatedAt: string;
  generator: 'proof setup';
  bundlePath: string;
  bundleSha256: string;
  missingExpectedGuidelines: string[];
  updateDirective: string;
  sources: OwnedGuidelineManifestSource[];
}

export interface OwnedGuidelinesFreshness {
  isFresh: boolean;
  reasons: string[];
}

export interface OwnedGuidelinesBundleResult {
  status: 'reused' | 'regenerated';
  bundlePath: string;
  manifestPath: string;
  bundleText: string;
  manifest: OwnedGuidelinesManifest;
  freshness: OwnedGuidelinesFreshness;
}

export interface SetupGaps {
  missingExpectedGuidelines: string[];
  missingFromOwnedBundle: string[];
  staleOwnedBundleEntries: string[];
  unexpectedOwnedBundleEntries: string[];
  hasGaps: boolean;
}

const PROOF_SETUP_UPDATE_DIRECTIVE =
  'If Proof-related work changes rules, docs, skills, prompts, or runtime behavior, update the authoritative source files, run `pnpm -F @flatbread/proof build`, and rerun `pnpm exec proof setup` before concluding so the owned-guidelines bundle and manifest do not go stale.';

const EXPECTED_GUIDELINE_CANDIDATES: Array<{
  id: string;
  title: string;
  category: ExpectedGuidelineCategory;
  relativePath: string;
}> = [
  {
    id: 'proof-usage-guardrails',
    title: 'Proof usage guardrails',
    category: 'workspace-rule',
    relativePath: '.cursor/rules/proof-usage-guardrails.mdc',
  },
  {
    id: 'workspace-agents',
    title: 'Workspace agent contract',
    category: 'workspace-contract',
    relativePath: 'AGENTS.md',
  },
  {
    id: 'proof-readme',
    title: '@flatbread/proof README',
    category: 'package-readme',
    relativePath: 'packages/proof/README.md',
  },
  {
    id: 'proof-skill',
    title: 'Proof skill guide',
    category: 'skill',
    relativePath: '.cursor/skills/proof/SKILL.md',
  },
  {
    id: 'dag-task-runner-compat-skill',
    title: 'Legacy dag-task-runner compatibility skill',
    category: 'skill',
    relativePath: '.cursor/skills/dag-task-runner/SKILL.md',
  },
];

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

function normalizeRelativePath(cwd: string, absolutePath: string): string {
  const rel = relative(cwd, absolutePath);
  if (rel === '') return '.';
  return rel.split('\\').join('/');
}

function compareStringArrays(
  a: readonly string[],
  b: readonly string[]
): boolean {
  if (a.length !== b.length) return false;
  return a.every((value, idx) => value === b[idx]);
}

function sortStrings(values: readonly string[]): string[] {
  return [...values].sort((a, b) => a.localeCompare(b));
}

function fileCodeFenceLanguage(path: string): string {
  if (path.endsWith('.md') || path.endsWith('.mdc')) return 'md';
  if (path.endsWith('.json')) return 'json';
  return 'text';
}

function setupGapLines(gaps: SetupGaps): string[] {
  const lines: string[] = [];
  if (gaps.missingExpectedGuidelines.length > 0) {
    lines.push(
      `Missing expected guidelines: ${gaps.missingExpectedGuidelines.join(
        ', '
      )}`
    );
  }
  if (gaps.missingFromOwnedBundle.length > 0) {
    lines.push(
      `Expected guidelines missing from owned bundle: ${gaps.missingFromOwnedBundle.join(
        ', '
      )}`
    );
  }
  if (gaps.staleOwnedBundleEntries.length > 0) {
    lines.push(
      `Owned bundle entries that are stale versus source files: ${gaps.staleOwnedBundleEntries.join(
        ', '
      )}`
    );
  }
  if (gaps.unexpectedOwnedBundleEntries.length > 0) {
    lines.push(
      `Owned bundle contains unexpected entries: ${gaps.unexpectedOwnedBundleEntries.join(
        ', '
      )}`
    );
  }
  if (lines.length === 0) {
    lines.push('No Proof setup gaps were detected.');
  }
  return lines;
}

function renderGapChecklist(gaps: SetupGaps): string {
  return setupGapLines(gaps)
    .map((line) => `- ${line}`)
    .join('\n');
}

function buildTask(
  id: string,
  depends_on: string[],
  complexity: RawTask['complexity'],
  subtask_prompt: string
): RawTask {
  return { id, depends_on, complexity, subtask_prompt, kind: 'task' };
}

function buildOracleTask(
  id: string,
  depends_on: string[],
  subtask_prompt: string,
  command: string
): RawTask {
  return {
    id,
    depends_on,
    kind: 'oracle',
    complexity: 'LOW',
    subtask_prompt,
    command,
  };
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function isExistingGuideline(
  guideline: ExpectedGuideline
): guideline is ExpectedGuideline & {
  exists: true;
  content: string;
  sha256: string;
  sizeBytes: number;
  mtimeMs: number;
} {
  return (
    guideline.exists &&
    typeof guideline.content === 'string' &&
    typeof guideline.sha256 === 'string' &&
    typeof guideline.sizeBytes === 'number' &&
    typeof guideline.mtimeMs === 'number'
  );
}

export function proofSetupUpdateDirective(): string {
  return PROOF_SETUP_UPDATE_DIRECTIVE;
}

export function buildProofSetupRefreshCommand(
  cwd: string,
  outDir: string
): string {
  return `pnpm -F @flatbread/proof build && pnpm exec proof setup --cwd ${shellQuote(
    cwd
  )} --out-dir ${shellQuote(outDir)}`;
}

export async function discoverExpectedGuidelines(
  cwd: string
): Promise<ExpectedGuideline[]> {
  const guidelines: ExpectedGuideline[] = [];
  for (const candidate of EXPECTED_GUIDELINE_CANDIDATES) {
    const absolutePath = resolve(cwd, candidate.relativePath);
    if (!existsSync(absolutePath)) {
      guidelines.push({
        ...candidate,
        absolutePath,
        exists: false,
      });
      continue;
    }
    const [content, meta] = await Promise.all([
      readFile(absolutePath, 'utf8'),
      stat(absolutePath),
    ]);
    guidelines.push({
      ...candidate,
      absolutePath,
      exists: true,
      content,
      sha256: sha256(content),
      sizeBytes: meta.size,
      mtimeMs: meta.mtimeMs,
    });
  }
  return guidelines;
}

export function buildOwnedGuidelinesBundle(
  guidelines: readonly ExpectedGuideline[],
  bundleRelativePath: string
): { bundleText: string; missingExpectedGuidelines: string[] } {
  const existing = guidelines.filter(isExistingGuideline);
  const missingExpectedGuidelines = sortStrings(
    guidelines
      .filter((guideline) => !guideline.exists)
      .map((guideline) => guideline.relativePath)
  );
  const lines: string[] = [
    '# Owned Proof Guidelines Bundle',
    '',
    'This file is derived by `pnpm exec proof setup`. Do not hand-edit it; edit the source files listed below instead.',
    '',
    '## Maintenance Contract',
    '',
    `- ${PROOF_SETUP_UPDATE_DIRECTIVE}`,
    `- This derived bundle lives at \`${bundleRelativePath}\` and is only trustworthy when its manifest matches the current source files.`,
    '- Treat the source files as authoritative when reconciling conflicts between this bundle and the repo.',
    '',
    '## Included Sources',
    '',
  ];

  if (existing.length === 0) {
    lines.push('_No owned Proof guideline sources were found._', '');
  } else {
    for (const guideline of existing) {
      lines.push(
        `- \`${guideline.relativePath}\` (${guideline.category}, sha256=${guideline.sha256})`
      );
    }
    lines.push('');
  }

  lines.push('## Missing Expected Sources', '');
  if (missingExpectedGuidelines.length === 0) {
    lines.push('_None._', '');
  } else {
    for (const missing of missingExpectedGuidelines) {
      lines.push(`- \`${missing}\``);
    }
    lines.push('');
  }

  for (const guideline of existing) {
    lines.push(`## Source: \`${guideline.relativePath}\``, '');
    lines.push(`Category: ${guideline.category}`, '');
    lines.push(
      `\`\`\`${fileCodeFenceLanguage(guideline.relativePath)}`,
      guideline.content ?? '',
      '```',
      ''
    );
  }

  return {
    bundleText: lines.join('\n').trimEnd() + '\n',
    missingExpectedGuidelines,
  };
}

export function buildOwnedGuidelinesManifest(
  guidelines: readonly ExpectedGuideline[],
  bundleRelativePath: string,
  bundleText: string
): OwnedGuidelinesManifest {
  const existing = guidelines.filter(isExistingGuideline);
  return {
    version: 2,
    generatedAt: new Date().toISOString(),
    generator: 'proof setup',
    bundlePath: bundleRelativePath,
    bundleSha256: sha256(bundleText),
    missingExpectedGuidelines: sortStrings(
      guidelines
        .filter((guideline) => !guideline.exists)
        .map((guideline) => guideline.relativePath)
    ),
    updateDirective: PROOF_SETUP_UPDATE_DIRECTIVE,
    sources: existing.map((guideline) => ({
      id: guideline.id,
      title: guideline.title,
      category: guideline.category,
      path: guideline.relativePath,
      sha256: guideline.sha256,
      sizeBytes: guideline.sizeBytes,
      mtimeMs: guideline.mtimeMs,
    })),
  };
}

export function computeOwnedGuidelinesFreshness(
  cwd: string,
  guidelines: readonly ExpectedGuideline[],
  manifest: OwnedGuidelinesManifest | null,
  bundlePath: string,
  bundleText: string | null
): OwnedGuidelinesFreshness {
  if (bundleText === null) {
    return {
      isFresh: false,
      reasons: ['owned guidelines bundle is missing or unreadable'],
    };
  }
  if (manifest === null) {
    return {
      isFresh: false,
      reasons: ['owned guidelines manifest is missing or unreadable'],
    };
  }

  const reasons: string[] = [];
  const bundleRelativePath = normalizeRelativePath(cwd, bundlePath);
  const expectedBundle = buildOwnedGuidelinesBundle(
    guidelines,
    bundleRelativePath
  );
  const expectedManifest = buildOwnedGuidelinesManifest(
    guidelines,
    bundleRelativePath,
    expectedBundle.bundleText
  );
  const expectedSourcesByPath = new Map(
    expectedManifest.sources.map((source) => [source.path, source])
  );
  const manifestByPath = new Map(
    manifest.sources.map((source) => [source.path, source])
  );

  if (manifest.version !== 2) {
    reasons.push(
      `owned guidelines manifest version ${manifest.version} is stale`
    );
  }
  if (manifest.bundlePath !== bundleRelativePath) {
    reasons.push('owned guidelines bundle path changed');
  }
  if (manifest.bundleSha256 !== sha256(bundleText)) {
    reasons.push('manifest bundle hash does not match bundle content');
  }
  if (bundleText !== expectedBundle.bundleText) {
    reasons.push(
      'owned guidelines bundle content does not match current source files'
    );
  }

  for (const expectedSource of expectedManifest.sources) {
    const manifestEntry = manifestByPath.get(expectedSource.path);
    if (!manifestEntry) {
      reasons.push(`manifest is missing ${expectedSource.path}`);
      continue;
    }
    if (manifestEntry.id !== expectedSource.id) {
      reasons.push(`manifest metadata changed for ${expectedSource.path} (id)`);
    }
    if (manifestEntry.title !== expectedSource.title) {
      reasons.push(
        `manifest metadata changed for ${expectedSource.path} (title)`
      );
    }
    if (manifestEntry.category !== expectedSource.category) {
      reasons.push(
        `manifest metadata changed for ${expectedSource.path} (category)`
      );
    }
    if (manifestEntry.sha256 !== expectedSource.sha256) {
      reasons.push(`${expectedSource.path} changed since last bundle`);
    }
    if (manifestEntry.sizeBytes !== expectedSource.sizeBytes) {
      reasons.push(
        `manifest metadata changed for ${expectedSource.path} (sizeBytes)`
      );
    }
    if (manifestEntry.mtimeMs !== expectedSource.mtimeMs) {
      reasons.push(
        `manifest metadata changed for ${expectedSource.path} (mtimeMs)`
      );
    }
  }

  for (const source of manifest.sources) {
    if (!expectedSourcesByPath.has(source.path)) {
      reasons.push(`manifest contains unexpected source ${source.path}`);
    }
  }

  const expectedMissing = sortStrings(
    expectedManifest.missingExpectedGuidelines
  );
  const manifestMissing = sortStrings(manifest.missingExpectedGuidelines);
  if (!compareStringArrays(expectedMissing, manifestMissing)) {
    reasons.push('missing expected guideline set changed');
  }

  if (manifest.updateDirective !== PROOF_SETUP_UPDATE_DIRECTIVE) {
    reasons.push('update directive changed');
  }

  return {
    isFresh: reasons.length === 0,
    reasons,
  };
}

export function computeSetupGaps(
  guidelines: readonly ExpectedGuideline[],
  manifest: OwnedGuidelinesManifest
): SetupGaps {
  const expectedExisting = new Map(
    guidelines
      .filter((guideline) => guideline.exists)
      .map((guideline) => [guideline.relativePath, guideline])
  );
  const manifestByPath = new Map(
    manifest.sources.map((source) => [source.path, source])
  );

  const missingExpectedGuidelines = sortStrings(
    guidelines
      .filter((guideline) => !guideline.exists)
      .map((guideline) => guideline.relativePath)
  );
  const missingFromOwnedBundle = sortStrings(
    [...expectedExisting.keys()].filter((path) => !manifestByPath.has(path))
  );
  const staleOwnedBundleEntries = sortStrings(
    [...expectedExisting.entries()]
      .filter(([path, guideline]) => {
        const manifestEntry = manifestByPath.get(path);
        return (
          manifestEntry !== undefined &&
          manifestEntry.sha256 !== guideline.sha256
        );
      })
      .map(([path]) => path)
  );
  const unexpectedOwnedBundleEntries = sortStrings(
    manifest.sources
      .map((source) => source.path)
      .filter((path) => !expectedExisting.has(path))
  );

  return {
    missingExpectedGuidelines,
    missingFromOwnedBundle,
    staleOwnedBundleEntries,
    unexpectedOwnedBundleEntries,
    hasGaps:
      missingExpectedGuidelines.length > 0 ||
      missingFromOwnedBundle.length > 0 ||
      staleOwnedBundleEntries.length > 0 ||
      unexpectedOwnedBundleEntries.length > 0,
  };
}

export async function prepareOwnedGuidelinesBundle(opts: {
  cwd: string;
  bundlePath: string;
  manifestPath: string;
  expectedGuidelines: readonly ExpectedGuideline[];
}): Promise<OwnedGuidelinesBundleResult> {
  const { cwd, bundlePath, manifestPath, expectedGuidelines } = opts;
  let existingBundleText: string | null = null;
  if (existsSync(bundlePath)) {
    try {
      existingBundleText = await readFile(bundlePath, 'utf8');
    } catch {
      existingBundleText = null;
    }
  }
  let existingManifest: OwnedGuidelinesManifest | null = null;
  if (existsSync(manifestPath)) {
    try {
      existingManifest = JSON.parse(
        await readFile(manifestPath, 'utf8')
      ) as OwnedGuidelinesManifest;
    } catch {
      existingManifest = null;
    }
  }

  const freshness = computeOwnedGuidelinesFreshness(
    cwd,
    expectedGuidelines,
    existingManifest,
    bundlePath,
    existingBundleText
  );

  if (
    freshness.isFresh &&
    existingManifest !== null &&
    existingBundleText !== null
  ) {
    return {
      status: 'reused',
      bundlePath,
      manifestPath,
      bundleText: existingBundleText,
      manifest: existingManifest,
      freshness,
    };
  }

  const bundleRelativePath = normalizeRelativePath(cwd, bundlePath);
  const { bundleText } = buildOwnedGuidelinesBundle(
    expectedGuidelines,
    bundleRelativePath
  );
  const manifest = buildOwnedGuidelinesManifest(
    expectedGuidelines,
    bundleRelativePath,
    bundleText
  );
  await mkdir(dirname(bundlePath), { recursive: true });
  await writeFile(bundlePath, bundleText, 'utf8');
  await writeFile(
    manifestPath,
    JSON.stringify(manifest, null, 2) + '\n',
    'utf8'
  );

  return {
    status: 'regenerated',
    bundlePath,
    manifestPath,
    bundleText,
    manifest,
    freshness,
  };
}

export function createSetupDag(opts: {
  cwd: string;
  bundlePath: string;
  manifestPath: string;
  summaryPath: string;
  gaps: SetupGaps;
}): DAG {
  const { cwd, bundlePath, manifestPath, summaryPath, gaps } = opts;
  const bundleRef = normalizeRelativePath(cwd, bundlePath);
  const manifestRef = normalizeRelativePath(cwd, manifestPath);
  const summaryRef = normalizeRelativePath(cwd, summaryPath);
  const repoName = basename(resolve(cwd));
  const outDir = dirname(bundlePath);
  const outDirRef = normalizeRelativePath(cwd, outDir);

  const inspectId = 'inspect-proof-setup-context';
  const closeId = 'close-proof-setup-gaps';
  const refreshId = 'refresh-proof-setup-artifacts';
  const reviewId = 'review-proof-setup';
  const tasks: RawTask[] = [
    buildTask(
      inspectId,
      [],
      'LOW',
      [
        `Read \`${summaryRef}\`, \`${bundleRef}\`, and \`${manifestRef}\`.`,
        'Summarize the repo-owned Proof guidance, the current setup status, and the exact gaps that remain.',
        `Treat the source files summarized in \`${bundleRef}\` as authoritative for edits; the bundle itself is derived context.`,
        PROOF_SETUP_UPDATE_DIRECTIVE,
      ].join('\n')
    ),
  ];

  if (gaps.hasGaps) {
    tasks.push(
      buildTask(
        closeId,
        [inspectId],
        'MED',
        [
          'Close the remaining Proof setup gaps described below.',
          renderGapChecklist(gaps),
          `Use \`${summaryRef}\` and \`${bundleRef}\` as the starting context, but edit the authoritative source files in the repo.`,
          PROOF_SETUP_UPDATE_DIRECTIVE,
        ].join('\n\n')
      )
    );
    tasks.push(
      buildOracleTask(
        refreshId,
        [closeId],
        [
          'Refresh the derived Proof setup artifacts after any upstream edits.',
          `Re-run \`proof setup\` so \`${bundleRef}\`, \`${manifestRef}\`, and \`${summaryRef}\` are regenerated from the current authoritative source files before review.`,
          'The refresh command rebuilds `@flatbread/proof` first so runtime/source edits are reflected in the packaged `proof setup` CLI.',
          'This refresh step is required whenever Proof-related work changes rules, docs, skills, prompts, or runtime behavior.',
        ].join('\n\n'),
        buildProofSetupRefreshCommand(cwd, outDirRef)
      )
    );
  }

  tasks.push(
    buildTask(
      reviewId,
      [gaps.hasGaps ? refreshId : inspectId],
      'HIGH',
      [
        'Review the current Proof setup state and any edits made by upstream tasks.',
        'If setup gaps remain, or if Proof-related work changed behavior without the refresh step re-running `proof setup` and re-ingesting the owned guidelines artifacts, report that under `## Blockers` or `## High-severity findings`.',
        `Re-check \`${summaryRef}\`, \`${bundleRef}\`, and \`${manifestRef}\` before concluding.`,
      ].join('\n\n')
    )
  );

  return {
    title: `Proof setup for ${repoName}`,
    framing: [
      'You are working on Proof setup for this repository.',
      `The derived owned-guidelines bundle is \`${bundleRef}\` and its manifest is \`${manifestRef}\`.`,
      PROOF_SETUP_UPDATE_DIRECTIVE,
    ].join('\n\n'),
    tasks,
    loops: gaps.hasGaps
      ? [
          {
            convergeOn: reviewId,
            maxIterations: 2,
            reexecute: { kind: 'tasks', tasks: [closeId, refreshId] },
          },
        ]
      : undefined,
  };
}

export function renderSetupSummary(opts: {
  cwd: string;
  bundle: OwnedGuidelinesBundleResult;
  gaps: SetupGaps;
  dagPath: string;
}): string {
  const { cwd, bundle, gaps, dagPath } = opts;
  const bundleRef = normalizeRelativePath(cwd, bundle.bundlePath);
  const manifestRef = normalizeRelativePath(cwd, bundle.manifestPath);
  const dagRef = normalizeRelativePath(cwd, dagPath);
  const gapLines = setupGapLines(gaps);

  const lines: string[] = [
    '# Proof Setup Summary',
    '',
    `- **Owned guidelines bundle:** \`${bundleRef}\` (${bundle.status})`,
    `- **Owned guidelines manifest:** \`${manifestRef}\``,
    `- **Generated setup DAG:** \`${dagRef}\``,
    `- **Freshness check before this run:** ${
      bundle.freshness.isFresh ? 'fresh' : bundle.freshness.reasons.join('; ')
    }`,
    '',
    '## Guidance Sources',
    '',
  ];

  for (const source of bundle.manifest.sources) {
    lines.push(`- \`${source.path}\` (${source.category})`);
  }
  if (bundle.manifest.sources.length === 0) {
    lines.push(
      '- _No existing owned Proof guideline sources were discovered._'
    );
  }

  lines.push('', '## Gaps', '');
  for (const line of gapLines) {
    lines.push(`- ${line}`);
  }

  lines.push(
    '',
    '## Maintenance Contract',
    '',
    `- ${PROOF_SETUP_UPDATE_DIRECTIVE}`
  );
  lines.push(
    '- Default `proof setup` only refreshes/reuses the owned bundle, computes gaps, and writes the DAG/summary.',
    '- When setup gaps exist, the generated DAG inserts an explicit `proof setup` refresh step after corrective edits so review reads regenerated owned-guidelines artifacts instead of stale pre-edit files.',
    '- Use `proof setup --run-agents` to hand the generated DAG to the existing Proof runner.'
  );

  return lines.join('\n').trimEnd() + '\n';
}
