/**
 * Intent-driven manifest generator — `cleopatraAssetManifestIntent` is the sole authoring source.
 *
 * Runtime `assets/manifest.json` is derived from intent via validate → normalize → type conversion.
 * Do not hand-edit the generated manifest.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { z } from 'zod';
import {
  normalizeSlotAssetManifest,
  validateSlotAssetManifest,
  type SlotAssetManifestIntent,
  type SlotAssetManifestNormalized,
  type SlotAssetManifestNormalizedAsset,
  type SlotAssetManifestValidationIssue,
} from '@fnx/sl-engine';
import { cleopatraAssetManifestIntent } from '../../../src/config/assetManifestIntent.ts';
import { loadBuildConfig } from '../config/buildConfigLoader.ts';
import {
  inferSlotBundleClassification,
  type CostClass,
  type PayloadClass,
} from './manifestIntelligence.ts';
import {
  type PipelineIssue,
  IssueCategory,
  IssueCodes,
  createReport,
} from './pipelineTypes.ts';

const RUNTIME_ASSET_TYPES = ['texture', 'spritesheet', 'spine', 'audio', 'audioSprite', 'json', 'font'] as const;
type RuntimeAssetType = (typeof RUNTIME_ASSET_TYPES)[number];

/**
 * Explicit intent authoring type → runtime loader manifest type.
 * Unknown intent types fail before write (no silent pass-through).
 */
export const INTENT_TO_RUNTIME_ASSET_TYPE: Readonly<Record<string, RuntimeAssetType>> = {
  image: 'texture',
  sprite: 'texture',
  spritesheet: 'spritesheet',
  spine: 'spine',
  audio: 'audio',
  audioSprite: 'audioSprite',
  json: 'json',
  bitmapFont: 'font',
  font: 'font',
  text: 'json',
  binary: 'json',
  video: 'json',
  shader: 'json',
};

export interface RuntimeManifestAsset {
  key: string;
  type: RuntimeAssetType;
  url: string;
  urls?: Record<string, string>;
  meta?: Record<string, unknown>;
}

export interface RuntimeManifestBundle {
  name: string;
  priority: number;
  required: boolean;
  assets: RuntimeManifestAsset[];
  decodeCostClass?: CostClass;
  uploadCostClass?: CostClass;
  payloadClass?: PayloadClass;
  heavy?: boolean;
  estimatedBytes?: number;
  weight?: number;
}

export interface RuntimeManifest {
  version: string;
  baseUrl: string;
  bundles: RuntimeManifestBundle[];
}

const BUNDLE_PRIORITY_BY_ID: Record<string, { priority: number; required: boolean }> = {
  boot: { priority: 0, required: true },
  main: { priority: 1, required: true },
  bonus: { priority: 2, required: false },
  deferred: { priority: 3, required: false },
};

const RuntimeManifestSchema = z.object({
  version: z.string(),
  baseUrl: z.string(),
  bundles: z.array(z.object({
    name: z.string().min(1),
    assets: z.array(z.object({
      key: z.string().min(1),
      type: z.enum(RUNTIME_ASSET_TYPES),
      url: z.string().min(1),
      urls: z.record(z.string(), z.string()).optional(),
      meta: z.record(z.string(), z.unknown()).optional(),
    })),
    priority: z.number().int().min(0),
    required: z.boolean(),
    weight: z.number().int().min(0).optional(),
    estimatedBytes: z.number().min(0).optional(),
    heavy: z.boolean().optional(),
    decodeCostClass: z.enum(['negligible', 'low', 'medium', 'high']).optional(),
    uploadCostClass: z.enum(['negligible', 'low', 'medium', 'high']).optional(),
    payloadClass: z.string().optional(),
  })),
});

function encodeUrlSegments(url: string): string {
  return url.split('/').map((segment) => encodeURIComponent(segment)).join('/');
}

export function convertIntentAssetTypeToRuntime(intentType: string): RuntimeAssetType {
  const runtimeType = INTENT_TO_RUNTIME_ASSET_TYPE[intentType.trim()];
  if (runtimeType == null) {
    throw new Error(
      `Unknown intent asset type "${intentType}". Add an explicit mapping in INTENT_TO_RUNTIME_ASSET_TYPE.`,
    );
  }
  return runtimeType;
}

function resolveAssetUrl(asset: SlotAssetManifestNormalizedAsset): string {
  const { source } = asset;
  if (source.kind === 'path' && source.value != null) {
    return encodeUrlSegments(source.value);
  }
  if (source.kind === 'url' && source.value != null) {
    return source.value;
  }
  if (source.kind === 'src' && source.value != null) {
    return source.value;
  }
  throw new Error(`Asset "${asset.key}" must use path, url, or src (variants not supported for runtime manifest).`);
}

