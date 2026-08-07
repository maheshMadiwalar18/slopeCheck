import type { DetectorPlugin, PackageContext, RiskFactor, Result } from '@slopcheck/core';
import { ok, fail } from '@slopcheck/core';
import { distance } from 'fastest-levenshtein';

// Simple mocked list of highly popular packages for typosquatting checks
// In a real app, this would be fetched from @slopcheck/datasets
const POPULAR_PACKAGES = [
  'react', 'lodash', 'express', 'moment', 'chalk', 'tslib', 'commander', 'axios', 'request'
];

export class SimilarityDetector implements DetectorPlugin {
  name = 'SimilarityDetector';

  async analyze(context: PackageContext): Promise<Result<RiskFactor[], Error>> {
    try {
      if (POPULAR_PACKAGES.includes(context.name)) return ok([]);

      for (const popular of POPULAR_PACKAGES) {
        const dist = distance(context.name, popular);

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
        if (dist === 2 && context.name.length > 5) {
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
