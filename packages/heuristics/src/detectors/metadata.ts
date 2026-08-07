import type { DetectorPlugin, PackageContext, RiskFactor, Result } from '@slopcheck/core';
import { ok, fail } from '@slopcheck/core';

export class MetadataDetector implements DetectorPlugin {
  name = 'MetadataDetector';

  async analyze(context: PackageContext): Promise<Result<RiskFactor[], Error>> {
    try {
      if (!context.npm) return ok([]);

      let missingFields = 0;
      if (!context.npm.description || context.npm.description.length < 10) missingFields++;
      if (!context.npm.readme || context.npm.readme.length < 50) missingFields++;
      if (!context.npm.repository) missingFields++;
      if (!context.npm.homepage) missingFields++;
      if (!context.npm.maintainers || context.npm.maintainers.length === 0) missingFields++;

      if (missingFields === 0) return ok([]);

      return ok([{
        name: this.name,
        description: `Package is missing ${missingFields} important metadata fields (description, readme, repo, homepage, maintainers).`,
        score: missingFields * 20, // 20 points per missing field
        weight: 0.5, // Low impact overall compared to typosquatting
      }]);
    } catch (e) {
      return fail(e instanceof Error ? e : new Error('Unknown error in MetadataDetector'));
    }
  }
}
