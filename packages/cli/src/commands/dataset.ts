import pc from 'picocolors';
import { getDatasetManifest, getOfficialHallucinations, getCommunityHallucinations, getPopularPackages, getProtectedPackages } from '@slopcheck/datasets';

export async function datasetCommand(subcommand: string) {
  if (subcommand === 'info') {
    await datasetInfo();
  } else if (subcommand === 'verify') {
    await datasetVerify();
  } else {
    console.error(pc.red(`Unknown dataset subcommand: ${subcommand}`));
    console.error(`Available subcommands: info, verify`);
    process.exitCode = 1;
  }
}

async function datasetInfo() {
  try {
    const manifest = await getDatasetManifest();
    console.log(pc.bold('\n📊 Slopcheck Dataset Information\n'));
    console.log(`Version: ${pc.cyan(manifest.datasetVersion)}`);
    console.log(`Schema: v${manifest.schemaVersion}`);
    console.log(`Generated: ${manifest.generatedAt}\n`);

    for (const [name, info] of Object.entries(manifest.datasets)) {
      console.log(pc.bold(name));
      console.log(`  Version: ${info.version}`);
      console.log(`  Records: ${info.records}`);
      console.log(`  Checksum: ${info.sha256}`);
      console.log();
    }
  } catch (e) {
    console.error(pc.red(`Failed to load dataset manifest: ${e instanceof Error ? e.message : String(e)}`));
    process.exitCode = 1;
  }
}

async function datasetVerify() {
  console.log(pc.bold('\n🔍 Verifying Datasets against Manifest...\n'));
  let allOk = true;

  try {
    const manifest = await getDatasetManifest();
    
    // We can just call the loading functions, which verify the checksums natively
    try {
      await getOfficialHallucinations();
      console.log(pc.green(`✓ official.json - Verified (${manifest.datasets['official']?.sha256})`));
    } catch (e) {
      console.log(pc.red(`✗ official.json - Verification failed: ${e instanceof Error ? e.message : String(e)}`));
      allOk = false;
    }

    try {
      await getCommunityHallucinations();
      console.log(pc.green(`✓ community.json - Verified (${manifest.datasets['community']?.sha256})`));
    } catch (e) {
      console.log(pc.red(`✗ community.json - Verification failed: ${e instanceof Error ? e.message : String(e)}`));
      allOk = false;
    }

    try {
      await getPopularPackages();
      console.log(pc.green(`✓ popular-packages.json - Verified (${manifest.datasets['popular-packages']?.sha256})`));
    } catch (e) {
      console.log(pc.red(`✗ popular-packages.json - Verification failed: ${e instanceof Error ? e.message : String(e)}`));
      allOk = false;
    }

    try {
      await getProtectedPackages();
      console.log(pc.green(`✓ protected.json - Verified (${manifest.datasets['protected']?.sha256})`));
    } catch (e) {
      console.log(pc.red(`✗ protected.json - Verification failed: ${e instanceof Error ? e.message : String(e)}`));
      allOk = false;
    }

  } catch (e) {
    console.log(pc.red(`✗ Failed to load dataset manifest: ${e instanceof Error ? e.message : String(e)}`));
    allOk = false;
  }

  console.log();
  if (allOk) {
    console.log(pc.green(pc.bold('All datasets verified successfully! ✅')));
  } else {
    console.log(pc.red(pc.bold('Dataset verification failed. ❌')));
    process.exitCode = 1;
  }
}
