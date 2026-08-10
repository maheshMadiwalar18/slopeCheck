import { evaluatePackage } from '../engine';
import pc from 'picocolors';

export interface CheckOptions {
  json?: boolean;
}

export function isValidPackageName(name: string): boolean {
  return /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(name);
}

export async function checkCommand(packageName: string, options: CheckOptions = {}) {
  if (!isValidPackageName(packageName)) {
    if (options.json) {
      console.log(JSON.stringify({ error: `Invalid package name format: ${packageName}` }, null, 2));
    } else {
      console.error(pc.red(`❌ Invalid package name format: ${packageName}`));
    }
    process.exitCode = 2;
    return;
  }

  const result = await evaluatePackage(packageName);

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(pc.cyan(`\n🔍 Scanning package: ${pc.bold(packageName)}...`));
    console.log(`\nRisk Level: ${getRiskColor(result.level)(result.level)} (Score: ${result.score !== null ? result.score : 'N/A'})`);
    
    if (result.status !== 'COMPLETE') {
       console.log(pc.yellow(`\nAssessment Status: ${result.status}`));
       for (const err of result.errors) {
         console.log(pc.red(`  - [${err.source}] ${err.code}: ${err.message}`));
       }
    }

    if (result.factors.length > 0) {
      console.log(`\nFactors identified:`);
      for (const factor of result.factors) {
        console.log(`  - ${factor.name}: ${factor.description} [${factor.score} pts]`);
      }
    } else if (result.assessable) {
      console.log(pc.green(`  - No significant risk factors identified.`));
    }

    if (result.recommendations.length > 0) {
      console.log(`\nRecommendations:`);
      for (const rec of result.recommendations) {
        console.log(pc.yellow(`  👉 ${rec}`));
      }
    }
    console.log();
  }

  if (result.status === 'NOT_FOUND' || result.status === 'UNAVAILABLE' || !result.assessable) {
    process.exitCode = 2;
  } else if (result.level === 'HIGH' || result.level === 'CRITICAL') {
    process.exitCode = 1;
  } else {
    process.exitCode = 0;
  }
}

export function getRiskColor(level: string) {
  switch (level) {
    case 'SAFE': return pc.green;
    case 'SUSPICIOUS': return pc.yellow;
    case 'HIGH': return pc.red;
    case 'CRITICAL': return (s: string) => pc.bgRed(pc.white(pc.bold(s)));
    default: return pc.white;
  }
}
