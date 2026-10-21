import { fail } from '../util/assert.ts';
import type { Keymap } from '../keys/keymap.ts';
import type { ExportCapability, PluginApiV1, PluginManifest } from './api.ts';
import type { PluginEventName, PluginEvents } from './events.ts';
import { isPluginEvent } from './events.ts';
import { checkCapabilities } from './capabilities.ts';
import { Sandbox } from './sandbox.ts';

/** What the host needs from the editor. */
export interface HostServices {
  selection(): string[];
  runCommand(title: string): boolean;
  listCommands(): string[];
  shortcuts(): Keymap;
  saveDocument(): string;
}

type AnyListener = (payload: never) => void;

interface Loaded {
  manifest: PluginManifest;
  listeners: Map<PluginEventName, Set<AnyListener>>;
}

export class PluginHost {
  readonly sandbox = new Sandbox();
  private plugins = new Map<string, Loaded>();
  private services: HostServices;

  constructor(services: HostServices) {
    this.services = services;
  }

  load(manifest: PluginManifest): PluginApiV1 {
    if (!manifest || typeof manifest.name !== 'string' || !manifest.name)
      fail('bad-manifest', 'a plugin manifest needs a name');
    if (typeof manifest.main !== 'function')
      fail('bad-manifest', `plugin ${manifest.name} has no main()`);
    if (this.plugins.has(manifest.name))
      fail('duplicate-plugin', `plugin ${manifest.name} is already loaded`);
    const capabilities = checkCapabilities(manifest.capabilities);
    const loaded: Loaded = { manifest, listeners: new Map() };
    this.plugins.set(manifest.name, loaded);
    this.sandbox.restore(manifest.name);
    const api = this.createApi(loaded, capabilities.includes('export'));
    this.sandbox.call(manifest.name, 'main', () => manifest.main(api));
    return api;
  }

  unload(name: string): boolean {
    if (!this.plugins.delete(name)) return false;
    this.sandbox.revoke(name);
    return true;
  }

  loaded(): string[] {
    return [...this.plugins.keys()];
  }

  emit<K extends PluginEventName>(event: K, payload: PluginEvents[K]): void {
    for (const [name, plugin] of this.plugins)
      for (const listener of [...(plugin.listeners.get(event) ?? [])])
        this.sandbox.call(name, event, () =>
          (listener as (p: PluginEvents[K]) => void)(payload)
        );
  }

  listenerCount(event: PluginEventName): number {
    let n = 0;
    for (const plugin of this.plugins.values())
      n += plugin.listeners.get(event)?.size ?? 0;
    return n;
  }

  private createApi(plugin: Loaded, canExport: boolean): PluginApiV1 {
    const name = plugin.manifest.name;
    const guard = <A extends unknown[], R>(fn: (...args: A) => R) =>
      this.sandbox.guard(name, fn);
    const services = this.services;
    const exporter: ExportCapability | undefined = canExport
      ? Object.freeze({ document: guard(() => services.saveDocument()) })
      : undefined;
    const api: PluginApiV1 = {
      version: 1,
      name,
      on: guard((event: PluginEventName, listener: AnyListener) => {
        if (!isPluginEvent(event))
          fail('unknown-event', `no plugin event "${event}"`);
        let set = plugin.listeners.get(event);
        if (!set) {
          set = new Set();
          plugin.listeners.set(event, set);
        }
        set.add(listener);
      }) as PluginApiV1['on'],
      off: guard((event: PluginEventName, listener: AnyListener) => {
        plugin.listeners.get(event)?.delete(listener);
      }) as PluginApiV1['off'],
      getSelection: guard(() => services.selection()),
      runCommand: guard((title: string) => services.runCommand(title)),
      listCommands: guard(() => services.listCommands()),
      shortcuts: guard(() => services.shortcuts()),
      ...(exporter ? { export: exporter } : {}),
    };
    return Object.freeze(api);
  }
}
