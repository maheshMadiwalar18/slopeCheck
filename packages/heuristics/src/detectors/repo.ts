import type { DetectorPlugin, PackageContext, RiskFactor, Result } from '@slopcheck/core';
import { ok, fail } from '@slopcheck/core';

export class RepoDetector implements DetectorPlugin {
  name = 'RepoDetector';

  async analyze(context: PackageContext): Promise<Result<RiskFactor[], Error>> {
    try {
      if (!context.npm) return ok([]);

      if (!context.npm.repository) {
        return ok([{
          name: this.name,
          description: `No repository field declared in package.json`,
          score: 80,
          weight: 1.0,
        }]);
      }

      if (context.github) {
        if (context.github.archived) {
          return ok([{
            name: this.name,
            description: `The linked GitHub repository is archived.`,
            score: 70,
            weight: 1.0,
          }]);
        }
      } else {
        // We tried to fetch GitHub but got nothing, meaning the repo might be invalid or not on GitHub
        // For this basic detector, we won't penalize heavily unless we know it's a 404, but we don't have the explicit HTTP status here.
        // We will rely on MetadataDetector for missing repo.
      }

      return ok([]);
    } catch (e) {
      return fail(e instanceof Error ? e : new Error('Unknown error in RepoDetector'));
    }
  }
}
