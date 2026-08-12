import { evaluatePackage, setRegistryClient } from '../../cli/src/engine';
import { DataCache, RegistryClient, HttpTransport } from '@slopcheck/registry';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

class FixtureTransport implements HttpTransport {
  async fetch(url: string, init?: RequestInit): Promise<Response> {
    if (url.includes('registry.npmjs.org') || url.includes('api.npmjs.org')) registryRequests++;
    else if (url.includes('api.github.com')) githubRequests++;

    let fixturePath = '';
    if (url.includes('pkg-fake')) {
      return new Response('{"error":"Not found"}', { status: 404 });
    }
    
    if (url.includes('api.github.com')) {
       fixturePath = 'github_valid.json';
    } else if (url.includes('api.npmjs.org/downloads')) {
      fixturePath = 'react_dl.json';
    } else if (url.includes('registry.npmjs.org')) {
      fixturePath = 'react.json';
    }

    try {
      const fullPath = path.join(__dirname, '../fixtures', fixturePath);
      const data = await fs.readFile(fullPath, 'utf-8');
      return new Response(data, {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    } catch (e) {
      return new Response('{"error":"Not found"}', { status: 404 });
    }
  }
}

async function runWorkload(name: string, size: number, uniqueCount: number = size) {
  registryRequests = 0;
  githubRequests = 0;
  cacheHits = 0;
  cacheMisses = 0;
  
  const client = new RegistryClient(
    new FixtureTransport(),
    new InstrumentedCache(),
    new InstrumentedCache(),
    new InstrumentedCache()
  );
  setRegistryClient(client);

  const pkgs = [];
  for (let i = 0; i < size; i++) {
    pkgs.push(`pkg-fake-${i % uniqueCount}`);
  }

  const startMem = process.memoryUsage().heapUsed;
  const startTime = performance.now();
  
  const evalTimes: number[] = [];

  // Simple concurrency limit 10
  for (let i = 0; i < pkgs.length; i += 10) {
    const chunk = pkgs.slice(i, i + 10);
    await Promise.all(chunk.map(async p => {
      const st = performance.now();
      await evaluatePackage(p);
      evalTimes.push(performance.now() - st);
    }));
  }

  const totalTime = performance.now() - startTime;
  const endMem = process.memoryUsage().heapUsed;
  
  evalTimes.sort((a, b) => a - b);
  const p95 = evalTimes[Math.floor(evalTimes.length * 0.95)];
  const avg = evalTimes.reduce((a, b) => a + b, 0) / evalTimes.length;

  console.log(`\n=== Workload: ${name} (${size} dependencies, ${uniqueCount} unique) ===`);
  console.log(`Total scan time: ${totalTime.toFixed(2)} ms`);
  console.log(`Average evaluation: ${avg.toFixed(2)} ms`);
  console.log(`P95 evaluation: ${p95?.toFixed(2)} ms`);
  console.log(`Max concurrency: 10`);
  console.log(`Registry Requests: ${registryRequests}`);
  console.log(`Cache Hits: ${cacheHits}, Cache Misses: ${cacheMisses}`);
  console.log(`Memory Used (delta): ${((endMem - startMem) / 1024 / 1024).toFixed(2)} MB`);
}

async function main() {
  const processStart = performance.now();
  console.log(`Startup time: ${processStart.toFixed(2)} ms`);
  
  await runWorkload('small', 10);
  await runWorkload('medium', 50);
  await runWorkload('large', 100);
  await runWorkload('stress', 500);
  
  // Test duplicate deduplication specifically
  await runWorkload('concurrency-duplicates', 100, 20); // 100 requests but 20 unique
}

main().catch(console.error);
