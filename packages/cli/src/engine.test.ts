import { describe, it, expect, vi, beforeEach } from 'vitest';
import { evaluatePackage } from './engine';
import { fetchNpmMetadata, fetchNpmDownloads, fetchGithubMetadata } from '@slopcheck/registry';
import { ok, fail } from '@slopcheck/core';

vi.mock('@slopcheck/registry', () => ({
  fetchNpmMetadata: vi.fn(),
  fetchNpmDownloads: vi.fn(),
  fetchGithubMetadata: vi.fn(),
}));

describe('CLI Engine - evaluatePackage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should handle a successful package', async () => {
    vi.mocked(fetchNpmMetadata).mockResolvedValue(ok({
      name: 'express',
      time: { created: '2010-01-01' },
      repository: 'https://github.com/expressjs/express',
    }));
    vi.mocked(fetchNpmDownloads).mockResolvedValue(ok({
      package: 'express',
      downloads: 1000000,
      start: '2024-01-01',
      end: '2024-01-07',
    }));
    vi.mocked(fetchGithubMetadata).mockResolvedValue(ok({
      full_name: 'expressjs/express',
      stargazers_count: 50000,
      forks_count: 10000,
      created_at: '2010-01-01',
      updated_at: '2024-01-01',
      pushed_at: '2024-01-01',
    }));

    const result = await evaluatePackage('express');
    
    expect(result.status).toBe('COMPLETE');
    expect(result.assessable).toBe(true);
    expect(result.errors.length).toBe(0);
    expect(result.package).toBe('express');
    expect(typeof result.score).toBe('number');
  });

  it('should return NOT_FOUND for npm 404', async () => {
    vi.mocked(fetchNpmMetadata).mockResolvedValue(fail({
      name: 'RegistryError',
      message: 'Package not found',
      status: 404,
    } as any));

    const result = await evaluatePackage('non-existent-pkg');
    
    expect(result.status).toBe('NOT_FOUND');
    expect(result.assessable).toBe(false);
    expect(result.score).toBeNull();
    expect(result.level).toBe('UNKNOWN');
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]?.code).toBe('PACKAGE_NOT_FOUND');
  });

  it('should return UNAVAILABLE for npm timeout or network failure', async () => {
    vi.mocked(fetchNpmMetadata).mockResolvedValue(fail({
      name: 'RegistryError',
      message: 'Request timed out',
    } as any));

    const result = await evaluatePackage('some-pkg');
    
    expect(result.status).toBe('UNAVAILABLE');
    expect(result.assessable).toBe(false);
    expect(result.score).toBeNull();
    expect(result.level).toBe('UNKNOWN');
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]?.code).toBe('REGISTRY_ERROR');
  });

  it('should return UNAVAILABLE for npm 429 rate limit', async () => {
    vi.mocked(fetchNpmMetadata).mockResolvedValue(fail({
      name: 'RegistryError',
      message: 'Rate limited',
      status: 429,
    } as any));

    const result = await evaluatePackage('some-pkg');
    
    expect(result.status).toBe('UNAVAILABLE');
    expect(result.assessable).toBe(false);
    expect(result.score).toBeNull();
    expect(result.level).toBe('UNKNOWN');
    expect(result.errors.length).toBe(1);
  });

  it('should return PARTIAL for downloads failure', async () => {
    vi.mocked(fetchNpmMetadata).mockResolvedValue(ok({
      name: 'express',
      time: { created: '2010-01-01' },
    }));
    vi.mocked(fetchNpmDownloads).mockResolvedValue(fail({
      name: 'RegistryError',
      message: 'Downloads failed',
    } as any));

    const result = await evaluatePackage('express');
    
    expect(result.status).toBe('PARTIAL');
    expect(result.assessable).toBe(true);
    expect(typeof result.score).toBe('number');
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]?.code).toBe('DOWNLOADS_UNAVAILABLE');
  });

  it('should return PARTIAL for GitHub failure', async () => {
    vi.mocked(fetchNpmMetadata).mockResolvedValue(ok({
      name: 'express',
      time: { created: '2010-01-01' },
      repository: 'https://github.com/expressjs/express',
    }));
    vi.mocked(fetchNpmDownloads).mockResolvedValue(ok({
      package: 'express',
      downloads: 1000000,
      start: '2024-01-01',
      end: '2024-01-07',
    }));
    vi.mocked(fetchGithubMetadata).mockResolvedValue(fail({
      name: 'RegistryError',
      message: 'Rate limited by GitHub',
      status: 403,
    } as any));

    const result = await evaluatePackage('express');
    
    expect(result.status).toBe('PARTIAL');
    expect(result.assessable).toBe(true);
    expect(typeof result.score).toBe('number');
    expect(result.errors.some(e => e.source === 'github')).toBe(true);
  });
});
