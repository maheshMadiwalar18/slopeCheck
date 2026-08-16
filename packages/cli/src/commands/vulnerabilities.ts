import { getRegistryClient } from '../engine';
import { isValidPackageName, getRiskColor } from './check';
import pc from 'picocolors';
import { isFailure } from '@slopcheck/core';

export async function vulnerabilitiesCommand(packageName: string, version?: string) {
  if (!isValidPackageName(packageName)) {
    console.error(pc.red(`❌ Invalid package name format: ${packageName}`));
    process.exitCode = 2;
    return;
  }

  const client = getRegistryClient();
  
  console.log(pc.cyan(`\n🔍 Fetching vulnerabilities for: ${pc.bold(packageName)}${version ? `@${version}` : ''}...`));

  const res = await client.fetchOsvVulnerabilities(packageName, version);
  
  if (isFailure(res)) {
    console.error(pc.red(`\n❌ Failed to fetch vulnerabilities: ${res.error.message}`));
    process.exitCode = 2;
    return;
  }

  const vulns = res.value;

  if (vulns.length === 0) {
    console.log(pc.green(`\n✅ No known vulnerabilities found for ${packageName}${version ? `@${version}` : ''}.`));
    return;
  }

  console.log(pc.red(`\nFound ${vulns.length} vulnerabilities:`));
  
  // Find highest severity
  const severityOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MODERATE': 2, 'LOW': 1, 'UNKNOWN': 0 };
  const highest = vulns.reduce((max, v) => 
    severityOrder[v.severity as keyof typeof severityOrder] > severityOrder[max as keyof typeof severityOrder] ? v.severity : max, 
  'UNKNOWN');

  console.log(`Highest severity: ${highest === 'CRITICAL' ? pc.bgRed(pc.white(highest)) : highest === 'HIGH' ? pc.red(highest) : pc.yellow(highest)}\n`);

  for (const vuln of vulns) {
    const severityColor = vuln.severity === 'CRITICAL' ? pc.bgRed : vuln.severity === 'HIGH' ? pc.red : pc.yellow;
    console.log(`- ${pc.bold(vuln.id)} [${severityColor(vuln.severity)}]`);
    console.log(`  Summary: ${vuln.summary}`);
    console.log(`  Affected versions: ${vuln.affectedVersions.join(', ')}`);
    console.log(`  Fixed in: ${vuln.fixedVersions?.join(', ') || 'Unknown'}`);
    console.log(`  Source: OSV.dev\n`);
  }
}
