import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

/**
 * A record representing a known AI-hallucinated or malicious package name.
 */
export interface HallucinationRecord {
  readonly package: string;
  readonly source: string;
  readonly date_added: string;
  readonly notes?: string | undefined;
}

// ---------------------------------------------------------------------------
// Internal: ESM-safe directory resolution
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __basedir = dirname(__filename);

// ---------------------------------------------------------------------------
// Internal: In-memory cache (read once from disk, serve forever)
// ---------------------------------------------------------------------------

let officialCache: readonly HallucinationRecord[] | null = null;
let communityCache: readonly HallucinationRecord[] | null = null;
let mergedSet: ReadonlySet<string> | null = null;
let popularCache: readonly string[] | null = null;

function validateRecords(data: unknown, filePath: string): readonly HallucinationRecord[] {
  if (!Array.isArray(data)) {
    throw new Error(`Dataset ${filePath} must be a JSON array, got ${typeof data}`);
  }

  for (let i = 0; i < data.length; i++) {
    const item: unknown = data[i];
    if (
      typeof item !== 'object' ||
      item === null ||
      !('package' in item) ||
      typeof (item as Record<string, unknown>).package !== 'string' ||
      !('source' in item) ||
      typeof (item as Record<string, unknown>).source !== 'string' ||
      !('date_added' in item) ||
      typeof (item as Record<string, unknown>).date_added !== 'string'
    ) {
      throw new Error(
        `Dataset ${filePath}[${i}] must have { package: string, source: string, date_added: string }`,
      );
    }
  }

  return data as readonly HallucinationRecord[];
}

async function loadJsonFile(relativePath: string): Promise<readonly HallucinationRecord[]> {
  const fullPath = resolve(__basedir, relativePath);
  const content = await readFile(fullPath, 'utf-8');
  const data: unknown = JSON.parse(content);
  return validateRecords(data, relativePath);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Load the official hallucination dataset (curated by maintainers).
 * Results are cached after the first call.
 */
export async function getOfficialHallucinations(): Promise<readonly HallucinationRecord[]> {
  if (officialCache !== null) return officialCache;
  officialCache = await loadJsonFile('../data/official.json');
  return officialCache;
}

/**
 * Load the community-contributed hallucination dataset.
 * Results are cached after the first call.
 */
export async function getCommunityHallucinations(): Promise<readonly HallucinationRecord[]> {
  if (communityCache !== null) return communityCache;
  communityCache = await loadJsonFile('../data/community.json');
  return communityCache;
}

/**
 * Get a merged Set of all known hallucinated package names for O(1) lookups.
 * Results are cached after the first call.
 */
export async function getKnownHallucinationNames(): Promise<ReadonlySet<string>> {
  if (mergedSet !== null) return mergedSet;

  const [official, community] = await Promise.all([
    getOfficialHallucinations(),
    getCommunityHallucinations(),
  ]);

  const names = new Set<string>();
  for (const record of official) names.add(record.package);
  for (const record of community) names.add(record.package);

  mergedSet = names;
  return mergedSet;
}

/**
 * Load the curated list of popular npm package names used for typosquatting detection.
 * Results are cached after the first call.
 */
export async function getPopularPackages(): Promise<readonly string[]> {
  if (popularCache !== null) return popularCache;

  const fullPath = resolve(__basedir, '../data/popular-packages.json');
  const content = await readFile(fullPath, 'utf-8');
  const data: unknown = JSON.parse(content);

  if (!Array.isArray(data) || !data.every((item): item is string => typeof item === 'string')) {
    throw new Error('popular-packages.json must be a JSON array of strings');
  }

  popularCache = data as readonly string[];
  return popularCache;
}
