import type { EvaluationResult } from './runner';

export interface BenchmarkMetrics {
  detection: {
    tp: number;
    fp: number;
    fn: number;
    tn: number;
    precision: number;
    recall: number;
    f1: number;
  };
  severity: {
    exactMatch: number;
    overEscalation: number;
    underEscalation: number;
  };
  safe: {
    precision: number;
    recall: number;
  };
}

const SEVERITY_RANK = {
  'SAFE': 0,
  'UNKNOWN': 0,
  'UNAVAILABLE': 0,
  'NOT_FOUND': 0,
  'UNSUPPORTED': 0,
  'SUSPICIOUS': 1,
  'HIGH': 2,
  'CRITICAL': 3,
};

export function calculateMetrics(results: EvaluationResult[]): BenchmarkMetrics {
  let tp = 0, fp = 0, fn = 0, tn = 0;
  let exactMatch = 0, overEscalation = 0, underEscalation = 0;

  for (const res of results) {
    const isExpectedSafe = res.expectedBehavior === 'SAFE' || res.expectedBehavior === 'UNSUPPORTED';
    const expectedRank = SEVERITY_RANK[res.expectedBehavior as keyof typeof SEVERITY_RANK] ?? 0;
    const actualRank = SEVERITY_RANK[res.actualLevel as keyof typeof SEVERITY_RANK] ?? 0;
    const isActualSuspicious = actualRank >= 1;

    // Detection Classification
    if (!isExpectedSafe && isActualSuspicious) tp++;
    else if (isExpectedSafe && isActualSuspicious) fp++;
    else if (!isExpectedSafe && !isActualSuspicious) fn++;
    else if (isExpectedSafe && !isActualSuspicious) tn++;

    // Severity Accuracy
    if (!isExpectedSafe && isActualSuspicious) {
      if (res.actualLevel === res.expectedBehavior) {
        exactMatch++;
      } else if (actualRank > expectedRank) {
        overEscalation++;
      } else if (actualRank < expectedRank) {
        underEscalation++;
      }
    }
  }

  const calcPrecision = (truePos: number, falsePos: number) => truePos + falsePos === 0 ? 0 : truePos / (truePos + falsePos);
  const calcRecall = (truePos: number, falseNeg: number) => truePos + falseNeg === 0 ? 0 : truePos / (truePos + falseNeg);
  const calcF1 = (p: number, r: number) => p + r === 0 ? 0 : (2 * p * r) / (p + r);

  const detectionPrecision = calcPrecision(tp, fp);
  const detectionRecall = calcRecall(tp, fn);
  
  // Safe metrics treat TN as the "Positive" class for safety
  const safePrecision = calcPrecision(tn, fn);
  const safeRecall = calcRecall(tn, fp);

  return {
    detection: {
      tp, fp, fn, tn,
      precision: detectionPrecision,
      recall: detectionRecall,
      f1: calcF1(detectionPrecision, detectionRecall),
    },
    severity: {
      exactMatch,
      overEscalation,
      underEscalation,
    },
    safe: {
      precision: safePrecision,
      recall: safeRecall,
    }
  };
}