function mapValidationIssuesToPipeline(
  issues: readonly SlotAssetManifestValidationIssue[],
): PipelineIssue[] {
  return issues.map((issue) => ({
    code: issue.code,
    category: IssueCategory.MANIFEST,
    severity: issue.severity,
    message: issue.message,
    file: 'src/config/assetManifestIntent.ts',
    context: { path: issue.path },
  }));
}

function resolveBundlePriority(bundleId: string, preload: boolean): { priority: number; required: boolean } {
  const known = BUNDLE_PRIORITY_BY_ID[bundleId];
  if (known != null) {
    return known;
  }
  return {
    priority: 10,
    required: preload,
  };
}

export function buildRuntimeManifestFromNormalizedIntent(
  normalized: SlotAssetManifestNormalized,
  options: { version: string; baseUrl: string },
): RuntimeManifest {
  const bundles: RuntimeManifestBundle[] = [];

  for (const bundle of normalized.bundles) {
    const bundleAssets: RuntimeManifestAsset[] = [];
    for (const assetKey of bundle.assets) {
      const asset = normalized.assetsByKey[assetKey];
      if (asset == null) {
        throw new Error(`Bundle "${bundle.id}" references missing asset key "${assetKey}".`);
      }
      const runtimeAsset: RuntimeManifestAsset = {
        key: asset.key,
        type: convertIntentAssetTypeToRuntime(asset.type),
        url: resolveAssetUrl(asset),
      };
      if (asset.metadata != null && Object.keys(asset.metadata).length > 0) {
        runtimeAsset.meta = asset.metadata;
      }
      bundleAssets.push(runtimeAsset);
    }

    bundleAssets.sort((a, b) => a.key.localeCompare(b.key));

    const { priority, required } = resolveBundlePriority(bundle.id, bundle.preload);
    const runtimeBundle: RuntimeManifestBundle = {
      name: bundle.id,
      priority,
      required,
      assets: bundleAssets,
    };

    const classification = inferSlotBundleClassification({
      name: runtimeBundle.name,
      assets: runtimeBundle.assets,
    });
    runtimeBundle.payloadClass = classification.payloadClass;
    runtimeBundle.decodeCostClass = classification.decodeCostClass;
    runtimeBundle.uploadCostClass = classification.uploadCostClass;

    bundles.push(runtimeBundle);
  }

  bundles.sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name));

  return {
    version: options.version,
    baseUrl: options.baseUrl,
    bundles,
  };
}

