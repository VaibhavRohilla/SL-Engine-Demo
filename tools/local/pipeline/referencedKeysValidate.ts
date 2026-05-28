/**
 * Referenced Keys Validation — Ensures asset keys used in runtime config exist in manifest.
 *
 * Symbol sprite keys are owned by `templateIntentValidate` (intent + composed slotConfig).
 * This validator covers template scene surfaces and audio only.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { loadBuildConfig } from '../config/buildConfigLoader.ts';
import { getCleopatraReferencedAudioKeys } from '../../../src/config/audioConfig.ts';
import { extractTemplateConfigAssetKeys } from '../runtime-surfaces/templateGameConfigSurface.ts';
import { readGeneratedManifestKeys } from './manifestKeys.ts';
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
  sourceLabel: 'audioConfig.cleopatraSfxManifestAssets',
  extract(_projectRoot: string): Set<string> {
    return new Set(getCleopatraReferencedAudioKeys());
  },
};

const TEMPLATE_CONFIG_REFERENCED_KEY_SURFACE: ReferencedSurface = {
  file: 'src/config/templateGameConfig.ts',
  sourceLabel: 'templateGameConfig scene asset keys',
  extract(projectRoot: string): Set<string> {
    return extractTemplateConfigAssetKeys(projectRoot);
  },
};

const SUPPORTED_SURFACES: ReferencedSurface[] = [
  TEMPLATE_CONFIG_REFERENCED_KEY_SURFACE,
  AUDIO_REFERENCED_KEY_SURFACE,
];

export function validateReferencedKeys(rootDir?: string): ReturnType<typeof createReport> {
  const issues: PipelineIssue[] = [];
  const { config, rootDir: projectRoot } = loadBuildConfig(rootDir);
  const manifestPath = path.join(projectRoot, config.assets.manifestPath);

  if (!fs.existsSync(manifestPath)) {
    return createReport('referenced-keys:validate', [], {
      skipped: true,
      reason: 'Manifest not found',
    });
  }

  const manifestKeys = readGeneratedManifestKeys(manifestPath);
  let totalReferenced = 0;

  for (const surface of SUPPORTED_SURFACES) {
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
    supportedSurfaces: SUPPORTED_SURFACES.map((surface) => surface.sourceLabel),
  });
}
