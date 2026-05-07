import { fileExists, readTextFile } from '../utils/fs.ts';
import { resolveFromProjectRoot } from '../utils/paths.ts';

export interface BootBundleGroups {
  bootVisualBundles: readonly string[];
  postTapCoreBundles: readonly string[];
  firstSpinBundles: readonly string[];
  deferredBundles: readonly string[];
}

export interface BootConfigSurface {
  manifestUrl: string | null;
  startSceneBundles: readonly string[];
  skipStartScreen: boolean | null;
}

const EMPTY_BUNDLES: BootBundleGroups = {
  bootVisualBundles: [],
  postTapCoreBundles: [],
  firstSpinBundles: [],
  deferredBundles: [],
};

const EMPTY_BOOT_CONFIG: BootConfigSurface = {
  manifestUrl: null,
  startSceneBundles: [],
  skipStartScreen: null,
};

function parseStringArrayExport(content: string, exportName: string): string[] {
  const exportPattern = new RegExp(
    `export\\s+const\\s+${exportName}(?:\\s*:\\s*[^=]+)?\\s*=\\s*\\[([\\s\\S]*?)\\]`,
    'm',
  );
  const match = content.match(exportPattern);
  if (!match?.[1]) return [];

  const values: string[] = [];
  const valuePattern = /['"]([^'"]+)['"]/g;
  let valueMatch: RegExpExecArray | null;
  while ((valueMatch = valuePattern.exec(match[1])) !== null) {
    const value = valueMatch[1]?.trim();
    if (value) values.push(value);
  }

  return values;
}

function parseStringProperty(content: string, propertyName: string): string | null {
  const pattern = new RegExp(`${propertyName}\\s*:\\s*['\"]([^'\"]+)['\"]`, 'm');
  const match = content.match(pattern);
  return match?.[1]?.trim() ?? null;
}

function parseBooleanProperty(content: string, propertyName: string): boolean | null {
  const pattern = new RegExp(`${propertyName}\\s*:\\s*(true|false)`, 'm');
  const match = content.match(pattern);
  if (!match?.[1]) return null;
  return match[1] === 'true';
}

function parseArrayProperty(content: string, propertyName: string): string[] {
  const pattern = new RegExp(`${propertyName}\\s*:\\s*\\[([\\s\\S]*?)\\]`, 'm');
  const match = content.match(pattern);
  if (!match?.[1]) return [];

  const values: string[] = [];
  const valuePattern = /['"]([^'"]+)['"]/g;
  let valueMatch: RegExpExecArray | null;
  while ((valueMatch = valuePattern.exec(match[1])) !== null) {
    const value = valueMatch[1]?.trim();
    if (value) values.push(value);
  }

  return values;
}

function readBootConfigContent(projectRoot: string): string | null {
  const bootConfigPath = resolveFromProjectRoot(projectRoot, 'src/config/bootConfig.ts');
  if (!fileExists(bootConfigPath)) return null;
  return readTextFile(bootConfigPath);
}

export function loadBootBundleGroups(projectRoot: string): BootBundleGroups {
  const content = readBootConfigContent(projectRoot);
  if (!content) return EMPTY_BUNDLES;

  return {
    bootVisualBundles: parseStringArrayExport(content, 'BOOT_VISUAL_BUNDLES'),
    postTapCoreBundles: parseStringArrayExport(content, 'POST_TAP_CORE_BUNDLES'),
    firstSpinBundles: parseStringArrayExport(content, 'FIRST_SPIN_BUNDLES'),
    deferredBundles: parseStringArrayExport(content, 'DEFERRED_BUNDLES'),
  };
}

export function loadBootConfigSurface(projectRoot: string): BootConfigSurface {
  const content = readBootConfigContent(projectRoot);
  if (!content) return EMPTY_BOOT_CONFIG;

  return {
    manifestUrl: parseStringProperty(content, 'manifestUrl'),
    startSceneBundles: parseArrayProperty(content, 'startSceneBundles'),
    skipStartScreen: parseBooleanProperty(content, 'skipStartScreen'),
  };
}
