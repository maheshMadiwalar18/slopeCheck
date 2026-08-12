import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RegistryError } from './npm';
import { RegistryClient } from './client';
import { isSuccess, isFailure } from '@slopcheck/core';

// We mock the global fetch to avoid real network calls
const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
  mockFetch.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchNpmMetadata', () => {
  let client: RegistryClient;
  beforeEach(() => {
    client = new RegistryClient();
  });

  it('should return parsed metadata on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        name: 'test-pkg',
        description: 'A test package',
        time: { created: '2024-01-01T00:00:00.000Z' },
        maintainers: [{ name: 'author' }],
      }),
    });

    const result = await client.fetchNpmMetadata('test-pkg');
    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.name).toBe('test-pkg');
      expect(result.value.description).toBe('A test package');
    }
  });

  it('should return a failure for 404', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    const result = await client.fetchNpmMetadata('nonexistent');
    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error).toBeInstanceOf(RegistryError);
      expect(result.error.message).toContain('not found');
    }
  });

  it('should return a failure for 429 rate limiting', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
    });

    const result = await client.fetchNpmMetadata('rate-limited');
    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error.message).toContain('Rate limited');
    }
  });
});

describe('fetchNpmDownloads', () => {
  let client: RegistryClient;
  beforeEach(() => {
    client = new RegistryClient();
  });

  it('should return parsed download stats on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        downloads: 50000,
        start: '2024-01-01',
        end: '2024-01-07',
        package: 'test-pkg',
      }),
    });

    const result = await client.fetchNpmDownloads('test-pkg');
    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.downloads).toBe(50000);
      expect(result.value.package).toBe('test-pkg');
    }
  });

  it('should return a failure for 404', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    const result = await client.fetchNpmDownloads('nonexistent');
    expect(isFailure(result)).toBe(true);
  });
});

describe('fetchGithubMetadata', () => {
  let client: RegistryClient;
  beforeEach(() => {
    client = new RegistryClient();
  });

  it('should return parsed GitHub metadata on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        full_name: 'owner/repo',
        stargazers_count: 1000,
        forks_count: 50,
        created_at: '2020-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        pushed_at: '2024-01-01T00:00:00Z',
      }),
    });

    const result = await client.fetchGithubMetadata('https://github.com/owner/repo');
    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.full_name).toBe('owner/repo');
      expect(result.value.stargazers_count).toBe(1000);
    }
  });

  it('should return a failure for an invalid GitHub URL', async () => {
    const result = await client.fetchGithubMetadata('https://not-github.com/whatever');
    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error.message).toContain('Invalid GitHub URL');
    }
  });

  it('should return a failure for 404', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    const result = await client.fetchGithubMetadata('https://github.com/owner/missing-repo');
    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error.message).toContain('not found');
    }
  });

  it('should return a failure for rate limiting (403)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
    });

    const result = await client.fetchGithubMetadata('https://github.com/ratelimited/repo');
    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error.message).toContain('Rate limited');
    }
  });
});
