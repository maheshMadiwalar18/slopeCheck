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
          console.error(`Plugin ${plugin.name} failed with error:`, result.error);
        }
      } catch (e) {
        console.error(`Plugin ${plugin.name} threw an unexpected error:`, e);
      }
    }

    let finalScore = totalWeight > 0 ? Math.min(Math.round(totalWeightedScore / totalWeight), 100) : 0;
    let level: RiskLevel = 'SAFE';

    // Fail-Closed: If we have zero weight (no factors scored) but the assessment had errors
    // (e.g., UNAVAILABLE metadata), we must NOT consider the package SAFE.
    if (totalWeight === 0 && (status === 'UNAVAILABLE' || errors.length > 0)) {
      finalScore = 100;
      level = 'CRITICAL';
      factors.push({
        name: 'MissingDataFallback',
        description: 'Crucial security data could not be retrieved. Assuming maximum risk.',
        score: 100,
        weight: 1.0,
      });
    } else {
      if (finalScore >= 80) level = 'CRITICAL';
      else if (finalScore >= 60) level = 'HIGH';
      else if (finalScore >= 30) level = 'SUSPICIOUS';
    }

    return {
      package: context.name,
      status,
      assessable: true,
      score: finalScore,
      level,
      factors,
      recommendations,
      errors,
    };
  }
}
