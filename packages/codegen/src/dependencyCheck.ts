import { existsSync } from 'fs';
import { join } from 'path';
import { createRequire } from 'module';

export const DEFAULT_PLUGIN_DEPENDENCIES: Record<string, string[]> = {
  'typed-document-node': ['@graphql-typed-document-node/core'],
};

const DEBUG_DEPS =
  process.env.FLATBREAD_DEBUG === '1' || process.env.FLATBREAD_DEBUG === 'true';

function logDebug(message: string) {
  if (DEBUG_DEPS) console.log(`[codegen:deps] ${message}`);
}

function moduleDirPath(dep: string, baseDir: string): string {
  if (dep.startsWith('@')) {
    const [scope, name] = dep.split('/');
    return join(baseDir, 'node_modules', scope, name);
  }
  return join(baseDir, 'node_modules', dep);
}

/**
 * Robust, ESM-safe dependency resolver.
 * Returns true if the module can be resolved from cwd, package context, or exists in node_modules.
 */
export function resolveDependency(dep: string): boolean {
  let requireFromCwd: NodeRequire | null = null;
  let requireFromHere: NodeRequire | null = null;
  try {
    requireFromCwd = createRequire(join(process.cwd(), 'package.json'));
  } catch {}
  try {
    // @ts-ignore import.meta.url is available at runtime
    requireFromHere = createRequire(import.meta.url);
  } catch {}

  // 1) Try from user's project root via createRequire
  if (requireFromCwd) {
    try {
      const resolved = requireFromCwd.resolve(dep);
      logDebug(`Resolved '${dep}' from cwd to: ${resolved}`);
      return true;
    } catch (e) {
      logDebug(`Failed to resolve '${dep}' from cwd: ${(e as Error).message}`);
    }
  }

  // 2) Try from this package context via createRequire
  if (requireFromHere) {
    try {
      const resolved = requireFromHere.resolve(dep);
      logDebug(`Resolved '${dep}' from package context to: ${resolved}`);
      return true;
    } catch (e) {
      logDebug(
        `Failed to resolve '${dep}' from package context: ${
          (e as Error).message
        }`
      );
    }
  }

  // 3) Fallback: check if module directory exists in user's node_modules
  const candidateDir = moduleDirPath(dep, process.cwd());
  if (existsSync(candidateDir)) {
    logDebug(`Found module directory for '${dep}' at: ${candidateDir}`);
    return true;
  }

  logDebug(`Could not resolve or find directory for '${dep}'`);
  return false;
}

/**
 * Check missing deps for the provided plugins.
 * Returns the unique list of missing dependency package names.
 */
export function checkPluginDependencies(
  plugins: string[],
  options?: {
    pluginDependencies?: Record<string, string[]>;
    resolver?: (dep: string) => boolean;
  }
): string[] {
  const pluginDependencies =
    options?.pluginDependencies ?? DEFAULT_PLUGIN_DEPENDENCIES;
  const canResolve = options?.resolver ?? resolveDependency;

  const missingDeps = new Set<string>();

  for (const plugin of plugins) {
    const requiredDeps = pluginDependencies[plugin];
    if (!requiredDeps) continue;
    for (const dep of requiredDeps) {
      if (!canResolve(dep)) {
        missingDeps.add(dep);
      }
    }
  }

  return Array.from(missingDeps);
}

/**
 * Generate a human-friendly warning for missing dependencies.
 */
export function formatMissingDepsWarning(
  missingDeps: string[],
  installCommand: string
): string {
  return (
    `⚠️  Warning: Some GraphQL codegen plugins require dependencies that aren't installed:\n` +
    `   Missing: ${missingDeps.join(', ')}\n` +
    `   Install them with: ${installCommand}\n` +
    `   Or remove the corresponding plugins from your codegen config.`
  );
}
