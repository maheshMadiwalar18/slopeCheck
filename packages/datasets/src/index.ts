import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { z } from 'zod';

export interface HallucinationRecord {
  readonly package: string;
  readonly source: string;
  readonly date_added: string;
  readonly notes?: string | undefined;
}

const HallucinationRecordSchema = z.object({
  package: z.string().regex(/^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/, "Invalid npm package name format"),
  source: z.string().min(1),
  date_added: z.string(),
  notes: z.string().optional(),
});

const DatasetSchema = z.array(HallucinationRecordSchema);

const __filename = fileURLToPath(import.meta.url);
const __basedir = dirname(__filename);

let officialCache: readonly HallucinationRecord[] | null = null;
let communityCache: readonly HallucinationRecord[] | null = null;
let mergedSet: ReadonlySet<string> | null = null;
let hallucinationMap: ReadonlyMap<string, HallucinationRecord> | null = null;
let popularCache: readonly string[] | null = null;

async function loadJsonFile(relativePath: string): Promise<readonly HallucinationRecord[]> {
  const fullPath = resolve(__basedir, relativePath);
  const content = await readFile(fullPath, 'utf-8');
  const data: unknown = JSON.parse(content);
  return DatasetSchema.parse(data);
}

export async function getOfficialHallucinations(): Promise<readonly HallucinationRecord[]> {
  if (officialCache !== null) return officialCache;
  officialCache = await loadJsonFile('../data/official.json');
  return officialCache;
}

export async function getCommunityHallucinations(): Promise<readonly HallucinationRecord[]> {
  if (communityCache !== null) return communityCache;
  communityCache = await loadJsonFile('../data/community.json');
  return communityCache;
}

export async function getKnownHallucinationNames(): Promise<ReadonlySet<string>> {
  if (mergedSet !== null) return mergedSet;
  const map = await getHallucinationMap();
  mergedSet = new Set(map.keys());
  return mergedSet;
}

export async function getHallucinationMap(): Promise<ReadonlyMap<string, HallucinationRecord>> {
  if (hallucinationMap !== null) return hallucinationMap;

  const [official, community] = await Promise.all([
    getOfficialHallucinations(),
    getCommunityHallucinations(),
  ]);

  const map = new Map<string, HallucinationRecord>();
  for (const record of official) map.set(record.package, record);
  for (const record of community) {
    if (!map.has(record.package)) {
      map.set(record.package, record);
    }
  }

  hallucinationMap = map;
  return hallucinationMap;
}

export async function getPopularPackages(): Promise<readonly string[]> {
  if (popularCache !== null) return popularCache;

  const fullPath = resolve(__basedir, '../data/popular-packages.json');
  const content = await readFile(fullPath, 'utf-8');
  const data: unknown = JSON.parse(content);

  const parsed = z.array(z.string()).parse(data);
  popularCache = parsed;
  return popularCache;
}
