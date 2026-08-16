import pc from 'picocolors';
import type { RiskAssessment } from '@slopcheck/core';

export function formatRiskAssessment(assessment: RiskAssessment): string {
  let output = `\n${pc.bold('Package:')} ${pc.cyan(assessment.package)}\n`;
  output += `${pc.bold('Risk Score:')} ${assessment.score}/100\n`;
  
  let levelColor = pc.green;
  let icon = '✓';
  if (assessment.level === 'CRITICAL') { levelColor = pc.red; icon = '✖'; }
  else if (assessment.level === 'HIGH') { levelColor = pc.yellow; icon = '⚠'; }
  else if (assessment.level === 'SUSPICIOUS') { levelColor = pc.blue; icon = 'ℹ'; }
  
  output += `${pc.bold('Level:')} ${levelColor(assessment.level)}\n`;
  
  const statusColor = assessment.status === 'COMPLETE' ? pc.green : pc.yellow;
  output += `${pc.bold('Status:')} ${statusColor(assessment.status)}\n\n`;

  if (assessment.factors.length > 0) {
    output += `${pc.bold('Findings')}\n`;
    output += `────────────────────────────\n`;
    for (const factor of assessment.factors) {
      // If the factor increases risk, use the alert icon, otherwise info
      const factorIcon = factor.score > 0 ? levelColor(icon) : pc.green('✓');
      output += `${factorIcon} ${factor.description}\n`;
    }
    output += '\n';
  }

  if (assessment.recommendations.length > 0) {
    output += `${pc.bold('Recommendation:')}\n`;
    for (const rec of assessment.recommendations) {
      output += `${pc.yellow('!')} ${rec}\n`;
    }
  } else {
    // Provide a default recommendation based on level
    if (assessment.level === 'SAFE') {
      output += `${pc.bold('Recommendation:')}\n${pc.green('✓')} Package appears safe based on heuristic checks.\n`;
    } else {
      output += `${pc.bold('Recommendation:')}\n${pc.yellow('!')} Proceed with caution. Verify the package provenance manually.\n`;
    }
  }

  return output;
}
