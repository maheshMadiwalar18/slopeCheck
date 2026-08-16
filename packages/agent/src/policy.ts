import type { RiskAssessment } from '@slopcheck/core';
import type { SecurityDecision, SecurityPolicy } from './types';

export class DefaultSecurityPolicy implements SecurityPolicy {
  decide(assessment: RiskAssessment): SecurityDecision {
    const reasons: { code: string; message: string }[] = [];
    
    if (assessment.status === 'UNAVAILABLE') {
      reasons.push({ code: 'REGISTRY_UNAVAILABLE', message: 'Could not fetch metadata from the registry.' });
      return { decision: 'BLOCK', assessment, reasons };
    }

    if (assessment.status === 'NOT_FOUND' && assessment.level !== 'CRITICAL') {
      // It's a missing package, not a hallucination, but we still shouldn't allow it.
      reasons.push({ code: 'PACKAGE_NOT_FOUND', message: 'Package does not exist in the registry.' });
      return { decision: 'BLOCK', assessment, reasons };
    }

    if (assessment.level === 'CRITICAL') {
      for (const factor of assessment.factors) {
         if (factor.score >= 80) {
           reasons.push({ code: factor.name.toUpperCase().replace(/\s+/g, '_'), message: factor.description });
         }
      }
      return { decision: 'BLOCK', assessment, reasons };
    }
    
    if (assessment.level === 'HIGH') {
      for (const factor of assessment.factors) {
         if (factor.score >= 60) {
           reasons.push({ code: factor.name.toUpperCase().replace(/\s+/g, '_'), message: factor.description });
         }
      }
      return { decision: 'BLOCK', assessment, reasons };
    }
    
    if (assessment.level === 'SUSPICIOUS') {
      if (assessment.status === 'PARTIAL') {
         reasons.push({ code: 'PARTIAL_ASSESSMENT', message: 'Assessment incomplete due to missing data.' });
      }
      for (const factor of assessment.factors) {
         if (factor.score >= 30) {
           reasons.push({ code: factor.name.toUpperCase().replace(/\s+/g, '_'), message: factor.description });
         }
      }
      return { decision: 'WARN', assessment, reasons };
    }

    if (assessment.status === 'PARTIAL') {
      reasons.push({ code: 'PARTIAL_ASSESSMENT', message: 'Assessment incomplete due to missing data.' });
      return { decision: 'WARN', assessment, reasons };
    }
    
    return { decision: 'ALLOW', assessment, reasons };
  }
}
