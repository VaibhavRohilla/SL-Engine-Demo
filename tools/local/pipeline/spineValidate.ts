/**
 * Spine Asset Validator — Validates spine animation asset integrity.
 *
 * Checks that each spine asset in assets/spine/ has the required files:
 * skeleton (.json or .skel), atlas, and referenced textures.
 */

import * as fs from 'fs';
import * as path from 'path';
import { loadBuildConfig } from '../config/buildConfigLoader.ts';
import { STARTER_CONVENTIONS } from '../constants/conventions.ts';
import {
  type PipelineIssue,
  IssueCategory,
  IssueCodes,
  createReport,
} from './pipelineTypes.ts';

interface SpineAsset {
  name: string;
  skeleton: string | null;
  atlas: string | null;
  textures: string[];
  valid: boolean;
}

function validateSpineSet(dir: string, name: string, issues: PipelineIssue[], relPrefix: string): SpineAsset {
  const asset: SpineAsset = { name, skeleton: null, atlas: null, textures: [], valid: true };
  const relName = relPrefix ? `${relPrefix}/${name}` : name;

  const skelJson = path.join(dir, `${name}.json`);
  const skelBinary = path.join(dir, `${name}.skel`);

  if (fs.existsSync(skelJson)) {
    asset.skeleton = `${name}.json`;
    try {
      const data = JSON.parse(fs.readFileSync(skelJson, 'utf-8'));
      if (!data.bones) {
        asset.valid = false;
        issues.push({
          code: IssueCodes.SPINE_INVALID_SKELETON,
          category: IssueCategory.SPINE,
          severity: 'error',
          message: `Invalid skeleton JSON: missing "bones" property`,
          file: relName,
        });
      }
    } catch (e) {
      asset.valid = false;
      issues.push({
        code: IssueCodes.SPINE_INVALID_SKELETON,
        category: IssueCategory.SPINE,
        severity: 'error',
        message: `Failed to parse skeleton JSON: ${e}`,
        file: relName,
      });
    }
  } else if (fs.existsSync(skelBinary)) {
    asset.skeleton = `${name}.skel`;
  } else {
    asset.valid = false;
    issues.push({
      code: IssueCodes.SPINE_MISSING_SKELETON,
      category: IssueCategory.SPINE,
      severity: 'error',
      message: `Missing skeleton: need ${name}.json or ${name}.skel`,
      file: relName,
    });
  }

  const atlasFile = path.join(dir, `${name}.atlas`);
  if (fs.existsSync(atlasFile)) {
    asset.atlas = `${name}.atlas`;
    const atlasContent = fs.readFileSync(atlasFile, 'utf-8');
    for (const line of atlasContent.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.endsWith('.png') || trimmed.endsWith('.jpg')) {
        const texPath = path.join(dir, trimmed);
        if (fs.existsSync(texPath)) {
          asset.textures.push(trimmed);
        } else {
          asset.valid = false;
          issues.push({
            code: IssueCodes.SPINE_MISSING_TEXTURE,
            category: IssueCategory.SPINE,
            severity: 'error',
            message: `Missing atlas texture: ${trimmed}`,
            file: relName,
          });
        }
      }
    }
  } else {
    asset.valid = false;
    issues.push({
      code: IssueCodes.SPINE_MISSING_ATLAS,
      category: IssueCategory.SPINE,
      severity: 'error',
      message: `Missing atlas: ${name}.atlas`,
      file: relName,
    });
  }

  return asset;
}

export function validateSpine(rootDir?: string): ReturnType<typeof createReport> {
  const issues: PipelineIssue[] = [];
  const { rootDir: projectRoot } = loadBuildConfig(rootDir);
  const spineDir = path.join(projectRoot, STARTER_CONVENTIONS.spineDir);

  if (!fs.existsSync(spineDir)) {
    return createReport('spine:validate', issues, { assetCount: 0 });
  }

  const entries = fs.readdirSync(spineDir, { withFileTypes: true });
  const assets: SpineAsset[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === '__MACOSX') continue;

    if (entry.isDirectory()) {
      assets.push(validateSpineSet(path.join(spineDir, entry.name), entry.name, issues, entry.name));
    } else if (entry.isFile()) {
      if (entry.name.endsWith('.json') || entry.name.endsWith('.skel')) {
        const name = path.basename(entry.name, path.extname(entry.name));
        if (!seen.has(name)) {
          seen.add(name);
          assets.push(validateSpineSet(spineDir, name, issues, ''));
        }
      }
    }
  }

  return createReport('spine:validate', issues, {
    assetCount: assets.length,
    validCount: assets.filter(a => a.valid).length,
  });
}
