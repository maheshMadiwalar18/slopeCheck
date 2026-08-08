import { describe, it, expect } from 'vitest';
import { MetadataDetector } from './metadata';
import type { PackageContext, NpmMetadata } from '@slopcheck/core';
import { isSuccess } from '@slopcheck/core';

function makeNpm(overrides: Partial<NpmMetadata> = {}): NpmMetadata {
  return {
    name: 'test-pkg',
    description: 'A valid package description here',
    readme: 'A'.repeat(100), // at least 50 chars
    time: { created: '2020-01-01T00:00:00.000Z' },
    maintainers: [{ name: 'author' }],
    repository: { url: 'https://github.com/test/test' },
    homepage: 'https://example.com',
    ...overrides,
  };
}

describe('MetadataDetector', () => {
  const detector = new MetadataDetector();

  it('should return no factors when all metadata is present', async () => {
    const ctx: PackageContext = { name: 'test-pkg', npm: makeNpm() };
    const result = await detector.analyze(ctx);

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.length).toBe(0);
    }
  });

  it('should return no factors when npm data is missing', async () => {
    const ctx: PackageContext = { name: 'test-pkg' };
    const result = await detector.analyze(ctx);

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.length).toBe(0);
    }
  });

  it('should penalize missing description', async () => {
    const ctx: PackageContext = {
      name: 'test-pkg',
      npm: makeNpm({ description: undefined }),
    };
    const result = await detector.analyze(ctx);

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.length).toBe(1);
      expect(result.value[0]!.score).toBe(20); // 1 missing field * 20
    }
  });

  it('should penalize short description', async () => {
    const ctx: PackageContext = {
      name: 'test-pkg',
      npm: makeNpm({ description: 'short' }), // < 10 chars
    };
    const result = await detector.analyze(ctx);

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value[0]!.score).toBe(20);
    }
  });

  it('should penalize multiple missing fields', async () => {
    const ctx: PackageContext = {
      name: 'test-pkg',
      npm: makeNpm({
        description: undefined,
        readme: undefined,
        repository: undefined,
        homepage: undefined,
        maintainers: [],
      }),
    };
    const result = await detector.analyze(ctx);

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value[0]!.score).toBe(100); // 5 missing * 20
    }
  });
});
