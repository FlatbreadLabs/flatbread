// Keeps a misbehaving plugin from breaking the editor: every call into a
// plugin is caught, and an unloaded plugin's API stops working.

export interface PluginError {
  plugin: string;
  where: string;
  message: string;
}

export class Sandbox {
  readonly errors: PluginError[] = [];
  private revoked = new Set<string>();

  call<T>(plugin: string, where: string, fn: () => T): T | undefined {
    if (this.revoked.has(plugin)) return undefined;
    try {
      return fn();
    } catch (error) {
      this.errors.push({
        plugin,
        where,
        message: error instanceof Error ? error.message : String(error),
      });
      return undefined;
    }
  }

  revoke(plugin: string): void {
    this.revoked.add(plugin);
  }

  restore(plugin: string): void {
    this.revoked.delete(plugin);
  }

  isRevoked(plugin: string): boolean {
    return this.revoked.has(plugin);
  }

  /** Wraps an API method so it throws once the plugin is unloaded. */
  guard<A extends unknown[], R>(
    plugin: string,
    fn: (...args: A) => R
  ): (...args: A) => R {
    return (...args: A) => {
      if (this.revoked.has(plugin))
        throw new Error(`plugin ${plugin} is unloaded`);
      return fn(...args);
    };
  }
}
