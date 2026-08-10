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
        const repoUrl = typeof context.npm.repository === 'string' ? context.npm.repository : context.npm.repository.url;
        if (repoUrl && repoUrl.includes('github.com')) {
           return ok([{
             name: this.name,
             description: `The linked GitHub repository is missing or inaccessible.`,
             score: 95,
             weight: 2.0,
           }]);
        }
      }

      return ok([]);
    } catch (e) {
      return fail(e instanceof Error ? e : new Error('Unknown error in RepoDetector'));
    }
  }
}