export function serializeRuntimeManifest(manifest: RuntimeManifest): string {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

function validateRuntimeManifestShape(manifest: RuntimeManifest, issues: PipelineIssue[]): boolean {
  const result = RuntimeManifestSchema.safeParse(manifest);
  if (!result.success) {
    for (const issue of result.error.issues) {
      issues.push({
        code: IssueCodes.MANIFEST_SCHEMA_INVALID,
        category: IssueCategory.MANIFEST,
        severity: 'error',
        message: `Generated manifest fails runtime schema: ${issue.path.join('.')}: ${issue.message}`,
      });
    }
    return false;
  }

  const allKeys = new Map<string, string>();
  for (const bundle of manifest.bundles) {
    for (const asset of bundle.assets) {
      if (allKeys.has(asset.key)) {
        issues.push({
          code: IssueCodes.MANIFEST_DUPLICATE_KEY,
          category: IssueCategory.MANIFEST,
          severity: 'error',
          message: `Duplicate key "${asset.key}" in bundle "${bundle.name}" (also in "${allKeys.get(asset.key)}")`,
        });
      }
      allKeys.set(asset.key, bundle.name);
    }
  }

  return issues.filter((issue) => issue.severity === 'error').length === 0;
}

function validateReferencedFilesExist(
  manifest: RuntimeManifest,
  assetsDir: string,
  issues: PipelineIssue[],
): void {
  function urlToFsPath(url: string): string {
    try {
      return path.join(assetsDir, decodeURIComponent(url));
    } catch {
      return path.join(assetsDir, url);
    }
  }

  for (const bundle of manifest.bundles) {
    for (const asset of bundle.assets) {
      const primaryFile = urlToFsPath(asset.url);
      if (!fs.existsSync(primaryFile)) {
        issues.push({
          code: IssueCodes.MANIFEST_MISSING_FILE,
          category: IssueCategory.MANIFEST,
          severity: 'error',
          message: `Missing file for intent asset "${asset.key}": ${asset.url}`,
          file: asset.url,
        });
      }
      if (asset.urls != null) {
        for (const [label, url] of Object.entries(asset.urls)) {
          if (!fs.existsSync(urlToFsPath(url))) {
            issues.push({
              code: IssueCodes.MANIFEST_MISSING_FILE,
              category: IssueCategory.MANIFEST,
              severity: 'error',
              message: `Missing ${label} file for intent asset "${asset.key}": ${url}`,
              file: url,
            });
          }
        }
      }
    }
  }
}

export interface GenerateManifestFromIntentOptions {
  rootDir?: string;
  manifestIntent?: SlotAssetManifestIntent;
}

export function generateManifestFromIntent(
  options: GenerateManifestFromIntentOptions = {},
): { manifest: RuntimeManifest; report: ReturnType<typeof createReport> } {
  const issues: PipelineIssue[] = [];
  const { config, rootDir: projectRoot } = loadBuildConfig(options.rootDir);
  const manifestIntent = options.manifestIntent ?? cleopatraAssetManifestIntent;
  const assetsDir = path.join(projectRoot, 'assets');

  const validation = validateSlotAssetManifest(manifestIntent);
  issues.push(...mapValidationIssuesToPipeline(validation.errors));
  issues.push(...mapValidationIssuesToPipeline(validation.warnings));

  if (!validation.valid) {
    const report = createReport('manifest:generate', issues);
    return {
      manifest: { version: config.game.version, baseUrl: config.assets.baseUrl, bundles: [] },
      report,
    };
  }

  let normalized: SlotAssetManifestNormalized;
  try {
    normalized = normalizeSlotAssetManifest(manifestIntent);
  } catch (error) {
    issues.push({
      code: IssueCodes.MANIFEST_SCHEMA_INVALID,
      category: IssueCategory.MANIFEST,
      severity: 'error',
      message: error instanceof Error ? error.message : String(error),
      file: 'src/config/assetManifestIntent.ts',
    });
    const report = createReport('manifest:generate', issues);
    return {
      manifest: { version: config.game.version, baseUrl: config.assets.baseUrl, bundles: [] },
      report,
    };
  }

  const manifest = buildRuntimeManifestFromNormalizedIntent(normalized, {
    version: config.game.version,
    baseUrl: config.assets.baseUrl,
  });

  validateRuntimeManifestShape(manifest, issues);
  validateReferencedFilesExist(manifest, assetsDir, issues);

  const totalAssets = manifest.bundles.reduce((count, bundle) => count + bundle.assets.length, 0);
  const report = createReport('manifest:generate', issues, {
    assetCount: totalAssets,
    bundleCount: manifest.bundles.length,
    source: 'assetManifestIntent',
    bundles: manifest.bundles.map((bundle) => ({ name: bundle.name, assets: bundle.assets.length })),
  });

  return { manifest, report };
}

/** @deprecated Use generateManifestFromIntent — kept for pipeline import stability. */
export function generateManifest(rootDir?: string): ReturnType<typeof generateManifestFromIntent> {
  return generateManifestFromIntent({ rootDir });
}

export function collectRuntimeManifestAssetKeys(manifest: RuntimeManifest): Set<string> {
  const keys = new Set<string>();
  for (const bundle of manifest.bundles) {
    for (const asset of bundle.assets) {
      keys.add(asset.key);
    }
  }
  return keys;
}

export function checkManifestIntentDrift(
  projectRoot: string,
  options: { manifestIntent?: SlotAssetManifestIntent } = {},
): PipelineIssue[] {
  const issues: PipelineIssue[] = [];
  const { config } = loadBuildConfig(projectRoot);
  const manifestPath = path.join(projectRoot, config.assets.manifestPath);

  const { manifest: expected, report: generationReport } = generateManifestFromIntent({
    rootDir: projectRoot,
    manifestIntent: options.manifestIntent,
  });

  const generationErrors = generationReport.issues.filter((issue) => issue.severity === 'error');
  if (generationErrors.length > 0) {
    issues.push(...generationErrors);
    return issues;
  }

  if (!fs.existsSync(manifestPath)) {
    issues.push({
      code: IssueCodes.MANIFEST_MISSING,
      category: IssueCategory.MANIFEST,
      severity: 'error',
      message: 'Manifest not found — run: pnpm assets',
      file: manifestPath,
    });
    return issues;
  }

  let raw: string;
  try {
    raw = fs.readFileSync(manifestPath, 'utf-8');
  } catch (error) {
    issues.push({
      code: IssueCodes.MANIFEST_INVALID_JSON,
      category: IssueCategory.MANIFEST,
      severity: 'error',
      message: `Cannot read manifest: ${error instanceof Error ? error.message : String(error)}`,
      file: manifestPath,
    });
    return issues;
  }

  const expectedSerialized = serializeRuntimeManifest(expected);
  if (raw !== expectedSerialized) {
    issues.push({
      code: IssueCodes.MANIFEST_STALE,
      category: IssueCategory.MANIFEST,
      severity: 'error',
      message: `${config.assets.manifestPath} is out of date with asset manifest intent — run: pnpm assets`,
      file: manifestPath,
      context: {
        expectedAssetCount: collectRuntimeManifestAssetKeys(expected).size,
      },
    });
  }

  return issues;
}
