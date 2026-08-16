import fs from 'node:fs/promises';
import path from 'node:path';
import { evaluatePackage } from '../engine';
import { loadConfig, PolicyEngine } from '@slopcheck/core';
import { getRiskColor, isValidPackageName, getDecisionColor } from './check';
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

  const allPackages = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const validPackages = allPackages.filter(isValidPackageName);
  const skippedPackages = allPackages.filter(p => !isValidPackageName(p));

  if (allPackages.length === 0) {
    if (options.json) {
      console.log(JSON.stringify([], null, 2));
    } else {
      console.log(pc.green('No dependencies found.'));
    }
    process.exitCode = 0;
    return;
  }

  if (skippedPackages.length > 0 && !options.json) {
    console.log(pc.yellow(`⚠️ Skipping ${skippedPackages.length} dependencies with unsupported identifiers:`));
    for (const p of skippedPackages) {
      console.log(`  - ${pc.gray(p)}`);
    }
    console.log('');
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
    bar.start(validPackages.length, 0, { package: 'Starting...' });
  }

  const config = await loadConfig(options.policy);
  const engine = new PolicyEngine(config || undefined);

  const results = await Promise.all(validPackages.map(p => 
    limit(async () => {
      if (bar) bar.update({ package: p });
      const res = await evaluatePackage(p);
      const decision = engine.decide(res);
      if (bar) bar.increment();
      return { assessment: res, policy: decision };
    })
  ));

  if (bar) bar.stop();

  if (options.json) {
    const jsonOutput = {
      results,
      skipped: skippedPackages,
    };
    console.log(JSON.stringify(jsonOutput, null, 2));
  } else {
    console.log('\n');
    const riskyPackages = results.filter(r => r.policy.decision !== 'ALLOW' || r.assessment.status !== 'COMPLETE');
    
    if (riskyPackages.length === 0) {
      console.log(pc.green(`✅ All ${validPackages.length} supported dependencies appear safe and are allowed by policy.`));
    } else {
      console.log(pc.yellow(`⚠️ Found ${riskyPackages.length} packages requiring attention:\n`));

      for (const r of riskyPackages) {
        console.log(`${pc.bold(r.assessment.package)} - Risk Level: ${getRiskColor(r.assessment.level)(r.assessment.level)} (Decision: ${getDecisionColor(r.policy.decision)(r.policy.decision)})`);
        
        if (r.assessment.status !== 'COMPLETE') {
          console.log(pc.yellow(`  - Assessment Status: ${r.assessment.status}`));
          for (const err of r.assessment.errors) {
            console.log(pc.red(`    [${err.source}] ${err.code}: ${err.message}`));
          }
        }
        
        for (const reason of r.policy.reasons) {
           console.log(`  - [${reason.code}] ${reason.message}`);
        }
        console.log();
      }
    }
  }

  let exitCode = 0;
  for (const r of results) {
    if (r.policy.decision === 'BLOCK') {
      exitCode = 1;
      break; 
    } else if (r.policy.decision === 'WARN') {
       // WARN doesn't override BLOCK or operational errors
    } else if (r.assessment.status === 'NOT_FOUND' || r.assessment.status === 'UNAVAILABLE' || !r.assessment.assessable) {
       // Default operational error if not explicitly blocked
       if (exitCode !== 1) exitCode = 2;
    }
  }
  process.exitCode = exitCode;
}
