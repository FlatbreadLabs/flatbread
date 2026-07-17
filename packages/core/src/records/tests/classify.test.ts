import test from 'ava';
import { resolve } from 'node:path';
import { classifyPath } from '../classify';
import type { LoadedFlatbreadConfig } from '../../types';

function config(
  content: LoadedFlatbreadConfig['content'],
  extensions = ['.md']
): LoadedFlatbreadConfig {
  return { content, loaded: { extensions } } as LoadedFlatbreadConfig;
}

test('classifies a descendant of a plain collection directory', (t) => {
  t.deepEqual(
    classifyPath(
      'content/posts/2026/nested/post.md',
      config([{ collection: 'Post', path: 'content/posts' }])
    ),
    { collection: 'Post', captures: {} }
  );
});

test('extracts a named capture from a file-pattern segment', (t) => {
  t.deepEqual(
    classifyPath(
      'content/hello.md',
      config([{ collection: 'Post', path: 'content/[slug].md' }])
    ),
    { collection: 'Post', captures: { slug: 'hello' } }
  );
});

test('extracts nested captures in path order', (t) => {
  t.deepEqual(
    classifyPath(
      'content/news/hello.md',
      config([{ collection: 'Post', path: 'content/[category]/[slug].md' }])
    ),
    { collection: 'Post', captures: { category: 'news', slug: 'hello' } }
  );
  t.deepEqual(
    classifyPath(
      'content/a/b.md',
      config([{ collection: 'Post', path: 'content/[name]/[name].md' }])
    ),
    { collection: 'Post', captures: { name: 'b' } }
  );
});

test('filters extensions before classifying paths', (t) => {
  const content = [{ collection: 'Post', path: 'content' }];
  t.is(classifyPath('content/post.txt', config(content)), undefined);
  t.deepEqual(classifyPath('content/post.MD', config(content, ['MD'])), {
    collection: 'Post',
    captures: {},
  });
});

test('returns undefined for paths outside every configured collection', (t) => {
  t.is(
    classifyPath(
      'content/posts-extra/post.md',
      config([{ collection: 'Post', path: 'content/posts' }])
    ),
    undefined
  );
  t.is(
    classifyPath(
      'content/hello.md/extra',
      config([{ collection: 'Post', path: 'content/[slug].md' }])
    ),
    undefined
  );
});

test('matches globstar across zero and multiple directories', (t) => {
  const content = [{ collection: 'Post', path: 'content/**/[slug].md' }];
  t.deepEqual(classifyPath('content/hello.md', config(content)), {
    collection: 'Post',
    captures: { slug: 'hello' },
  });
  t.deepEqual(classifyPath('content/a/b/hello.md', config(content)), {
    collection: 'Post',
    captures: { slug: 'hello' },
  });
  t.is(classifyPath('other/hello.md', config(content)), undefined);
});

test('resolves relative and absolute candidates identically', (t) => {
  const content = [
    { collection: 'First', path: 'content/[slug].md' },
    { collection: 'Second', path: 'content/hello.md' },
  ];
  const relative = classifyPath('content/hello.md', config(content));
  const absolute = classifyPath(resolve('content/hello.md'), config(content));
  t.deepEqual(absolute, relative);
  t.is(relative?.collection, 'First');
});
