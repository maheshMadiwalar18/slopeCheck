#!/usr/bin/env node
import { cac } from 'cac';
import { checkCommand } from './commands/check';
import { scanCommand } from './commands/scan';
import { scanLockfileCommand } from './commands/scan-lockfile';
import { explainCommand } from './commands/explain';
import { doctorCommand } from './commands/doctor';
import { datasetCommand } from './commands/dataset';
import { validatePolicyCommand } from './commands/policy';
import { vulnerabilitiesCommand } from './commands/vulnerabilities';
import { sbomCommand } from './commands/sbom';
import { reportCommand } from './commands/report';
import pc from 'picocolors';

const cli = cac('slopcheck-agent');

cli
  .command('check <package>', 'Check a single npm package for risks')
  .option('--json', 'Output results in JSON format')
  .option('--policy <file>', 'Path to policy configuration file')
  .example('  $ slopcheck-agent check react')
  .example('  $ slopcheck-agent check express --json')
  .action(async (pkg, options) => {
    try {
      await checkCommand(pkg, options);
    } catch (err: unknown) {
      const e = err as Error;
      if (options.json) {
        console.log(JSON.stringify({ error: 'Failed to analyze package', message: e.message }, null, 2));
      } else {
        console.error(pc.red('\n✖ Analysis Failed (Exit Code 2)'));
        console.error(pc.bold('What happened?'));
        console.error('  Slopcheck could not complete the security analysis for the package.');
        console.error(pc.bold('\nWhy?'));
        console.error(`  ${e.message || 'An unknown error occurred during execution.'}`);
        console.error(pc.bold('\nWhat should you do next?'));
        console.error('  1. Verify the package name is spelled correctly and exists on npm.');
        console.error('  2. Check your network connection and registry access.');
        console.error('  3. Run `slopcheck-agent doctor` to diagnose environment issues.\n');
      }
      process.exitCode = 2;
    }
  });

cli
  .command('scan <package.json>', 'Scan all dependencies in a package.json')
  .option('--json', 'Output results in JSON format')
  .option('--policy <file>', 'Path to policy configuration file')
  .example('  $ slopcheck-agent scan ./package.json')
  .action(async (file, options) => {
    try {
      await scanCommand(file, options);
    } catch (err: unknown) {
      const e = err as Error;
      if (options.json) {
        console.log(JSON.stringify({ error: 'Failed to scan package.json', message: e.message }, null, 2));
      } else {
        console.error(pc.red('\n✖ Scan Failed (Exit Code 2)'));
        console.error(pc.bold('What happened?'));
        console.error('  Slopcheck could not complete the scan of the provided package.json file.');
        console.error(pc.bold('\nWhy?'));
        console.error(`  ${e.message || 'An unknown error occurred (e.g., file not found or invalid JSON).'}`);
        console.error(pc.bold('\nWhat should you do next?'));
        console.error('  1. Ensure the file path exists and is a valid JSON file.');
        console.error('  2. Check your network connection to the npm registry.\n');
      }
      process.exitCode = 2;
    }
  });

cli
  .command('scan-lockfile <file>', 'Scan a resolved dependency graph from package-lock.json or pnpm-lock.yaml')
  .option('--json', 'Output results in JSON format')
  .option('--policy <file>', 'Path to policy configuration file')
  .example('  $ slopcheck-agent scan-lockfile package-lock.json')
  .action(async (file, options) => {
    try {
      await scanLockfileCommand(file, options);
    } catch (err: unknown) {
      const e = err as Error;
      if (options.json) {
        console.log(JSON.stringify({ error: 'Failed to scan lockfile', message: e.message }, null, 2));
      } else {
        console.error(pc.red('\n✖ Scan Failed (Exit Code 2)'));
        console.error(pc.bold('What happened?'));
        console.error('  Slopcheck could not complete the scan of the provided lockfile.');
        console.error(pc.bold('\nWhy?'));
        console.error(`  ${e.message || 'An unknown error occurred.'}`);
      }
      process.exitCode = 2;
    }
  });

cli
  .command('explain <package>', 'Explain risk scoring for a package')
  .example('  $ slopcheck-agent explain suspicious-package')
  .action(async (pkg) => {
    try {
      await explainCommand(pkg);
    } catch (err: unknown) {
      const e = err as Error;
      console.error(pc.red('\n✖ Explanation Failed'));
      console.error(pc.bold('Why?'), e.message);
      process.exitCode = 2;
    }
  });

cli
  .command('doctor', 'Diagnose environment connectivity and dataset availability')
  .example('  $ slopcheck-agent doctor')
  .action(async () => {
    await doctorCommand();
  });


cli
  .command('policy validate <file>', 'Validate a policy configuration file')
  .example('  $ slopcheck-agent policy validate .slopcheck.yml')
  .action(async (file) => {
    await validatePolicyCommand(file);
  });

cli
  .command('dataset <subcommand>', 'Manage and inspect datasets (info, verify)')
  .example('  $ slopcheck-agent dataset info')
  .example('  $ slopcheck-agent dataset verify')
  .action(async (subcommand) => {
    await datasetCommand(subcommand);
  });

cli
  .command('vulnerabilities <package>', 'Check known vulnerabilities for a package')
  .example('  $ slopcheck-agent vulnerabilities lodash')
  .action(async (pkg) => {
    await vulnerabilitiesCommand(pkg);
  });

cli
  .command('sbom [lockfile]', 'Generate a CycloneDX SBOM with vulnerability extensions')
  .option('--out <file>', 'Output file path')
  .example('  $ slopcheck-agent sbom package-lock.json --out sbom.json')
  .action(async (lockfile, options) => {
    await sbomCommand(lockfile, options);
  });

cli
  .command('report [lockfile]', 'Generate a risk report from a lockfile scan')
  .option('--policy <file>', 'Path to policy configuration file')
  .example('  $ slopcheck-agent report package-lock.json')
  .action(async (lockfile, options) => {
    await reportCommand(lockfile, options);
  });

cli.help(() => {
  console.log('\nSlopcheck Agent - AI-native npm supply-chain security.');
  console.log('Detects hallucinated, typosquatted, and suspicious packages.\n');
});

cli.version('0.1.0');

cli.parse();
