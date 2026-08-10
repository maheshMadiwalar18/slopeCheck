import fs from 'node:fs/promises';
import path from 'node:path';
import { evaluatePackage } from '../engine';
import { getRiskColor, isValidPackageName } from './check';
import type { CheckOptions } from './check';
import pc from 'picocolors';
import pLimit from 'p-limit';
import cliProgress from 'cli-progress';
import { z } from 'zod';

const PackageJsonSchema = z.object({
  dependencies: z.record(z.string(), z.string()).optional(),
  devDependencies: z.record(z.string(), z.string()).optional(),
});

export async function scanCommand(packageJsonPath: string, options: CheckOptions = {}) {
  if (!options.json) {
    console.log(pc.cyan(`\n📦 Scanning workspace dependencies: ${pc.bold(packageJsonPath)}...\n`));
  }

  let content: string;
  try {
    const fullPath = path.resolve(process.cwd(), packageJsonPath);
    if (!fullPath.endsWith('.json')) {
      throw new Error('Input path must be a .json file');
    }
    // Basic path traversal prevention (ensure it stays within intended directory if needed, 
    // though local scans are usually safe. It's best practice not to resolve arbitrary system files.)
    content = await fs.readFile(fullPath, 'utf-8');
  } catch (e) {
    if (options.json) {
      console.log(JSON.stringify({ error: `Could not read ${packageJsonPath}.` }, null, 2));
    } else {
      console.error(pc.red(`❌ Could not read ${packageJsonPath}.`));
    }
    process.exitCode = 2;
    return;
  }

  let pkg: z.infer<typeof PackageJsonSchema>;
  try {
    const data = JSON.parse(content);
    pkg = PackageJsonSchema.parse(data);
  } catch (e) {
    const msg = `Invalid package.json format: ${e instanceof Error ? e.message : 'Unknown error'}`;
    if (options.json) {
      console.log(JSON.stringify({ error: msg }, null, 2));
    } else {
      console.error(pc.red(`❌ ${msg}`));
    }
    process.exitCode = 2;
    return;
  }

  const packages = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ].filter(isValidPackageName);

  if (packages.length === 0) {
    if (options.json) {
      console.log(JSON.stringify([], null, 2));
    } else {
      console.log(pc.green('No dependencies found.'));
    }
    process.exitCode = 0;
    return;
  }

  const limit = pLimit(10);
  let bar: cliProgress.SingleBar | undefined;

  if (!options.json) {
    bar = new cliProgress.SingleBar({
      format: 'Progress |' + pc.cyan('{bar}') + '| {percentage}% || {value}/{total} Packages || Current: {package}',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    });
    bar.start(packages.length, 0, { package: 'Starting...' });
  }

  const results = await Promise.all(packages.map(p => 
    limit(async () => {
      if (bar) bar.update({ package: p });
      const res = await evaluatePackage(p);
      if (bar) bar.increment();
      return res;
    })
  ));

  if (bar) bar.stop();

  if (options.json) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    console.log('\n');
    const riskyPackages = results.filter(r => (r.score !== null ? r.score : 0) >= 30 || r.status !== 'COMPLETE').sort((a, b) => (b.score || 0) - (a.score || 0));
    
    if (riskyPackages.length === 0) {
      console.log(pc.green(`✅ All ${packages.length} dependencies appear safe.`));
    } else {
      console.log(pc.yellow(`⚠️ Found ${riskyPackages.length} potentially risky dependencies:\n`));

      for (const r of riskyPackages) {
        console.log(`${pc.bold(r.package)} - Risk Level: ${getRiskColor(r.level)(r.level)} (Score: ${r.score !== null ? r.score : 'N/A'})`);
        if (r.status !== 'COMPLETE') {
          console.log(pc.yellow(`  - Assessment Status: ${r.status}`));
          if (r.status === 'PARTIAL') {
            console.log(pc.yellow(`    ⚠️ WARNING: The assessment is based on incomplete evidence.`));
          }
          for (const err of r.errors) {
            console.log(pc.red(`  - [${err.source}] ${err.code}: ${err.message}`));
          }
        }
        for (const factor of r.factors) {
          if (factor.score >= 50) {
            console.log(`  - ${pc.red(factor.name)}: ${factor.description}`);
          }
        }
        console.log();
      }
    }
  }

  let exitCode = 0;
  for (const r of results) {
    if (r.level === 'HIGH' || r.level === 'CRITICAL') {
      exitCode = 1;
      break; // Security risk overrides analysis errors
    } else if (r.status === 'NOT_FOUND' || r.status === 'UNAVAILABLE' || !r.assessable) {
      exitCode = Math.max(exitCode, 2);
    }
  }
  process.exitCode = exitCode;
}
