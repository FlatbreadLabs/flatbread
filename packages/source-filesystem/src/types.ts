import type { Dirent } from 'node:fs';

/**
 * Config options for the source-filesystem plugin
 */
export interface sourceFilesystemConfig {
  /**
   * File extensions to include
   */
  [key: string]: any;
}

export interface InitializedSourceFilesystemConfig
  extends sourceFilesystemConfig {
  extensions: string[];
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
