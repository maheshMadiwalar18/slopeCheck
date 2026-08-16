import pc from 'picocolors';
import { scanLockfileCommand } from './scan-lockfile';
import fs from 'node:fs/promises';

export async function reportCommand(lockfilePath: string = 'package-lock.json', options: { policy?: string } = {}) {
  console.log(pc.cyan(`\n📊 Generating Slopcheck Risk Report...`));
  
  const tempLog = console.log;
  let capturedOutput = '';
  console.log = (...args: any[]) => {
    capturedOutput += args.join(' ') + '\n';
  };

  try {
    await scanLockfileCommand(lockfilePath, { ...options, json: true });
  } catch {
     // Ignore process.exit
  }

  console.log = tempLog;

  try {
     const data = JSON.parse(capturedOutput);
     console.log(pc.bold(`\nRisk Report for ${lockfilePath}`));
     console.log(`=========================================`);
     console.log(`Total dependencies: ${data.graph.nodes}`);
     
     const blocked = data.results.filter((r: any) => r.policy.decision === 'BLOCK');
     const critical = data.results.filter((r: any) => r.assessment.level === 'CRITICAL');
     
     console.log(`\nPackages blocked by policy: ${blocked.length}`);
     for (const b of blocked) {
        console.log(pc.red(` - ${b.package}@${b.version}`));
        for (const r of b.policy.reasons) {
           console.log(pc.gray(`   * ${r.message}`));
        }
     }
     
     if (blocked.length === 0) {
        console.log(pc.green(`✅ All packages passed policy.`));
     }

     console.log(`\nReport complete.\n`);
  } catch (e: any) {
     console.error(pc.red(`Failed to parse scan results for report: ${e.message}`));
  }
}
