#!/usr/bin/env node
import { SlopcheckGuard, parseInstallCommand } from '@slopcheck/agent';

export async function runCursorHook(inputJSON: string, guard: SlopcheckGuard) {
  try {
    const payload = JSON.parse(inputJSON);
    
    // Check if it's the expected hook
    if (payload.hook_event_name !== 'beforeShellExecution') {
      return {
        permission: 'allow',
        user_message: 'Ignored non-shell event.',
        agent_message: 'Event ignored by Slopcheck.'
      };
    }

    const command = payload.command;
    if (!command || typeof command !== 'string') {
      return {
        permission: 'allow'
      };
    }

    const parsed = parseInstallCommand(command);
    if (!parsed.isInstall || parsed.packages.length === 0) {
      return {
        permission: 'allow'
      };
    }

    let finalDecision: 'ALLOW' | 'WARN' | 'BLOCK' = 'ALLOW';
    const warnMessages: string[] = [];

    for (const pkg of parsed.packages) {
      const req: import('@slopcheck/agent').InstallRequest = { package: pkg.name };
      if (pkg.version) req.version = pkg.version;
      if (parsed.packageManager) req.packageManager = parsed.packageManager;

      const result = await guard.inspect(req);

      if (result.decision === 'BLOCK') {
        finalDecision = 'BLOCK';
        const msg = formatMessage(result);
        return {
          permission: 'deny',
          user_message: `Slopcheck blocked installation of ${pkg.name}.\n\n${msg}`,
          agent_message: `Slopcheck Security Policy blocked this package due to risk assessment: ${result.assessment?.level || 'UNKNOWN'}. Do NOT attempt to install it again.`
        };
      }

      if (result.decision === 'WARN') {
        finalDecision = 'WARN';
        warnMessages.push(`⚠️ Warning for ${pkg.name}: ${formatMessage(result)}`);
      }
    }

    if (finalDecision === 'WARN') {
      return {
        permission: 'allow',
        user_message: warnMessages.join('\n\n'),
        agent_message: 'Slopcheck raised warnings but allowed the installation. Proceed with caution.'
      };
    }

    return {
      permission: 'allow'
    };

  } catch (err) {
    // Fail-open for parsing errors to not break IDE
    return {
      permission: 'allow',
      user_message: `Slopcheck failed to parse hook payload: ${String(err)}`
    };
  }
}

function formatMessage(result: import('@slopcheck/agent').SecurityDecision) {
  let msg = `Risk: ${result.assessment?.level || 'UNKNOWN'}\n`;
  if (result.assessment?.score !== undefined && result.assessment?.score !== null) {
    msg += `Score: ${result.assessment.score}/100\n`;
  }
  if (result.reasons.length > 0) {
    msg += `Reasons:\n${result.reasons.map(r => `- [${r.code}] ${r.message}`).join('\n')}`;
  }
  return msg;
}

async function main() {
  // Read from stdin
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const input = Buffer.concat(chunks).toString('utf8');

  const guard = new SlopcheckGuard();
  const result = await runCursorHook(input, guard);

  console.log(JSON.stringify(result));
}

if (require.main === module) {
  main().catch((err) => {
    console.error(JSON.stringify({
      permission: 'allow',
      user_message: `Slopcheck hook fatal error: ${String(err)}`
    }));
    process.exit(0);
  });
}
