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
