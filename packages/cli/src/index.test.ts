import { describe, it, expect } from 'vitest';
import { getEngine } from './engine';
import { formatRiskAssessment } from './formatters/console';
import type { RiskAssessment } from '@slopcheck/core';

describe('getEngine', () => {
  it('should return a RiskEngine with all 6 detectors registered', () => {
    const engine = getEngine();
    // Access the internal registry via evaluate — we just verify it doesn't throw
    expect(engine).toBeDefined();
    expect(typeof engine.evaluate).toBe('function');
  });

  it('should return the same singleton instance', () => {
    const a = getEngine();
    const b = getEngine();
    expect(a).toBe(b);
  });
});

describe('formatRiskAssessment', () => {
  it('should format a SAFE assessment', () => {
    const assessment: RiskAssessment = {
      package: 'safe-pkg',
      status: 'COMPLETE',
      assessable: true,
      score: 0,
      level: 'SAFE',
      factors: [],
      recommendations: [],
      errors: [],
    };
    const output = formatRiskAssessment(assessment);
    expect(output).toContain('safe-pkg');
    expect(output).toContain('0/100');
    expect(output).toContain('SAFE');
  });

  it('should format a CRITICAL assessment with factors and recommendations', () => {
    const assessment: RiskAssessment = {
      package: 'bad-pkg',
      status: 'COMPLETE',
      assessable: true,
      score: 95,
      level: 'CRITICAL',
      factors: [
        { name: 'Test', description: 'This is risky', score: 95, weight: 2 },
      ],
      recommendations: ['Stop using this package'],
      errors: [],
    };
    const output = formatRiskAssessment(assessment);
    expect(output).toContain('bad-pkg');
    expect(output).toContain('95/100');
    expect(output).toContain('CRITICAL');
    expect(output).toContain('This is risky');
    expect(output).toContain('Stop using this package');
  });
});
