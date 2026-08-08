import { z } from 'zod';
import { DataCache } from './cache';
import type { Result } from '@slopcheck/core';
import { ok, fail } from '@slopcheck/core';

// ---------------------------------------------------------------------------
// Shared fetch infrastructure: timeouts, retries, deduplication
// ---------------------------------------------------------------------------

const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 2;
const RETRY_BASE_MS = 500;

/** In-flight request deduplication map. */
const inflight = new Map<string, Promise<Response>>();

async function fetchWithRetry(url: string, init?: RequestInit): Promise<Response> {
  // Deduplicate: if an identical request is already in-flight, reuse it
  const existing = inflight.get(url);
  if (existing) return existing;

  const attempt = async (retries: number): Promise<Response> => {
    try {
      const response = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
      });

      // Retry on 5xx server errors
      if (response.status >= 500 && retries < MAX_RETRIES) {
        await sleep(RETRY_BASE_MS * 2 ** retries);
        return attempt(retries + 1);
      }

      return response;
    } catch (e) {
      // Retry on network errors (not timeouts, which should fail fast)
      if (retries < MAX_RETRIES && e instanceof TypeError) {
        await sleep(RETRY_BASE_MS * 2 ** retries);
        return attempt(retries + 1);
      }
      throw e;
    }
  };

  const promise = attempt(0).finally(() => {
    inflight.delete(url);
  });

  inflight.set(url, promise);
  return promise;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// npm Registry Client
// ---------------------------------------------------------------------------

export const NpmPackageMetadataSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  readme: z.string().optional(),
  time: z.record(z.string(), z.string()),
  maintainers: z.array(z.object({ name: z.string(), email: z.string().optional() })).optional(),
  repository: z.union([
    z.object({ type: z.string().optional(), url: z.string() }),
    z.string()
  ]).optional(),
  homepage: z.string().optional(),
  versions: z.record(z.string(), z.unknown()).optional(),
});

export type NpmPackageMetadata = z.infer<typeof NpmPackageMetadataSchema>;

export const NpmDownloadStatsSchema = z.object({
  downloads: z.number(),
  start: z.string(),
  end: z.string(),
  package: z.string(),
});

export type NpmDownloadStats = z.infer<typeof NpmDownloadStatsSchema>;

const metadataCache = new DataCache<NpmPackageMetadata>();
const downloadsCache = new DataCache<NpmDownloadStats>();

export class RegistryError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'RegistryError';
  }
}

export async function fetchNpmMetadata(packageName: string): Promise<Result<NpmPackageMetadata, RegistryError>> {
  const cached = metadataCache.get(packageName);
  if (cached) return ok(cached);

  try {
    const response = await fetchWithRetry(`https://registry.npmjs.org/${packageName}`);
    if (!response.ok) {
      if (response.status === 404) return fail(new RegistryError('Package not found', 404));
      if (response.status === 429) return fail(new RegistryError('Rate limited', 429));
      return fail(new RegistryError(`NPM registry returned ${response.status}`, response.status));
    }
    const data = await response.json();
    const parsed = NpmPackageMetadataSchema.parse(data);
    metadataCache.set(packageName, parsed);
    return ok(parsed);
  } catch (e) {
    if (e instanceof z.ZodError) return fail(new RegistryError(`Schema validation failed: ${e.message}`));
    if (e instanceof DOMException && e.name === 'TimeoutError') return fail(new RegistryError('Request timed out'));
    return fail(new RegistryError(e instanceof Error ? e.message : 'Unknown network error'));
  }
}

export async function fetchNpmDownloads(packageName: string): Promise<Result<NpmDownloadStats, RegistryError>> {
  const cached = downloadsCache.get(packageName);
  if (cached) return ok(cached);

  try {
    const response = await fetchWithRetry(`https://api.npmjs.org/downloads/point/last-week/${packageName}`);
    if (!response.ok) {
      if (response.status === 404) return fail(new RegistryError('Downloads not found', 404));
      if (response.status === 429) return fail(new RegistryError('Rate limited', 429));
      return fail(new RegistryError(`NPM API returned ${response.status}`, response.status));
    }
    const data = await response.json();
    const parsed = NpmDownloadStatsSchema.parse(data);
    downloadsCache.set(packageName, parsed);
    return ok(parsed);
  } catch (e) {
    if (e instanceof z.ZodError) return fail(new RegistryError(`Schema validation failed: ${e.message}`));
    if (e instanceof DOMException && e.name === 'TimeoutError') return fail(new RegistryError('Request timed out'));
    return fail(new RegistryError(e instanceof Error ? e.message : 'Unknown network error'));
  }
}
