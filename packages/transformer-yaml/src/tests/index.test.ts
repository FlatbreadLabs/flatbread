import test from 'ava';
import { EntryNode } from 'flatbread';
import { VFile } from 'vfile';

import Transformer from '../index.js';

const testFile = new VFile(`
id: 2a3e
name: Tony
enjoys:
  - cats
  - tea
  - making this
friend: 40s3
date_joined: 2021-02-25T16:41:59.558Z
skills:
  sitting: 204
  breathing: 7.07
  liquid_consumption: 100
  existence: simulation
  sports: -2
  cat_pat: 1500
`);

const transformer = Transformer();

test('it can parse a basic yaml file', async (t) => {
  const parse = transformer.parse as (input: VFile) => EntryNode;
  const node = parse(testFile);
  t.snapshot(node);
});
