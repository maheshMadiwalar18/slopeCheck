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
    `  ${'Factor'.padEnd(24)} ${'Score'.padStart(6)} ${'Weight'.padStart(7)} ${'Weighted'.padStart(9)}`
  );
  console.log(`  ${'─'.repeat(24)} ${'─'.repeat(6)} ${'─'.repeat(7)} ${'─'.repeat(9)}`);

  let totalWeightedScore = 0;
  let totalWeight = 0;

  for (const factor of result.factors) {
    const weighted = factor.score * factor.weight;
    totalWeightedScore += weighted;
    totalWeight += factor.weight;

    const scoreStr = `${factor.score}`.padStart(6);
    const weightStr = `x${factor.weight.toFixed(1)}`.padStart(7);
    const weightedStr = `${weighted.toFixed(0)}`.padStart(9);

    const colorFn = factor.score >= 80 ? pc.red : factor.score >= 50 ? pc.yellow : pc.white;
    console.log(`  ${colorFn(factor.name.padEnd(24))} ${scoreStr} ${weightStr} ${weightedStr}`);
    console.log(`  ${pc.gray(`  └─ ${factor.description}`)}`);
  }

  console.log(`\n  ${'─'.repeat(48)}`);
  const avgScore = totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0;
  console.log(
    `  ${'Aggregated'.padEnd(24)} ${' '.repeat(14)} ${pc.bold(String(avgScore).padStart(9))}`
  );
  console.log(
    pc.gray(`\n  Final = Σ(score × weight) / Σ(weight) = ${totalWeightedScore.toFixed(0)} / ${totalWeight.toFixed(1)} = ${avgScore}`)
  );

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
