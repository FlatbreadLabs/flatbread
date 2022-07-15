import type { Dirent } from 'node:fs';

/**
 * Config options for the source-filesystem plugin
 */
export interface sourceFilesystemConfig {
  /**
   * File extensions to include
   */
  extensions?: string[];
  [key: string]: any;
}

export interface FileNode extends Dirent {
  path: string;
  data: {
    [key: string]: any;
  };
}

export interface GatherFileNodesOptions {
  extensions?: string[];
  readDirectory?: (path: string) => Promise<FileNode[]>;
}
