/**
 * Asset DX Generator — Generates Asset.d.ts and asset-suggestions.json from manifest truth.
 *
 * These outputs are for developer experience (IDE autocomplete, suggestions) only.
 * Runtime MUST NOT depend on them. Generated from the current manifest so they cannot drift.
 *
 * Run as part of the asset pipeline after manifest generation.
 */

import * as fs from 'fs';
import * as path from 'path';
import { loadBuildConfig, resolveAssetPath } from '../config/buildConfigLoader.ts';
import { STARTER_CONVENTIONS } from '../constants/conventions.ts';

const ASSET_TYPES = ['texture', 'spritesheet', 'spine', 'audio', 'audioSprite', 'json', 'font'] as const;
type AssetType = (typeof ASSET_TYPES)[number];

interface ManifestAsset {
  key: string;
  type: AssetType;
  url: string;
  urls?: Record<string, string>;
  meta?: Record<string, unknown>;
}

interface ManifestBundle {
  name: string;
  priority: number;
  required: boolean;
  assets: ManifestAsset[];
}

interface Manifest {
  version: string;
  baseUrl: string;
  bundles: ManifestBundle[];
}

function loadManifest(manifestPath: string): Manifest | null {
  if (!fs.existsSync(manifestPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as Manifest;
  } catch {
    return null;
  }
}

function collectKeysByType(manifest: Manifest): Record<AssetType, string[]> {
  const byType: Record<string, string[]> = {};
  for (const t of ASSET_TYPES) {
    byType[t] = [];
  }
  for (const bundle of manifest.bundles) {
    for (const asset of bundle.assets) {
      const t = asset.type as AssetType;
      if (byType[t] && !byType[t].includes(asset.key)) {
        byType[t].push(asset.key);
      }
    }
  }
  for (const t of ASSET_TYPES) {
    const arr = byType[t];
    if (arr) arr.sort();
  }
  return byType as Record<AssetType, string[]>;
}

function buildAssetSuggestions(manifest: Manifest): Record<string, { key: string; type: string; bundle: string; path: string }> {
  const assets: Record<string, { key: string; type: string; bundle: string; path: string }> = {};
  for (const bundle of manifest.bundles) {
    for (const asset of bundle.assets) {
      assets[asset.key] = {
        key: asset.key,
        type: asset.type,
        bundle: bundle.name,
        path: asset.url,
      };
    }
  }
  return assets;
}

function generateAssetDts(byType: Record<AssetType, string[]>): string {
  const lines: string[] = [
    '/**',
    ' * Auto-generated Asset Type Definitions',
    ' *',
    ' * This file is generated from assets/manifest.json. Do not edit manually.',
    ' * Regenerate with: pnpm assets',
    ' *',
    ' * DX only — runtime does not depend on this file.',
    ` * Generated: ${new Date().toISOString()}`,
    ' */',
    '',
    "export type AssetType = 'texture' | 'spritesheet' | 'spine' | 'audio' | 'audioSprite' | 'json' | 'font';",
    '',
  ];

  for (const t of ASSET_TYPES) {
    const keys = byType[t];
    const typeName = (t.charAt(0).toUpperCase() + t.slice(1)) as string;
    const union = keys.length > 0 ? keys.map(k => `'${k.replace(/'/g, "\\'")}'`).join(' | ') : 'never';
    lines.push(`export type ${typeName}AssetKey = ${union};`);
    lines.push('');
  }

  const allUnion = ASSET_TYPES.map(t => `${(t.charAt(0).toUpperCase() + t.slice(1))}AssetKey`).join(' | ');
  lines.push(`export type AssetKey = ${allUnion};`);
  lines.push('');
  lines.push('export interface AssetEntry {');
  lines.push('  key: AssetKey;');
  lines.push('  type: AssetType;');
  lines.push('  url: string;');
  lines.push('  urls?: Record<string, string>;');
  lines.push('  meta?: Record<string, unknown>;');
  lines.push('}');
  lines.push('');
  lines.push('export interface Bundle {');
  lines.push('  name: string;');
  lines.push('  priority: number;');
  lines.push('  required: boolean;');
  lines.push('  assets: AssetEntry[];');
  lines.push('}');
  lines.push('');
  lines.push('export interface Manifest {');
  lines.push('  version: string;');
  lines.push('  baseUrl: string;');
  lines.push('  bundles: Bundle[];');
  lines.push('}');
  lines.push('');

  lines.push('/** Type-safe asset key lists by type (for autocomplete). */');
  lines.push('export const AssetKeys = {');
  for (const t of ASSET_TYPES) {
    const keys = byType[t];
    const arr = keys.length > 0 ? keys.map(k => `'${k.replace(/'/g, "\\'")}'`).join(', ') : '';
    const typeName = (t.charAt(0).toUpperCase() + t.slice(1)) as string;
    lines.push(`  ${t}: [${arr}] as const satisfies readonly ${typeName}AssetKey[],`);
  }
  lines.push('} as const;');
  lines.push('');

  return lines.join('\n');
}

export function generateAssetDx(rootDir?: string): { written: string[]; skipped: boolean } {
  const { config, rootDir: projectRoot } = loadBuildConfig(rootDir);
  const manifestPath = resolveAssetPath(config.assets.manifestPath, projectRoot);

  const manifest = loadManifest(manifestPath);
  if (!manifest) {
    return { written: [], skipped: true };
  }

  const byType = collectKeysByType(manifest);
  const written: string[] = [];

  const dtsPath = path.join(projectRoot, STARTER_CONVENTIONS.assetTypesPath);
  const dtsDir = path.dirname(dtsPath);
  fs.mkdirSync(dtsDir, { recursive: true });
  fs.writeFileSync(dtsPath, generateAssetDts(byType) + '\n', 'utf-8');
  written.push(STARTER_CONVENTIONS.assetTypesPath);

  const suggestionsPath = path.join(projectRoot, STARTER_CONVENTIONS.assetSuggestionsPath);
  const suggestionsDir = path.dirname(suggestionsPath);
  fs.mkdirSync(suggestionsDir, { recursive: true });
  const suggestions = {
    generated: new Date().toISOString(),
    assets: buildAssetSuggestions(manifest),
  };
  fs.writeFileSync(suggestionsPath, JSON.stringify(suggestions, null, 2) + '\n', 'utf-8');
  written.push(STARTER_CONVENTIONS.assetSuggestionsPath);

  return { written, skipped: false };
}
