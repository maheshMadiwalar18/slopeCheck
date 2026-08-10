import { evaluatePackage } from '../../cli/src/engine'; // We use the CLI engine which initializes plugins
import { DataCache } from '@slopcheck/registry';
import type { RiskLevel } from '@slopcheck/core';
import type { TestCase } from './corpus';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface EvaluationResult {
  package: string;
  expectedBehavior: string;
  actualLevel: RiskLevel | 'UNAVAILABLE' | 'UNSUPPORTED';
  isMatch: boolean;
  score: number | null;
  status: string;
  source: string;
  sourceType: string;
  rationale: string;
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

// Monkey-patch fetch to count API requests and optionally mock them
const originalFetch = globalThis.fetch;
let currentMode: 'live' | 'deterministic' = 'live';

globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = input.toString();
  if (url.includes('registry.npmjs.org') || url.includes('api.npmjs.org')) {
    registryRequests++;
  } else if (url.includes('api.github.com')) {
    githubRequests++;
  }

  if (currentMode === 'deterministic') {
    let fixturePath = '';
    
    // Determine fixture based on URL
    if (url.includes('api.github.com')) {
      fixturePath = 'github.json';
    } else if (url.includes('api.npmjs.org/downloads')) {
      if (url.includes('reactt')) fixturePath = 'reactt_dl.json';
      else if (url.includes('@angular/core')) fixturePath = 'scoped_dl.json';
      else if (url.includes('react-codeshift')) fixturePath = 'hallucinated.json';
      else fixturePath = 'react_dl.json'; // fallback for 'react'
    } else if (url.includes('registry.npmjs.org')) {
      if (url.includes('reactt')) fixturePath = 'reactt.json';
      else if (url.includes('@angular/core')) fixturePath = 'scoped.json';
      else if (url.includes('react-codeshift')) fixturePath = 'hallucinated.json';
      else fixturePath = 'react.json';
    }

    if (fixturePath) {
      try {
        const fullPath = path.join(__dirname, '../fixtures', fixturePath);
        const data = await fs.readFile(fullPath, 'utf-8');
        return new Response(data, {
          status: fixturePath === 'hallucinated.json' || fixturePath === 'github.json' ? 404 : 200,
          headers: { 'content-type': 'application/json' }
        });
      } catch (e) {
        // Fallback to 404 if fixture missing
        return new Response('{"error":"Not found"}', { status: 404 });
      }
    }
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

export async function runBenchmark(corpus: readonly TestCase[], mode: 'live' | 'deterministic' = 'live'): Promise<{
  results: EvaluationResult[];
  metrics: RunMetrics;
}> {
  currentMode = mode;
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
        source: testCase.source,
        sourceType: testCase.sourceType,
        rationale: testCase.rationale,
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
      source: testCase.source,
      sourceType: testCase.sourceType,
      rationale: testCase.rationale,
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
