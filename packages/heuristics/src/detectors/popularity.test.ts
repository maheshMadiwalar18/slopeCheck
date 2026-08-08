import { describe, it, expect } from 'vitest';
import { PopularityDetector } from './popularity';
import type { PackageContext, DownloadStats } from '@slopcheck/core';
import { isSuccess } from '@slopcheck/core';

function makeDl(downloads: number): DownloadStats {
  return { downloads, start: '2024-01-01', end: '2024-01-07', package: 'test-pkg' };
}

describe('PopularityDetector', () => {
  const detector = new PopularityDetector();

  it('should flag a package with zero downloads (score 100)', async () => {
    const ctx: PackageContext = { name: 'test-pkg', downloads: makeDl(0) };
    const result = await detector.analyze(ctx);

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.length).toBe(1);
      expect(result.value[0]!.score).toBe(100);
    }
  });

  it('should flag a package with very low downloads (score 80)', async () => {
    const ctx: PackageContext = { name: 'test-pkg', downloads: makeDl(25) };
    const result = await detector.analyze(ctx);

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value[0]!.score).toBe(80);
    }
  });

  it('should flag a package with low downloads (score 50)', async () => {
    const ctx: PackageContext = { name: 'test-pkg', downloads: makeDl(200) };
    const result = await detector.analyze(ctx);

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value[0]!.score).toBe(50);
    }
  });

  it('should flag a package with moderate downloads (score 20)', async () => {
    const ctx: PackageContext = { name: 'test-pkg', downloads: makeDl(1500) };
    const result = await detector.analyze(ctx);

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value[0]!.score).toBe(20);
    }
  });

  it('should pass a popular package with high downloads', async () => {
    const ctx: PackageContext = { name: 'test-pkg', downloads: makeDl(100_000) };
    const result = await detector.analyze(ctx);

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.length).toBe(0);
    }
  });

  it('should return empty factors when download data is missing', async () => {
    const ctx: PackageContext = { name: 'test-pkg' };
    const result = await detector.analyze(ctx);

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.length).toBe(0);
    }
  });
});
