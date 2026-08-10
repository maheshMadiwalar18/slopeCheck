import { describe, it, expect, vi } from 'vitest';
import { HallucinationDetector } from './hallucination';
import type { PackageContext } from '@slopcheck/core';
import { isSuccess } from '@slopcheck/core';

vi.mock('@slopcheck/datasets', () => {
  const map = new Map();
  map.set('react-codeshift', { package: 'react-codeshift', source: 'ChatGPT hallucination', date_added: '2024-03-15' });
  map.set('express-router-v2', { package: 'express-router-v2', source: 'ChatGPT hallucination', date_added: '2024-03-15' });
  map.set('discord-token-grabber-x', { package: 'discord-token-grabber-x', source: 'community report', date_added: '2024-05-10' });
  // Add an entry with inconsistent casing that the real dataset loader would canonicalize,
  // but we mock it canonicalized because `getHallucinationMap` in real code handles the canonicalization.
  // Wait, if `getHallucinationMap` canonicalizes, then the mocked map should represent the *output* of `getHallucinationMap`.
  // The output of `getHallucinationMap` has lowercase keys.
  map.set('mixed-case-pkg', { package: 'MiXeD-CaSe-PkG', source: 'test case', date_added: '2024-05-10' });
  return {
    getHallucinationMap: vi.fn().mockResolvedValue(map),
  };
});

describe('HallucinationDetector', () => {
  const detector = new HallucinationDetector();

  it('should flag a package on the AI hallucination list', async () => {
    const ctx: PackageContext = { name: 'react-codeshift' };
    const result = await detector.analyze(ctx);

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.length).toBe(1);
      expect(result.value[0]!.score).toBe(100);
      expect(result.value[0]!.weight).toBe(3.0);
      expect(result.value[0]!.severityClass).toBe('hard');
      expect(result.value[0]!.description).toContain('EXACT_HALLUCINATION_MATCH');
    }
  });

  it('should flag a community package on the AI hallucination list', async () => {
    const ctx: PackageContext = { name: 'discord-token-grabber-x' };
    const result = await detector.analyze(ctx);

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.length).toBe(1);
      expect(result.value[0]!.score).toBe(100);
      expect(result.value[0]!.severityClass).toBe('hard');
      expect(result.value[0]!.description).toContain('EXACT_HALLUCINATION_MATCH');
    }
  });

  it('should flag a scoped variant of a hallucination list package', async () => {
    const ctx: PackageContext = { name: '@evil/react-codeshift' };
    const result = await detector.analyze(ctx);

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.length).toBe(1);
      expect(result.value[0]!.score).toBe(80);
      expect(result.value[0]!.severityClass).toBe('strong');
      expect(result.value[0]!.description).toContain('HALLUCINATED_BASENAME_VARIANT');
    }
  });

  it('should flag a cased variant of a hallucination list package', async () => {
    const ctx: PackageContext = { name: 'React-codeshift' };
    const result = await detector.analyze(ctx);

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.length).toBe(1);
      expect(result.value[0]!.score).toBe(80);
      expect(result.value[0]!.severityClass).toBe('strong');
      expect(result.value[0]!.description).toContain('HALLUCINATED_BASENAME_VARIANT');
    }
  });

  it('should flag an EXACT_HALLUCINATION_MATCH when querying with the exact inconsistent casing of the dataset record', async () => {
    // Dataset record: { package: 'MiXeD-CaSe-PkG' }
    const ctx: PackageContext = { name: 'MiXeD-CaSe-PkG' };
    const result = await detector.analyze(ctx);

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.length).toBe(1);
      expect(result.value[0]!.score).toBe(100);
      expect(result.value[0]!.severityClass).toBe('hard');
      expect(result.value[0]!.description).toContain('EXACT_HALLUCINATION_MATCH');
    }
  });

  it('should flag a HALLUCINATED_BASENAME_VARIANT when querying a lowercase variant of a mixed-case dataset record', async () => {
    // Dataset record: { package: 'MiXeD-CaSe-PkG' }
    // User queries: 'mixed-case-pkg'
    const ctx: PackageContext = { name: 'mixed-case-pkg' };
    const result = await detector.analyze(ctx);

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.length).toBe(1);
      expect(result.value[0]!.score).toBe(80);
      expect(result.value[0]!.severityClass).toBe('strong');
      expect(result.value[0]!.description).toContain('HALLUCINATED_BASENAME_VARIANT');
    }
  });

  it('should return empty factors for an unknown package', async () => {
    const ctx: PackageContext = { name: 'totally-legit-package' };
    const result = await detector.analyze(ctx);

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.length).toBe(0);
    }
  });
});
