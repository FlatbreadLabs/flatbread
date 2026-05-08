#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';

const postFile = new URL('../content/markdown/posts/example-post.md', import.meta.url);
const yamlAuthorFile = new URL('../content/yaml/authors/dr-caffeine.yml', import.meta.url);
const original = "title: 'The Art of Measuring Cats in Fruit Units'";
const edited = "title: 'The Art of Measuring Cats in Fruit Units — live edit'";
const originalYamlName = 'name: "Dr. Maya Espresso"';
const editedYamlName = 'name: "Dr. Maya Espresso — live edit"';
const originalYamlFriend = 'friend: "2a3e"';
const editedYamlFriend = 'friend: "40s3"';

const postText = await readFile(postFile, 'utf-8');
await writeFile(postFile, postText.replace(edited, original));

const yamlText = await readFile(yamlAuthorFile, 'utf-8');
await writeFile(
  yamlAuthorFile,
  yamlText
    .replace(editedYamlName, originalYamlName)
    .replace(editedYamlFriend, originalYamlFriend)
);

console.log('Restored Markdown post title plus YAML author name and friend ref after the Flatbread watch demo.');
