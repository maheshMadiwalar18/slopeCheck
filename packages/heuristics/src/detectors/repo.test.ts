import { describe, it, expect } from 'vitest';
import { RepoDetector } from './repo';
import type { PackageContext, NpmMetadata, GithubInfo } from '@slopcheck/core';
import { isSuccess } from '@slopcheck/core';

const baseNpm: NpmMetadata = {
  name: 'test-pkg',
  time: { created: '2020-01-01T00:00:00.000Z' },
};

const baseGithub: GithubInfo = {
  full_name: 'test/test',
  stargazers_count: 100,
  forks_count: 10,
  created_at: '2020-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  pushed_at: '2024-01-01T00:00:00Z',
};

describe('RepoDetector', () => {
  const detector = new RepoDetector();

  it('should flag a package with no repository field', async () => {
    const ctx: PackageContext = {
      name: 'test-pkg',
      npm: { ...baseNpm, repository: undefined },
    };
    const result = await detector.analyze(ctx);

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.length).toBe(1);
      expect(result.value[0]!.score).toBe(80);
      expect(result.value[0]!.description).toContain('No repository');
    }
  });

  it('should flag an archived GitHub repository', async () => {
    const ctx: PackageContext = {
      name: 'test-pkg',
      npm: { ...baseNpm, repository: { url: 'https://github.com/test/test' } },
      github: { ...baseGithub, archived: true },
    };
    const result = await detector.analyze(ctx);

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.length).toBe(1);
      expect(result.value[0]!.score).toBe(70);
      expect(result.value[0]!.description).toContain('archived');
    }
  });

  it('should pass a package with a valid non-archived repository', async () => {
    const ctx: PackageContext = {
      name: 'test-pkg',
      npm: { ...baseNpm, repository: { url: 'https://github.com/test/test' } },
      github: { ...baseGithub, archived: false },
    };
    const result = await detector.analyze(ctx);

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.length).toBe(0);
    }
  });

  it('should return empty factors when npm data is missing', async () => {
    const ctx: PackageContext = { name: 'test-pkg' };
    const result = await detector.analyze(ctx);

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.length).toBe(0);
    }
  });
});
