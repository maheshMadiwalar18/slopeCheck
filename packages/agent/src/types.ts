import type { RiskAssessment, SecurityDecision as CoreSecurityDecision } from '@slopcheck/core';

export interface InstallRequest {
  package: string;
  version?: string;
  packageManager?: 'npm' | 'pnpm' | 'yarn' | 'bun' | string;
  source?: string;
}

/** @deprecated Use SecurityDecisionType from @slopcheck/core */
export type SecurityDecisionType = 'ALLOW' | 'WARN' | 'BLOCK';

/** @deprecated Use SecurityDecision from @slopcheck/core */
export type SecurityDecision = CoreSecurityDecision;

/** @deprecated Use PolicyEngine from @slopcheck/core */
export interface SecurityPolicy {
  decide(assessment: RiskAssessment): SecurityDecision;
}

export interface AgentAdapter {
  inspect(request: InstallRequest): Promise<SecurityDecision>;
}
