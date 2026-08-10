import { describe, it, expect } from 'vitest';
import { SimilarityDetector } from './similarity';
import type { PackageContext } from '@slopcheck/core';
import { isSuccess } from '@slopcheck/core';

describe('SimilarityDetector', () => {
  const detector = new SimilarityDetector();

  it('should flag a 1-char typosquat of a popular package', async () => {
    // "reacr" is 1 Levenshtein distance from "react"
    const ctx: PackageContext = { name: 'reacr' };
    const result = await detector.analyze(ctx);

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.length).toBe(1);
      expect(result.value[0]!.score).toBe(95);
      expect(result.value[0]!.description).toContain('distance 1');
    }
  });

  it('should flag a 2-char typosquat of a popular package (name > 5 chars)', async () => {
    // "exprezz" is Levenshtein distance 2 from "express" and length > 5
    const ctx: PackageContext = { name: 'exprezz' };
    const result = await detector.analyze(ctx);

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.length).toBe(1);
      expect(result.value[0]!.score).toBe(60);
      expect(result.value[0]!.description).toContain('distance 2');
    }
  });

  it('should pass an exact popular package name', async () => {
    const ctx: PackageContext = { name: 'react' };
    const result = await detector.analyze(ctx);

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.length).toBe(0);
    }
  });

  it('should flag a scoped impersonation of a popular package', async () => {
    const ctx: PackageContext = { name: '@evil/react' };
    const result = await detector.analyze(ctx);

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.length).toBe(1);
      expect(result.value[0]!.score).toBe(95);
      expect(result.value[0]!.severityClass).toBe('hard');
      expect(result.value[0]!.description).toContain('SCOPE_IMPERSONATION');
    }
  });

  it('should flag a scoped typosquat of a popular package', async () => {
    const ctx: PackageContext = { name: '@evil/reactt' };
    const result = await detector.analyze(ctx);

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.length).toBe(1);
      expect(result.value[0]!.score).toBe(95);
      expect(result.value[0]!.severityClass).toBe('strong');
      expect(result.value[0]!.description).toContain('distance 1');
    }
  });

  it('should pass a completely unrelated package name', async () => {
    const ctx: PackageContext = { name: 'my-custom-utility-library-xyz' };
    const result = await detector.analyze(ctx);

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.length).toBe(0);
    }
  });
});
