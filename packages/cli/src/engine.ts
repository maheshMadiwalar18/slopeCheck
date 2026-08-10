import type { PackageContext, RiskAssessment, AssessmentStatus, AssessmentError } from '@slopcheck/core';
import { RiskEngine, PluginRegistry, isFailure } from '@slopcheck/core';
import { fetchNpmMetadata, fetchNpmDownloads, fetchGithubMetadata } from '@slopcheck/registry';
import { 
  AgeDetector, 
  HallucinationDetector, 
  MetadataDetector, 
  PopularityDetector, 
  RepoDetector, 
  SimilarityDetector 
} from '@slopcheck/heuristics';

let sharedEngine: RiskEngine | null = null;

export function getEngine(): RiskEngine {
  if (sharedEngine) return sharedEngine;
  
  const registry = new PluginRegistry();
  registry.register(new AgeDetector());
  registry.register(new PopularityDetector());
  registry.register(new RepoDetector());
  registry.register(new MetadataDetector());
  registry.register(new HallucinationDetector());
  registry.register(new SimilarityDetector());

  sharedEngine = new RiskEngine(registry);
  return sharedEngine;
}

export async function evaluatePackage(packageName: string, version?: string): Promise<RiskAssessment> {
  const context: PackageContext = { name: packageName, version };
  let status: AssessmentStatus = 'COMPLETE';
  const errors: AssessmentError[] = [];

  const npmRes = await fetchNpmMetadata(packageName);
  if (isFailure(npmRes)) {
    const error: AssessmentError = {
      source: 'npm',
      code: npmRes.error.status === 404 ? 'PACKAGE_NOT_FOUND' : 'REGISTRY_ERROR',
      message: npmRes.error.message
    };
    
    if (npmRes.error.status === 404) {
      return {
        package: packageName,
        status: 'NOT_FOUND',
        assessable: false,
        score: null,
        level: 'UNKNOWN',
        factors: [],
        recommendations: [],
        errors: [error],
      };
    } else {
      status = 'UNAVAILABLE';
      errors.push(error);
    }
  } else {
    context.npm = npmRes.value;
    const dlRes = await fetchNpmDownloads(packageName);
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
      const ghRes = await fetchGithubMetadata(repoUrl);
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

  const engine = getEngine();
  return engine.evaluate(context, status, errors);
}
