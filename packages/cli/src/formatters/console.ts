import pc from 'picocolors';
import type { RiskAssessment } from '@slopcheck/core';

export function formatRiskAssessment(assessment: RiskAssessment): string {
  let output = `\n${pc.bold('Package:')} ${pc.cyan(assessment.package)}\n`;
  output += `${pc.bold('Risk Score:')} ${assessment.score}/100\n`;
  
  let levelColor = pc.green;
  if (assessment.level === 'CRITICAL') levelColor = pc.red;
  else if (assessment.level === 'HIGH') levelColor = pc.yellow;
  else if (assessment.level === 'SUSPICIOUS') levelColor = pc.blue;
  
  output += `${pc.bold('Level:')} ${levelColor(assessment.level)}\n\n`;

  if (assessment.factors.length > 0) {
    output += `${pc.bold('Reasons:')}\n`;
    for (const factor of assessment.factors) {
      output += `  ${levelColor('✓')} ${factor.description}\n`;
    }
    output += '\n';
  }

  if (assessment.recommendations.length > 0) {
    output += `${pc.bold('Recommendations:')}\n`;
    for (const rec of assessment.recommendations) {
      output += `  ${pc.yellow('!')} ${rec}\n`;
    }
  }

  return output;
}
