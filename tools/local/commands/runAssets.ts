import { runAssetPipeline, type RunAssetPipelineOptions } from '../pipeline/pipeline.ts';
import { printReport } from '../pipeline/pipelineTypes.ts';

export interface RunAssetsCommandOptions extends RunAssetPipelineOptions {
  logger?: Pick<Console, 'log'>;
}

export async function runAssets(options: RunAssetsCommandOptions = {}): Promise<{ success: boolean }> {
  const logger = options.logger ?? console;

  logger.log('SL-Engine Asset Pipeline\n');
  logger.log('='.repeat(60));

  const { overall, steps } = await runAssetPipeline(options);

  for (const step of steps) {
    const icon = step.passed ? '✓' : '✗';
    const suffix = step.summary.errors > 0
      ? ` (${step.summary.errors} errors)`
      : step.summary.warnings > 0
        ? ` (${step.summary.warnings} warnings)`
        : '';
    logger.log(`  ${icon} ${step.tool}${suffix}`);
  }

  logger.log(`\n${'='.repeat(60)}`);

  if (overall.issues.length > 0) {
    logger.log('');
    printReport(overall);
  }

  if (options.writeReports) {
    logger.log('\n  Reports written to generated/');
  }

  if (!overall.passed) {
    logger.log('\n  Pipeline completed with errors.\n');
    return { success: false };
  }

  logger.log('\n  Pipeline completed successfully.\n');
  return { success: true };
}
