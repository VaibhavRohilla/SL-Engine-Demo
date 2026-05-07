import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { fileExists, readTextFile } from '../utils/fs.ts';
import { resolveFromProjectRoot } from '../utils/paths.ts';

export interface TemplateConfigLoadResult {
  file: string;
  config: Record<string, unknown> | null;
  error?: string;
}

export interface TemplateConfigAssetReference {
  key: string;
  sourceLabel: string;
  file: string;
}

function objectFromEntries(entries: Array<[string, unknown]>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of entries) out[key] = value;
  return out;
}

function propertyNameText(name: ts.PropertyName): string | null {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text;
  return null;
}

function evaluateExpression(node: ts.Expression): unknown {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (node.kind === ts.SyntaxKind.NullKeyword) return null;
  if (ts.isPrefixUnaryExpression(node)) {
    const value = evaluateExpression(node.operand);
    if (typeof value === 'number') {
      if (node.operator === ts.SyntaxKind.MinusToken) return -value;
      if (node.operator === ts.SyntaxKind.PlusToken) return value;
    }
    return undefined;
  }
  if (ts.isArrayLiteralExpression(node)) return node.elements.map((entry) => evaluateExpression(entry));
  if (ts.isObjectLiteralExpression(node)) {
    const entries: Array<[string, unknown]> = [];
    for (const property of node.properties) {
      if (!ts.isPropertyAssignment(property)) continue;
      const key = propertyNameText(property.name);
      if (!key) continue;
      entries.push([key, evaluateExpression(property.initializer)]);
    }
    return objectFromEntries(entries);
  }
  return undefined;
}

function findTemplateGameConfig(sourceFile: ts.SourceFile): Record<string, unknown> | null {
  let found: Record<string, unknown> | null = null;
  const visit = (node: ts.Node): void => {
    if (found) return;
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'templateGameConfig') {
      const value = node.initializer ? evaluateExpression(node.initializer) : null;
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        found = value as Record<string, unknown>;
      }
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found;
}

export function loadTemplateGameConfigSurface(projectRoot: string): TemplateConfigLoadResult {
  const file = 'src/config/templateGameConfig.ts';
  const fullPath = resolveFromProjectRoot(projectRoot, file);
  if (!fileExists(fullPath)) {
    return { file, config: null, error: 'template config file is missing' };
  }

  try {
    const content = readTextFile(fullPath);
    const sourceFile = ts.createSourceFile(fullPath, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const config = findTemplateGameConfig(sourceFile);
    if (!config) return { file, config: null, error: 'templateGameConfig export was not found or is not an object literal' };
    return { file, config };
  } catch (error) {
    return { file, config: null, error: error instanceof Error ? error.message : String(error) };
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function stringProperty(record: Record<string, unknown> | null, key: string): string | null {
  const value = record?.[key];
  return typeof value === 'string' ? value : null;
}

function collectAssetReference(
  refs: TemplateConfigAssetReference[],
  config: Record<string, unknown>,
  pathParts: readonly string[],
  sourceLabel: string,
): void {
  let cursor: unknown = config;
  for (const part of pathParts) {
    cursor = asRecord(cursor)?.[part];
  }
  const key = stringProperty(asRecord(cursor), 'assetKey');
  if (key && key.trim()) {
    refs.push({ key: key.trim(), sourceLabel, file: 'src/config/templateGameConfig.ts' });
  }
}

export function extractTemplateConfigAssetReferences(projectRoot: string): TemplateConfigAssetReference[] {
  const loaded = loadTemplateGameConfigSurface(projectRoot);
  if (!loaded.config) return [];
  const refs: TemplateConfigAssetReference[] = [];
  collectAssetReference(refs, loaded.config, ['scenes', 'slot', 'background'], 'templateGameConfig.scenes.slot.background.assetKey');
  collectAssetReference(refs, loaded.config, ['scenes', 'slot', 'frame'], 'templateGameConfig.scenes.slot.frame.assetKey');
  collectAssetReference(refs, loaded.config, ['scenes', 'boot', 'background'], 'templateGameConfig.scenes.boot.background.assetKey');
  collectAssetReference(refs, loaded.config, ['scenes', 'start', 'background'], 'templateGameConfig.scenes.start.background.assetKey');
  return refs;
}

export function extractTemplateConfigAssetKeys(projectRoot: string): Set<string> {
  return new Set(extractTemplateConfigAssetReferences(projectRoot).map((ref) => ref.key));
}

export function readManifestKeys(projectRoot: string, manifestPath: string): Set<string> {
  const absolute = path.join(projectRoot, manifestPath);
  if (!fs.existsSync(absolute)) return new Set();
  try {
    const manifest = JSON.parse(fs.readFileSync(absolute, 'utf8')) as { bundles?: Array<{ assets?: Array<{ key?: string }> }> };
    const keys = new Set<string>();
    for (const bundle of manifest.bundles ?? []) {
      for (const asset of bundle.assets ?? []) {
        if (asset.key) keys.add(asset.key);
      }
    }
    return keys;
  } catch {
    return new Set();
  }
}
