import type { DetectorPlugin, PackageContext, RiskFactor, Result } from '@slopcheck/core';
import { ok, fail } from '@slopcheck/core';
import { distance } from 'fastest-levenshtein';
import { getPopularPackages } from '@slopcheck/datasets';

export class SimilarityDetector implements DetectorPlugin {
  name = 'SimilarityDetector';

  private normalize(name: string): string {
    // Strip scope (e.g., @evil/react -> react)
    const withoutScope = name.includes('/') ? name.split('/').pop()! : name;
    // Normalize Unicode (canonical composition) and convert to lowercase
    return withoutScope.normalize('NFKC').toLowerCase();
  }

  private normalizedPopularCache: string[] | null = null;

  async analyze(context: PackageContext): Promise<Result<RiskFactor[], Error>> {
    try {
      const popularPackages = await getPopularPackages();

      if (popularPackages.includes(context.name)) return ok([]);

      if (!this.normalizedPopularCache || this.normalizedPopularCache.length !== popularPackages.length) {
        this.normalizedPopularCache = popularPackages.map(p => this.normalize(p));
      }

      const normalizedContextName = this.normalize(context.name);

      let bestMatch: RiskFactor | null = null;
      let minDistance = Infinity;

      for (let i = 0; i < popularPackages.length; i++) {
        const popular = popularPackages[i]!;
        const normalizedPopular = this.normalizedPopularCache[i]!;
        const dist = distance(normalizedContextName, normalizedPopular);

        if (dist < minDistance) {
          minDistance = dist;
          
          // EXACT BASENAME MATCH (distance 0)
          if (dist === 0) {
            if (context.name !== popular) {
              bestMatch = {
                name: this.name,
                description: `SCOPE_IMPERSONATION: Scoped package '${context.name}' shares the exact basename of popular package '${popular}'`,
                score: 95,
                weight: 3.0,
                severityClass: 'hard',
              };
            } else {
              return ok([]); // It IS the popular package
            }
          } else if (dist === 1) {
            bestMatch = {
              name: this.name,
              description: `Package name '${context.name}' is highly similar to popular package '${popular}' (Levenshtein distance 1)`,
              score: 95,
              weight: 2.5,
              severityClass: 'strong',
            };
          } else if (dist === 2 && normalizedContextName.length > 5) {
            bestMatch = {
              name: this.name,
              description: `Package name '${context.name}' is similar to popular package '${popular}' (Levenshtein distance 2)`,
              score: 60,
              weight: 1.5,
              severityClass: 'strong',
            };
          }
        }
      }

      if (bestMatch) {
        return ok([bestMatch]);
      }

      return ok([]);
    } catch (e) {
      return fail(e instanceof Error ? e : new Error('Unknown error in SimilarityDetector'));
    }
  }
}

