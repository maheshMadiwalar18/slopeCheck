import { evaluatePackage } from '../../cli/src/engine'; // We use the CLI engine which initializes plugins
import { DataCache } from '@slopcheck/registry';
import type { RiskLevel } from '@slopcheck/core';
import type { TestCase } from './corpus';

export interface EvaluationResult {
  package: string;
  expectedBehavior: string;
  actualLevel: RiskLevel | 'UNAVAILABLE' | 'UNSUPPORTED';
  isMatch: boolean;
  score: number | null;
  status: string;
  notes?: string;
}

export interface RunMetrics {
  registryRequests: number;
  githubRequests: number;
  cacheHits: number;
  cacheMisses: number;
  durationMs: number;
}

let registryRequests = 0;
let githubRequests = 0;
let cacheHits = 0;
let cacheMisses = 0;

// Monkey-patch fetch to count API requests
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = input.toString();
  if (url.includes('registry.npmjs.org') || url.includes('api.npmjs.org')) {
    registryRequests++;
  } else if (url.includes('api.github.com')) {
    githubRequests++;
  }
  return originalFetch(input, init);
};

// Monkey-patch DataCache to count cache hits/misses
const originalDataCacheGet = DataCache.prototype.get;
DataCache.prototype.get = function(key: string) {
  const result = originalDataCacheGet.call(this, key);
  if (result !== undefined) {
    cacheHits++;
  } else {
    cacheMisses++;
  }
  return result;
};

// Helper for invalid names
function isValidPackageName(name: string): boolean {
  if (!name) return false;
  if (name.startsWith('.') || name.startsWith('/')) return false;
  if (name.includes('://') || name.startsWith('github:')) return false;
  if (name.match(/[\s\0]/)) return false;
  return true;
}

export async function runBenchmark(corpus: readonly TestCase[]): Promise<{
  results: EvaluationResult[];
  metrics: RunMetrics;
}> {
  registryRequests = 0;
  githubRequests = 0;
  cacheHits = 0;
  cacheMisses = 0;

  const results: EvaluationResult[] = [];
  const startTime = performance.now();

  for (const testCase of corpus) {
    if (!isValidPackageName(testCase.package)) {
      results.push({
        package: testCase.package,
        expectedBehavior: testCase.expectedBehavior,
        actualLevel: 'UNSUPPORTED',
        isMatch: testCase.expectedBehavior === 'UNSUPPORTED',
        score: null,
        status: 'UNSUPPORTED',
        notes: testCase.notes,
      });
      continue;
    }

    const res = await evaluatePackage(testCase.package);
    
    // Evaluate match
    let actualBehavior: string = res.level;
    if (res.status === 'UNAVAILABLE' || res.status === 'NOT_FOUND') {
      actualBehavior = res.status;
    }

    let isMatch = false;
    if (testCase.expectedBehavior === 'SAFE') {
      isMatch = actualBehavior === 'SAFE';
    } else if (testCase.expectedBehavior === 'HIGH' || testCase.expectedBehavior === 'CRITICAL') {
      // If expected is HIGH, we accept HIGH or CRITICAL.
      // If expected is CRITICAL, we want CRITICAL.
      if (testCase.expectedBehavior === 'HIGH') {
        isMatch = actualBehavior === 'HIGH' || actualBehavior === 'CRITICAL';
      } else {
        isMatch = actualBehavior === 'CRITICAL';
      }
    } else {
      isMatch = actualBehavior === testCase.expectedBehavior;
    }

    results.push({
      package: testCase.package,
      expectedBehavior: testCase.expectedBehavior,
      actualLevel: actualBehavior as any,
      isMatch,
      score: res.score,
      status: res.status,
      notes: testCase.notes,
    });
  }

  const durationMs = performance.now() - startTime;

  return {
    results,
    metrics: {
      registryRequests,
      githubRequests,
      cacheHits,
      cacheMisses,
      durationMs,
    },
  };
}
