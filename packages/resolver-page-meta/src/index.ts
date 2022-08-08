import { parse } from 'node-html-parser';
import { metadataRuleSets, MatchedHeadCategories } from './ruleset';
import type { RequestInfo, RequestInit } from 'node-fetch';
import colors from 'kleur';

// Fetch polyfill for Node <17.5
// enforcing this makes it work for some reason. There's a difference between response.body between native node and this. wait maybe it's the same?

// if (globalThis && !globalThis.fetch) {
Object.assign(globalThis, {
  fetch: async (url: RequestInfo, init?: RequestInit | undefined) => {
    try {
      const { default: fetch } = await import('node-fetch');
      Object.assign(globalThis, { fetch });
      return fetch(url, init);
    } catch (e) {
      console.error(
        `⚠️ missing the package to run server-side fetch. 
          Please install the ${colors.bold('node-fetch')} package\n`
      );
      Object.assign(globalThis, { fetch: () => Promise.reject() });
      return Promise.reject();
    }
  },
});
// }

const fetchHead = async (url: string) => {
  const read = async (
    body: Iterable<ReadableStream<Uint8Array>>
  ): Promise<string> =>
    new Promise(async (resolve) => {
      let head = '';

      for await (const chunk of body) {
        head += chunk.toString();

        if (head.toString().split('</head>')[1] !== undefined) {
          head += `${head.toString().split('</head>')[0]}</head></html>`;
          resolve(head);
        }
      }

      resolve(head);
    });

  let response;

  try {
    response = await fetch(url, { method: 'GET' });
    if (!response.body) {
      throw new Error('Response contains no body');
    }
    return read(
      // workaround for https://github.com/microsoft/TypeScript/issues/39051
      response.body as unknown as Iterable<ReadableStream<Uint8Array>>
    );
  } catch (e) {
    console.error(e);
  }
};

const makeUrlAbsolute = (url: string, path: string) =>
  new URL(path, new URL(url).origin).toString();

interface Meta {
  url: string;
  dom: unknown;
}

export default async function fetchMeta(url: string): Promise<Meta | null> {
  const head = await fetchHead(url);

  if (!head) {
    return null;
  }
  const dom = parse(head);

  const metadata: Record<string, string | null> = {
    url,
    title: null,
    description: null,
    icon: null,
    image: null,
  };

  // console.log(dom.outerHTML);

  for (const prop of Object.keys(metadataRuleSets)) {
    for (const rule of metadataRuleSets[prop as MatchedHeadCategories].rules) {
      const el = dom.querySelector(rule.selector);
      console.log(rule.selector, el);

      if (el) {
        let data = rule.getAttribute(el as unknown as HTMLElement);

        Object.assign(metadata, {
          prop:
            data &&
            'absolute' in metadataRuleSets[prop as MatchedHeadCategories]
              ? makeUrlAbsolute(url, data)
              : data,
        });

        break;
      }
    }
    if (
      !metadata[prop as MatchedHeadCategories] &&
      'defaultValue' in metadataRuleSets[prop as MatchedHeadCategories]
    ) {
      metadata[prop as MatchedHeadCategories] = makeUrlAbsolute(
        url,
        metadataRuleSets[prop as MatchedHeadCategories].defaultValue
      );
    }
  }
  return metadata;
}

console.log(
  await fetchMeta(
    'https://resetpresents.com/events/2022/beats-popup-w-blake-skowron-ellpsis-palpa-and-more'
  )
);
