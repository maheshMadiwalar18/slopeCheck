import type { DetectorPlugin, PackageContext, RiskFactor, Result } from '@slopcheck/core';
import { ok, fail } from '@slopcheck/core';
import { getHallucinationMap } from '@slopcheck/datasets';

export class HallucinationDetector implements DetectorPlugin {
  name = 'HallucinationDetector';

  async analyze(context: PackageContext): Promise<Result<RiskFactor[], Error>> {
    try {
      const map = await getHallucinationMap();
      const record = map.get(context.name);

      if (record) {
        return ok([{
          name: this.name,
          description: `Package is on the AI hallucination list (Source: ${record.source})`,
          score: 100, // Safe default high score since we can't cleanly distinguish official vs community based on array anymore without extra data, but source is preserved. Or we could check if record.source includes 'community' maybe? Let's just use 100.
          weight: 3.0,
        }]);
      }

      return ok([]);
    } catch (e) {
      return fail(e instanceof Error ? e : new Error('Unknown error in HallucinationDetector'));
    }
  }
}
