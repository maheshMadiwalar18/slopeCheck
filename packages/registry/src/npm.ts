import { z } from 'zod';

// ---------------------------------------------------------------------------
// npm Registry Schemas and Types
// ---------------------------------------------------------------------------

export const NpmPackageMetadataSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  time: z.record(z.string(), z.string()),
  maintainers: z.array(z.object({ name: z.string(), email: z.string().optional() })).optional(),
  repository: z.union([
    z.object({ type: z.string().optional(), url: z.string() }),
    z.string()
  ]).optional(),
  homepage: z.string().optional(),
});

export type NpmPackageMetadata = z.infer<typeof NpmPackageMetadataSchema>;

export const NpmDownloadStatsSchema = z.object({
  downloads: z.number(),
  start: z.string(),
  end: z.string(),
  package: z.string(),
});

export type NpmDownloadStats = z.infer<typeof NpmDownloadStatsSchema>;

export class RegistryError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'RegistryError';
  }
}
