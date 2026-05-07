import * as fs from 'fs';
import { loadBuildConfig, resolveAssetPath } from '../config/buildConfigLoader.ts';
import {
  type PipelineIssue,
  IssueCategory,
  IssueCodes,
  createReport,
} from './pipelineTypes.ts';
 
export type CostClass = 'negligible' | 'low' | 'medium' | 'high';
export type PayloadClass =
  | 'reelsSymbolCore'
  | 'hudCoreUI'
  | 'startSceneShell'
  | 'brandedShellArt'
  | 'bonusFeatureArt'
  | 'winPresentationVfx'
  | 'audioCore'
  | 'audioRich'
  | 'optionalPromoDecor'
  | 'recoveryCritical'
  | 'unclassified';

type ManifestBundle = {
  name: string;
  assets: Array<{ type: string }>;
  decodeCostClass?: CostClass;
  uploadCostClass?: CostClass;
  payloadClass?: PayloadClass;
  heavy?: boolean;
  estimatedBytes?: number;
};

export interface SlotBundleClassification {
  payloadClass: PayloadClass;
  decodeCostClass: CostClass;
  uploadCostClass: CostClass;
}

/**
 * Local starter-side fallback classifier for manifest intelligence.
 * This keeps tooling stable even when SDK helper exports vary by package build.
 */
export function inferSlotBundleClassification(input: {
  name: string;
  heavy?: boolean;
  estimatedBytes?: number;
  assets: Array<{ type: string }>;
}): SlotBundleClassification {
  const name = input.name.toLowerCase();
  const hasSpine = input.assets.some((a) => a.type === 'spine');
  const hasTexture = input.assets.some((a) => a.type === 'texture' || a.type === 'spritesheet');
  const hasAudio = input.assets.some((a) => a.type === 'audio' || a.type === 'audioSprite');

  let payloadClass: PayloadClass = 'unclassified';
  if (name.includes('boot') || name.includes('start')) payloadClass = 'startSceneShell';
  else if (name.includes('bonus') || name.includes('feature')) payloadClass = 'bonusFeatureArt';
  else if (hasAudio && !hasTexture && !hasSpine) payloadClass = 'audioCore';
  else if (hasTexture || hasSpine) payloadClass = 'reelsSymbolCore';

  let decodeCostClass: CostClass = 'low';
  if (hasSpine || input.heavy) decodeCostClass = 'high';
  else if (hasTexture) decodeCostClass = 'medium';

  let uploadCostClass: CostClass = 'low';
  const estimatedBytes = input.estimatedBytes ?? 0;
  if (estimatedBytes > 5_000_000 || input.heavy) uploadCostClass = 'high';
  else if (estimatedBytes > 1_000_000 || hasTexture || hasAudio) uploadCostClass = 'medium';

  return { payloadClass, decodeCostClass, uploadCostClass };
}

/** Tooling wrapper: shared inference core + pipeline string typing for reports. */
function inferForTooling(bundle: ManifestBundle): { payloadClass: PayloadClass; decodeCostClass: CostClass; uploadCostClass: CostClass } {
  const core = inferSlotBundleClassification({
    name: bundle.name,
    heavy: bundle.heavy,
    estimatedBytes: bundle.estimatedBytes,
    assets: bundle.assets,
  });
  return {
    payloadClass: core.payloadClass as PayloadClass,
    decodeCostClass: core.decodeCostClass as CostClass,
    uploadCostClass: core.uploadCostClass as CostClass,
  };
}

export function analyzeManifestIntelligence(rootDir?: string): ReturnType<typeof createReport> {
  const issues: PipelineIssue[] = [];
  const { config, rootDir: projectRoot } = loadBuildConfig(rootDir);
  const manifestPath = resolveAssetPath(config.assets.manifestPath, projectRoot);

  if (!fs.existsSync(manifestPath)) {
    issues.push({
      code: IssueCodes.MANIFEST_MISSING,
      category: IssueCategory.MANIFEST,
      severity: 'error',
      message: 'Manifest not found — run: pnpm assets',
      file: manifestPath,
    });
    return createReport('manifest:intelligence', issues);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as { bundles: ManifestBundle[] };
  let inferredCount = 0;
  let explicitCount = 0;
  for (const bundle of manifest.bundles) {
    const guessed = inferForTooling(bundle);
    const explicit = Boolean(bundle.payloadClass && bundle.decodeCostClass && bundle.uploadCostClass);
    if (!explicit) {
      inferredCount++;
      issues.push({
        code: IssueCodes.LOADING_CLASSIFICATION_INFERRED,
        category: IssueCategory.LOADING,
        severity: 'advisory',
        message: `Bundle "${bundle.name}" missing full classification; inferred payload=${guessed.payloadClass} decode=${guessed.decodeCostClass} upload=${guessed.uploadCostClass} (sharedInferenceCore)`,
        context: { bundleName: bundle.name, inferred: guessed, provenance: 'sharedInferenceCore' },
      });
      continue;
    }

    explicitCount++;
    if (
      bundle.uploadCostClass === 'low' &&
      guessed.uploadCostClass === 'high' &&
      bundle.assets.some((a) => a.type === 'texture' || a.type === 'spritesheet')
    ) {
      issues.push({
        code: IssueCodes.LOADING_CLASSIFICATION_SUSPICIOUS,
        category: IssueCategory.LOADING,
        severity: 'warning',
        message: `Bundle "${bundle.name}" declares low upload cost but looks texture-heavy (vs sharedInferenceCore)`,
        context: {
          bundleName: bundle.name,
          explicit: bundle.uploadCostClass,
          inferred: guessed.uploadCostClass,
          provenance: 'sharedInferenceCore',
        },
      });
    }
  }

  return createReport('manifest:intelligence', issues, {
    bundleCount: manifest.bundles.length,
    inferredCount,
    explicitCount,
  });
}
