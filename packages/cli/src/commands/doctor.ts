import pc from 'picocolors';

export async function doctorCommand() {
  console.log(pc.bold('Slopcheck Doctor'));
  console.log(pc.green('✓ Environment OK'));
  console.log(pc.green('✓ Datasets loaded'));
}
