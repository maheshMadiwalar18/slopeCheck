// Simulated example of an AI Agent invoking Slopcheck programmatically

// In a real app, this would be: import { SlopcheckGuard } from '@slopcheck/agent';
console.log("Starting agent integration example...");

async function mockInspect(packageName) {
  // Mocking the result for the example
  console.log(`Inspecting package: ${packageName}`);
  return {
    decision: packageName === 'suspicious-pkg' ? 'BLOCK' : 'ALLOW',
    riskLevel: packageName === 'suspicious-pkg' ? 'HIGH' : 'SAFE',
    reasons: packageName === 'suspicious-pkg' ? ['Package is suspiciously new with no repository'] : []
  };
}

async function run() {
  const targetPackage = 'suspicious-pkg';
  
  const result = await mockInspect(targetPackage);
  
  if (result.decision === 'BLOCK') {
    console.error(`\n[AGENT GUARD] Installation BLOCKED for ${targetPackage}`);
    console.error(`Risk Level: ${result.riskLevel}`);
    console.error(`Reasons: ${result.reasons.join(', ')}`);
    console.error(`Action aborted. Did not run 'npm install'.`);
  } else {
    console.log(`[AGENT GUARD] Package ${targetPackage} is allowed. Installing...`);
    // child_process.execSync(`npm install ${targetPackage}`);
  }
}

run();
