import { z } from 'zod';
import type { RiskAssessment, AssessmentStatus } from './types';

export const ActionSchema = z.enum(['allow', 'warn', 'block']);
export type Action = z.infer<typeof ActionSchema>;

export const PolicyRuleSchema = z.object({
  detector: z.string(),
  severity: z.enum(['hard', 'strong', 'heuristic']).optional(),
  action: ActionSchema
});

export const PolicySchema = z.object({
  rules: z.array(PolicyRuleSchema).optional(),
  thresholds: z.object({
    critical: ActionSchema.optional(),
    high: ActionSchema.optional(),
    suspicious: ActionSchema.optional(),
    safe: ActionSchema.optional()
  }).optional(),
  behavior: z.object({
    unavailable: ActionSchema.optional(),
    notFound: ActionSchema.optional(),
    partial: ActionSchema.optional()
  }).optional()
}).strict();

export type SlopcheckPolicyConfig = z.infer<typeof PolicySchema>;

export type SecurityDecisionType = 'ALLOW' | 'WARN' | 'BLOCK';

export interface SecurityDecision {
  decision: SecurityDecisionType;
  assessment?: RiskAssessment;
  reasons: Array<{
    code: string;
    message: string;
  }>;
}

export class PolicyEngine {
  private config: SlopcheckPolicyConfig;

  constructor(config?: SlopcheckPolicyConfig) {
    // Merge provided config with secure defaults
    this.config = {
      rules: config?.rules || [],
      thresholds: {
        critical: config?.thresholds?.critical || 'block',
        high: config?.thresholds?.high || 'block',
        suspicious: config?.thresholds?.suspicious || 'warn',
        safe: config?.thresholds?.safe || 'allow'
      },
      behavior: {
        unavailable: config?.behavior?.unavailable || 'block',
        notFound: config?.behavior?.notFound || 'block',
        partial: config?.behavior?.partial || 'warn'
      }
    };
  }

  public validate(configRaw: unknown): SlopcheckPolicyConfig {
    return PolicySchema.parse(configRaw);
  }

  public decide(assessment: RiskAssessment): SecurityDecision {
    const reasons: { code: string; message: string }[] = [];
    let finalDecision: SecurityDecisionType = 'ALLOW';

    const upgradeDecision = (newDecision: Action, reason: { code: string; message: string }) => {
      reasons.push(reason);
      const nd = newDecision.toUpperCase() as SecurityDecisionType;
      if (nd === 'BLOCK') finalDecision = 'BLOCK';
      else if (nd === 'WARN' && finalDecision !== 'BLOCK') finalDecision = 'WARN';
    };

    // 1. Check Behavior (Status)
    if (assessment.status === 'UNAVAILABLE') {
      const action = this.config.behavior?.unavailable;
      if (action && action !== 'allow') {
        upgradeDecision(action, { code: 'POLICY_UNAVAILABLE', message: 'Registry unavailable behavior triggered.' });
      }
    } else if (assessment.status === 'NOT_FOUND') {
      // Missing package is generally bad unless explicitly allowed or it's SAFE
      const action = this.config.behavior?.notFound;
      if (action && action !== 'allow') {
         upgradeDecision(action, { code: 'POLICY_NOT_FOUND', message: 'Package not found behavior triggered.' });
      }
    } else if (assessment.status === 'PARTIAL') {
      const action = this.config.behavior?.partial;
      if (action && action !== 'allow') {
         upgradeDecision(action, { code: 'POLICY_PARTIAL', message: 'Partial assessment behavior triggered.' });
      }
    }

    // 2. Check Specific Rules (Detector-level overrides)
    for (const factor of assessment.factors) {
      const matchingRule = this.config.rules?.find(r => 
        r.detector === factor.name && 
        (!r.severity || r.severity === factor.severityClass)
      );

      if (matchingRule) {
        if (matchingRule.action !== 'allow') {
          upgradeDecision(matchingRule.action, { 
            code: `POLICY_RULE_${matchingRule.detector.toUpperCase()}`, 
            message: `Triggered rule: detector '${matchingRule.detector}' -> ${matchingRule.action.toUpperCase()}`
          });
        }
      }
    }

    // 3. Check General Thresholds
    // Only apply threshold rules if a specific rule hasn't already dominated for these factors?
    // Actually, threshold rules apply to the overall computed risk level.
    const levelKey = assessment.level.toLowerCase() as keyof NonNullable<SlopcheckPolicyConfig['thresholds']>;
    const thresholdAction = this.config.thresholds?.[levelKey];
    
    if (thresholdAction && thresholdAction !== 'allow') {
      // Provide factors that contributed to this level as reasons
      for (const factor of assessment.factors) {
         if (factor.score > 0) { // If it contributed to the risk
           reasons.push({ 
             code: factor.name.toUpperCase().replace(/\s+/g, '_'), 
             message: factor.description 
           });
         }
      }
      upgradeDecision(thresholdAction, { 
        code: `POLICY_THRESHOLD_${assessment.level.toUpperCase()}`, 
        message: `Package risk level: ${assessment.level}. Triggered threshold policy: ${thresholdAction.toUpperCase()}`
      });
    }

    // If assessment is fully safe and no rules trigger, return ALLOW
    return {
      decision: finalDecision,
      assessment,
      reasons
    };
  }
}
