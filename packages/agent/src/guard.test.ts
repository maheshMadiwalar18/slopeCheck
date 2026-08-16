/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest';
import { SlopcheckGuard } from './guard';
import { DefaultSecurityPolicy } from './policy';
import { RegistryClient, RegistryError } from '@slopcheck/registry';
import { RiskEngine } from '@slopcheck/core';

// Create mock classes
class MockRegistryClient extends RegistryClient {
  fetchNpmMetadata = vi.fn();
  fetchNpmDownloads = vi.fn();
  fetchGithubMetadata = vi.fn();
}

class MockRiskEngine extends RiskEngine {
  evaluate = vi.fn();
}

describe('SlopcheckGuard', () => {
  it('blocks invalid package names', async () => {
    const guard = new SlopcheckGuard();
    const result = await guard.inspect({ package: 'invalid package name' });
    expect(result.decision).toBe('BLOCK');
    expect(result.reasons[0]?.code).toBe('INVALID_PACKAGE_NAME');
  });

  it('blocks on UNAVAILABLE registry', async () => {
    const client = new MockRegistryClient();
    client.fetchNpmMetadata.mockResolvedValue({ 
      ok: false, 
      error: new RegistryError('Network Error', 500) 
    });
    
    const engine = new MockRiskEngine({} as any);
    engine.evaluate.mockResolvedValue({
      package: 'test-pkg',
      status: 'UNAVAILABLE',
      assessable: false,
      score: null,
      level: 'UNKNOWN',
      factors: [],
      recommendations: [],
      errors: [],
      scoring: { totalWeightedScore: 0, totalWeight: 0, heuristicAverage: 0, finalScore: 0, contributions: [] }
    });

    const guard = new SlopcheckGuard(new DefaultSecurityPolicy(), client, engine);
    const result = await guard.inspect({ package: 'test-pkg' });
    
    expect(result.decision).toBe('BLOCK');
    expect(result.reasons[0]?.code).toBe('REGISTRY_UNAVAILABLE');
  });

  it('blocks on NOT_FOUND registry (non-hallucination)', async () => {
    const client = new MockRegistryClient();
    client.fetchNpmMetadata.mockResolvedValue({ 
      ok: false, 
      error: new RegistryError('Not found', 404) 
    });
    
    const engine = new MockRiskEngine({} as any);
    engine.evaluate.mockResolvedValue({
      package: 'test-pkg',
      status: 'NOT_FOUND',
      assessable: false,
      score: null,
      level: 'UNKNOWN',
      factors: [],
      recommendations: [],
      errors: [],
      scoring: { totalWeightedScore: 0, totalWeight: 0, heuristicAverage: 0, finalScore: 0, contributions: [] }
    });

    const guard = new SlopcheckGuard(new DefaultSecurityPolicy(), client, engine);
    const result = await guard.inspect({ package: 'test-pkg' });
    
    expect(result.decision).toBe('BLOCK');
    expect(result.reasons[0]?.code).toBe('PACKAGE_NOT_FOUND');
  });

  it('allows SAFE packages', async () => {
    const client = new MockRegistryClient();
    client.fetchNpmMetadata.mockResolvedValue({ ok: true, value: {} as any });
    client.fetchNpmDownloads.mockResolvedValue({ ok: true, value: {} as any });
    
    const engine = new MockRiskEngine({} as any);
    engine.evaluate.mockResolvedValue({
      package: 'test-pkg',
      status: 'COMPLETE',
      assessable: true,
      score: 10,
      level: 'SAFE',
      factors: [],
      recommendations: [],
      errors: [],
      scoring: { totalWeightedScore: 10, totalWeight: 1, heuristicAverage: 10, finalScore: 10, contributions: [] }
    });

    const guard = new SlopcheckGuard(new DefaultSecurityPolicy(), client, engine);
    const result = await guard.inspect({ package: 'test-pkg' });
    
    expect(result.decision).toBe('ALLOW');
  });

  it('warns on SUSPICIOUS packages', async () => {
    const client = new MockRegistryClient();
    client.fetchNpmMetadata.mockResolvedValue({ ok: true, value: {} as any });
    client.fetchNpmDownloads.mockResolvedValue({ ok: true, value: {} as any });
    
    const engine = new MockRiskEngine({} as any);
    engine.evaluate.mockResolvedValue({
      package: 'test-pkg',
      status: 'COMPLETE',
      assessable: true,
      score: 40,
      level: 'SUSPICIOUS',
      factors: [
        { name: 'Age', description: 'Young', score: 40, weight: 1, severityClass: 'soft' }
      ],
      recommendations: [],
      errors: [],
      scoring: { totalWeightedScore: 40, totalWeight: 1, heuristicAverage: 40, finalScore: 40, contributions: [] }
    });

    const guard = new SlopcheckGuard(new DefaultSecurityPolicy(), client, engine);
    const result = await guard.inspect({ package: 'test-pkg' });
    
    expect(result.decision).toBe('WARN');
    expect(result.reasons[0]?.code).toBe('AGE');
  });
});
