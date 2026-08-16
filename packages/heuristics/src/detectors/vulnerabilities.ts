import type { PackageContext, RiskFactor } from '@slopcheck/core';
import type { Result } from '@slopcheck/core';
import { ok } from '@slopcheck/core';
import type { DetectorPlugin } from '@slopcheck/core';

export class VulnerabilityDetector implements DetectorPlugin {
  name = 'vulnerabilities';

  async analyze(context: PackageContext): Promise<Result<RiskFactor[], Error>> {
    const factors: RiskFactor[] = [];

    // If vulnerability information is successfully fetched but there are no findings
    if (context.vulnerabilities !== null && context.vulnerabilities !== undefined) {
      if (context.vulnerabilities.length === 0) {
        // Safe, no risk factors
        return ok([]);
      }

      // Group vulnerabilities by severity to emit signals
      const counts = {
        CRITICAL: 0,
        HIGH: 0,
        MODERATE: 0,
        LOW: 0,
        UNKNOWN: 0
      };

      for (const vuln of context.vulnerabilities) {
        counts[vuln.severity as keyof typeof counts] = (counts[vuln.severity as keyof typeof counts] || 0) + 1;
      }

      if (counts.CRITICAL > 0) {
        factors.push({
          name: 'critical-vulnerabilities',
          description: `Found ${counts.CRITICAL} CRITICAL known vulnerabilit${counts.CRITICAL === 1 ? 'y' : 'ies'}.`,
          score: 100,
          weight: 10, // high weight to ensure it dominates
          severityClass: 'hard'
        });
      }

      if (counts.HIGH > 0) {
        factors.push({
          name: 'high-vulnerabilities',
          description: `Found ${counts.HIGH} HIGH known vulnerabilit${counts.HIGH === 1 ? 'y' : 'ies'}.`,
          score: 80,
          weight: 8,
          severityClass: 'strong'
        });
      }

      if (counts.MODERATE > 0) {
        factors.push({
          name: 'moderate-vulnerabilities',
          description: `Found ${counts.MODERATE} MODERATE known vulnerabilit${counts.MODERATE === 1 ? 'y' : 'ies'}.`,
          score: 40,
          weight: 5,
          severityClass: 'heuristic'
        });
      }

      if (counts.LOW > 0) {
        factors.push({
          name: 'low-vulnerabilities',
          description: `Found ${counts.LOW} LOW known vulnerabilit${counts.LOW === 1 ? 'y' : 'ies'}.`,
          score: 20,
          weight: 2,
          severityClass: 'heuristic'
        });
      }
    }

    return ok(factors);
  }
}
