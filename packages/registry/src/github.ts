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

const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 2;
const RETRY_BASE_MS = 500;

const inflight = new Map<string, Promise<Response>>();

async function fetchWithRetry(url: string, init?: RequestInit): Promise<Response> {
  const existing = inflight.get(url);
  if (existing) return existing;

  const attempt = async (retries: number): Promise<Response> => {
    try {
      const response = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
      });

      if (response.status >= 500 && retries < MAX_RETRIES) {
        await sleep(RETRY_BASE_MS * 2 ** retries);
        return attempt(retries + 1);
      }

      return response;
    } catch (e) {
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

    const token = process.env['GITHUB_TOKEN'];
    if (token) {
      headers['Authorization'] = `token ${token}`;
    }

    const response = await fetchWithRetry(`https://api.github.com/repos/${owner}/${repo}`, {
      headers,
    });
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
    if (e instanceof DOMException && e.name === 'TimeoutError') return fail(new RegistryError('Request timed out'));
    return fail(new RegistryError(e instanceof Error ? e.message : 'Unknown network error'));
  }
}
