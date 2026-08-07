import type { PackageContext, RiskFactor } from './types';
import type { Result } from './result';

export interface DetectorPlugin {
  name: string;
  analyze(context: PackageContext): Promise<Result<RiskFactor[], Error>>;
}

export class PluginRegistry {
  private plugins: DetectorPlugin[] = [];

  register(plugin: DetectorPlugin) {
    this.plugins.push(plugin);
  }

  getPlugins() {
    return this.plugins;
  }
}
