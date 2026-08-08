import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HallucinationDetector } from './hallucination';
import type { PackageContext } from '@slopcheck/core';
import { isSuccess } from '@slopcheck/core';

// Mock the datasets module
vi.mock('@slopcheck/datasets', () => ({
  getOfficialHallucinations: vi.fn().mockResolvedValue([
    { package: 'react-codeshift', source: 'ChatGPT hallucination', date_added: '2024-03-15' },
    { package: 'express-router-v2', source: 'ChatGPT hallucination', date_added: '2024-03-15' },
  ]),
  getCommunityHallucinations: vi.fn().mockResolvedValue([
    { package: 'discord-token-grabber-x', source: 'community report', date_added: '2024-05-10' },
  ]),
}));

describe('HallucinationDetector', () => {
  const detector = new HallucinationDetector();

  it('should flag a package on the official hallucination list', async () => {
    const ctx: PackageContext = { name: 'react-codeshift' };
    const result = await detector.analyze(ctx);

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.length).toBe(1);
      expect(result.value[0]!.score).toBe(100);
      expect(result.value[0]!.weight).toBe(3.0);
      expect(result.value[0]!.description).toContain('official');
    }
  });

  it('should flag a package on the community hallucination list', async () => {
    const ctx: PackageContext = { name: 'discord-token-grabber-x' };
    const result = await detector.analyze(ctx);

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.length).toBe(1);
      expect(result.value[0]!.score).toBe(80);
      expect(result.value[0]!.weight).toBe(2.0);
      expect(result.value[0]!.description).toContain('community');
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
