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
