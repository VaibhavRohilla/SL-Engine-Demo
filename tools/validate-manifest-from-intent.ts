/**
 * Deterministic proof script for Cleopatra intent → runtime manifest generation (Phase 9).
 * Run: pnpm validate:manifest-intent
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  defineSlotAssetManifest,
  normalizeSlotAssetManifest,
  validateSlotAssetManifest,
} from '@fnx/sl-engine';
import { cleopatraAssetManifestIntent } from '../src/config/assetManifestIntent.ts';
import {
  buildRuntimeManifestFromNormalizedIntent,
  checkManifestIntentDrift,
  convertIntentAssetTypeToRuntime,
  generateManifestFromIntent,
  INTENT_TO_RUNTIME_ASSET_TYPE,
  serializeRuntimeManifest,
} from './local/pipeline/manifestFromIntent.ts';
import { resolveProjectRoot } from './local/utils/paths.ts';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function main(): void {
  const projectRoot = resolveProjectRoot();
  const manifestPath = path.join(projectRoot, 'assets/manifest.json');

  const validation = validateSlotAssetManifest(cleopatraAssetManifestIntent);
  assert(validation.valid, `cleopatra intent invalid: ${validation.errors.map((e) => e.code).join(', ')}`);

  const normalized = normalizeSlotAssetManifest(cleopatraAssetManifestIntent);
  const { manifest, report } = generateManifestFromIntent({ rootDir: projectRoot });
  const errors = report.issues.filter((issue) => issue.severity === 'error');
  assert(errors.length === 0, `generation errors: ${errors.map((e) => e.message).join('; ')}`);

  const assetKeys = new Set<string>();
  for (const bundle of manifest.bundles) {
    for (const asset of bundle.assets) {
      assetKeys.add(asset.key);
    }
  }
  assert(assetKeys.size === 23, `expected 23 manifest keys, got ${assetKeys.size}`);

  assert(convertIntentAssetTypeToRuntime('image') === 'texture', 'image → texture');
  assert(convertIntentAssetTypeToRuntime('spritesheet') === 'spritesheet', 'spritesheet unchanged');
  assert(INTENT_TO_RUNTIME_ASSET_TYPE.image === 'texture', 'conversion table documents image → texture');

  const duplicateIntent = defineSlotAssetManifest({
    assets: [
      { key: 'dup', type: 'image', path: 'Background.png' },
      { key: 'dup', type: 'image', path: 'Vase.png' },
    ],
  });
  const duplicateResult = validateSlotAssetManifest(duplicateIntent);
  assert(
    duplicateResult.errors.some((issue) => issue.code === 'TEMPLATE_ASSET_DUPLICATE_KEY'),
    'duplicate intent key must fail validation before write',
  );

  const unknownTypeIntent = defineSlotAssetManifest({
    assets: [{ key: 'x', type: 'not-a-real-type', path: 'Background.png' }],
  });
  const unknownTypeResult = validateSlotAssetManifest(unknownTypeIntent);
  assert(
    unknownTypeResult.errors.some((issue) => issue.code === 'TEMPLATE_ASSET_UNKNOWN_TYPE'),
    'unknown intent type must fail validation before write',
  );

  const missingSourceIntent = defineSlotAssetManifest({
    assets: [{ key: 'no-src', type: 'image' }],
  });
  const missingSourceResult = validateSlotAssetManifest(missingSourceIntent);
  assert(
    missingSourceResult.errors.some((issue) => issue.code === 'TEMPLATE_ASSET_MISSING_SOURCE'),
    'missing source must fail validation before write',
  );

  let unknownRuntimeConversionFailed = false;
  try {
    convertIntentAssetTypeToRuntime('not-a-real-type');
  } catch {
    unknownRuntimeConversionFailed = true;
  }
  assert(unknownRuntimeConversionFailed, 'unknown runtime conversion must throw');

  const serializedOnce = serializeRuntimeManifest(manifest);
  const serializedTwice = serializeRuntimeManifest(
    buildRuntimeManifestFromNormalizedIntent(normalized, {
      version: manifest.version,
      baseUrl: manifest.baseUrl,
    }),
  );
  assert(serializedOnce === serializedTwice, 'manifest JSON output must be stable across serializations');

  assert(fs.existsSync(manifestPath), 'committed assets/manifest.json must exist');
  const committed = fs.readFileSync(manifestPath, 'utf-8');
  assert(
    committed === serializedOnce,
    'committed manifest must equal intent-generated output — run pnpm assets',
  );

  const driftIssues = checkManifestIntentDrift(projectRoot);
  const driftErrors = driftIssues.filter((issue) => issue.severity === 'error');
  assert(driftErrors.length === 0, `drift check failed: ${driftErrors.map((e) => e.message).join('; ')}`);

  console.log('Cleopatra manifest-from-intent validation: PASS');
  console.log(`  manifest keys: ${assetKeys.size}`);
  console.log(`  bundles: ${manifest.bundles.map((b) => b.name).join(', ')}`);
}

main();
