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
import { REFERENCED_AUDIO_ASSET_KEYS } from '../src/config/audioConfig.ts';
import { extractAudioConfigReferencedKeys } from './local/runtime-surfaces/audioConfigSurface.ts';
import {
  buildRuntimeManifestFromNormalizedIntent,
  checkManifestIntentDrift,
  convertIntentAssetTypeToRuntime,
  generateManifestFromIntent,
  INTENT_TO_RUNTIME_ASSET_TYPE,
  serializeRuntimeManifest,
  writeManifestFromIntent,
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
  const { manifest: generatedManifest, report } = generateManifestFromIntent({ rootDir: projectRoot });
  if (generatedManifest == null || !report.passed) {
    const messages = report.issues
      .filter((issue) => issue.severity === 'error')
      .map((issue) => issue.message)
      .join('; ');
    throw new Error(`valid intent must produce a manifest: ${messages}`);
  }
  const manifest = generatedManifest;

  const assetKeys = new Set<string>();
  for (const bundle of manifest.bundles) {
    for (const asset of bundle.assets) {
      assetKeys.add(asset.key);
    }
  }
  const expectedManifestKeyCount = cleopatraAssetManifestIntent.assets.length;
  assert(
    assetKeys.size === expectedManifestKeyCount,
    `expected ${expectedManifestKeyCount} manifest keys, got ${assetKeys.size}`,
  );

  const intentKeys = new Set<string>(cleopatraAssetManifestIntent.assets.map((asset) => asset.key));
  for (const audioKey of REFERENCED_AUDIO_ASSET_KEYS) {
    assert(intentKeys.has(audioKey), `referenced audio key "${audioKey}" missing from cleopatraAssetManifestIntent`);
    assert(assetKeys.has(audioKey), `referenced audio key "${audioKey}" missing from generated manifest`);
  }

  const extractedAudioKeys = extractAudioConfigReferencedKeys(projectRoot);
  for (const audioKey of extractedAudioKeys) {
    assert(intentKeys.has(audioKey), `audioConfig key "${audioKey}" missing from cleopatraAssetManifestIntent`);
    assert(assetKeys.has(audioKey), `audioConfig key "${audioKey}" missing from generated manifest`);
  }

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

  const ambiguousSourceIntent = defineSlotAssetManifest({
    assets: [{ key: 'ambig', type: 'image', path: 'Background.png', url: 'https://example.com/bg.png' }],
  });
  const ambiguousSourceResult = validateSlotAssetManifest(ambiguousSourceIntent);
  assert(
    ambiguousSourceResult.errors.some((issue) => issue.code === 'TEMPLATE_ASSET_AMBIGUOUS_SOURCE'),
    'ambiguous source must fail validation before write',
  );

  let unknownRuntimeConversionFailed = false;
  try {
    convertIntentAssetTypeToRuntime('not-a-real-type');
  } catch {
    unknownRuntimeConversionFailed = true;
  }
  assert(unknownRuntimeConversionFailed, 'unknown runtime conversion must throw');

  const failedGeneration = generateManifestFromIntent({
    rootDir: projectRoot,
    manifestIntent: duplicateIntent,
  });
  assert(failedGeneration.manifest == null, 'failed generation must not return a manifest object');
  assert(!failedGeneration.report.passed, 'failed generation report must not pass');

  const committedBeforeFailedWrite = fs.readFileSync(manifestPath, 'utf-8');
  const failedWrite = writeManifestFromIntent({
    rootDir: projectRoot,
    manifestIntent: duplicateIntent,
  });
  assert(!failedWrite.written, 'failed generation must not write manifest to disk');
  assert(failedWrite.manifest == null, 'failed write must not return manifest');
  assert(
    fs.readFileSync(manifestPath, 'utf-8') === committedBeforeFailedWrite,
    'failed generation must not mutate committed manifest on disk',
  );

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
