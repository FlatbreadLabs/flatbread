import test from 'ava';

import { createMarkdownProcessor } from './markdown';

async function render(markdown: string): Promise<string> {
  return String(await createMarkdownProcessor().process(markdown));
}

test('keeps syntax-highlighter code metadata through sanitizing', async (t) => {
  const html = await render(
    '<pre><code class="language-ts" data-title="demo.ts">const answer = 42;</code></pre>'
  );

  t.true(html.includes('class="language-ts"'));
  t.true(html.includes('data-title="demo.ts"'));
});

test('keeps supported fenced language classes through sanitizing', async (t) => {
  const html = await render(
    [
      '```ts',
      'const answer: number = 42;',
      '```',
      '',
      '```tsx',
      'const title = <h1>Flatbread</h1>;',
      '```',
      '',
      '```shell-session',
      '$ pnpm build',
      '```',
    ].join('\n')
  );

  t.true(html.includes('class="language-ts"'));
  t.true(html.includes('class="language-tsx"'));
  t.true(html.includes('class="language-shell-session"'));
});

test('strips event handlers and unrelated code classes', async (t) => {
  const html = await render(
    '<pre><code class="language-ts utility" onclick="alert(1)">const answer = 42;</code></pre>'
  );

  t.true(html.includes('class="language-ts"'));
  t.false(html.includes('utility'));
  t.false(html.includes('onclick'));
});

test('keeps default sanitizer attributes on non-code elements', async (t) => {
  const html = await render(
    '<a href="/guide" title="Read the guide">Guide</a>'
  );

  t.true(html.includes('href="/guide"'));
  t.true(html.includes('title="Read the guide"'));
});

test('strips fence languages outside the public character boundary', async (t) => {
  const cpp = await render('```c++\nint main() {}\n```');
  const csharp = await render('```c#\npublic class Program {}\n```');

  t.false(cpp.includes('language-c++'));
  t.false(csharp.includes('language-c#'));
  t.true(cpp.includes('<code class="">'));
  t.true(csharp.includes('<code class="">'));
  t.true(cpp.includes('int main() {}'));
  t.true(csharp.includes('public class Program {}'));
});
