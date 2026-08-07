import { evaluatePackage } from '../engine';
import pc from 'picocolors';

export async function checkCommand(packageName: string) {
  console.log(pc.cyan(`\n🔍 Scanning package: ${pc.bold(packageName)}...`));
  
  const result = await evaluatePackage(packageName);

  console.log(`\nRisk Level: ${getRiskColor(result.level)(result.level)} (Score: ${result.score})`);
  
  if (result.factors.length > 0) {
    console.log(`\nFactors identified:`);
    for (const factor of result.factors) {
      console.log(`  - ${factor.name}: ${factor.description} [${factor.score} pts]`);
    }
  } else {
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

export function getRiskColor(level: string) {
  switch (level) {
    case 'SAFE': return pc.green;
    case 'SUSPICIOUS': return pc.yellow;
    case 'HIGH': return pc.red;
    case 'CRITICAL': return (s: string) => pc.bgRed(pc.white(pc.bold(s)));
    default: return pc.white;
  }
}
