import pc from 'picocolors';
import { liveCorpus, deterministicCorpus } from './corpus';
import { runBenchmark } from './runner';
import { calculateMetrics } from './metrics';

async function main() {
  const isJson = process.argv.includes('--json');
  const isLive = process.argv.includes('--live');
  const mode = isLive ? 'live' : 'deterministic';
  const targetCorpus = isLive ? liveCorpus : deterministicCorpus;

  if (!isJson) {
    console.log(pc.cyan(`\n🚀 Starting Slopcheck Benchmark Harness (${mode} mode)...`));
    console.log(pc.gray(`Evaluating ${targetCorpus.length} test cases\n`));
  }

  const { results, metrics: perfMetrics } = await runBenchmark(targetCorpus, mode);
  const metrics = calculateMetrics(results);
  const failures = results.filter(r => !r.isMatch);

  if (isJson) {
    console.log(JSON.stringify({
      performance: perfMetrics,
      metrics,
      results,
    }, null, 2));
    return;
  }

  console.log(pc.bold('📊 Benchmark Results'));
  console.log('────────────────────────────────────────');
  
  console.log(pc.bold('\nDetection Accuracy (Is it suspicious?)'));
  console.log(`True Positives (TP):  ${pc.green(metrics.detection.tp)}`);
  console.log(`True Negatives (TN):  ${pc.green(metrics.detection.tn)}`);
  console.log(`False Positives (FP): ${metrics.detection.fp > 0 ? pc.red(metrics.detection.fp) : pc.green(metrics.detection.fp)}`);
  console.log(`False Negatives (FN): ${metrics.detection.fn > 0 ? pc.red(metrics.detection.fn) : pc.green(metrics.detection.fn)}`);
  console.log(`Precision: ${pc.cyan((metrics.detection.precision * 100).toFixed(1) + '%')}`);
  console.log(`Recall:    ${pc.cyan((metrics.detection.recall * 100).toFixed(1) + '%')}`);
  console.log(`F1 Score:  ${pc.cyan((metrics.detection.f1 * 100).toFixed(1) + '%')}`);
  
  console.log(pc.bold('\nSafety Accuracy (Are legitimate packages safe?)'));
  console.log(`Precision: ${pc.cyan((metrics.safe.precision * 100).toFixed(1) + '%')}`);
  console.log(`Recall:    ${pc.cyan((metrics.safe.recall * 100).toFixed(1) + '%')}`);

  console.log(pc.bold('\nSeverity Accuracy (For True Positives)'));
  const totalTp = metrics.detection.tp;
  console.log(`Exact Match:      ${pc.green(metrics.severity.exactMatch)} ${totalTp ? `(${((metrics.severity.exactMatch / totalTp) * 100).toFixed(1)}%)` : ''}`);
  console.log(`Over-Escalation:  ${pc.yellow(metrics.severity.overEscalation)} ${totalTp ? `(${((metrics.severity.overEscalation / totalTp) * 100).toFixed(1)}%)` : ''}`);
  console.log(`Under-Escalation: ${pc.red(metrics.severity.underEscalation)} ${totalTp ? `(${((metrics.severity.underEscalation / totalTp) * 100).toFixed(1)}%)` : ''}`);
  
  console.log(pc.bold('\nSeverity Confusion Matrix'));
  console.log('                 ACTUAL');
  console.log('             SAFE SUSP HIGH CRIT');
  console.log('EXPECTED');
  
  const labels = ['SAFE', 'SUSPICIOUS', 'HIGH', 'CRITICAL'];
  const shortLabels = ['SAFE', 'SUSP', 'HIGH', 'CRIT'];
  for (let i = 0; i < labels.length; i++) {
    const rowLabel = (shortLabels[i] as string).padEnd(12, ' ');
    const expected = labels[i] as string;
    const safeCount = (metrics.confusionMatrix[expected]?.['SAFE'] ?? 0).toString().padStart(4, ' ');
    const suspCount = (metrics.confusionMatrix[expected]?.['SUSPICIOUS'] ?? 0).toString().padStart(4, ' ');
    const highCount = (metrics.confusionMatrix[expected]?.['HIGH'] ?? 0).toString().padStart(4, ' ');
    const critCount = (metrics.confusionMatrix[expected]?.['CRITICAL'] ?? 0).toString().padStart(4, ' ');
    
    console.log(`${rowLabel} ${safeCount} ${suspCount} ${highCount} ${critCount}`);
  }

  console.log('\n' + pc.bold('⏱️ Performance Metrics'));
  console.log('────────────────────────────────────────');
  console.log(`Total Duration:   ${pc.yellow((perfMetrics.durationMs).toFixed(0) + 'ms')} (avg ${(perfMetrics.durationMs / targetCorpus.length).toFixed(1)}ms/pkg)`);
  console.log(`Registry API:     ${pc.yellow(perfMetrics.registryRequests)} requests`);
  console.log(`GitHub API:       ${pc.yellow(perfMetrics.githubRequests)} requests`);
  console.log(`Cache Hits:       ${pc.green(perfMetrics.cacheHits)}`);
  console.log(`Cache Misses:     ${pc.yellow(perfMetrics.cacheMisses)}`);

  if (failures.length > 0) {
    console.log('\n' + pc.bold(pc.red('❌ Failing Test Cases')));
    console.log('────────────────────────────────────────');
    for (const f of failures) {
      console.log(`📦 ${pc.bold(f.package)}`);
      console.log(`   Expected: ${f.expectedBehavior}`);
      console.log(`   Actual:   ${f.actualLevel} (Score: ${f.score})`);
      console.log(`   Source:   ${f.source} (${f.sourceType})`);
      console.log(`   Rationale: ${f.rationale}\n`);
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
