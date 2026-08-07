import type { DetectorPlugin, PackageContext, RiskFactor, Result } from '@slopcheck/core';
import { ok, fail } from '@slopcheck/core';
import { getOfficialHallucinations, getCommunityHallucinations } from '@slopcheck/datasets';

export class HallucinationDetector implements DetectorPlugin {
  name = 'HallucinationDetector';

  async analyze(context: PackageContext): Promise<Result<RiskFactor[], Error>> {
    try {
      const official = await getOfficialHallucinations();
      const community = await getCommunityHallucinations();

      const inOfficial = official.find(record => record.package === context.name);
      if (inOfficial) {
        return ok([{
          name: this.name,
          description: `Package is on the official AI hallucination list (Source: ${inOfficial.source})`,
          score: 100,
          weight: 3.0, // High severity
        }]);
      }

      const inCommunity = community.find(record => record.package === context.name);
      if (inCommunity) {
        return ok([{
          name: this.name,
          description: `Package is on the community AI hallucination list (Source: ${inCommunity.source})`,
          score: 80,
          weight: 2.0,
        }]);
      }

      return ok([]);
    } catch (e) {
      return fail(e instanceof Error ? e : new Error('Unknown error in HallucinationDetector'));
    }
  }
}
