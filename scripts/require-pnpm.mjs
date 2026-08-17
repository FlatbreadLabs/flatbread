#!/usr/bin/env node
import { pathToFileURL } from 'node:url';

const MESSAGE =
  'This repository requires pnpm 10.33.0. Enable Corepack, then run `corepack prepare pnpm@10.33.0 --activate`.';

/** Fail before install when another package manager invokes the lifecycle. */
export function assertUsingPnpm(userAgent = process.env.npm_config_user_agent) {
  if (typeof userAgent === 'string' && /(?:^|\s)pnpm\/\d/.test(userAgent)) {
    return;
  }
  throw new Error(MESSAGE);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    assertUsingPnpm();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
