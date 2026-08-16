import * as core from '@actions/core';
import * as exec from '@actions/exec';


const severityLevels = ['safe', 'suspicious', 'high', 'critical'] as const;
type Severity = typeof severityLevels[number];

const SeverityMap = {
  safe: 0,
  suspicious: 1,
  high: 2,
  critical: 3,
} as const;

export async function run() {
  try {
    const lockfile = core.getInput('lockfile');
    const path = core.getInput('path') || 'package.json';
    const failOn = (core.getInput('fail-on') || 'high').toLowerCase() as Severity;
    const policy = core.getInput('policy');
    const version = core.getInput('version') || '0.1.0';

    if (!policy && !severityLevels.includes(failOn)) {
      core.setFailed(`Invalid fail-on value: ${failOn}. Must be one of: ${severityLevels.join(', ')}`);
      return;
    }

    // Validate version to prevent arguments injection
    if (!/^[0-9a-zA-Z.-]+$/.test(version)) {
      core.setFailed(`Invalid version format: ${version}`);
      return;
    }

    core.info(`Installing slopcheck-agent@${version}...`);
    // Safe execution without shell interpolation
    await exec.exec('npm', ['install', '-g', `slopcheck-agent@${version}`]);

    let args: string[];
    if (lockfile) {
      core.info(`Running slopcheck-agent scan-lockfile on ${lockfile}...`);
      args = ['slopcheck-agent', 'scan-lockfile', lockfile, '--json'];
    } else {
      core.info(`Running slopcheck-agent scan on ${path}...`);
      args = ['slopcheck-agent', 'scan', path, '--json'];
    }
    
    if (policy) {
       args.push('--policy', policy);
    }

    const { exitCode, stdout, stderr } = await exec.getExecOutput(
      'npx',
      args,
      { ignoreReturnCode: true, silent: true }
    );

    if (exitCode === 2) {
      core.setFailed(`Slopcheck Agent encountered an operational error (Exit code 2).\nStderr: ${stderr}\nStdout: ${stdout}`);
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(stdout);
    } catch (err) {
      core.setFailed(`Failed to parse JSON output from Slopcheck Agent. Output: ${stdout}`);
      return;
    }

    if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as { results?: unknown }).results)) {
      core.setFailed(`Invalid JSON structure returned by Slopcheck Agent.`);
      return;
    }

    // The new scan output provides results with { assessment, policy }
    const results = (parsed as { results: Array<any> }).results;

    let safeCount = 0;
    let suspCount = 0;
    let highCount = 0;
    let critCount = 0;
    let maxSeverityLevel = -1;
    let highestLevelStr = 'SAFE';

    const criticalPkgs: Array<any> = [];
    const highPkgs: Array<any> = [];

    for (const res of results) {
      // Handle both old { level, score } format and new { assessment, policy } format
      const assessment = res.assessment || res;
      const level = (assessment.level || 'UNKNOWN').toLowerCase();
      let levelValue = -1;
      
      if (level === 'safe') { safeCount++; levelValue = SeverityMap.safe; }
      else if (level === 'suspicious') { suspCount++; levelValue = SeverityMap.suspicious; }
      else if (level === 'high') { highCount++; levelValue = SeverityMap.high; highPkgs.push(assessment); }
      else if (level === 'critical') { critCount++; levelValue = SeverityMap.critical; criticalPkgs.push(assessment); }

      if (levelValue > maxSeverityLevel) {
        maxSeverityLevel = levelValue;
        highestLevelStr = level.toUpperCase();
      }
    }

    const totalScanned = safeCount + suspCount + highCount + critCount;

    core.setOutput('status', highestLevelStr);
    core.setOutput('packages-scanned', totalScanned);
    core.setOutput('high-risk-count', highCount);
    core.setOutput('critical-count', critCount);

    // Build Job Summary
    await core.summary
      .addHeading('Slopcheck Agent Results')
      .addRaw(`**Packages Scanned:** ${totalScanned}`)
      .addTable([
        [{ data: 'Status', header: true }, { data: 'Count', header: true }],
        ['SAFE', safeCount.toString()],
        ['SUSPICIOUS', suspCount.toString()],
        ['HIGH', highCount.toString()],
        ['CRITICAL', critCount.toString()]
      ])
      .addBreak();

    if (criticalPkgs.length > 0) {
      core.summary.addHeading('Critical Risks', 3);
      for (const p of criticalPkgs) {
        core.summary.addRaw(`- \`${p.package}\` (Score: ${p.score})\n`);
      }
    }
    if (highPkgs.length > 0) {
      core.summary.addHeading('High Risks', 3);
      for (const p of highPkgs) {
        core.summary.addRaw(`- \`${p.package}\` (Score: ${p.score})\n`);
      }
    }

    await core.summary.write();

    if (policy) {
      // When using a policy, we completely trust the CLI exit code (1 means BLOCK, 0 means ALLOW/WARN)
      if (exitCode === 1) {
        core.setFailed(`Security policy blocked the build. Check the CLI output for details.`);
      }
    } else {
      // Determine failure based on legacy fail-on threshold
      const failOnValue = SeverityMap[failOn];
      if (maxSeverityLevel >= failOnValue) {
        core.setFailed(`Security threshold exceeded. Found packages with severity ${highestLevelStr}, which is >= ${failOn.toUpperCase()}.`);
      } else if (exitCode === 1 && maxSeverityLevel < failOnValue) {
        // CLI exited with 1 because it found HIGH/CRIT, but the action threshold allowed it.
        core.info(`CLI detected high/critical risks, but fail-on threshold (${failOn}) was not met. Passing action.`);
      }
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    core.setFailed(`Action failed with error: ${message}`);
  }
}

if (process.env.NODE_ENV !== 'test') {
  run();
}
