import type { DetectorPlugin, PackageContext, RiskFactor, Result } from '@slopcheck/core';
import { ok, fail } from '@slopcheck/core';

export class AgeDetector implements DetectorPlugin {
  name = 'AgeDetector';

  async analyze(context: PackageContext): Promise<Result<RiskFactor[], Error>> {
    try {
      if (!context.npm || !context.npm.time || !context.npm.time.created) {
        return ok([]);
      }

      const createdTime = new Date(context.npm.time.created).getTime();
      const now = Date.now();
      const daysOld = Math.max(0, (now - createdTime) / (1000 * 60 * 60 * 24));

      let score = 0;
      if (daysOld < 1) score = 100;
      else if (daysOld < 7) score = 80;
      else if (daysOld < 30) score = 50;
      else if (daysOld < 90) score = 20;

      if (score === 0) return ok([]);

      return ok([{
        name: this.name,
        description: `Package is ${Math.round(daysOld)} days old.`,
        score,
        weight: 1.5,
      }]);
    } catch (e) {
      return fail(e instanceof Error ? e : new Error('Unknown error in AgeDetector'));
    }
  }
}
