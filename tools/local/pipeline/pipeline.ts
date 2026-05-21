/**
 * Asset Pipeline Orchestrator — unified content pipeline implementation.
 */

import * as fs from 'fs';
import * as path from 'path';
import { loadBuildConfig } from '../config/buildConfigLoader.ts';
import { type PipelineReport, createReport, IssueCategory, IssueCodes } from './pipelineTypes.ts';
import { generateManifest } from './manifestGenerate.ts';
import { buildAudioSprites } from './audioSpriteBuild.ts';
import { generateAssetDx } from './assetDxGenerate.ts';
import { validateManifest } from './manifestValidate.ts';
import { validateReferencedKeys } from './referencedKeysValidate.ts';
import { validateAssets } from './assetsValidate.ts';
import { validateSpine } from './spineValidate.ts';
import { validateLoading } from './loadingValidate.ts';

export interface RunAssetPipelineOptions {
  rootDir?: string;
  writeReports?: boolean;
}

export interface RunAssetPipelineResult {
  overall: PipelineReport;
  steps: PipelineReport[];
}

export function runAssetPipeline(options: RunAssetPipelineOptions = {}): RunAssetPipelineResult {
  const steps: PipelineReport[] = [];

  let configPath: string;
  let projectRoot: string;
  let manifestPath: string;

  try {
    const loaded = loadBuildConfig(options.rootDir);
    configPath = loaded.configPath;
    projectRoot = loaded.rootDir;
    manifestPath = path.join(projectRoot, loaded.config.assets.manifestPath);
  } catch (error) {
    const configReport = createReport('config', [{
      code: IssueCodes.CONFIG_INVALID,
      category: IssueCategory.CONFIG,
      severity: 'error',
      message: error instanceof Error ? error.message : String(error),
    }]);
    steps.push(configReport);

    return {
      overall: createReport('pipeline', configReport.issues, { stepsRun: steps.length }),
      steps,
    };
  }

  const audioReport = buildAudioSprites(projectRoot);
  steps.push(audioReport);

  const { manifest, report: manifestGenerationReport } = generateManifest(projectRoot);
  steps.push(manifestGenerationReport);

  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');

  generateAssetDx(projectRoot);

  const manifestValidationReport = validateManifest(projectRoot);
  steps.push(manifestValidationReport);

  const referencedKeysReport = validateReferencedKeys(projectRoot);
  if (!referencedKeysReport.metadata?.skipped) {
    steps.push(referencedKeysReport);
  }

  steps.push(validateAssets(projectRoot));
  steps.push(validateSpine(projectRoot));
  steps.push(validateLoading(projectRoot));

  const allIssues = steps.flatMap((step) => step.issues);
  const overall = createReport('pipeline', allIssues, {
    configPath,
    manifestPath,
    stepsRun: steps.length,
    steps: steps.map((step) => ({
      tool: step.tool,
      passed: step.passed,
      errors: step.summary.errors,
      warnings: step.summary.warnings,
    })),
  });

  if (options.writeReports) {
    const generatedDir = path.join(projectRoot, 'generated');
    fs.mkdirSync(generatedDir, { recursive: true });
    fs.writeFileSync(
      path.join(generatedDir, 'pipeline-report.json'),
      JSON.stringify({ overall, steps }, null, 2) + '\n',
      'utf-8',
    );
  }

  return { overall, steps };
}
