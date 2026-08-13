import { evaluatePackage, setRegistryClient } from '../../cli/src/engine';
import { DataCache, RegistryClient, FetchTransport } from '@slopcheck/registry';
import type { HttpTransport } from '@slopcheck/registry';
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

class InstrumentedCache<T> extends DataCache<T> {
  get(key: string): T | undefined {
    const val = super.get(key);
    if (val !== undefined) {
      cacheHits++;
    } else {
      cacheMisses++;
    }
    return val;
  }
}

class InstrumentedTransport implements HttpTransport {
  constructor(private base: HttpTransport) {}

  async fetch(url: string, init?: RequestInit): Promise<Response> {
    if (url.includes('registry.npmjs.org') || url.includes('api.npmjs.org')) {
      registryRequests++;
    } else if (url.includes('api.github.com')) {
      githubRequests++;
    }
    return this.base.fetch(url, init);
  }
}

interface FixtureMap {
  [pkg: string]: { metadata?: string; downloads?: string; github?: string };
}

const packageFixtures: FixtureMap = {
  // Legitimate Popular
  'react': { metadata: 'react.json', downloads: 'react_dl.json' },
  'express': { metadata: 'react.json', downloads: 'react_dl.json' },
  'typescript': { metadata: 'react.json', downloads: 'react_dl.json' },
  'vite': { metadata: 'react.json', downloads: 'react_dl.json' },
  'next': { metadata: 'react.json', downloads: 'react_dl.json' },
  'eslint': { metadata: 'react.json', downloads: 'react_dl.json' },
  'prettier': { metadata: 'react.json', downloads: 'react_dl.json' },
  'webpack': { metadata: 'react.json', downloads: 'react_dl.json' },

    'lodash': { metadata: 'react.json', downloads: 'react_dl.json' },
  'chalk': { metadata: 'react.json', downloads: 'react_dl.json' },
  'commander': { metadata: 'react.json', downloads: 'react_dl.json' },
  'debug': { metadata: 'react.json', downloads: 'react_dl.json' },
  'uuid': { metadata: 'react.json', downloads: 'react_dl.json' },
  'axios': { metadata: 'react.json', downloads: 'react_dl.json' },
  'moment': { metadata: 'react.json', downloads: 'react_dl.json' },

  // Typosquats
  'reactt': { metadata: 'reactt.json', downloads: 'reactt_dl.json' },
  'reacct': { metadata: 'reactt.json', downloads: 'reactt_dl.json' },
  'expres': { metadata: 'reactt.json', downloads: 'reactt_dl.json' },
  'expresss': { metadata: 'reactt.json', downloads: 'reactt_dl.json' },
  'typecript': { metadata: 'reactt.json', downloads: 'reactt_dl.json' },
  'lodas': { metadata: 'reactt.json', downloads: 'reactt_dl.json' },

    'axio': { metadata: 'reactt.json', downloads: 'reactt_dl.json' },
  'axioss': { metadata: 'reactt.json', downloads: 'reactt_dl.json' },
  'monent': { metadata: 'reactt.json', downloads: 'reactt_dl.json' },
  'vitta': { metadata: 'reactt.json', downloads: 'reactt_dl.json' },
  'nextt': { metadata: 'reactt.json', downloads: 'reactt_dl.json' },
  'es-lint': { metadata: 'reactt.json', downloads: 'reactt_dl.json' },
  'reacct-dom': { metadata: 'reactt.json', downloads: 'reactt_dl.json' },

  // Hallucinations
  'react-codeshift': { metadata: 'hallucinated.json', downloads: 'hallucinated.json' },
  'unused-imports': { metadata: 'hallucinated.json', downloads: 'hallucinated.json' },
  'huggingface-cli': { metadata: 'hallucinated.json', downloads: 'hallucinated.json' },

    'openai-auth-middleware': { metadata: 'hallucinated.json', downloads: 'hallucinated.json' },
  'stripe-fake-webhooks': { metadata: 'hallucinated.json', downloads: 'hallucinated.json' },
  'react-dom-server-render-to-stream': { metadata: 'hallucinated.json', downloads: 'hallucinated.json' },

  // Scoped Impersonation
  '@evil/react': { metadata: 'reactt.json', downloads: 'reactt_dl.json' },
  '@evil/express': { metadata: 'reactt.json', downloads: 'reactt_dl.json' },
  '@evil/typescript': { metadata: 'reactt.json', downloads: 'reactt_dl.json' },

    '@evil/react-dom': { metadata: 'reactt.json', downloads: 'reactt_dl.json' },
  '@evil/lodash': { metadata: 'reactt.json', downloads: 'reactt_dl.json' },
  '@evil/axios': { metadata: 'reactt.json', downloads: 'reactt_dl.json' },
  '@evil/next': { metadata: 'reactt.json', downloads: 'reactt_dl.json' },
  '@evil/vite': { metadata: 'reactt.json', downloads: 'reactt_dl.json' },

  // Legitimate Scoped
  '@angular/core': { metadata: 'scoped.json', downloads: 'scoped_dl.json' },
  '@babel/core': { metadata: 'scoped.json', downloads: 'scoped_dl.json' },

    '@vue/compiler-core': { metadata: 'scoped.json', downloads: 'scoped_dl.json' },
  '@types/node': { metadata: 'scoped.json', downloads: 'scoped_dl.json' },
  '@nestjs/core': { metadata: 'scoped.json', downloads: 'scoped_dl.json' },
  '@mui/material': { metadata: 'scoped.json', downloads: 'scoped_dl.json' },

  // Legitimate New
  'some-new-startup-package': { metadata: 'new_package.json', downloads: 'new_package_dl.json' },

  // Unknown
  'this-package-definitely-does-not-exist-12345': { metadata: 'hallucinated.json', downloads: 'hallucinated.json' }
};

