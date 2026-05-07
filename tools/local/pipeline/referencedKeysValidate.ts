/**
 * Referenced Keys Validation — Ensures asset keys used in runtime config exist in manifest.
 *
 * Supported surfaces:
 * - slotConfig.symbols[].spriteKey
 * - audioConfig.REFERENCED_AUDIO_ASSET_KEYS
 */

import * as fs from 'fs';
import * as path from 'path';
import { loadBuildConfig } from '../config/buildConfigLoader.ts';
import { extractAudioConfigReferencedKeys } from '../runtime-surfaces/audioConfigSurface.ts';
import { extractSlotConfigSpriteKeys } from '../runtime-surfaces/slotConfigSurface.ts';
import { extractTemplateConfigAssetKeys } from '../runtime-surfaces/templateGameConfigSurface.ts';
import {
  type PipelineIssue,
  IssueCategory,
  IssueCodes,
  createReport,
} from './pipelineTypes.ts';

interface ReferencedSurface {
  file: string;
  sourceLabel: string;
  extract(projectRoot: string): Set<string>;
}

export const AUDIO_REFERENCED_KEY_SURFACE: ReferencedSurface = {
  file: 'src/config/audioConfig.ts',
  sourceLabel: 'audioConfig.REFERENCED_AUDIO_ASSET_KEYS',
  extract(projectRoot: string): Set<string> {
    return extractAudioConfigReferencedKeys(projectRoot);
  },
};

const SLOT_REFERENCED_KEY_SURFACE: ReferencedSurface = {
  file: 'src/config/slotConfig.ts',
  sourceLabel: 'slotConfig.symbols[].spriteKey',
  extract(projectRoot: string): Set<string> {
    return extractSlotConfigSpriteKeys(projectRoot);
  },
};

const TEMPLATE_CONFIG_REFERENCED_KEY_SURFACE: ReferencedSurface = {
  file: 'src/config/templateGameConfig.ts',
  sourceLabel: 'templateGameConfig scene asset keys',
  extract(projectRoot: string): Set<string> {
    return extractTemplateConfigAssetKeys(projectRoot);
  },
};

function getManifestKeys(manifestPath: string): Set<string> {
  if (!fs.existsSync(manifestPath)) return new Set();

  const raw = fs.readFileSync(manifestPath, 'utf-8');
  let manifest: { bundles?: Array<{ assets?: Array<{ key?: string }> }> };
  try {
    manifest = JSON.parse(raw);
  } catch {
    return new Set();
  }

  const keys = new Set<string>();
  for (const bundle of manifest.bundles ?? []) {
    for (const asset of bundle.assets ?? []) {
      if (asset.key) keys.add(asset.key);
    }
  }

  return keys;
}

export function validateReferencedKeys(rootDir?: string): ReturnType<typeof createReport> {
  const issues: PipelineIssue[] = [];
  const { config, rootDir: projectRoot } = loadBuildConfig(rootDir);
  const supportedSurfaces: ReferencedSurface[] = [
    SLOT_REFERENCED_KEY_SURFACE,
    TEMPLATE_CONFIG_REFERENCED_KEY_SURFACE,
    AUDIO_REFERENCED_KEY_SURFACE,
  ];
  const manifestPath = path.join(projectRoot, config.assets.manifestPath);

  if (!fs.existsSync(manifestPath)) {
    return createReport('referenced-keys:validate', [], {
      skipped: true,
      reason: 'Manifest not found',
    });
  }

  const manifestKeys = getManifestKeys(manifestPath);
  let totalReferenced = 0;

  for (const surface of supportedSurfaces) {
    const keys = surface.extract(projectRoot);
    totalReferenced += keys.size;

    for (const key of keys) {
      if (!manifestKeys.has(key)) {
        issues.push({
          code: IssueCodes.REFERENCED_KEY_MISSING,
          category: IssueCategory.REFERENCED,
          severity: 'error',
          message: `Referenced asset key "${key}" (${surface.sourceLabel}) not found in manifest`,
          file: surface.file,
          context: { key, source: surface.sourceLabel },
        });
      }
    }
  }

  return createReport('referenced-keys:validate', issues, {
    referencedCount: totalReferenced,
    missingCount: issues.length,
    supportedSurfaces: supportedSurfaces.map((surface) => surface.sourceLabel),
  });
}
