import { evaluatePackage } from '../engine';
import { loadConfig, PolicyEngine } from '@slopcheck/core';
import pc from 'picocolors';

export interface CheckOptions {
  json?: boolean;
  policy?: string;
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

  const config = await loadConfig(options.policy);
  const engine = new PolicyEngine(config || undefined);

  const result = await evaluatePackage(packageName);
  const decision = engine.decide(result);

  if (options.json) {
    console.log(JSON.stringify({ assessment: result, policy: decision }, null, 2));
  } else {
    console.log(pc.cyan(`\n🔍 Scanning package: ${pc.bold(packageName)}...`));
    console.log(`\nRisk Level: ${getRiskColor(result.level)(result.level)} (Score: ${result.score !== null ? result.score : 'N/A'})`);
    
    if (result.status !== 'COMPLETE') {
       console.log(pc.yellow(`\nAssessment Status: ${result.status}`));
       if (result.status === 'PARTIAL') {
         console.log(pc.yellow(`  ⚠️ WARNING: The assessment is based on incomplete evidence. Some data could not be fetched or detectors failed.`));
       }
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

    if (result.vulnerabilities && result.vulnerabilities.length > 0) {
      console.log(pc.red(`\nVulnerabilities (${result.vulnerabilities.length}):`));
      for (const vuln of result.vulnerabilities) {
        const severityColor = vuln.severity === 'CRITICAL' ? pc.bgRed : vuln.severity === 'HIGH' ? pc.red : pc.yellow;
        console.log(`  - ${pc.bold(vuln.id)} [${severityColor(vuln.severity)}]`);
        console.log(`    Fixed in: ${vuln.fixedVersions?.join(', ') || 'Unknown'}`);
        console.log(`    Summary: ${vuln.summary}`);
      }
    }

    console.log(`\nPolicy Decision: ${getDecisionColor(decision.decision)(decision.decision)}`);
    if (decision.reasons.length > 0) {
      console.log(`Reasons:`);
      for (const reason of decision.reasons) {
         console.log(`  - [${reason.code}] ${reason.message}`);
      }
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
    // Determine exit code based on policy, but if it's operational failure and policy didn't explicitly allow/warn it, exit 2
    if (decision.decision === 'BLOCK') process.exitCode = 1;
    else if (decision.decision === 'WARN') process.exitCode = 0;
    else process.exitCode = 2; // Default operational error code if unhandled by policy
  } else if (decision.decision === 'BLOCK') {
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

export function getDecisionColor(decision: string) {
  switch (decision) {
    case 'ALLOW': return pc.green;
    case 'WARN': return pc.yellow;
    case 'BLOCK': return pc.red;
    default: return pc.white;
  }
}