class FixtureTransport implements HttpTransport {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async fetch(url: string, init?: RequestInit): Promise<Response> {
    let fixturePath = '';

    if (url.includes('api.github.com')) {
      // For legitimate packages like react, return a valid github repo to prevent false positive bot inflation
      if (url.includes('voodoowrez') || url.includes('nonexistent')) {
         fixturePath = 'github.json'; // 404
      } else {
         fixturePath = 'github_valid.json'; // 200
      }
    } else if (url.includes('api.npmjs.org/downloads')) {
      const match = url.match(/last-week\/(.+)$/);
      const pkg = match ? decodeURIComponent(match[1] || '') : '';
      const map = packageFixtures[pkg];
      if (!map) throw new Error(`No fixture mapped for downloads of package: ${pkg}`);
      fixturePath = map.downloads || 'react_dl.json';
    } else if (url.includes('registry.npmjs.org')) {
      const match = url.match(/npmjs\.org\/(.+)$/);
      const pkg = match ? decodeURIComponent(match[1] || '') : '';
      const map = packageFixtures[pkg];
      if (!map) throw new Error(`No fixture mapped for metadata of package: ${pkg}`);
      fixturePath = map.metadata || 'react.json';
    }

    if (!fixturePath) {
      throw new Error(`Unhandled fixture URL: ${url}`);
    }

    try {
      const fullPath = path.join(__dirname, '../fixtures', fixturePath);
      const data = await fs.readFile(fullPath, 'utf-8');
      return new Response(data, {
        status: fixturePath === 'hallucinated.json' || fixturePath === 'github.json' ? 404 : 200,
        headers: { 'content-type': 'application/json' }
      });
    } catch (e) {
      return new Response('{"error":"Not found"}', { status: 404 });
    }
  }
}

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
  registryRequests = 0;
  githubRequests = 0;
  cacheHits = 0;
  cacheMisses = 0;

  const baseTransport = mode === 'deterministic' ? new FixtureTransport() : new FetchTransport();
  const transport = new InstrumentedTransport(baseTransport);
  const client = new RegistryClient(
    transport,
    new InstrumentedCache(),
    new InstrumentedCache(),
    new InstrumentedCache()
  );
  setRegistryClient(client);

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
    
    let actualBehavior: string = res.level;
    if (res.status === 'UNAVAILABLE' || (res.status === 'NOT_FOUND' && res.level === 'UNKNOWN')) {
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

    if (isMatch && testCase.expectedMinSeverity) {
      const severityLevels = { hard: 3, strong: 2, heuristic: 1 };
      const expectedSeverityLevel = severityLevels[testCase.expectedMinSeverity];
      let maxActualSeverityLevel = 0;
      
      for (const factor of res.factors) {
        let level = 1; // heuristic is default
        if (factor.severityClass === 'hard') level = 3;
        else if (factor.severityClass === 'strong') level = 2;
        else if (factor.severityClass === 'heuristic') level = 1;
        
        if (level > maxActualSeverityLevel) {
          maxActualSeverityLevel = level;
        }
      }
      
      if (maxActualSeverityLevel < expectedSeverityLevel) {
        isMatch = false;
      }
    }

    results.push({
      package: testCase.package,
      expectedBehavior: testCase.expectedBehavior,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
