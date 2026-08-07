import { describe, it, expect } from 'vitest';
import { AgeDetector } from './age';
import { PackageContext, isSuccess } from '@slopcheck/core';

describe('AgeDetector', () => {
  it('should flag a 1-day old package', async () => {
    const detector = new AgeDetector();
    const ctx: PackageContext = {
      name: 'test',
      npm: {
        name: 'test',
        time: { created: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString() }, // 12 hours old
        maintainers: []
      }
    };
    const res = await detector.analyze(ctx);
    expect(isSuccess(res)).toBe(true);
    if (isSuccess(res)) {
      expect(res.value[0]?.score).toBe(100);
    }
  });

  it('should pass an old package', async () => {
    const detector = new AgeDetector();
    const ctx: PackageContext = {
      name: 'test',
      npm: {
        name: 'test',
        time: { created: new Date(Date.now() - 1000 * 60 * 60 * 24 * 365).toISOString() }, // 1 year old
        maintainers: []
      }
    };
    const res = await detector.analyze(ctx);
    expect(isSuccess(res)).toBe(true);
    if (isSuccess(res)) {
      expect(res.value.length).toBe(0);
    }
  });
});
