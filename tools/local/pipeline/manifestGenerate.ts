/**
 * Manifest Generator — Canonical asset manifest pipeline.
 *
 * Scans the assets/ directory, classifies files by type, organizes them into
 * bundles by path convention, and writes a manifest.json that is validated
 * against the runtime ManifestSchema contract before output.
 *
 * Generated output: assets/manifest.json
 * This file is GENERATED — do not hand-edit.
 *
 * Contract alignment: output shape matches src/runtime/assets/ManifestTypes.ts
 * exactly (version, baseUrl, bundles with name/assets/priority/required/weight).
 *
 * Key derivation: relative path minus extension, ensuring uniqueness.
 * Determinism: entries sorted alphabetically within each bundle; bundles
 * ordered by priority.
 */

import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';
import type { BuildConfig } from '../config/buildConfigLoader.ts';
import { loadBuildConfig } from '../config/buildConfigLoader.ts';
import { STARTER_CONVENTIONS } from '../constants/conventions.ts';
import {
  type PipelineIssue,
  IssueCategory,
  IssueCodes,
  createReport,
} from './pipelineTypes.ts';
import {
  inferSlotBundleClassification,
  type CostClass,
  type PayloadClass,
} from './manifestIntelligence.ts';
import { type BootBundleGroups, loadBootBundleGroups } from '../runtime-surfaces/bootConfigSurface.ts';

/**
 * Encode path segments for web-safe URLs (spaces and special chars).
 * Slashes are preserved; each segment is encoded so paths work everywhere.
 */
function encodeUrlSegments(url: string): string {
  return url.split('/').map(segment => encodeURIComponent(segment)).join('/');
}

const ASSET_TYPES = ['texture', 'spritesheet', 'spine', 'audio', 'audioSprite', 'json', 'font'] as const;
type AssetType = (typeof ASSET_TYPES)[number];

interface AssetEntry {
  key: string;
  type: AssetType;
  url: string;
  urls?: Record<string, string>;
  meta?: Record<string, unknown>;
}

interface Bundle {
  name: string;
  priority: number;
  required: boolean;
  assets: AssetEntry[];
  decodeCostClass?: CostClass;
  uploadCostClass?: CostClass;
  payloadClass?: PayloadClass;
  heavy?: boolean;
  estimatedBytes?: number;
}

interface Manifest {
  version: string;
  baseUrl: string;
  bundles: Bundle[];
}

/** Raster extensions; order used when probing for JSON+image spritesheet pairs (TexturePacker-style). */
const TEXTURE_EXT_ORDER = ['.png', '.jpg', '.jpeg', '.webp', '.avif'] as const;
const TEXTURE_EXTS = new Set<string>(TEXTURE_EXT_ORDER);
const AUDIO_EXTS = new Set(['.mp3', '.ogg', '.wav', '.webm']);
const FONT_EXTS = new Set(['.woff', '.woff2', '.ttf', '.otf']);

const IGNORED_NAMES = new Set(['.', '..', '__MACOSX', '.DS_Store', 'Thumbs.db']);
const IGNORED_FILES = new Set(['manifest.json']);

/**
 * Schema that mirrors the runtime ManifestSchema for self-validation.
 * This ensures the generator's output is always consumable by the engine.
 */
