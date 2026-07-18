#!/usr/bin/env node

import { watch } from 'node:fs';
import { resolve } from 'node:path';
import { loadConfig } from '@flatbread/config';
import { FlatbreadProvider } from '@flatbread/core';

const cwd = process.cwd();
const watchedFiles = [
  resolve(cwd, 'content/markdown/posts/example-post.md'),
  resolve(cwd, 'content/yaml/authors/dr-caffeine.yml'),
];

const query = `
  query DemoPost {
    allPosts(filter: { id: { eq: "sdfsdf-23423-sdfsd-23444-dfghf" } }) {
      id
      title
      tags
      authors {
        id
        name
      }
    }
    allYamlAuthors(filter: { id: { eq: "caffeine-researcher" } }) {
      id
      name
      friend {
        id
        name
      }
    }
  }
`;

let renderInFlight = false;
let renderAgain = false;

async function loadFreshProvider() {
  const result = await loadConfig({ cwd });
  if (!result.config) {
    throw new Error('Flatbread config did not load.');
  }

  return new FlatbreadProvider(result.config);
}

async function render() {
  if (renderInFlight) {
    renderAgain = true;
    return;
  }

  renderInFlight = true;
  try {
    const provider = await loadFreshProvider();
    const response = await provider.query({ source: query });
    const payload = {
      renderedAt: new Date().toISOString(),
      data: response.data,
      errors: response.errors?.map((error) => error.message),
    };

    console.log(JSON.stringify(payload, null, 2));
  } finally {
    renderInFlight = false;
    if (renderAgain) {
      renderAgain = false;
      await render();
    }
  }
}

console.log(`Watching ${watchedFiles.join(', ')}`);
await render();

for (const watchedFile of watchedFiles) {
  watch(watchedFile, { persistent: true }, () => {
    setTimeout(() => {
      render().catch((error) => {
        console.error(error);
        process.exitCode = 1;
      });
    }, 100);
  });
}
