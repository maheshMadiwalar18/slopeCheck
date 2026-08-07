import fs from 'node:fs/promises';
import path from 'node:path';
import { evaluatePackage } from '../engine';
import { getRiskColor } from './check';
import pc from 'picocolors';
import pLimit from 'p-limit';
import cliProgress from 'cli-progress';
import { z } from 'zod';

const PackageJsonSchema = z.object({
  dependencies: z.record(z.string(), z.string()).optional(),
  devDependencies: z.record(z.string(), z.string()).optional(),
});

export async function scanCommand(packageJsonPath: string) {
  console.log(pc.cyan(`\n📦 Scanning workspace dependencies: ${pc.bold(packageJsonPath)}...\n`));

  let content: string;
  try {
    const fullPath = path.resolve(process.cwd(), packageJsonPath);
    // Path traversal check is minimal but cwd() scopes it
    content = await fs.readFile(fullPath, 'utf-8');
  } catch (e) {
    console.error(pc.red(`❌ Could not read ${packageJsonPath}.`));
    return;
  }

  let pkg: z.infer<typeof PackageJsonSchema>;
  try {
    const data = JSON.parse(content);
    pkg = PackageJsonSchema.parse(data);
  } catch (e) {
    console.error(pc.red(`❌ Invalid package.json format: ${e instanceof Error ? e.message : 'Unknown error'}`));
    return;
  }

  const packages = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];

  if (packages.length === 0) {
    console.log(pc.green('No dependencies found.'));
    return;
  }

  const limit = pLimit(10);
  const bar = new cliProgress.SingleBar({
    format: 'Progress |' + pc.cyan('{bar}') + '| {percentage}% || {value}/{total} Packages || Current: {package}',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true
  });

  bar.start(packages.length, 0, { package: 'Starting...' });

  const results = await Promise.all(packages.map(p => 
    limit(async () => {
      bar.update({ package: p });
      const res = await evaluatePackage(p);
      bar.increment();
      return res;
    })
  ));

  bar.stop();
  console.log('\n');

  const riskyPackages = results.filter(r => r.score >= 30).sort((a, b) => b.score - a.score);
  
  if (riskyPackages.length === 0) {
    console.log(pc.green(`✅ All ${packages.length} dependencies appear safe.`));
    return;
  }

  console.log(pc.yellow(`⚠️ Found ${riskyPackages.length} potentially risky dependencies:\n`));

  for (const r of riskyPackages) {
    console.log(`${pc.bold(r.package)} - Risk Level: ${getRiskColor(r.level)(r.level)} (Score: ${r.score})`);
    for (const factor of r.factors) {
      if (factor.score >= 50) {
        console.log(`  - ${pc.red(factor.name)}: ${factor.description}`);
      }
    }
    console.log();
  }
}
