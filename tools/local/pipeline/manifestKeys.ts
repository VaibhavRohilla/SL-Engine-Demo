/**
 * Shared helpers for reading generated `assets/manifest.json` asset keys.
 */

import * as fs from 'node:fs';

export function readGeneratedManifestKeys(manifestPath: string): Set<string> {
  if (!fs.existsSync(manifestPath)) return new Set();

  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as {
      bundles?: Array<{ assets?: Array<{ key?: string }> }>;
    };
    const keys = new Set<string>();
    for (const bundle of manifest.bundles ?? []) {
      for (const asset of bundle.assets ?? []) {
        if (typeof asset.key === 'string' && asset.key.length > 0) {
          keys.add(asset.key);
        }
      }
    }
    return keys;
  } catch {
    return new Set();
  }
}
