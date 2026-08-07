import { z } from 'zod';
import { DataCache } from './cache';
import type { HttpResult } from './result';
import { ok, fail } from './result';

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

export async function fetchNpmMetadata(packageName: string): Promise<HttpResult<NpmPackageMetadata, RegistryError>> {
  const cached = metadataCache.get(packageName);
  if (cached) return ok(cached);

  try {
    const response = await fetch(`https://registry.npmjs.org/${packageName}`);
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
    return fail(new RegistryError(e instanceof Error ? e.message : 'Unknown network error'));
  }
}

export async function fetchNpmDownloads(packageName: string): Promise<HttpResult<NpmDownloadStats, RegistryError>> {
  const cached = downloadsCache.get(packageName);
  if (cached) return ok(cached);

  try {
    const response = await fetch(`https://api.npmjs.org/downloads/point/last-week/${packageName}`);
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
    return fail(new RegistryError(e instanceof Error ? e.message : 'Unknown network error'));
  }
}
