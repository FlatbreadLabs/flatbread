// The instructions one benchmark session receives: its rules, the read
// commands its strategy allows, and one question. Never the answer.
import { join } from 'node:path';

export const STRATEGIES = ['brief', 'nobrief', 'find', 'findstate'];

const BRIEF_LINE =
  '- `./flatbread proof brief <effortId>`: an Effort\'s latest summary (a "compaction") in full, plus every record that changed since. Its envelope\'s `compaction.stale` is true when a record the summary relies on has changed. Start each Effort you need here.';
const FIND_LINE =
  "- `./flatbread proof find <words> [--all | --effort <effortId>] [--kinds k1,k2] [--as-of iso] [--retracted include|only] [--limit 5]` ranks records by the words they contain, counting all versions of a record as one hit. Its envelope's `cards` field shows each hit's id, standing, best-matching passage, versions, and links.";
const STATE_LINE =
  "- `./flatbread proof state <effortId>` prints where one Effort stands, built from its records' frontmatter and links, in the envelope's `markdown` field; its digest repeats it, so you need not read that. It holds exact counts by kind and standing; open Issues and blockers with what they gate; Risks; Constraints in force; contested topics, with each rejected or replaced version; Issues closed without a fix; live records that rest on dead ones; other dated changes; and retractions. Records with nothing to report, such as an accepted Decision never reopened, appear only in the counts. Long lists are cut and end with `… N more` or `and N more`; page the rest with `records`. It holds nothing from record bodies.";
const NO_BRIEF =
  '\nDo not use `proof brief`. Findings with `kind: compaction` are summaries; check what they claim.\n';
const FIND_FIRST_STATE =
  '\nStart with `find`, or with `state` for counts and the lists it holds. Pass `--all` when the question names no Effort, and `--effort <effortId>` when it does (`list` gives Effort ids). Run `get` on a hit to read its full text. Use `records` to page through records. Do not use `proof brief`. Findings with `kind: compaction` are summaries; check what they claim.\n';
const FIND_FIRST =
  '\nStart with `find`. Pass `--all` when the question names no Effort, and `--effort <effortId>` when it does (`list` gives Effort ids). Run `get` on a hit to read its full text. Use `records` only to count records or to page through them. Do not use `proof brief`. Findings with `kind: compaction` are summaries; check what they claim.\n';

/** Markdown for TASK.md in `folder`, for one question and one strategy. */
export function taskText({ folder, question, format, strategy }) {
  if (!STRATEGIES.includes(strategy))
    throw new Error(`Unknown strategy ${strategy}`);
  const brief = strategy === 'brief';
  // `findstate` is the `find` text plus the `state` line.
  const find = strategy === 'find' || strategy === 'findstate';
  const state = strategy === 'findstate';
  return `# One-question recall test

Answer one question about a project-memory graph, using only its read commands. Every command you run is counted, so be efficient, but a right answer matters most.

## Rules
- Work only inside this folder: \`${folder}\`. Never read, list, or search anything outside it. Never open files under \`.flatbread-proof/\` directly.
- Run one graph command per tool call. No shell loops, scripts, or chains (\`&&\`, \`;\`, \`|\` into another graph command) that run several graph commands at once.

## Read commands
Run from the folder. Each prints a JSON envelope; its \`artifact_path\` names a Markdown digest. Read or grep that digest for evidence.
${find ? FIND_LINE + '\n' : ''}${
    state ? STATE_LINE + '\n' : ''
  }- \`./flatbread proof list --status active,paused,completed,abandoned\` lists Efforts (the default shows only active ones).
${
  brief ? BRIEF_LINE + '\n' : ''
}- \`./flatbread proof records <effortId> [--kinds issue,finding,decision,constraint,risk,citation,blob] [--state s] [--status s] [--kind k] [--retracted include|only] [--limit 25] [--cursor c]\` browses records. Bodies are cut at 600 characters or 12 lines; Blob bodies are left out. Retracted records are left out unless you pass \`--retracted\`, and are marked RETRACTED when shown.
- \`./flatbread proof get <id> [--resolve head]\` shows one record in full, Blob payloads included. \`--resolve head\` follows replacements to the newest version.
- \`./flatbread proof relations <effortId> <fromId> --relations derives_from,supersedes,superseded_by,invalidates,invalidated_by,resolved_by,rejected_by,mitigated_by,evidence,cites\` follows one hop of links.
- \`./flatbread proof blocking-decisions <effortId>\`.
${brief ? '' : state ? FIND_FIRST_STATE : find ? FIND_FIRST : NO_BRIEF}
Records can be superseded (replaced), invalidated (shown wrong), rejected, reopened, or retracted (noise, hidden from browse reads unless asked; \`get\` still shows them). Titles repeat on purpose. Efforts never link to each other; one may name another's record by title in prose. A summary can be out of date; check its claims against the records.

## The question
${question}

Answer format: ${format}. For a record, give its id (such as \`dec-...--...\`). If the graph does not answer the question, or its premise is false, answer the string "unknown".

## When done
Write \`${join(
    folder,
    'answer.json'
  )}\` as \`{"answer": <your answer>}\`, then reply with only the answer.
`;
}
