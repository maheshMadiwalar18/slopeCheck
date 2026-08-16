import { RegistryClient } from '@slopcheck/registry';
import { RiskEngine, PluginRegistry, isFailure, PolicyEngine } from '@slopcheck/core';
import { getDatasetManifest } from '@slopcheck/datasets';
import type { PackageContext, AssessmentStatus, AssessmentError } from '@slopcheck/core';
import { 
  AgeDetector, 
  HallucinationDetector, 
  MetadataDetector, 
  PopularityDetector, 
  RepoDetector, 
  SimilarityDetector 
} from '@slopcheck/heuristics';
import type { AgentAdapter, InstallRequest, SecurityDecision, SecurityPolicy } from './types';

export class SlopcheckGuard implements AgentAdapter {
  private engine: RiskEngine;

  constructor(
    private policy: SecurityPolicy | PolicyEngine = new PolicyEngine(),
    private client: RegistryClient = new RegistryClient(),
    engine?: RiskEngine
  ) {
    if (engine) {
      this.engine = engine;
    } else {
      const registry = new PluginRegistry();
      registry.register(new AgeDetector());
      registry.register(new PopularityDetector());
      registry.register(new RepoDetector());
      registry.register(new MetadataDetector());
      registry.register(new HallucinationDetector());
      registry.register(new SimilarityDetector());
      this.engine = new RiskEngine(registry);
    }
  }

  private isValidPackageName(name: string): boolean {
    return /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(name);
  }

  async inspect(request: InstallRequest): Promise<SecurityDecision> {
    if (!this.isValidPackageName(request.package)) {
      return {
        decision: 'BLOCK',
        reasons: [{ code: 'INVALID_PACKAGE_NAME', message: `Invalid package name format: ${request.package}` }]
      };
    }

    const context: PackageContext = { name: request.package, version: request.version };
    let status: AssessmentStatus = 'COMPLETE';
    const errors: AssessmentError[] = [];
    let isNotFound = false;

    // Fetch NPM Metadata
    const npmRes = await this.client.fetchNpmMetadata(request.package);
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
      
      // Fetch NPM Downloads
      const dlRes = await this.client.fetchNpmDownloads(request.package);
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
      
      // Fetch GitHub Metadata
      if (context.npm.repository) {
        const repoUrl = typeof context.npm.repository === 'string' ? context.npm.repository : context.npm.repository.url;
        const ghRes = await this.client.fetchGithubMetadata(repoUrl);
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

    let datasetVersion: string | undefined;
    try {
      const manifest = await getDatasetManifest();
      datasetVersion = manifest.datasetVersion;
    } catch {
      // Ignore
    }

    let assessment = await this.engine.evaluate(context, status, errors, datasetVersion);

    if (isNotFound && assessment.level !== 'CRITICAL' && assessment.level !== 'HIGH') {
      assessment = {
        ...assessment,
        level: 'UNKNOWN',
        score: null,
        assessable: false,
      };
    }

    return this.policy.decide(assessment);
  }
}
