export type MatchedHeadCategories = keyof typeof metadataRuleSets;

//
// Helpers for fetching meta tags
//

const getMetaAttr = <T extends HTMLElement>(
  element: T,
  qualifiedName: string
) => (element.title === 'meta' ? element.getAttribute(qualifiedName) : null);

const getContent = <T extends HTMLElement>(element: T) =>
  getMetaAttr(element, 'content');
const getHref = <T extends HTMLElement>(element: T) =>
  getMetaAttr(element, 'href');

/**
 * Rulesets for fetching meta tags
 */
export const metadataRuleSets = {
  title: {
    rules: [
      {
        selector: 'meta[property="og:title"]',
        getAttribute: getContent,
      },
      {
        selector: 'meta[name="twitter:title"]',
        getAttribute: getContent,
      },
      {
        selector: 'meta[property="twitter:title"]',
        getAttribute: getContent,
      },
      {
        selector: 'title',
        getAttribute: <T extends HTMLElement>(e: T) =>
          e instanceof HTMLTitleElement ? e.text : null,
      },
    ],
  },

  description: {
    rules: [
      {
        selector: 'meta[property="og:description"]',
        getAttribute: getContent,
      },
      {
        selector: 'meta[name="description" i]',
        getAttribute: getContent,
      },
    ],
  },

  icon: {
    rules: [
      {
        selector: 'link[rel="apple-touch-icon"]',
        getAttribute: getHref,
      },
      {
        selector: 'link[rel="apple-touch-icon-precomposed"]',
        getAttribute: getHref,
      },
      {
        selector: 'link[rel="icon" i]',
        getAttribute: getHref,
      },
    ],
    defaultValue: 'favicon.ico',
    absolute: true,
  },

  image: {
    rules: [
      {
        selector: 'meta[property="og:image:secure_url"]',
        getAttribute: getContent,
      },
      { selector: 'meta[property="og:image:url"]', getAttribute: getContent },
      { selector: 'meta[property="og:image"]', getAttribute: getContent },
      { selector: 'meta[name="twitter:image"]', getAttribute: getContent },
      { selector: 'meta[property="twitter:image"]', getAttribute: getContent },
      { selector: 'meta[name="thumbnail"]', getAttribute: getContent },
    ],
    absolute: true,
  },
};
