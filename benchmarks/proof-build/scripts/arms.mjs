// The task text one build-benchmark session receives, for each arm. The
// part that is not about Proof is the same in every arm: the folder rule,
// the request, and the closing line. Arms differ only in the block between
// the folder rule and the request, and in what their clone holds (see
// CLONE). Nothing here names a task, a rule, or a record.

export const ARMS = [
  'none',
  'skill',
  'brief',
  'find',
  'findcode',
  'dump',
  'dump10x',
];

/**
 * What each arm's clone is made from and holds. `bed` is the bed variant
 * (`none`, `proof`, or `proof10x`); `proof` adds the skill, the
 * `./flatbread` wrapper, the node_modules link, and the AGENTS.md line;
 * `inject` names the text pasted into the task (`brief` or `dump`).
 */
export const CLONE = {
  none: { bed: 'none', proof: false },
  skill: { bed: 'proof', proof: true },
  brief: { bed: 'proof', proof: true, inject: 'brief' },
  find: { bed: 'proof', proof: true },
  findcode: { bed: 'proof', proof: true },
  dump: { bed: 'proof', proof: true, inject: 'dump' },
  dump10x: { bed: 'proof10x', proof: true, inject: 'dump' },
};

/** The line every Proof arm's AGENTS.md gains. `none` has no such line. */
export const AGENTS_LINE =
  'Project memory (decisions, constraints, findings) lives in Proof; read it with `./flatbread proof …` (see the proof skill).';

/** Every arm's CLAUDE.md, so AGENTS.md loads the same way in each. */
export const CLAUDE_MD = '@AGENTS.md\n';

const FIND =
  'Before planning, run `./flatbread proof find <words from the request> --all`, then `./flatbread proof get <id>` for any hit that bears on the request.';
const FIND_CODE =
  'Before editing a file, run `./flatbread proof find --path <file>`. Before relying on a Decision, run `./flatbread proof find <words> --refs all`.';

/** The arm's block. `inject` is the brief or dump text for those arms. */
function armBlock(arm, inject) {
  switch (arm) {
    case 'none':
    case 'skill':
      return '';
    case 'brief':
      return `## Project memory briefs

The output of \`./flatbread proof brief <effort>\` for each Effort in this repository.

${inject}
`;
    case 'find':
      return `## Before you start

${FIND}
`;
    case 'findcode':
      return `## Before you start

${FIND}
${FIND_CODE}
`;
    case 'dump':
    case 'dump10x':
      return `## Project memory records

Every live record in this repository's project memory, grouped by Effort.

${inject}
`;
    default:
      throw new Error(`Unknown arm ${arm}`);
  }
}

export const CLOSING = {
  build: 'Implement it, add tests, and run the test suite.',
  plan: 'Write PLAN.md in the repository root; do not change code.',
};

/**
 * Markdown for one session: `kind` is `build` or `plan`, `prompt` the
 * request in the user's words, `folder` the clone's absolute path, and
 * `inject` the pasted text for `brief` and `dump` arms.
 */
export function armText({ arm, kind, prompt, folder, inject = '' }) {
  if (!ARMS.includes(arm)) throw new Error(`Unknown arm ${arm}`);
  if (!CLOSING[kind]) throw new Error(`Unknown task kind ${kind}`);
  if (CLONE[arm].inject && !inject.trim())
    throw new Error(`Arm ${arm} needs its ${CLONE[arm].inject} text`);
  const block = armBlock(arm, inject.trim());
  return `# Task

You are working in a git repository at \`${folder}\`. Work only inside this folder: do not read, list, or search anything outside it.
${block ? `\n${block}` : ''}
## Request

${prompt.trim()}

${CLOSING[kind]}
`;
}
