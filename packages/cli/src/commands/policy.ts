import { loadConfig, PolicyEngine } from '@slopcheck/core';
import pc from 'picocolors';

export async function validatePolicyCommand(filePath: string) {
  try {
    const config = await loadConfig(filePath);
    if (!config) {
      console.error(pc.red(`❌ Policy configuration not found.`));
      process.exitCode = 1;
      return;
    }
    const engine = new PolicyEngine(config); // ensure it initializes properly
    console.log(pc.green(`✅ Policy configuration is valid.`));
    console.log(pc.cyan(`Loaded rules: ${config.rules?.length || 0}`));
  } catch (err: unknown) {
    console.error(pc.red(`❌ Invalid policy configuration.`));
    console.error(pc.yellow((err as Error).message));
    process.exitCode = 1;
  }
}
