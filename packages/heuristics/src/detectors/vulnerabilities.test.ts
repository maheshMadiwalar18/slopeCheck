import { describe, it, expect } from 'vitest';
import { VulnerabilityDetector } from './vulnerabilities';
import type { PackageContext } from '@slopcheck/core';

describe('VulnerabilityDetector', () => {
  it('returns ok([]) when vulnerabilities is null (offline/unavailable)', async () => {
    const detector = new VulnerabilityDetector();
    const context: PackageContext = {
      name: 'test-pkg',
      vulnerabilities: null
    };

    const result = await detector.analyze(context);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual([]);
    }
  });

  it('returns ok([]) when vulnerabilities is empty array', async () => {
    const detector = new VulnerabilityDetector();
    const context: PackageContext = {
      name: 'test-pkg',
      vulnerabilities: []
    };

    const result = await detector.analyze(context);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual([]);
    }
  });

  it('emits critical factor when CRITICAL vulnerabilities exist', async () => {
    const detector = new VulnerabilityDetector();
    const context: PackageContext = {
      name: 'test-pkg',
      vulnerabilities: [{
        id: 'CVE-1234',
        source: 'OSV.dev',
        severity: 'CRITICAL',
        package: 'test-pkg',
        affectedVersions: ['*'],
        summary: 'Test'
      }]
    };

    const result = await detector.analyze(context);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const factor = result.value.find(f => f.name === 'critical-vulnerabilities');
      expect(factor).toBeDefined();
      expect(factor?.score).toBe(100);
      expect(factor?.severityClass).toBe('hard');
    }
  });

  it('emits high factor when HIGH vulnerabilities exist', async () => {
    const detector = new VulnerabilityDetector();
    const context: PackageContext = {
      name: 'test-pkg',
      vulnerabilities: [{
        id: 'CVE-1235',
        source: 'OSV.dev',
        severity: 'HIGH',
        package: 'test-pkg',
        affectedVersions: ['*'],
        summary: 'Test'
      }]
    };

    const result = await detector.analyze(context);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const factor = result.value.find(f => f.name === 'high-vulnerabilities');
      expect(factor).toBeDefined();
      expect(factor?.score).toBe(80);
      expect(factor?.severityClass).toBe('strong');
    }
  });
});
