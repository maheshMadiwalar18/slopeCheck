import pc from 'picocolors';

export async function explainCommand(packageName: string) {
  console.log(pc.cyan(`Explaining risk factors for ${packageName}...`));
  console.log(pc.gray(`(To be implemented: detailed trace of how ${packageName} is evaluated)`));
}
