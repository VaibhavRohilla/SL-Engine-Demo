/**
 * Manifest Validator — Contract-based manifest integrity check.
 *
 * Validates assets/manifest.json against the runtime ManifestSchema
 * (same Zod shape used by the engine's ManifestProvider), checks for
 * duplicate keys, verifies referenced files exist on disk, and detects
 * orphaned assets (files on disk not referenced in manifest).
 *
 * Schema alignment: this validator uses the SAME field set as the runtime,
 * including optional fields (weight, estimatedBytes, heavy) so that
 * pipeline and runtime can never silently drift.
 */

import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';
import { loadBuildConfig } from '../config/buildConfigLoader.ts';
import { checkManifestIntentDrift } from './manifestFromIntent.ts';
import {
  type PipelineIssue,
  IssueCategory,
  IssueCodes,
  createReport,
} from './pipelineTypes.ts';

const ASSET_TYPES = ['texture', 'spritesheet', 'spine', 'audio', 'audioSprite', 'json', 'font'] as const;

/**
 * Mirror of runtime ManifestSchema from ManifestTypes.ts.
 * Must stay in sync — if the runtime schema adds fields, add them here.
 */
const AssetSchema = z.object({
  key: z.string().min(1),
  type: z.enum(ASSET_TYPES),
  url: z.string().min(1),
  urls: z.record(z.string(), z.string()).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

const BundleSchema = z.object({
  name: z.string().min(1),
  assets: z.array(AssetSchema),
  priority: z.number().int().min(0).default(0),
  required: z.boolean().default(false),
  weight: z.number().int().min(0).optional(),
  estimatedBytes: z.number().min(0).optional(),
  heavy: z.boolean().optional(),
  decodeCostClass: z.enum(['negligible', 'low', 'medium', 'high']).optional(),
  uploadCostClass: z.enum(['negligible', 'low', 'medium', 'high']).optional(),
  payloadClass: z.string().optional(),
});

const ManifestSchema = z.object({
  version: z.string(),
  baseUrl: z.string(),
  bundles: z.array(BundleSchema),
});

const KNOWN_ASSET_EXTS = new Set([
  '.png', '.jpg', '.jpeg', '.webp', '',
  '.json', '.atlas',
  '.mp3', '.ogg', '.wav', '.webm',
  '.woff', '.woff2', '.ttf', '.otf',
  '.skel',
]);

/** Raster extensions; must stay aligned with manifestGenerate.ts (JSON + same basename → spritesheet). */
const TEXTURE_EXT_ORDER = ['.png', '.jpg', '.jpeg', '.webp', '.avif'] as const;
const TEXTURE_EXT_SET = new Set<string>(TEXTURE_EXT_ORDER);

/** True if this file is a texture sheet image paired with same-name .json (manifest lists JSON only). */
function isSpritesheetRasterCompanion(relativeFile: string, assetsDir: string): boolean {
  const ext = path.extname(relativeFile).toLowerCase();
  if (!TEXTURE_EXT_SET.has(ext)) return false;
  const fullPath = path.join(assetsDir, relativeFile);
  const dir = path.dirname(fullPath);
  const base = path.basename(relativeFile).slice(0, -ext.length);
  return fs.existsSync(path.join(dir, `${base}.json`));
}

function collectDiskAssets(dir: string, basePath: string = ''): Set<string> {
  const files = new Set<string>();
  if (!fs.existsSync(dir)) return files;

  for (const item of fs.readdirSync(dir).sort()) {
    if (item.startsWith('.') || item === '__MACOSX' || item === 'Thumbs.db') continue;
    const fullPath = path.join(dir, item);
    const relativePath = basePath ? `${basePath}/${item}` : item;
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      for (const f of collectDiskAssets(fullPath, relativePath)) {
        files.add(f);
      }
    } else {
      if (item === 'manifest.json') continue;
      const ext = path.extname(item).toLowerCase();
      if (KNOWN_ASSET_EXTS.has(ext)) {
        files.add(relativePath.replace(/\\/g, '/'));
      }
    }
  }

  return files;
}

export function validateManifest(rootDir?: string): ReturnType<typeof createReport> {
  const issues: PipelineIssue[] = [];
  const { config, rootDir: projectRoot } = loadBuildConfig(rootDir);
  const manifestPath = path.join(projectRoot, config.assets.manifestPath);
  const assetsDir = path.join(projectRoot, 'assets');

  issues.push(...checkManifestIntentDrift(projectRoot));

  if (!fs.existsSync(manifestPath)) {
    issues.push({
      code: IssueCodes.MANIFEST_MISSING,
      category: IssueCategory.MANIFEST,
      severity: 'error',
      message: 'Manifest not found — run: pnpm assets',
      file: manifestPath,
    });
    return createReport('manifest:validate', issues);
  }

  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  } catch (e) {
    issues.push({
      code: IssueCodes.MANIFEST_INVALID_JSON,
      category: IssueCategory.MANIFEST,
      severity: 'error',
      message: `Invalid JSON: ${e}`,
      file: manifestPath,
    });
    return createReport('manifest:validate', issues);
  }

  const parseResult = ManifestSchema.safeParse(raw);
  if (!parseResult.success) {
    for (const issue of parseResult.error.issues) {
      issues.push({
        code: IssueCodes.MANIFEST_SCHEMA_INVALID,
        category: IssueCategory.MANIFEST,
        severity: 'error',
        message: `Schema: ${issue.path.join('.')}: ${issue.message}`,
      });
    }
    return createReport('manifest:validate', issues);
  }

  const manifest = parseResult.data;
  const seenKeys = new Map<string, string>();
  const referencedFiles = new Set<string>();
  let assetCount = 0;

  /** Resolve manifest URL to filesystem path (decode for disk; manifest stores encoded URLs). */
  function urlToFsPath(url: string): string {
    try {
      return path.join(assetsDir, decodeURIComponent(url));
    } catch {
      return path.join(assetsDir, url);
    }
  }

  for (const bundle of manifest.bundles) {
    for (const asset of bundle.assets) {
      assetCount++;

      if (seenKeys.has(asset.key)) {
        issues.push({
          code: IssueCodes.MANIFEST_DUPLICATE_KEY,
          category: IssueCategory.MANIFEST,
          severity: 'error',
          message: `Duplicate key "${asset.key}" in bundle "${bundle.name}" (also in "${seenKeys.get(asset.key)}")`,
        });
      }
      seenKeys.set(asset.key, bundle.name);

      const primaryFile = urlToFsPath(asset.url);
      referencedFiles.add(asset.url);
      if (!fs.existsSync(primaryFile)) {
        issues.push({
          code: IssueCodes.MANIFEST_MISSING_FILE,
          category: IssueCategory.MANIFEST,
          severity: 'error',
          message: `Missing file: ${asset.url} (key: "${asset.key}", bundle: "${bundle.name}")`,
          file: asset.url,
        });
      }

      if (asset.urls) {
        for (const [label, url] of Object.entries(asset.urls)) {
          referencedFiles.add(url);
          if (!fs.existsSync(urlToFsPath(url))) {
            issues.push({
              code: IssueCodes.MANIFEST_MISSING_FILE,
              category: IssueCategory.MANIFEST,
              severity: 'error',
              message: `Missing ${label} file: ${url} (key: "${asset.key}", bundle: "${bundle.name}")`,
              file: url,
            });
          }
        }
      }
    }
  }

  const referencedFilesDecoded = new Set<string>();
  for (const url of referencedFiles) {
    try {
      referencedFilesDecoded.add(decodeURIComponent(url));
    } catch {
      referencedFilesDecoded.add(url);
    }
  }

  const diskAssets = collectDiskAssets(assetsDir);
  for (const file of diskAssets) {
    if (referencedFilesDecoded.has(file)) continue;
    if (isSpritesheetRasterCompanion(file, assetsDir)) continue;
    issues.push({
      code: IssueCodes.ASSET_ORPHANED,
      category: IssueCategory.ASSET,
      severity: 'warning',
      message: `Orphaned asset: "${file}" exists on disk but is not in manifest`,
      file,
    });
  }

  return createReport('manifest:validate', issues, {
    bundleCount: manifest.bundles.length,
    assetCount,
    orphanedCount: issues.filter(i => i.code === IssueCodes.ASSET_ORPHANED).length,
  });
}
