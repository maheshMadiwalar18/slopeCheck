import type { PackageContext, RiskFactor } from './types';
import type { Result } from './result';

/**
 * A detector plugin that analyzes a package and returns risk factors.
 *
 * Third-party plugins should implement this interface.
 */
export interface DetectorPlugin {
  /** Unique name identifying this plugin. */
  readonly name: string;

  /** Semver version of this plugin (optional, for diagnostics). */
  readonly version?: string | undefined;

  /** Human-readable description (optional, for help output). */
  readonly description?: string | undefined;

  /** Execution priority. Lower values run first. Default: 100. */
  readonly priority?: number | undefined;

  /** Analyze the given package context and return risk factors. */
  analyze(context: PackageContext): Promise<Result<readonly RiskFactor[], Error>>;
}

/**
 * Registry for managing detector plugins.
 *
 * Plugins are stored in priority order and can be registered/unregistered by name.
 */
export class PluginRegistry {
  private plugins: DetectorPlugin[] = [];

  /**
   * Register a plugin. Throws if a plugin with the same name is already registered.
   */
  register(plugin: DetectorPlugin): void {
    if (this.has(plugin.name)) {
      throw new Error(`Plugin "${plugin.name}" is already registered.`);
    }
    this.plugins.push(plugin);
    this.plugins.sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));
  }

  /**
   * Unregister a plugin by name. Returns true if found and removed.
   */
  unregister(name: string): boolean {
    const idx = this.plugins.findIndex(p => p.name === name);
    if (idx === -1) return false;
    this.plugins.splice(idx, 1);
    return true;
  }

  /**
   * Check if a plugin with the given name is registered.
   */
  has(name: string): boolean {
    return this.plugins.some(p => p.name === name);
  }

  /**
   * Get all registered plugins, sorted by priority (lowest first).
   */
  getPlugins(): readonly DetectorPlugin[] {
    return this.plugins;
  }

  /**
   * Get the number of registered plugins.
   */
  get size(): number {
    return this.plugins.length;
  }
}
