import test from 'ava';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(rel) {
  return readFileSync(path.join(root, rel), 'utf8');
}

const command = readRepo('.cursor/commands/read-branch.md');
const rule = readRepo('.cursor/rules/cursor-grok-latest.mdc');
const agents = readRepo('AGENTS.md');

test('/read-branch tells review subagents to use the latest Cursor Grok', (t) => {
  t.true(command.includes('latest Cursor Grok'));
  t.true(command.includes('inherit'));
  t.true(command.includes('Do not pass `cursor-grok-4.5-high`'));
  t.false(command.includes('models cursor-grok-4.5-high'));
});

test('always-on rule forbids pinning Grok 4.5 on review Task children', (t) => {
  t.true(rule.includes('alwaysApply: true'));
  t.true(rule.includes('latest Cursor Grok'));
  t.true(rule.includes('cursor-grok-4.5-high'));
  t.true(rule.includes('Do **not** pass `cursor-grok-4.5-high`'));
});

test('AGENTS.md points PR review routing at the in-repo command and rule', (t) => {
  t.true(agents.includes('.cursor/commands/read-branch.md'));
  t.true(agents.includes('.cursor/rules/cursor-grok-latest.mdc'));
  t.true(agents.includes('latest Cursor Grok'));
});
