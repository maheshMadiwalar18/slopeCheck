import { z } from 'zod';

export const GithubMetadataSchema = z.object({
  full_name: z.string(),
  stargazers_count: z.number(),
  forks_count: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
  pushed_at: z.string(),
  archived: z.boolean().optional(),
  disabled: z.boolean().optional(),
});

export type GithubMetadata = z.infer<typeof GithubMetadataSchema>;


