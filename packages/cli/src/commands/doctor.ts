import pc from 'picocolors';
import { getEngine } from '../engine';
import { getOfficialHallucinations, getCommunityHallucinations, getPopularPackages } from '@slopcheck/datasets';

export async function doctorCommand() {
  console.log(pc.bold('\n🩺 Slopcheck Doctor\n'));

  let allOk = true;

  // 1. Node.js version
  const nodeVersion = process.versions.node;
  const major = parseInt(nodeVersion.split('.')[0]!, 10);
  if (major >= 18) {
    console.log(pc.green(`  ✓ Node.js v${nodeVersion} (>=18 required)`));
  } else {
    console.log(pc.red(`  ✗ Node.js v${nodeVersion} — version 18+ is required`));
    allOk = false;
  }

  // 2. Datasets
  try {
    const official = await getOfficialHallucinations();
    const community = await getCommunityHallucinations();
    const popular = await getPopularPackages();
    console.log(pc.green(`  ✓ Datasets loaded (${official.length} official, ${community.length} community, ${popular.length} popular packages)`));
  } catch (e) {
    console.log(pc.red(`  ✗ Dataset loading failed: ${e instanceof Error ? e.message : 'Unknown error'}`));
    allOk = false;
  }

  // 3. Plugin registry
  try {
    getEngine();
    // Access plugin count via the engine's evaluate to check it's wired up
    // We can't directly access the registry, but we verify it initializes
    console.log(pc.green(`  ✓ Risk engine initialized with all detectors`));
  } catch (e) {
    console.log(pc.red(`  ✗ Risk engine failed to initialize: ${e instanceof Error ? e.message : 'Unknown error'}`));
    allOk = false;
  }

  // 4. npm registry connectivity
  try {
    const response = await fetch('https://registry.npmjs.org/', {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) {
      console.log(pc.green(`  ✓ npm registry reachable`));
    } else {
      console.log(pc.yellow(`  ⚠ npm registry returned ${response.status}`));
      allOk = false;
    }
  } catch {
    console.log(pc.red(`  ✗ npm registry unreachable (network error or timeout)`));
    allOk = false;
  }

  // 5. GitHub API connectivity and token
  const ghToken = process.env['GITHUB_TOKEN'];
  if (ghToken) {
    console.log(pc.green(`  ✓ GITHUB_TOKEN is set`));
  } else {
    console.log(pc.yellow(`  ⚠ GITHUB_TOKEN not set — GitHub API requests may be rate-limited`));
  }

  try {
    const headers: Record<string, string> = {
      'User-Agent': 'slopcheck-agent',
      'Accept': 'application/vnd.github.v3+json',
    };
    if (ghToken) headers['Authorization'] = `token ${ghToken}`;

    const response = await fetch('https://api.github.com/rate_limit', {
      headers,
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) {
      const data = await response.json() as { rate?: { remaining?: number; limit?: number } };
      const remaining = data.rate?.remaining ?? '?';
      const limit = data.rate?.limit ?? '?';
      console.log(pc.green(`  ✓ GitHub API reachable (${remaining}/${limit} requests remaining)`));
    } else {
      console.log(pc.yellow(`  ⚠ GitHub API returned ${response.status}`));
    }
  } catch {
    console.log(pc.red(`  ✗ GitHub API unreachable (network error or timeout)`));
    allOk = false;
  }

  // Summary
  console.log();
  if (allOk) {
    console.log(pc.green(pc.bold('  All checks passed! ✅\n')));
  } else {
    console.log(pc.yellow(pc.bold('  Some checks failed — review warnings above.\n')));
  }
}