const RuntimeManifestSchema = z.object({
  version: z.string(),
  baseUrl: z.string(),
  bundles: z.array(z.object({
    name: z.string().min(1),
    assets: z.array(z.object({
      key: z.string().min(1),
      type: z.enum(ASSET_TYPES),
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

function scanDirectory(dir: string, basePath: string = ''): AssetEntry[] {
  const entries: AssetEntry[] = [];
  if (!fs.existsSync(dir)) return entries;

  const items = fs.readdirSync(dir).sort();
  for (const item of items) {
    if (IGNORED_NAMES.has(item) || item.startsWith('.')) continue;

    const fullPath = path.join(dir, item);
    const relativePath = basePath ? `${basePath}/${item}` : item;
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      entries.push(...scanDirectory(fullPath, relativePath));
    } else {
      if (IGNORED_FILES.has(item)) continue;
      const entry = classifyAsset(relativePath, fullPath);
      if (entry) entries.push(entry);
    }
  }

  return entries;
}

/**
 * Derive a unique asset key from the relative path.
 * Uses path structure to prevent collisions (e.g. symbols/wild vs bonus/wild).
 */
function deriveKey(relativePath: string): string {
  const ext = path.extname(relativePath);
  const withoutExt = relativePath.replace(ext, '');
  return withoutExt
    .replace(/\\/g, '/')
    .replace(/[^a-zA-Z0-9/_-]/g, '_');
}

function classifyAsset(relativePath: string, fullPath: string): AssetEntry | null {
  const ext = path.extname(fullPath).toLowerCase();
  const filename = path.basename(fullPath);
  const dir = path.dirname(fullPath);
  const key = deriveKey(relativePath);
  const urlRaw = relativePath.replace(/\\/g, '/');
  const url = encodeUrlSegments(urlRaw);

  // Texture: skip if same-name .json exists (spritesheet entry owns the pair; loader loads image via atlas JSON)
  if (TEXTURE_EXTS.has(ext)) {
    const baseName = filename.slice(0, -ext.length);
    if (fs.existsSync(path.join(dir, `${baseName}.json`))) {
      return null;
    }
    return { key, type: 'texture', url };
  }

  if (ext === '.json') {
    if (filename.includes('spritesheet') || filename.includes('atlas')) {
      return { key, type: 'spritesheet', url };
    }
    if (filename.includes('skeleton') || filename.endsWith('.skel.json')) {
      const atlasUrl = encodeUrlSegments(urlRaw.replace('.json', '.atlas'));
      return { key, type: 'spine', url, urls: { atlas: atlasUrl } };
    }
    if (filename === 'sfx_sprite.json' || filename.endsWith('_sprite.json')) {
      return null;
    }
    // JSON + same-name raster in same dir → spritesheet (TexturePacker / same basename as PNG, etc.)
    const jsonBase = filename.replace(/\.json$/i, '');
    for (const texExt of TEXTURE_EXT_ORDER) {
      if (fs.existsSync(path.join(dir, `${jsonBase}${texExt}`))) {
        return { key, type: 'spritesheet', url };
      }
    }
    return { key, type: 'json', url };
  }

  if (AUDIO_EXTS.has(ext)) {
    return { key, type: 'audio', url };
  }

  if (FONT_EXTS.has(ext)) {
    return { key, type: 'font', url };
  }

  return null;
}

/**
 * Bundle assignment by path convention:
 * - ui/, boot/     → boot   (priority 0, required)
 * - bonus/         → bonus  (priority 2, not required)
 * - deferred/      → deferred (priority 3, not required)
 * - everything else → main  (priority 1, required)
 */
function assignBundleByConvention(assetUrl: string): string {
  if (assetUrl.startsWith('ui/') || assetUrl.startsWith('boot/')) return 'boot';
  if (assetUrl.startsWith('bonus/')) return 'bonus';
  if (assetUrl.startsWith('deferred/')) return 'deferred';
  return 'main';
}

const BUNDLE_CONFIG: Record<string, { priority: number; required: boolean }> = {
  boot: { priority: 0, required: true },
  main: { priority: 1, required: true },
  bonus: { priority: 2, required: false },
  deferred: { priority: 3, required: false },
};

/** Normalize path prefix for matching: forward slashes, trailing slash. */
function normalizePathPrefix(prefix: string): string {
  let p = prefix.replace(/\\/g, '/').trim();
  if (p && !p.endsWith('/')) p += '/';
  return p;
}

function assignBundle(assetUrl: string, explicitBundles: BuildConfig['assets']['bundles']): string {
  if (explicitBundles && explicitBundles.length > 0) {
    const normalizedUrl = assetUrl.replace(/\\/g, '/');
    for (const b of explicitBundles) {
      for (const rawPrefix of b.pathPrefixes) {
        const prefix = normalizePathPrefix(rawPrefix);
        if (prefix && normalizedUrl.startsWith(prefix)) return b.name;
      }
    }
  }
  return assignBundleByConvention(assetUrl);
}

function organizeBundles(
  assets: AssetEntry[],
  config: BuildConfig,
  bootBundles: BootBundleGroups,
): Bundle[] {
  const explicitBundles = config.assets.bundles;
  const bundleMap = new Map<string, AssetEntry[]>();
  const referencedBootBundles = new Set<string>([
    ...bootBundles.bootVisualBundles,
    ...config.boot.startSceneBundles,
    ...bootBundles.postTapCoreBundles,
    ...bootBundles.firstSpinBundles,
    ...bootBundles.deferredBundles,
  ]);

  for (const asset of assets) {
    const bundleName = assignBundle(asset.url, explicitBundles);
    if (!bundleMap.has(bundleName)) bundleMap.set(bundleName, []);
    bundleMap.get(bundleName)!.push(asset);
  }

  const bundles: Bundle[] = [];
  const orderedNames = new Set<string>();

  if (explicitBundles && explicitBundles.length > 0) {
    for (const b of explicitBundles) {
      orderedNames.add(b.name);
      const bundleAssets = bundleMap.get(b.name) ?? [];
      bundles.push({
        name: b.name,
        priority: b.priority,
        required: b.required,
        assets: bundleAssets.sort((a, b) => a.key.localeCompare(b.key)),
      });
    }
  }

  for (const name of ['boot', 'main', 'bonus', 'deferred'] as const) {
    if (orderedNames.has(name)) continue;
    const cfg = BUNDLE_CONFIG[name];
    if (!cfg) continue;
    orderedNames.add(name);
    const bundleAssets = bundleMap.get(name) ?? [];
    if (bundleAssets.length === 0 && !referencedBootBundles.has(name)) continue;
    if (!cfg.required && bundleAssets.length === 0) continue;
    bundles.push({
      name,
      priority: cfg.priority,
      required: cfg.required,
      assets: bundleAssets.sort((a, b) => a.key.localeCompare(b.key)),
    });
  }

  for (const [name, bundleAssets] of bundleMap) {
    if (orderedNames.has(name)) continue;
    bundles.push({
      name,
      priority: 10,
      required: false,
      assets: bundleAssets.sort((a, b) => a.key.localeCompare(b.key)),
    });
  }

  return bundles;
}

/**
 * Inject audio sprite entries into the manifest when audio sprite
 * output files exist. This bridges the audio-sprite-build output
 * with the manifest so the runtime can discover audioSprite assets.
 */
function injectAudioSpriteEntries(
  bundles: Bundle[],
  spriteOutDir: string,
  assetsDir: string,
): void {
  if (!fs.existsSync(spriteOutDir)) return;

  const spriteFiles = fs.readdirSync(spriteOutDir).sort()
    .filter((f: string) => f.endsWith('_sprite.json'));

  for (const spriteFile of spriteFiles) {
    const spriteName = spriteFile.replace('.json', '');
    const relSpriteJsonRaw = path.relative(assetsDir, path.join(spriteOutDir, spriteFile)).replace(/\\/g, '/');
    const relSpriteJson = encodeUrlSegments(relSpriteJsonRaw);

    const audioExts = ['.mp3', '.ogg', '.webm'];
    let relAudioUrl: string | null = null;
    for (const ext of audioExts) {
      const audioPath = path.join(spriteOutDir, spriteName + ext);
      if (fs.existsSync(audioPath)) {
        relAudioUrl = encodeUrlSegments(path.relative(assetsDir, audioPath).replace(/\\/g, '/'));
        break;
      }
    }

    const entry: AssetEntry = {
      key: deriveKey(relSpriteJsonRaw.replace('.json', '')),
      type: 'audioSprite',
      url: relAudioUrl ?? relSpriteJson,
      urls: { sprite: relSpriteJson },
    };

    const mainBundle = bundles.find(b => b.name === 'main');
    if (mainBundle) {
      const exists = mainBundle.assets.some(a => a.key === entry.key);
      if (!exists) mainBundle.assets.push(entry);
    }
  }
}

/**
 * Materialize bundle intelligence fields in generated manifest output.
 * This prevents "classification inferred" advisory drift in doctor/loading checks.
 */
function applyBundleClassifications(bundles: Bundle[]): void {
  for (const bundle of bundles) {
    const classification = inferSlotBundleClassification({
      name: bundle.name,
      heavy: bundle.heavy,
      estimatedBytes: bundle.estimatedBytes,
      assets: bundle.assets,
    });

    bundle.payloadClass = classification.payloadClass;
    bundle.decodeCostClass = classification.decodeCostClass;
    bundle.uploadCostClass = classification.uploadCostClass;
  }
}

function validateOutput(manifest: Manifest, issues: PipelineIssue[]): boolean {
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

  return issues.filter(i => i.severity === 'error').length === 0;
}

export function generateManifest(rootDir?: string): { manifest: Manifest; report: ReturnType<typeof createReport> } {
  const issues: PipelineIssue[] = [];
  const { config, rootDir: projectRoot } = loadBuildConfig(rootDir);
  const bootBundles = loadBootBundleGroups(projectRoot);
  const assetsDir = path.join(projectRoot, 'assets');
  const spriteOutDir = path.join(projectRoot, STARTER_CONVENTIONS.audioSpriteOutDir);

  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  const assets = scanDirectory(assetsDir);
  const bundles = organizeBundles(assets, config, bootBundles);

  injectAudioSpriteEntries(bundles, spriteOutDir, assetsDir);
  applyBundleClassifications(bundles);

  const explicitBundles = config.assets.bundles ?? [];
  for (const b of explicitBundles) {
    const out = bundles.find(bundle => bundle.name === b.name);
    if (out && out.assets.length === 0) {
      issues.push({
        code: IssueCodes.BUNDLE_EMPTY_EXPLICIT,
        category: IssueCategory.CONFIG,
        severity: 'warning',
        message: `Explicit bundle "${b.name}" has no assets (pathPrefixes matched no files).`,
        file: 'build-config.json',
        context: { bundleName: b.name },
      });
    }
  }

  const manifest: Manifest = {
    version: config.game.version,
    baseUrl: config.assets.baseUrl,
    bundles,
  };

  validateOutput(manifest, issues);

  const totalAssets = bundles.reduce((n, b) => n + b.assets.length, 0);
  const report = createReport('manifest:generate', issues, {
    assetCount: totalAssets,
    bundleCount: bundles.length,
    bundles: bundles.map(b => ({ name: b.name, assets: b.assets.length })),
  });

  return { manifest, report };
}
