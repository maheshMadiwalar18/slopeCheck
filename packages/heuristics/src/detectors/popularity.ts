import type { DetectorPlugin, PackageContext, RiskFactor, Result } from '@slopcheck/core';
import { ok, fail } from '@slopcheck/core';

export class PopularityDetector implements DetectorPlugin {
  name = 'PopularityDetector';

  async analyze(context: PackageContext): Promise<Result<RiskFactor[], Error>> {
    try {
      if (!context.downloads) return ok([]);

      const dl = context.downloads.downloads;
      let score = 0;

      if (dl === 0) score = 100;
      else if (dl < 50) score = 80;
      else if (dl < 500) score = 50;
      else if (dl < 2000) score = 20;

      if (score === 0) return ok([]);

      return ok([{
        name: this.name,
        description: `Package has only ${dl} weekly downloads.`,
        score,
        weight: 1.2,
      }]);
    } catch (e) {
      return fail(e instanceof Error ? e : new Error('Unknown error in PopularityDetector'));
    }
  }
}
