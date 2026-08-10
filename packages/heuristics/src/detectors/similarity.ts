import type { DetectorPlugin, PackageContext, RiskFactor, Result } from '@slopcheck/core';
import { ok, fail } from '@slopcheck/core';
import { distance } from 'fastest-levenshtein';
import { getPopularPackages } from '@slopcheck/datasets';

export class SimilarityDetector implements DetectorPlugin {
  name = 'SimilarityDetector';

  private normalize(name: string): string {
    // Strip scope (e.g., @evil/react -> react)
    const withoutScope = name.includes('/') ? name.split('/').pop()! : name;
    // Normalize Unicode (canonical decomposition) and convert to lowercase
    return withoutScope.normalize('NFKD').toLowerCase().replace(/[^a-z0-9-.]/g, '');
  }

  async analyze(context: PackageContext): Promise<Result<RiskFactor[], Error>> {
    try {
      const popularPackages = await getPopularPackages();

      if (popularPackages.includes(context.name)) return ok([]);

      const normalizedContextName = this.normalize(context.name);

      for (const popular of popularPackages) {
        const normalizedPopular = this.normalize(popular);
        const dist = distance(normalizedContextName, normalizedPopular);

        // If it's a 1-character typo of a massively popular package
        if (dist === 1) {
          return ok([{
            name: this.name,
            description: `Package name '${context.name}' is highly similar to popular package '${popular}' (Levenshtein distance 1)`,
            score: 95,
            weight: 2.5,
          }]);
        }
        
        // 2-character typo
        if (dist === 2 && normalizedContextName.length > 5) {
           return ok([{
            name: this.name,
            description: `Package name '${context.name}' is similar to popular package '${popular}' (Levenshtein distance 2)`,
            score: 60,
            weight: 1.5,
          }]);
        }
      }

      return ok([]);
    } catch (e) {
      return fail(e instanceof Error ? e : new Error('Unknown error in SimilarityDetector'));
    }
  }
}

