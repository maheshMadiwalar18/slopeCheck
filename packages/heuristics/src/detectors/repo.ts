import type { DetectorPlugin, PackageContext, RiskFactor, Result } from '@slopcheck/core';
import { ok, fail } from '@slopcheck/core';

export class RepoDetector implements DetectorPlugin {
  name = 'RepoDetector';

  async analyze(context: PackageContext): Promise<Result<RiskFactor[], Error>> {
    try {
      if (!context.npm) return ok([]);

      const isScoped = context.name.startsWith('@') && context.name.includes('/');

      if (!context.npm.repository) {
        return ok([{
          name: this.name,
          description: `No repository field declared in package.json`,
          score: isScoped ? 40 : 80,
          weight: isScoped ? 0.5 : 1.0,
          severityClass: 'heuristic',
        }]);
      }

      if (context.github) {
        if (context.github.archived) {
          return ok([{
            name: this.name,
            description: `The linked GitHub repository is archived.`,
            score: 70,
            weight: 1.0,
            severityClass: 'heuristic',
          }]);
        }
      } else {
        const repoUrl = typeof context.npm.repository === 'string' ? context.npm.repository : context.npm.repository.url;
        if (repoUrl && repoUrl.includes('github.com')) {
           return ok([{
             name: this.name,
             description: `The linked GitHub repository is missing or inaccessible.`,
             score: isScoped ? 50 : 95,
             weight: isScoped ? 1.0 : 2.0,
             severityClass: 'heuristic',
           }]);
        }
      }

      return ok([]);
    } catch (e) {
      return fail(e instanceof Error ? e : new Error('Unknown error in RepoDetector'));
    }
  }
}
