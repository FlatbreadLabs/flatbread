import test from 'ava';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(rel) {
  return readFileSync(path.join(root, rel), 'utf8');
}

const TOPIC_NAME = /^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$/;
const APPLY_PAYLOAD = JSON.parse(readRepo('.github/topics.json'));

test('GitHub topics payload is a names list GitHub will accept', (t) => {
  t.deepEqual(Object.keys(APPLY_PAYLOAD).sort(), ['names']);
  t.true(Array.isArray(APPLY_PAYLOAD.names));
  t.true(APPLY_PAYLOAD.names.length >= 8);
  t.true(APPLY_PAYLOAD.names.length <= 20);
  t.is(new Set(APPLY_PAYLOAD.names).size, APPLY_PAYLOAD.names.length);

  for (const name of APPLY_PAYLOAD.names) {
    t.regex(name, TOPIC_NAME);
    t.false(name.includes('--'));
  }
});

test('positioning docs, README tagline, and npm keywords use the same topic set', (t) => {
  const positioning = readRepo('docs/positioning.md');
  const readme = readRepo('packages/flatbread/README.md');
  const pkg = JSON.parse(readRepo('packages/flatbread/package.json'));

  t.true(readme.includes('Context alignment, version controlled.'));
  t.true(Array.isArray(pkg.keywords));

  for (const name of APPLY_PAYLOAD.names) {
    t.true(
      positioning.includes('`' + name + '`'),
      `docs/positioning.md must name ${name}`
    );
    t.true(
      pkg.keywords.includes(name),
      `flatbread keywords must include ${name}`
    );
  }
});
