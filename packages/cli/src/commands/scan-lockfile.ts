import pc from 'picocolors';
import pLimit from 'p-limit';
import path from 'node:path';
import fs from 'node:fs/promises';
import { RiskEngine, PluginRegistry, type PackageContext, PolicyEngine, AssessmentStatus, AssessmentError, loadConfig } from '@slopcheck/core';
import { getRiskColor } from './check';
import { AgeDetector, PopularityDetector, RepoDetector, MetadataDetector, HallucinationDetector, SimilarityDetector, VulnerabilityDetector } from '@slopcheck/heuristics';
import { getDatasetManifest } from '@slopcheck/datasets';
import { RegistryClient } from '@slopcheck/registry';
import { parsePackageLock } from '../lockfiles/npm';
import { parsePnpmLock } from '../lockfiles/pnpm';

export async function scanLockfileCommand(lockfilePath: string, options: { json?: boolean, policy?: string }) {
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

    const config = await loadConfig(options.policy);
    const policy = new PolicyEngine(config || undefined);

    const registry = new PluginRegistry();
    registry.register(new AgeDetector());
    registry.register(new PopularityDetector());
    registry.register(new RepoDetector());
    registry.register(new MetadataDetector());
    registry.register(new HallucinationDetector());
    registry.register(new SimilarityDetector());
    registry.register(new VulnerabilityDetector());
    const engine = new RiskEngine(registry);
    const client = new RegistryClient();

    let datasetVersion: string | undefined;
    try {
      const manifest = await getDatasetManifest();
      datasetVersion = manifest.datasetVersion;
    } catch {
      // Ignore
    }

    const limit = pLimit(10);
    const results: any[] = [];
    
    // Filter out root node and workspaces
    const nodesToScan = Array.from(graph.nodes.values()).filter(n => !n.isWorkspace && n.name !== 'root');

    if (!options.json) {
      console.log(pc.blue(`Scanning ${nodesToScan.length} dependencies from ${filename}...`));
    }

    const tasks = nodesToScan.map(node => limit(async () => {
      const context: PackageContext = { name: node.name, version: node.version };
      let status: AssessmentStatus = 'COMPLETE';
      const errors: AssessmentError[] = [];
      let isNotFound = false;

      const npmRes = await client.fetchNpmMetadata(node.name);
      if (npmRes.success) {
        context.npm = npmRes.value;
        const dlRes = await client.fetchNpmDownloads(node.name);
        if (dlRes.success) {
          context.downloads = dlRes.value;
        } else {
          status = 'PARTIAL';
          errors.push({ source: 'npm_downloads', code: 'DOWNLOADS_UNAVAILABLE', message: dlRes.error.message });
        }

        if (context.npm.repository) {
          const repoUrl = typeof context.npm.repository === 'string' ? context.npm.repository : context.npm.repository.url;
          const ghRes = await client.fetchGithubMetadata(repoUrl);
          if (ghRes.success) {
            context.github = ghRes.value;
          } else {
            status = 'PARTIAL';
            errors.push({ source: 'github', code: ghRes.error.status === 404 ? 'REPO_NOT_FOUND' : 'GITHUB_ERROR', message: ghRes.error.message });
          }
        }
      } else {
        if (npmRes.error.status === 404) {
          isNotFound = true;
          status = 'NOT_FOUND';
          errors.push({ source: 'npm', code: 'PACKAGE_NOT_FOUND', message: npmRes.error.message });
        } else {
          status = 'UNAVAILABLE';
          errors.push({ source: 'npm', code: 'REGISTRY_ERROR', message: npmRes.error.message });
        }
      }

      if (!isNotFound) {
        const osvRes = await client.fetchOsvVulnerabilities(node.name, node.version);
        if (osvRes.success) {
          context.vulnerabilities = osvRes.value;
        } else {
          status = 'UNAVAILABLE';
          context.vulnerabilities = null;
          errors.push({ source: 'osv', code: 'VULNERABILITIES_UNAVAILABLE', message: osvRes.error.message });
        }
      }

      let assessment = await engine.evaluate(context, status, errors, datasetVersion);
      
      // Lockfiles shouldn't have hallucinations natively since they were installed, but let's maintain engine purity.
      // If NOT_FOUND but not critical/high, downgrade to unknown
      if (isNotFound && assessment.level !== 'CRITICAL' && assessment.level !== 'HIGH') {
         assessment = { ...assessment, level: 'UNKNOWN', score: null, assessable: false };
      }

      const decision = policy.decide(assessment);
      return { node, assessment, decision };
    }));

    const evaluated = await Promise.all(tasks);

    const breakdown = { SAFE: 0, SUSPICIOUS: 0, HIGH: 0, CRITICAL: 0, UNKNOWN: 0 };
    let hasBlock = false;

    for (const res of evaluated) {
       const level = res.assessment.level;
       breakdown[level]++;
       if (res.decision.decision === 'BLOCK') {
          hasBlock = true;
       }
       results.push({
         package: res.node.name,
         version: res.node.version,
         path: res.node.resolutionPath,
         assessment: res.assessment,
         policy: res.decision
       });
    }

    if (options.json) {
      console.log(JSON.stringify({ graph: { nodes: graph.nodes.size, edges: graph.edges.length }, results }, null, 2));
      process.exit(hasBlock ? 1 : 0);
    }

    console.log(`\nDependency graph scanned:\nPackages: ${nodesToScan.length}\n`);
    console.log(`Results:`);
    console.log(`${pc.green('SAFE')}: ${breakdown.SAFE}`);
    console.log(`${pc.yellow('SUSPICIOUS')}: ${breakdown.SUSPICIOUS}`);
    console.log(`${pc.magenta('HIGH')}: ${breakdown.HIGH}`);
    console.log(`${pc.red('CRITICAL')}: ${breakdown.CRITICAL}`);
    
    if (breakdown.UNKNOWN > 0) {
      console.log(`${pc.gray('UNKNOWN')}: ${breakdown.UNKNOWN}`);
    }

    const criticalHigh = evaluated.filter(r => r.assessment.level === 'CRITICAL' || r.assessment.level === 'HIGH');
    
    if (criticalHigh.length > 0) {
       console.log(`\n${pc.red.bold('Critical/High findings:')}\n`);
       for (const res of criticalHigh) {
          console.log(`- ${getRiskColor(res.assessment.level)(`${res.node.name}@${res.node.version}`)}`);
          if (res.node.resolutionPath && res.node.resolutionPath.length > 0) {
             console.log(`  Path: ${pc.gray(res.node.resolutionPath.join(' → '))}`);
          }
          // Note: RiskAssessment uses 'factors', not 'flags'
          if (res.assessment.factors) {
            for (const flag of res.assessment.factors) {
               console.log(`  * [${flag.name}] ${flag.description}`);
            }
          }
          if (res.assessment.vulnerabilities && res.assessment.vulnerabilities.length > 0) {
             console.log(`  * Vulnerabilities:`);
             for (const vuln of res.assessment.vulnerabilities) {
                console.log(`    - ${pc.bold(vuln.id)} [${vuln.severity}]`);
             }
          }
       }
    }

    if (hasBlock) {
      console.log(pc.red.bold(`\n❌ Policy enforcement failed: Found packages violating the security policy.`));
      process.exit(1);
    } else {
      console.log(pc.green.bold(`\n✅ Scan passed.`));
      process.exit(0);
    }
  } catch (error: any) {
    console.error(pc.red(`Fatal error during lockfile scan: ${error.message}`));
    process.exit(2);
  }
}
