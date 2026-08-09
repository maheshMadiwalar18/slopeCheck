import { describe, it, expect } from 'vitest';
import { PluginRegistry } from './plugin';
import type { DetectorPlugin } from './plugin';
import { ok } from './result';

function makePlugin(name: string, priority?: number): DetectorPlugin {
  return {
    name,
    priority,
    analyze: async () => ok([]),
  };
}

describe('PluginRegistry', () => {
  it('should register and retrieve plugins', () => {
    const registry = new PluginRegistry();
    registry.register(makePlugin('A'));
    registry.register(makePlugin('B'));

    expect(registry.size).toBe(2);
    expect(registry.getPlugins().map(p => p.name)).toEqual(['A', 'B']);
  });

  it('should throw when registering a duplicate plugin name', () => {
    const registry = new PluginRegistry();
    registry.register(makePlugin('Dup'));

    expect(() => registry.register(makePlugin('Dup'))).toThrowError(
      'Plugin "Dup" is already registered.'
    );
  });

  it('should sort plugins by priority (lowest first)', () => {
    const registry = new PluginRegistry();
    registry.register(makePlugin('Low', 10));
    registry.register(makePlugin('High', 200));
    registry.register(makePlugin('Default')); // default = 100
    registry.register(makePlugin('Mid', 50));

    const names = registry.getPlugins().map(p => p.name);
    expect(names).toEqual(['Low', 'Mid', 'Default', 'High']);
  });

  it('should unregister a plugin by name', () => {
    const registry = new PluginRegistry();
    registry.register(makePlugin('X'));
    registry.register(makePlugin('Y'));

    expect(registry.unregister('X')).toBe(true);
    expect(registry.size).toBe(1);
    expect(registry.has('X')).toBe(false);
    expect(registry.has('Y')).toBe(true);
  });

  it('should return false when unregistering a non-existent plugin', () => {
    const registry = new PluginRegistry();
    expect(registry.unregister('ghost')).toBe(false);
  });

  it('has() should return correct values', () => {
    const registry = new PluginRegistry();
    expect(registry.has('nope')).toBe(false);
    registry.register(makePlugin('yep'));
    expect(registry.has('yep')).toBe(true);
  });

  it('should report size correctly', () => {
    const registry = new PluginRegistry();
    expect(registry.size).toBe(0);
    registry.register(makePlugin('one'));
    expect(registry.size).toBe(1);
    registry.register(makePlugin('two'));
    expect(registry.size).toBe(2);
    registry.unregister('one');
    expect(registry.size).toBe(1);
  });
});
