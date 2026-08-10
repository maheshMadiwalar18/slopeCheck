import type { DetectorPlugin, PackageContext, RiskFactor, Result } from '@slopcheck/core';
import { ok, fail } from '@slopcheck/core';
import { getHallucinationMap } from '@slopcheck/datasets';

export class HallucinationDetector implements DetectorPlugin {
  name = 'HallucinationDetector';

  async analyze(context: PackageContext): Promise<Result<RiskFactor[], Error>> {
    try {
      const map = await getHallucinationMap();
      const exactRecord = map.get(context.name.toLowerCase());

      if (exactRecord && exactRecord.package === context.name) {
        return ok([{
          name: this.name,
          description: `EXACT_HALLUCINATION_MATCH: Package is explicitly on the AI hallucination list (Source: ${exactRecord.source})`,
          score: 100,
          weight: 3.0,
          severityClass: 'hard',
        }]);
      }

      // Not an exact match. Check if the basename matches a known hallucination.
      const basename = context.name.includes('/') ? context.name.split('/').pop()! : context.name;
      const normalizedBasename = basename.toLowerCase();
      
      // We look for a hallucination entry that exactly matches our basename
      const variantRecord = map.get(normalizedBasename);
      
      if (variantRecord && context.name !== normalizedBasename) {
        return ok([{
          name: this.name,
          description: `HALLUCINATED_BASENAME_VARIANT: Package shares its basename with a known hallucinated package (Source: ${variantRecord.source})`,
          score: 80,
          weight: 2.0,
          severityClass: 'strong',
        }]);
      }

      return ok([]);
    } catch (e) {
      return fail(e instanceof Error ? e : new Error('Unknown error in HallucinationDetector'));
    }
  }
}
