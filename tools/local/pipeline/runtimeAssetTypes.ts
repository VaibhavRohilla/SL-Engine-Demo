/**
 * Runtime manifest asset types — single source for pipeline validators and DX generation.
 * Must stay aligned with engine `ManifestSchema` / `ManifestProvider` accepted `type` values.
 */

export const RUNTIME_MANIFEST_ASSET_TYPES = [
  'texture',
  'spritesheet',
  'spine',
  'audio',
  'audioSprite',
  'json',
  'font',
] as const;

export type RuntimeManifestAssetType = (typeof RUNTIME_MANIFEST_ASSET_TYPES)[number];

/** Union literal for generated `src/Asset.d.ts` (`export type AssetType = ...`). */
export const RUNTIME_MANIFEST_ASSET_TYPE_UNION = RUNTIME_MANIFEST_ASSET_TYPES.map(
  (type) => `'${type}'`,
).join(' | ');
