import type { PackageContext, RiskAssessment } from '@slopcheck/core';
import { RiskEngine, PluginRegistry } from '@slopcheck/core';
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

  const npmRes = await fetchNpmMetadata(packageName);
  if (npmRes.ok) {
    context.npm = npmRes.value;
    const dlRes = await fetchNpmDownloads(packageName);
    if (dlRes.ok) context.downloads = dlRes.value;
    
    if (context.npm.repository) {
      const repoUrl = typeof context.npm.repository === 'string' ? context.npm.repository : context.npm.repository.url;
      const ghRes = await fetchGithubMetadata(repoUrl);
      if (ghRes.ok) context.github = ghRes.value;
    }
  }

  const engine = getEngine();
  return engine.evaluate(context);
}
