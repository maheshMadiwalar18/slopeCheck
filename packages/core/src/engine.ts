import { PluginRegistry } from './plugin';
import type { PackageContext, RiskAssessment, RiskLevel, RiskFactor } from './types';
import { isSuccess } from './result';

export class RiskEngine {
  constructor(private registry: PluginRegistry) {}

  async evaluate(context: PackageContext): Promise<RiskAssessment> {
    const factors: RiskFactor[] = [];
    let totalWeightedScore = 0;
    let totalWeight = 0;
    const recommendations: string[] = [];

    for (const plugin of this.registry.getPlugins()) {
      try {
        const result = await plugin.analyze(context);
        if (isSuccess(result)) {
          for (const factor of result.value) {
            if (factor.score > 0) {
              factors.push(factor);
              totalWeightedScore += factor.score * factor.weight;
              totalWeight += factor.weight;

              if (factor.score >= 80) {
                recommendations.push(`Address risk from ${factor.name}: ${factor.description}`);
              }
            }
          }
        } else {
          console.error(`Plugin ${plugin.name} failed with error:`, result.error);
        }
      } catch (e) {
        console.error(`Plugin ${plugin.name} threw an unexpected error:`, e);
      }
    }

    const finalScore = totalWeight > 0 ? Math.min(Math.round(totalWeightedScore / totalWeight), 100) : 0;

    let level: RiskLevel = 'SAFE';
    if (finalScore >= 80) level = 'CRITICAL';
    else if (finalScore >= 60) level = 'HIGH';
    else if (finalScore >= 30) level = 'SUSPICIOUS';

    return {
      package: context.name,
      score: finalScore,
      level,
      factors,
      recommendations,
    };
  }
}
