#!/usr/bin/env node
import { cac } from 'cac';
import { checkCommand } from './commands/check';
import { scanCommand } from './commands/scan';
import { explainCommand } from './commands/explain';
import { doctorCommand } from './commands/doctor';
import pc from 'picocolors';

const cli = cac('slopcheck-agent');

cli
  .command('check <package>', 'Check a single npm package for risks')
  .option('--json', 'Output results in JSON format')
  .action(async (pkg, options) => {
    try {
      await checkCommand(pkg, options);
    } catch (e) {
      if (options.json) {
        console.log(JSON.stringify({ error: 'Error checking package' }, null, 2));
      } else {
        console.error(pc.red('Error checking package'), e);
      }
      process.exitCode = 2;
    }
  });

cli
  .command('scan <package.json>', 'Scan all dependencies in a package.json')
  .option('--json', 'Output results in JSON format')
  .action(async (file, options) => {
    try {
      await scanCommand(file, options);
    } catch (e) {
      if (options.json) {
        console.log(JSON.stringify({ error: 'Error scanning package.json' }, null, 2));
      } else {
        console.error(pc.red('Error scanning package.json'), e);
      }
      process.exitCode = 2;
    }
  });

cli
  .command('explain <package>', 'Explain risk scoring for a package')
  .action(async (pkg) => {
    await explainCommand(pkg);
  });

cli
  .command('doctor', 'Diagnose environment')
  .action(async () => {
    await doctorCommand();
  });

cli.help();
cli.version('0.1.0');

cli.parse();
