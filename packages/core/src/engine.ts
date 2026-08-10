import { PluginRegistry } from './plugin';
import type { PackageContext, RiskAssessment, RiskLevel, RiskFactor } from './types';
import { isSuccess } from './result';

export class RiskEngine {
  constructor(private registry: PluginRegistry) {}

  async evaluate(
    context: PackageContext,
    status: import('./types').AssessmentStatus = 'COMPLETE',
    errors: import('./types').AssessmentError[] = []
  ): Promise<RiskAssessment> {
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
          errors.push({
            source: plugin.name,
            code: 'PLUGIN_ERROR',
            message: result.error instanceof Error ? result.error.message : String(result.error),
          });
          if (status === 'COMPLETE') status = 'PARTIAL';
        }
      } catch (e) {
        errors.push({
          source: plugin.name,
          code: 'PLUGIN_CRASH',
          message: e instanceof Error ? e.message : String(e),
        });
        if (status === 'COMPLETE') status = 'PARTIAL';
      }
    }

    let finalScore: number | null = totalWeight > 0 ? Math.min(Math.round(totalWeightedScore / totalWeight), 100) : 0;
    let level: RiskLevel = 'SAFE';

    if (totalWeight === 0 && (status === 'UNAVAILABLE' || errors.length > 0)) {
      finalScore = null;
      level = 'UNKNOWN';
    } else {
      if (finalScore >= 80) level = 'CRITICAL';
      else if (finalScore >= 60) level = 'HIGH';
      else if (finalScore >= 30) level = 'SUSPICIOUS';
    }

    return {
      package: context.name,
      status,
      assessable: finalScore !== null,
      score: finalScore,
      level,
      factors,
      recommendations,
      errors,
      scoring: {
        totalWeightedScore,
        totalWeight,
      }
    };
  }
}
