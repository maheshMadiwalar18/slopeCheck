import { z } from 'zod';
import { DataCache } from './cache';
import type { Result } from '@slopcheck/core';
import { ok, fail } from '@slopcheck/core';
import { RegistryError } from './npm';

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

const githubCache = new DataCache<GithubMetadata>();

export async function fetchGithubMetadata(repoUrl: string): Promise<Result<GithubMetadata, RegistryError>> {
  const match = repoUrl.match(/github\.com[/:]([^/]+)\/([^/.]+)/);
  if (!match || !match[1] || !match[2]) return fail(new RegistryError('Invalid GitHub URL'));

  const owner = match[1];
  const repo = match[2].replace(/\.git$/, '');
  const cacheKey = `${owner}/${repo}`;

  const cached = githubCache.get(cacheKey);
  if (cached) return ok(cached);

  try {
    const headers: Record<string, string> = {
      'User-Agent': 'slopcheck-agent',
      'Accept': 'application/vnd.github.v3+json'
    };

    if (process.env['GITHUB_TOKEN']) {
      headers['Authorization'] = `token ${process.env['GITHUB_TOKEN']}`;
    }

    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    if (!response.ok) {
      if (response.status === 404) return fail(new RegistryError('Repository not found', 404));
      if (response.status === 403 || response.status === 429) return fail(new RegistryError('Rate limited by GitHub', response.status));
      return fail(new RegistryError(`GitHub API returned ${response.status}`, response.status));
    }
    const data = await response.json();
    const parsed = GithubMetadataSchema.parse(data);
    githubCache.set(cacheKey, parsed);
    return ok(parsed);
  } catch (e) {
    if (e instanceof z.ZodError) return fail(new RegistryError(`Schema validation failed: ${e.message}`));
    return fail(new RegistryError(e instanceof Error ? e.message : 'Unknown network error'));
  }
}
