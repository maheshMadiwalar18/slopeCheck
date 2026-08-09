import { describe, it, expect, vi } from 'vitest';
import { HallucinationDetector } from './hallucination';
import type { PackageContext } from '@slopcheck/core';
import { isSuccess } from '@slopcheck/core';

vi.mock('@slopcheck/datasets', () => {
  const map = new Map();
  map.set('react-codeshift', { package: 'react-codeshift', source: 'ChatGPT hallucination', date_added: '2024-03-15' });
  map.set('express-router-v2', { package: 'express-router-v2', source: 'ChatGPT hallucination', date_added: '2024-03-15' });
  map.set('discord-token-grabber-x', { package: 'discord-token-grabber-x', source: 'community report', date_added: '2024-05-10' });
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
      expect(result.value[0]!.description).toContain('AI hallucination');
    }
  });

  it('should flag a community package on the AI hallucination list', async () => {
    const ctx: PackageContext = { name: 'discord-token-grabber-x' };
    const result = await detector.analyze(ctx);

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.length).toBe(1);
      expect(result.value[0]!.score).toBe(100);
      expect(result.value[0]!.weight).toBe(3.0);
      expect(result.value[0]!.description).toContain('AI hallucination');
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
