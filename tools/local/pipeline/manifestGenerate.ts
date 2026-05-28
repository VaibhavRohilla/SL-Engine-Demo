/**
 * Manifest generation entry — intent is the sole authoring source (see manifestFromIntent.ts).
 *
 * Generated output: assets/manifest.json
 * This file is GENERATED — do not hand-edit.
 */

export {
  generateManifest,
  generateManifestFromIntent,
  buildRuntimeManifestFromNormalizedIntent,
  serializeRuntimeManifest,
  checkManifestIntentDrift,
  collectRuntimeManifestAssetKeys,
  convertIntentAssetTypeToRuntime,
  INTENT_TO_RUNTIME_ASSET_TYPE,
  type RuntimeManifest,
  type RuntimeManifestAsset,
  type RuntimeManifestBundle,
} from './manifestFromIntent.ts';
