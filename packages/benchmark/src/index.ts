import pc from 'picocolors';
import { corpus } from './corpus';
import { runBenchmark } from './runner';
import { calculateMetrics, type ConfusionMatrix } from './metrics';

async function main() {
  const isJson = process.argv.includes('--json');

  if (!isJson) {
    console.log(pc.cyan('\n🚀 Starting Slopcheck Benchmark Harness...'));
    console.log(pc.gray(`Evaluating ${corpus.length} test cases\n`));
  }

  const { results, metrics } = await runBenchmark(corpus);

  // Compute metrics
  const matrix: ConfusionMatrix = { tp: 0, fp: 0, fn: 0, tn: 0 };
  const failures: any[] = [];

  for (const res of results) {
    const isExpectedSafe = res.expectedBehavior === 'SAFE';
    const isActualSafe = res.actualLevel === 'SAFE';

    if (isExpectedSafe && isActualSafe) matrix.tn++;
    else if (isExpectedSafe && !isActualSafe) matrix.fp++;
    else if (!isExpectedSafe && !isActualSafe) matrix.tp++;
    else if (!isExpectedSafe && isActualSafe) matrix.fn++;

    if (!res.isMatch) {
      failures.push(res);
    }
  }

  const scores = calculateMetrics(matrix);

  if (isJson) {
    console.log(JSON.stringify({
      metrics,
      confusionMatrix: matrix,
      scores,
      results,
    }, null, 2));
    return;
  }

  console.log(pc.bold('📊 Benchmark Results'));
  console.log('────────────────────────────────────────');
  
  // Format the metrics nicely
  console.log(`True Positives (TP):  ${pc.green(matrix.tp)}`);
  console.log(`True Negatives (TN):  ${pc.green(matrix.tn)}`);
  console.log(`False Positives (FP): ${matrix.fp > 0 ? pc.red(matrix.fp) : pc.green(matrix.fp)}`);
  console.log(`False Negatives (FN): ${matrix.fn > 0 ? pc.red(matrix.fn) : pc.green(matrix.fn)}`);
  
  console.log('\n');
  console.log(`Precision: ${pc.cyan((scores.precision * 100).toFixed(1) + '%')}`);
  console.log(`Recall:    ${pc.cyan((scores.recall * 100).toFixed(1) + '%')}`);
  console.log(`F1 Score:  ${pc.cyan((scores.f1 * 100).toFixed(1) + '%')}`);
  console.log(`Accuracy:  ${pc.cyan((scores.accuracy * 100).toFixed(1) + '%')}`);
  
  console.log('\n' + pc.bold('⏱️ Performance Metrics'));
  console.log('────────────────────────────────────────');
  console.log(`Total Duration:   ${pc.yellow((metrics.durationMs).toFixed(0) + 'ms')} (avg ${(metrics.durationMs / corpus.length).toFixed(1)}ms/pkg)`);
  console.log(`Registry API:     ${pc.yellow(metrics.registryRequests)} requests`);
  console.log(`GitHub API:       ${pc.yellow(metrics.githubRequests)} requests`);
  console.log(`Cache Hits:       ${pc.green(metrics.cacheHits)}`);
  console.log(`Cache Misses:     ${pc.yellow(metrics.cacheMisses)}`);

  if (failures.length > 0) {
    console.log('\n' + pc.bold(pc.red('❌ Failing Test Cases')));
    console.log('────────────────────────────────────────');
    for (const f of failures) {
      console.log(`📦 ${pc.bold(f.package)}`);
      console.log(`   Expected: ${f.expectedBehavior}`);
      console.log(`   Actual:   ${f.actualLevel} (Score: ${f.score})`);
      console.log(`   Notes:    ${f.notes}\n`);
    }
  } else {
    console.log('\n' + pc.green('✅ All test cases match expected behavior!'));
  }
}

main().catch(e => {
  console.error(pc.red('Benchmark failed with error:'));
  console.error(e);
  process.exit(1);
});
