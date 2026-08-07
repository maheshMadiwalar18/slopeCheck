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
  .action(async (pkg) => {
    try {
      await checkCommand(pkg);
    } catch (e) {
      console.error(pc.red('Error checking package'), e);
    }
  });

cli
  .command('scan <package.json>', 'Scan all dependencies in a package.json')
  .action(async (file) => {
    try {
      await scanCommand(file);
    } catch (e) {
      console.error(pc.red('Error scanning package.json'), e);
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
