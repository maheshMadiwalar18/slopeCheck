import { describe, it, expect, vi, beforeEach } from 'vitest';
import { evaluatePackage, setRegistryClient } from './engine';
import { RegistryClient } from '@slopcheck/registry';
import { ok, fail } from '@slopcheck/core';

const mockFetchNpmMetadata = vi.fn();
const mockFetchNpmDownloads = vi.fn();
const mockFetchGithubMetadata = vi.fn();
const mockFetchOsvVulnerabilities = vi.fn();

const mockClient = {
  fetchNpmMetadata: mockFetchNpmMetadata,
  fetchNpmDownloads: mockFetchNpmDownloads,
  fetchGithubMetadata: mockFetchGithubMetadata,
  fetchOsvVulnerabilities: mockFetchOsvVulnerabilities,
} as unknown as RegistryClient;

describe('CLI Engine - evaluatePackage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockFetchOsvVulnerabilities.mockResolvedValue(ok([]));
    setRegistryClient(mockClient);
  });

  it('should handle a successful package', async () => {
    mockFetchNpmMetadata.mockResolvedValue(ok({
      name: 'express',
      time: { created: '2010-01-01' },
      repository: 'https://github.com/expressjs/express',
    }));
    mockFetchNpmDownloads.mockResolvedValue(ok({
      package: 'express',
      downloads: 1000000,
      start: '2024-01-01',
      end: '2024-01-07',
    }));
    mockFetchGithubMetadata.mockResolvedValue(ok({
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
    mockFetchNpmMetadata.mockResolvedValue(fail({
      name: 'RegistryError',
      message: 'Package not found',
      status: 404,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    mockFetchNpmMetadata.mockResolvedValue(fail({
      name: 'RegistryError',
      message: 'Request timed out',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    mockFetchNpmMetadata.mockResolvedValue(fail({
      name: 'RegistryError',
      message: 'Rate limited',
      status: 429,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any));

    const result = await evaluatePackage('some-pkg');
    
    expect(result.status).toBe('UNAVAILABLE');
    expect(result.assessable).toBe(false);
    expect(result.score).toBeNull();
    expect(result.level).toBe('UNKNOWN');
    expect(result.errors.length).toBe(1);
  });

  it('should return PARTIAL for downloads failure', async () => {
    mockFetchNpmMetadata.mockResolvedValue(ok({
      name: 'express',
      time: { created: '2010-01-01' },
    }));
    mockFetchNpmDownloads.mockResolvedValue(fail({
      name: 'RegistryError',
      message: 'Downloads failed',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any));

    const result = await evaluatePackage('express');
    
    expect(result.status).toBe('PARTIAL');
    expect(result.assessable).toBe(true);
    expect(typeof result.score).toBe('number');
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]?.code).toBe('DOWNLOADS_UNAVAILABLE');
  });

  it('should return PARTIAL for GitHub failure', async () => {
    mockFetchNpmMetadata.mockResolvedValue(ok({
      name: 'express',
      time: { created: '2010-01-01' },
      repository: 'https://github.com/expressjs/express',
    }));
    mockFetchNpmDownloads.mockResolvedValue(ok({
      package: 'express',
      downloads: 1000000,
      start: '2024-01-01',
      end: '2024-01-07',
    }));
    mockFetchGithubMetadata.mockResolvedValue(fail({
      name: 'RegistryError',
      message: 'Rate limited by GitHub',
      status: 403,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any));

    const result = await evaluatePackage('express');
    
    expect(result.status).toBe('PARTIAL');
    expect(result.assessable).toBe(true);
    expect(typeof result.score).toBe('number');
    expect(result.errors.some(e => e.source === 'github')).toBe(true);
  });
});
