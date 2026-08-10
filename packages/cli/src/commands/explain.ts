import { evaluatePackage } from '../engine';
import pc from 'picocolors';

export async function explainCommand(packageName: string) {
  console.log(pc.cyan(`\n🔍 Explaining risk analysis for: ${pc.bold(packageName)}\n`));

  const result = await evaluatePackage(packageName);

  // Header
  console.log(pc.bold('━'.repeat(60)));
  console.log(`${pc.bold('Package:')}  ${packageName}`);
  console.log(`${pc.bold('Score:')}    ${result.score}/100`);
  console.log(`${pc.bold('Level:')}    ${getLevelDisplay(result.level)}`);
  console.log(pc.bold('━'.repeat(60)));

  // Factor breakdown
  if (result.factors.length === 0) {
    console.log(pc.green('\n  ✅ No risk factors identified — this package appears safe.\n'));
    return;
  }

  console.log(pc.bold('\n📊 Factor Breakdown:\n'));
  console.log(
    `  ${'Factor'.padEnd(24)} ${'Class'.padEnd(10)} ${'Score'.padStart(6)} ${'Weight'.padStart(7)} ${'Weighted'.padStart(9)}`
  );
  console.log(`  ${'─'.repeat(24)} ${'─'.repeat(10)} ${'─'.repeat(6)} ${'─'.repeat(7)} ${'─'.repeat(9)}`);

  let totalWeightedScore = result.scoring?.totalWeightedScore ?? 0;
  let totalWeight = result.scoring?.totalWeight ?? 0;

  for (const factor of result.factors) {
    const contrib = result.scoring?.contributions.find(c => c.factor === factor.name);
    const weighted = contrib?.contribution ?? 0;
    const scoreStr = `${factor.score}`.padStart(6);
    const weightStr = `x${factor.weight.toFixed(1)}`.padStart(7);
    const weightedStr = `${weighted.toFixed(0)}`.padStart(9);
    const classStr = (factor.severityClass ?? '-').padEnd(10);

    const colorFn = factor.score >= 80 ? pc.red : factor.score >= 50 ? pc.yellow : pc.white;
    const classColor = factor.severityClass === 'hard' ? pc.red : factor.severityClass === 'strong' ? pc.yellow : pc.gray;
    
    console.log(`  ${colorFn(factor.name.padEnd(24))} ${classColor(classStr)} ${scoreStr} ${weightStr} ${weightedStr}`);
    console.log(`  ${pc.gray(`  └─ ${factor.description}`)}`);
  }

  console.log(`\n  ${'─'.repeat(60)}`);
  
  if (result.scoring) {
    const avgScore = totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0;
    console.log(
      `  ${'Heuristic Average'.padEnd(24)} ${' '.repeat(10)} ${' '.repeat(14)} ${pc.gray(String(avgScore).padStart(9))}`
    );
    console.log(
      `  ${'Final Score (Anti-Diluted)'.padEnd(24)} ${' '.repeat(10)} ${' '.repeat(14)} ${pc.bold(String(result.scoring.finalScore).padStart(9))}`
    );
  }

  if (result.status === 'PARTIAL') {
    console.log(pc.yellow('\n⚠️  WARNING: This is a PARTIAL assessment. Some data could not be fetched or some detectors failed.'));
    console.log(pc.yellow('    The final score is based on incomplete evidence and may not reflect the full risk.'));
  } else if (result.status === 'UNAVAILABLE') {
    console.log(pc.red('\n❌  ERROR: The assessment is UNAVAILABLE due to registry errors or timeouts.'));
  }

  // Recommendations
  if (result.recommendations.length > 0) {
    console.log(pc.bold('\n💡 Recommendations:\n'));
    for (const rec of result.recommendations) {
      console.log(pc.yellow(`  👉 ${rec}`));
    }
  }

  console.log();
}

function getLevelDisplay(level: string): string {
  switch (level) {
    case 'SAFE':       return pc.green(pc.bold('SAFE'));
    case 'SUSPICIOUS': return pc.yellow(pc.bold('SUSPICIOUS'));
    case 'HIGH':       return pc.red(pc.bold('HIGH'));
    case 'CRITICAL':   return pc.bgRed(pc.white(pc.bold(' CRITICAL ')));
    default:           return level;
  }
}
