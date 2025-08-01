import { promises as fs } from 'fs';
import { join } from 'path';
import { ensureDir, pathExists } from 'fs-extra';
import type { CodegenCache, CodegenOptions } from './types.js';

const CACHE_FILE_NAME = '.flatbread-codegen-cache.json';

/**
 * Get the cache file path for a given output directory
 */
function getCacheFilePath(outputDir: string): string {
  return join(outputDir, CACHE_FILE_NAME);
}

/**
 * Load the codegen cache from disk
 */
export async function loadCache(outputDir: string): Promise<CodegenCache | null> {
  const cacheFilePath = getCacheFilePath(outputDir);
  
  try {
    if (await pathExists(cacheFilePath)) {
      const cacheContent = await fs.readFile(cacheFilePath, 'utf-8');
      return JSON.parse(cacheContent) as CodegenCache;
    }
  } catch (error) {
    // If cache file is corrupted or unreadable, ignore it
    console.warn('Failed to load codegen cache, will regenerate types');
  }
  
  return null;
}

/**
 * Save the codegen cache to disk
 */
export async function saveCache(outputDir: string, cache: CodegenCache): Promise<void> {
  const cacheFilePath = getCacheFilePath(outputDir);
  
  // Ensure the output directory exists
  await ensureDir(outputDir);
  
  try {
    await fs.writeFile(cacheFilePath, JSON.stringify(cache, null, 2));
  } catch (error) {
    console.warn('Failed to save codegen cache:', error);
  }
}

/**
 * Check if the cache is valid for the given configuration hash
 */
export function isCacheValid(
  cache: CodegenCache | null,
  configHash: string,
  schemaHash: string,
  options: CodegenOptions
): boolean {
  if (!cache) {
    return false;
  }

  // Check if configuration has changed
  if (cache.configHash !== configHash) {
    return false;
  }

  // Check if schema has changed
  if (cache.schemaHash !== schemaHash) {
    return false;
  }

  // Check if caching is disabled
  if (options.cache === false) {
    return false;
  }

  // Check if all generated files still exist
  return cache.files.every(file => {
    try {
      require('fs').statSync(file);
      return true;
    } catch {
      return false;
    }
  });
}

/**
 * Clear the codegen cache
 */
export async function clearCache(outputDir: string): Promise<void> {
  const cacheFilePath = getCacheFilePath(outputDir);
  
  try {
    if (await pathExists(cacheFilePath)) {
      await fs.unlink(cacheFilePath);
    }
  } catch (error) {
    console.warn('Failed to clear codegen cache:', error);
  }
}