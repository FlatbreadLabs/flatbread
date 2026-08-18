import { readdirSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { getReferenceAction, REFERENCE_ACTIONS } from './reference-actions';

const PUBLISHED_PACKAGE_IDS = readdirSync(
  new URL('../content/reference/', import.meta.url)
)
  .filter((file) => file.endsWith('.md'))
  .map((file) => file.slice(0, -'.md'.length))
  .sort();

describe('reference actions', () => {
  it('covers every package page published by the docs site', () => {
    expect(Object.keys(REFERENCE_ACTIONS).sort()).toEqual(
      PUBLISHED_PACKAGE_IDS
    );
  });

  it.each(PUBLISHED_PACKAGE_IDS)(
    '%s has one short start and next action',
    (id) => {
      const action = getReferenceAction(id);

      expect(action.prerequisites.trim()).not.toBe('');
      expect(action.firstAction.label.trim()).not.toBe('');
      expect(action.firstAction.command.trim()).not.toBe('');
      expect(action.firstAction.success.trim()).not.toBe('');
      expect(action.firstAction.minutes).toBeLessThanOrEqual(2);
      expect(action.nextAction.label.trim()).not.toBe('');
      expect(action.nextAction.href).toMatch(/^#[a-z0-9-]+$/);
      expect(action.nextAction.minutes).toBeLessThanOrEqual(2);
    }
  );

  it('fails closed when a new package page has no action contract', () => {
    expect(() => getReferenceAction('new-package')).toThrow(
      /new-package.*no action contract/i
    );
  });
});
