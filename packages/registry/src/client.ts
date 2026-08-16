import { z } from 'zod';
import { DataCache } from './cache';
import { NpmPackageMetadataSchema, NpmDownloadStatsSchema, RegistryError } from './npm';
import type { NpmPackageMetadata, NpmDownloadStats } from './npm';
import { GithubMetadataSchema } from './github';
import type { GithubMetadata } from './github';
import type { Result } from '@slopcheck/core';
import { ok, fail } from '@slopcheck/core';
import type { HttpTransport } from './transport';
import { FetchTransport } from './transport';
import { OsvResponseSchema, normalizeOsv, isVersionAffected } from './osv';
import type { VulnerabilityFinding } from '@slopcheck/core';

const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 2;
const RETRY_BASE_MS = 500;

export class RegistryClient {
  private inflight = new Map<string, Promise<Response>>();

  constructor(
    public transport: HttpTransport = new FetchTransport(),
    public metadataCache = new DataCache<NpmPackageMetadata>(),
    public downloadsCache = new DataCache<NpmDownloadStats>(),
    public githubCache = new DataCache<GithubMetadata>(),
    public vulnerabilityCache = new DataCache<readonly VulnerabilityFinding[]>(),
  ) {}

  private async fetchWithRetry(url: string, init?: RequestInit): Promise<Response> {
    const existing = this.inflight.get(url);
    if (existing) return existing;

    const attempt = async (retries: number): Promise<Response> => {
      try {
        const response = await this.transport.fetch(url, {
          ...init,
          signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
        });

        if (response.status >= 500 && retries < MAX_RETRIES) {
          await this.sleep(RETRY_BASE_MS * 2 ** retries);
          return attempt(retries + 1);
        }

        return response;
      } catch (e) {
        if (retries < MAX_RETRIES && e instanceof TypeError) {
          await this.sleep(RETRY_BASE_MS * 2 ** retries);
          return attempt(retries + 1);
        }
        throw e;
      }
    };

    const promise = attempt(0).finally(() => {
      this.inflight.delete(url);
    });

    this.inflight.set(url, promise);
    return promise;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async fetchNpmMetadata(packageName: string): Promise<Result<NpmPackageMetadata, RegistryError>> {
    const cached = this.metadataCache.get(packageName);
    if (cached) return ok(cached);

    try {
      const response = await this.fetchWithRetry(`https://registry.npmjs.org/${packageName}`);
      if (!response.ok) {
        if (response.status === 404) return fail(new RegistryError('Package not found', 404));
        if (response.status === 429) return fail(new RegistryError('Rate limited', 429));
        return fail(new RegistryError(`NPM registry returned ${response.status}`, response.status));
      }
      const data = await response.json();
      const parsed = NpmPackageMetadataSchema.parse(data);
      // Break V8 string references to the massive JSON payload to prevent OOM
      const detached = JSON.parse(JSON.stringify(parsed));
      this.metadataCache.set(packageName, detached);
      return ok(detached);
    } catch (e) {
      if (e instanceof z.ZodError) return fail(new RegistryError(`Schema validation failed: ${e.message}`));
      if (e instanceof DOMException && e.name === 'TimeoutError') return fail(new RegistryError('Request timed out'));
      return fail(new RegistryError(e instanceof Error ? e.message : 'Unknown network error'));
    }
  }

  async fetchNpmDownloads(packageName: string): Promise<Result<NpmDownloadStats, RegistryError>> {
    const cached = this.downloadsCache.get(packageName);
    if (cached) return ok(cached);

    try {
      const response = await this.fetchWithRetry(`https://api.npmjs.org/downloads/point/last-week/${packageName}`);
      if (!response.ok) {
        if (response.status === 404) return fail(new RegistryError('Downloads not found', 404));
        if (response.status === 429) return fail(new RegistryError('Rate limited', 429));
        return fail(new RegistryError(`NPM API returned ${response.status}`, response.status));
      }
      const data = await response.json();
      const parsed = NpmDownloadStatsSchema.parse(data);
      this.downloadsCache.set(packageName, parsed);
      return ok(parsed);
    } catch (e) {
      if (e instanceof z.ZodError) return fail(new RegistryError(`Schema validation failed: ${e.message}`));
      if (e instanceof DOMException && e.name === 'TimeoutError') return fail(new RegistryError('Request timed out'));
      return fail(new RegistryError(e instanceof Error ? e.message : 'Unknown network error'));
    }
  }

  async fetchGithubMetadata(repoUrl: string): Promise<Result<GithubMetadata, RegistryError>> {
    const match = repoUrl.match(/github\.com[/:]([^/]+)\/([^/.]+)/);
    if (!match || !match[1] || !match[2]) return fail(new RegistryError('Invalid GitHub URL'));

    const owner = match[1];
    const repo = match[2].replace(/\.git$/, '');
    const cacheKey = `${owner}/${repo}`;

    const cached = this.githubCache.get(cacheKey);
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

      const response = await this.fetchWithRetry(`https://api.github.com/repos/${owner}/${repo}`, { headers });
      if (!response.ok) {
        if (response.status === 404) return fail(new RegistryError('Repository not found', 404));
        if (response.status === 403 || response.status === 429) return fail(new RegistryError('Rate limited by GitHub', response.status));
        return fail(new RegistryError(`GitHub API returned ${response.status}`, response.status));
      }
      const data = await response.json();
      const parsed = GithubMetadataSchema.parse(data);
      this.githubCache.set(cacheKey, parsed);
      return ok(parsed);
    } catch (e) {
      if (e instanceof z.ZodError) return fail(new RegistryError(`Schema validation failed: ${e.message}`));
      if (e instanceof DOMException && e.name === 'TimeoutError') return fail(new RegistryError('Request timed out'));
      return fail(new RegistryError(e instanceof Error ? e.message : 'Unknown network error'));
    }
  }

  async fetchOsvVulnerabilities(packageName: string, version?: string): Promise<Result<readonly VulnerabilityFinding[], RegistryError>> {
    const cacheKey = version ? `${packageName}@${version}` : packageName;
    const cached = this.vulnerabilityCache.get(cacheKey);
    if (cached) return ok(cached);

    try {
      // OSV API POST request
      const response = await this.fetchWithRetry(`https://api.osv.dev/v1/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ package: { name: packageName, ecosystem: 'npm' } })
      });
      
      if (!response.ok) {
        return fail(new RegistryError(`OSV API returned ${response.status}`, response.status));
      }
      
      const data = await response.json();
      const parsed = OsvResponseSchema.parse(data);
      
      let findings: VulnerabilityFinding[] = [];
      if (parsed.vulns && parsed.vulns.length > 0) {
        findings = parsed.vulns.map(v => normalizeOsv(v, packageName));
      }

      if (version) {
        findings = findings.filter(f => isVersionAffected(version, f));
      }

      this.vulnerabilityCache.set(cacheKey, findings);
      return ok(findings);
    } catch (e) {
      if (e instanceof z.ZodError) return fail(new RegistryError(`Schema validation failed: ${e.message}`));
      if (e instanceof DOMException && e.name === 'TimeoutError') return fail(new RegistryError('Request timed out'));
      return fail(new RegistryError(e instanceof Error ? e.message : 'Unknown network error'));
    }
  }
}
