import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import crypto from 'node:crypto';
import { z } from 'zod';

export interface HallucinationRecord {
  readonly package: string;
  readonly source: string;
  readonly date_added: string;
  readonly notes?: string | undefined;
}

export interface DatasetManifest {
  readonly schemaVersion: number;
  readonly datasetVersion: string;
  readonly generatedAt: string;
  readonly datasets: Readonly<Record<string, {
    readonly version: string;
    readonly sha256: string;
    readonly records: number;
  }>>;
}

const HallucinationRecordSchema = z.object({
  package: z.string().regex(/^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/, "Invalid npm package name format"),
  source: z.string().min(1),
  date_added: z.string(),
  notes: z.string().optional(),
});

const DatasetSchema = z.array(HallucinationRecordSchema);

const DatasetManifestSchema = z.object({
  schemaVersion: z.number(),
  datasetVersion: z.string(),
  generatedAt: z.string(),
  datasets: z.record(
    z.string(),
    z.object({
      version: z.string(),
      sha256: z.string(),
      records: z.number(),
    })
  )
});

const __filename = fileURLToPath(import.meta.url);
const __basedir = dirname(__filename);

let officialCache: readonly HallucinationRecord[] | null = null;
let communityCache: readonly HallucinationRecord[] | null = null;
let mergedSet: ReadonlySet<string> | null = null;
let hallucinationMap: ReadonlyMap<string, HallucinationRecord> | null = null;
let popularCache: readonly string[] | null = null;
let protectedCache: ReadonlySet<string> | null = null;
let manifestCache: DatasetManifest | null = null;

export function normalizePackageName(pkg: string): string {
  // Trim spaces and make lowercase to prevent trivial bypasses
  // This preserves @scope/name structure.
  return pkg.trim().toLowerCase();
}

async function loadManifest(): Promise<DatasetManifest> {
  if (manifestCache !== null) return manifestCache;
  const fullPath = resolve(__basedir, '../data/manifest.json');
  const content = await readFile(fullPath, 'utf-8');
  const data: unknown = JSON.parse(content);
  manifestCache = DatasetManifestSchema.parse(data);
  return manifestCache;
}

export async function getDatasetManifest(): Promise<DatasetManifest> {
  return loadManifest();
}

async function verifyAndLoadFile(relativePath: string, datasetKey: string): Promise<string> {
  const manifest = await loadManifest();
  const datasetInfo = manifest.datasets[datasetKey];
  if (!datasetInfo) {
    throw new Error(`Dataset manifest missing entry for ${datasetKey}`);
  }

  const fullPath = resolve(__basedir, relativePath);
  const fileBuffer = await readFile(fullPath);
  
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  const actualHash = hashSum.digest('hex');

  if (actualHash !== datasetInfo.sha256) {
    throw new Error(`Checksum mismatch for dataset ${datasetKey}. Expected ${datasetInfo.sha256}, got ${actualHash}`);
  }

  return fileBuffer.toString('utf-8');
}

async function loadJsonDataset(relativePath: string, datasetKey: string): Promise<readonly HallucinationRecord[]> {
  const content = await verifyAndLoadFile(relativePath, datasetKey);
  const data: unknown = JSON.parse(content);
  return DatasetSchema.parse(data);
}

export async function getOfficialHallucinations(): Promise<readonly HallucinationRecord[]> {
  if (officialCache !== null) return officialCache;
  officialCache = await loadJsonDataset('../data/official.json', 'official');
  return officialCache;
}

export async function getCommunityHallucinations(): Promise<readonly HallucinationRecord[]> {
  if (communityCache !== null) return communityCache;
  communityCache = await loadJsonDataset('../data/community.json', 'community');
  return communityCache;
}

export async function getProtectedPackages(): Promise<ReadonlySet<string>> {
  if (protectedCache !== null) return protectedCache;
  const content = await verifyAndLoadFile('../data/protected.json', 'protected');
  const data: unknown = JSON.parse(content);
  const parsed = z.array(z.string()).parse(data);
  const normalized = parsed.map(normalizePackageName);
  protectedCache = new Set(normalized);
  return protectedCache;
}

export async function getPopularPackages(): Promise<readonly string[]> {
  if (popularCache !== null) return popularCache;

  const content = await verifyAndLoadFile('../data/popular-packages.json', 'popular-packages');
  const data: unknown = JSON.parse(content);
  const parsed = z.array(z.string()).parse(data);
  
  popularCache = parsed.map(normalizePackageName);
  return popularCache;
}

export async function getHallucinationMap(): Promise<ReadonlyMap<string, HallucinationRecord>> {
  if (hallucinationMap !== null) return hallucinationMap;

  const [official, community, protectedPkgs] = await Promise.all([
    getOfficialHallucinations(),
    getCommunityHallucinations(),
    getProtectedPackages(),
  ]);

  const map = new Map<string, HallucinationRecord>();
  
  // Official dataset takes precedence
  for (const record of official) {
    const key = normalizePackageName(record.package);
    if (!protectedPkgs.has(key)) {
      map.set(key, record);
    }
  }

  // Community dataset fills in the gaps, but cannot override official or protected
  for (const record of community) {
    const key = normalizePackageName(record.package);
    if (!protectedPkgs.has(key) && !map.has(key)) {
      map.set(key, record);
    }
  }

  hallucinationMap = map;
  return hallucinationMap;
}

export async function getKnownHallucinationNames(): Promise<ReadonlySet<string>> {
  if (mergedSet !== null) return mergedSet;
  const map = await getHallucinationMap();
  mergedSet = new Set(map.keys());
  return mergedSet;
}
