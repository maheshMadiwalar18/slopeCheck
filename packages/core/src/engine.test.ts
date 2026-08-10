import { describe, it, expect } from 'vitest';
import { RiskEngine } from './engine';
import { PluginRegistry } from './plugin';
import type { DetectorPlugin } from './plugin';
import type { PackageContext } from './types';
import { ok } from './result';

describe('RiskEngine', () => {
  it('should evaluate a package and combine scores', async () => {
    const mockPlugin1: DetectorPlugin = {
      name: 'Mock1',
      analyze: async () => ok([{ name: 'Mock1', description: 'desc', score: 100, weight: 1 }])
    };
    
    const mockPlugin2: DetectorPlugin = {
      name: 'Mock2',
      analyze: async () => ok([{ name: 'Mock2', description: 'desc', score: 50, weight: 1 }])
    };

    const registry = new PluginRegistry();
    registry.register(mockPlugin1);
    registry.register(mockPlugin2);

    const engine = new RiskEngine(registry);
    const ctx: PackageContext = { name: 'test-pkg' };
    
    const result = await engine.evaluate(ctx);
    
    expect(result.package).toBe('test-pkg');
    // Weighted score: (100*1 + 50*1) / 2 = 75
    expect(result.score).toBe(75);
    expect(result.level).toBe('HIGH');
    expect(result.factors.length).toBe(2);
  });

  it('should return UNKNOWN and null score when totalWeight is 0 and status is UNAVAILABLE', async () => {
    const registry = new PluginRegistry();
    const engine = new RiskEngine(registry);
    const ctx: PackageContext = { name: 'test-pkg' };
    
    const result = await engine.evaluate(ctx, 'UNAVAILABLE', [{source: 'npm', code: 'TEST', message: 'test'}]);
    
    expect(result.score).toBeNull();
    expect(result.level).toBe('UNKNOWN');
    expect(result.status).toBe('UNAVAILABLE');
    expect(result.assessable).toBe(false);
  });

  it('should mutate status to PARTIAL and log error if a plugin fails', async () => {
    const mockPlugin: DetectorPlugin = {
      name: 'FailingPlugin',
      analyze: async () => { throw new Error('Crash!'); }
    };

    const registry = new PluginRegistry();
    registry.register(mockPlugin);

    const engine = new RiskEngine(registry);
    const ctx: PackageContext = { name: 'test-pkg' };
    
    const result = await engine.evaluate(ctx, 'COMPLETE', []);
    
    expect(result.status).toBe('PARTIAL');
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]?.source).toBe('FailingPlugin');
    expect(result.errors[0]?.code).toBe('PLUGIN_CRASH');
  });
});
