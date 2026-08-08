import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DataCache } from './cache';

describe('DataCache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should store and retrieve values', () => {
    const cache = new DataCache<string>();
    cache.set('key', 'value');
    expect(cache.get('key')).toBe('value');
  });

  it('should return undefined for missing keys', () => {
    const cache = new DataCache<string>();
    expect(cache.get('missing')).toBeUndefined();
  });

  it('should expire entries after TTL', () => {
    const cache = new DataCache<string>(1000); // 1 second TTL
    cache.set('key', 'value');

    expect(cache.get('key')).toBe('value');

    // Advance past TTL
    vi.advanceTimersByTime(1500);

    expect(cache.get('key')).toBeUndefined();
  });

  it('should clear all entries', () => {
    const cache = new DataCache<number>();
    cache.set('a', 1);
    cache.set('b', 2);
    expect(cache.size).toBe(2);

    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.get('a')).toBeUndefined();
  });

  it('should report size correctly', () => {
    const cache = new DataCache<number>();
    expect(cache.size).toBe(0);
    cache.set('x', 42);
    expect(cache.size).toBe(1);
    cache.set('y', 43);
    expect(cache.size).toBe(2);
  });

  it('should overwrite existing values', () => {
    const cache = new DataCache<string>();
    cache.set('key', 'old');
    cache.set('key', 'new');
    expect(cache.get('key')).toBe('new');
    expect(cache.size).toBe(1);
  });
});
