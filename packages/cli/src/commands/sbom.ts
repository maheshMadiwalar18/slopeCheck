import path from 'node:path';
import fs from 'node:fs/promises';
import { parsePackageLock } from '../lockfiles/npm';
import { parsePnpmLock } from '../lockfiles/pnpm';
import { RegistryClient } from '@slopcheck/registry';
import pc from 'picocolors';

export async function sbomCommand(lockfilePath: string = 'package-lock.json', options: { out?: string } = {}) {
  try {
    const absPath = path.resolve(process.cwd(), lockfilePath);
    try {
      await fs.access(absPath);
    } catch {
      console.error(pc.red(`Error: Lockfile not found at ${absPath}`));
      process.exit(2);
    }

    const filename = path.basename(absPath);
    let graph;

    if (filename === 'package-lock.json') {
      graph = await parsePackageLock(absPath);
    } else if (filename === 'pnpm-lock.yaml') {
      graph = await parsePnpmLock(absPath);
    } else {
      console.error(pc.red(`Error: Unsupported lockfile format: ${filename}. Supported formats: package-lock.json, pnpm-lock.yaml`));
      process.exit(2);
    }

    console.log(pc.blue(`Generating CycloneDX SBOM for ${filename}...`));

    const client = new RegistryClient();
    const components: any[] = [];
    const vulnerabilities: any[] = [];

    const nodesToScan = Array.from(graph.nodes.values()).filter(n => !n.isWorkspace && n.name !== 'root');

    for (const node of nodesToScan) {
      const purl = `pkg:npm/${node.name}@${node.version}`;
      
      const component = {
        type: "library",
        name: node.name,
        version: node.version,
        purl
      };
      
      components.push(component);

      const osvRes = await client.fetchOsvVulnerabilities(node.name, node.version);
      if (osvRes.success && osvRes.value.length > 0) {
        for (const finding of osvRes.value) {
           vulnerabilities.push({
              id: finding.id,
              source: { name: "OSV" },
              ratings: [
                {
                   method: "other",
                   severity: finding.severity.toLowerCase(),
                }
              ],
              description: finding.summary,
              affects: [
                 {
                    ref: purl
                 }
              ]
           });
        }
      }
    }

    const sbom = {
      bomFormat: "CycloneDX",
      specVersion: "1.5",
      version: 1,
      components,
      vulnerabilities: vulnerabilities.length > 0 ? vulnerabilities : undefined
    };

    const outStr = JSON.stringify(sbom, null, 2);

    if (options.out) {
      await fs.writeFile(path.resolve(process.cwd(), options.out), outStr, 'utf-8');
      console.log(pc.green(`✅ SBOM successfully saved to ${options.out}`));
    } else {
      console.log(outStr);
    }
  } catch (error: any) {
    console.error(pc.red(`Fatal error during SBOM generation: ${error.message}`));
    process.exit(2);
  }
}
