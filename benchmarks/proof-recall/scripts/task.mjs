// The instructions one benchmark session receives: its rules, the read
// commands its strategy allows, and one question. Never the answer.
import { join } from 'node:path';

export const STRATEGIES = ['brief', 'nobrief'];

const BRIEF_LINE =
  '- `./flatbread proof brief <effortId>`: an Effort\'s latest summary (a "compaction") in full, plus every record that changed since. Its envelope\'s `compaction.stale` is true when a record the summary relies on has changed. Start each Effort you need here.';

/** Markdown for TASK.md in `folder`, for one question and one strategy. */
export function taskText({ folder, question, format, strategy }) {
  if (!STRATEGIES.includes(strategy))
    throw new Error(`Unknown strategy ${strategy}`);
  const brief = strategy === 'brief';
  return `# One-question recall test

Answer one question about a project-memory graph, using only its read commands. Every command you run is counted, so be efficient, but a right answer matters most.

## Rules
- Work only inside this folder: \`${folder}\`. Never read, list, or search anything outside it. Never open files under \`.flatbread-proof/\` directly.
- Run one graph command per tool call. No shell loops, scripts, or chains (\`&&\`, \`;\`, \`|\` into another graph command) that run several graph commands at once.

## Read commands
Run from the folder. Each prints a JSON envelope; its \`artifact_path\` names a Markdown digest. Read or grep that digest for evidence.
- \`./flatbread proof list --status active,paused,completed,abandoned\` lists Efforts (the default shows only active ones).
${
  brief ? BRIEF_LINE + '\n' : ''
}- \`./flatbread proof records <effortId> [--kinds issue,finding,decision,constraint,risk,citation,blob] [--state s] [--status s] [--kind k] [--limit 25] [--cursor c]\` browses records. Bodies are cut at 600 characters or 12 lines; Blob bodies are left out.
- \`./flatbread proof get <id> [--resolve head]\` shows one record in full, Blob payloads included. \`--resolve head\` follows replacements to the newest version.
- \`./flatbread proof relations <effortId> <fromId> --relations derives_from,supersedes,superseded_by,invalidates,invalidated_by,resolved_by,rejected_by,mitigated_by,evidence,cites\` follows one hop of links.
- \`./flatbread proof blocking-decisions <effortId>\`.
${
  brief
    ? ''
    : '\nDo not use `proof brief`. Findings with `kind: compaction` are summaries; check what they claim.\n'
}
Records can be superseded (replaced), invalidated (shown wrong), rejected, reopened, or retracted (hidden from browse reads; \`get\` still shows them). Titles repeat on purpose. Efforts never link to each other; one may name another's record by title in prose. A summary can be out of date; check its claims against the records.

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
