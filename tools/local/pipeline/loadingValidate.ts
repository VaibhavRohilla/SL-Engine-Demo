/**
 * Loading Validation — Validates the load plan against build-config and manifest.
 *
 * Checks that Wave 1 bundle groups in build-config.json
 * is consistent with the generated manifest. Also detects manifest bundles
 * that are unreferenced in the load plan (potential configuration drift).
 *
 * This is a lightweight pre-flight check; the SDK performs full adaptive
 * load plan validation at runtime.
 */

import * as fs from 'fs';
import { loadBuildConfig, resolveAssetPath } from '../config/buildConfigLoader.ts';
import {
  type PipelineIssue,
  IssueCategory,
  IssueCodes,
  createReport,
} from './pipelineTypes.ts';
import { analyzeManifestIntelligence } from './manifestIntelligence.ts';
import { loadBootBundleGroups } from '../runtime-surfaces/bootConfigSurface.ts';

export function validateLoading(rootDir?: string): ReturnType<typeof createReport> {
  const issues: PipelineIssue[] = [];
  const { config, rootDir: projectRoot } = loadBuildConfig(rootDir);
  const bootBundles = loadBootBundleGroups(projectRoot);
  const manifestPath = resolveAssetPath(config.assets.manifestPath, projectRoot);

  if (!fs.existsSync(manifestPath)) {
    issues.push({
      code: IssueCodes.MANIFEST_MISSING,
      category: IssueCategory.MANIFEST,
      severity: 'error',
      message: 'Manifest not found — run: pnpm assets',
      file: manifestPath,
    });
    return createReport('loading:validate', issues);
  }

  let manifest: { bundles: Array<{ name: string; assets: unknown[] }> };
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  } catch (e) {
    issues.push({
      code: IssueCodes.MANIFEST_INVALID_JSON,
      category: IssueCategory.MANIFEST,
      severity: 'error',
      message: `Invalid manifest JSON: ${e}`,
      file: manifestPath,
    });
    return createReport('loading:validate', issues);
  }

  const manifestBundleNames = new Set(manifest.bundles.map(b => b.name));
  const startSceneBundles = config.boot.startSceneBundles;
  const configuredBundles = [
    ...bootBundles.bootVisualBundles,
    ...startSceneBundles,
    ...bootBundles.postTapCoreBundles,
    ...bootBundles.firstSpinBundles,
    ...bootBundles.deferredBundles,
  ];

  for (const name of configuredBundles) {
    if (!manifestBundleNames.has(name)) {
      issues.push({
        code: IssueCodes.LOADING_BUNDLE_NOT_IN_MANIFEST,
        category: IssueCategory.LOADING,
        severity: 'error',
        message: `Bundle "${name}" not found in manifest`,
        context: { bundleName: name },
      });
    }
  }

  if (startSceneBundles.length === 0) {
    issues.push({
      code: IssueCodes.LOADING_NO_PLAYABLE,
      category: IssueCategory.LOADING,
      severity: 'error',
      message: 'No startSceneBundles configured — game cannot show start screen',
    });
  }

  for (const bundle of manifest.bundles) {
    if (!configuredBundles.includes(bundle.name)) {
      issues.push({
        code: IssueCodes.LOADING_UNREFERENCED_BUNDLE,
        category: IssueCategory.LOADING,
        severity: 'advisory',
        message: `Bundle "${bundle.name}" in manifest but not referenced by any boot group`,
        context: { bundleName: bundle.name },
      });
    }
  }

  const intelligence = analyzeManifestIntelligence(projectRoot);
  issues.push(...intelligence.issues);

  return createReport('loading:validate', issues, {
    manifestBundles: [...manifestBundleNames],
    bootVisualBundles: [...bootBundles.bootVisualBundles],
    startSceneBundles: [...startSceneBundles],
    postTapCoreBundles: [...bootBundles.postTapCoreBundles],
    firstSpinBundles: [...bootBundles.firstSpinBundles],
    deferredBundles: [...bootBundles.deferredBundles],
    classificationInferred: intelligence.metadata?.inferredCount ?? 0,
    classificationExplicit: intelligence.metadata?.explicitCount ?? 0,
  });
}
