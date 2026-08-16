#!/usr/bin/env node
import { SlopcheckGuard, parseInstallCommand } from '@slopcheck/agent';
import * as fs from 'fs';

export async function runHook(input: string, guard: SlopcheckGuard): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  if (!input.trim()) {
    return { exitCode: 0, stdout: '', stderr: '' };
  }

  let payload;
  try {
    payload = JSON.parse(input);
  } catch (e) {
    // Not valid JSON
    return { exitCode: 0, stdout: '', stderr: '' };
  }

  // Claude Code PreToolUse hook payload usually provides command in one of these paths
  const command = payload.args?.command || payload.toolArguments?.command || payload.command;
  if (!command || typeof command !== 'string') {
    return { exitCode: 0, stdout: '', stderr: '' };
  }

  const parsed = parseInstallCommand(command);
  if (!parsed.isInstall || parsed.packages.length === 0) {
    return { exitCode: 0, stdout: '', stderr: '' };
  }
  
  let finalDecision: 'ALLOW' | 'WARN' | 'BLOCK' = 'ALLOW';
  const blockMessages: string[] = [];
  const warnMessages: string[] = [];

  for (const pkg of parsed.packages) {
    const req: import('@slopcheck/agent').InstallRequest = { package: pkg.name };
    if (pkg.version) req.version = pkg.version;
    if (parsed.packageManager) req.packageManager = parsed.packageManager;

    const result = await guard.inspect(req);

    if (result.decision === 'BLOCK') {
      finalDecision = 'BLOCK';
      blockMessages.push(formatMessage(result));
    } else if (result.decision === 'WARN' && finalDecision !== 'BLOCK') {
      finalDecision = 'WARN';
      warnMessages.push(formatMessage(result));
    }
  }

  if (finalDecision === 'BLOCK') {
    let stderr = 'Slopcheck Agent\n────────────────────────────\nBLOCKED\n\n';
    stderr += blockMessages.join('\n');
    stderr += 'Installation was NOT executed.\n';
    return { exitCode: 2, stdout: '', stderr };
  } else if (finalDecision === 'WARN') {
    let stdout = 'Slopcheck Agent\n────────────────────────────\nWARNING\n\n';
    stdout += warnMessages.join('\n');
    return { exitCode: 0, stdout, stderr: '' };
  }

  return { exitCode: 0, stdout: '', stderr: '' };
}

function formatMessage(result: import('@slopcheck/agent').SecurityDecision) {
  let msg = `Package: ${result.assessment?.package || 'Unknown'}\n`;
  msg += `Risk: ${result.assessment?.level || 'UNKNOWN'}\n`;
  if (result.assessment?.score !== undefined && result.assessment?.score !== null) {
    msg += `Score: ${result.assessment.score}\n`;
  }
  msg += `\nReasons:\n`;
  if (result.reasons) {
    for (const r of result.reasons) {
      msg += `• ${r.message}\n`;
    }
  }
  return msg;
}

async function main() {
  let input = '';
  try {
    input = fs.readFileSync(0, 'utf-8');
  } catch (e) {
    process.exit(0);
  }

  try {
    const guard = new SlopcheckGuard();
    const result = await runHook(input, guard);
    
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    
    process.exit(result.exitCode);
  } catch (e) {
    console.error(e);
    process.exit(2);
  }
}

if (require.main === module) {
  main();
}
