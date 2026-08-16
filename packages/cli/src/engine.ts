import type { PackageContext, RiskAssessment, AssessmentStatus, AssessmentError } from '@slopcheck/core';
import { RiskEngine, PluginRegistry, isFailure } from '@slopcheck/core';
import { getDatasetManifest } from '@slopcheck/datasets';
import { RegistryClient } from '@slopcheck/registry';
import { 
  AgeDetector, 
  HallucinationDetector, 
  MetadataDetector, 
  PopularityDetector, 
  RepoDetector, 
  SimilarityDetector,
  VulnerabilityDetector
} from '@slopcheck/heuristics';

let sharedEngine: RiskEngine | null = null;
let sharedRegistryClient: RegistryClient | null = null;

export function getRegistryClient(): RegistryClient {
  if (!sharedRegistryClient) {
    sharedRegistryClient = new RegistryClient();
  }
  return sharedRegistryClient;
}

export function setRegistryClient(client: RegistryClient) {
  sharedRegistryClient = client;
}

export function getEngine(): RiskEngine {
  if (sharedEngine) return sharedEngine;
  
  const registry = new PluginRegistry();
  registry.register(new AgeDetector());
  registry.register(new PopularityDetector());
  registry.register(new RepoDetector());
  registry.register(new MetadataDetector());
  registry.register(new HallucinationDetector());
  registry.register(new SimilarityDetector());
  registry.register(new VulnerabilityDetector());

  sharedEngine = new RiskEngine(registry);
  return sharedEngine;
}

export async function evaluatePackage(packageName: string, version?: string): Promise<RiskAssessment> {
  const context: PackageContext = { name: packageName, version };
  let status: AssessmentStatus = 'COMPLETE';
  const errors: AssessmentError[] = [];

  let isNotFound = false;
  const client = getRegistryClient();
  const npmRes = await client.fetchNpmMetadata(packageName);
  if (isFailure(npmRes)) {
    const error: AssessmentError = {
      source: 'npm',
      code: npmRes.error.status === 404 ? 'PACKAGE_NOT_FOUND' : 'REGISTRY_ERROR',
      message: npmRes.error.message
    };
    
    if (npmRes.error.status === 404) {
      isNotFound = true;
      status = 'NOT_FOUND';
      errors.push(error);
    } else {
      status = 'UNAVAILABLE';
      errors.push(error);
    }
  } else {
    context.npm = npmRes.value;
    const dlRes = await client.fetchNpmDownloads(packageName);
    if (isFailure(dlRes)) {
      status = 'PARTIAL';
      errors.push({
        source: 'npm_downloads',
        code: 'DOWNLOADS_UNAVAILABLE',
        message: dlRes.error.message,
      });
    } else {
      context.downloads = dlRes.value;
    }
    
    if (context.npm.repository) {
      const repoUrl = typeof context.npm.repository === 'string' ? context.npm.repository : context.npm.repository.url;
      const ghRes = await client.fetchGithubMetadata(repoUrl);
      if (isFailure(ghRes)) {
        status = 'PARTIAL';
        errors.push({
          source: 'github',
          code: ghRes.error.status === 404 ? 'REPO_NOT_FOUND' : 'GITHUB_ERROR',
          message: ghRes.error.message,
        });
      } else {
        context.github = ghRes.value;
      }
    }
  }

  // Fetch Vulnerabilities even if NPM fails, although OSV might also fail if package doesn't exist.
  // Actually, if NPM fails with 404, we don't strictly need to fetch OSV, but doing so is safe.
  if (!isNotFound) {
    const osvRes = await client.fetchOsvVulnerabilities(packageName, version);
    if (isFailure(osvRes)) {
      status = 'UNAVAILABLE';
      context.vulnerabilities = null;
      errors.push({
        source: 'osv',
        code: 'VULNERABILITIES_UNAVAILABLE',
        message: osvRes.error.message,
      });
    } else {
      context.vulnerabilities = osvRes.value;
    }
  }

  const engine = getEngine();
  let datasetVersion: string | undefined;
  try {
    const manifest = await getDatasetManifest();
    datasetVersion = manifest.datasetVersion;
  } catch {
    // Ignore, let it be undefined if datasets fail to load
  }

  const res = await engine.evaluate(context, status, errors, datasetVersion);
  
  if (isNotFound && res.level !== 'CRITICAL' && res.level !== 'HIGH') {
    return {
      ...res,
      level: 'UNKNOWN',
      score: null,
      assessable: false,
    };
  }
  
  return res;
}
