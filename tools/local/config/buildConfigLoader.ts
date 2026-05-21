/**
 * Build Config Loader — Canonical Project Input Parser
 *
 * Loads, validates, and normalizes build-config.json.
 * All tooling reads project configuration through this module.
 */

import { BuildConfigSchema, type BuildConfig } from './buildConfigSchema.ts';
import { fileExists, readTextFile } from '../utils/fs.ts';
import { parseJson } from '../utils/json.ts';
import { resolveFromProjectRoot, resolveProjectRoot } from '../utils/paths.ts';

export type { BuildConfig } from './buildConfigSchema.ts';

export interface LoadBuildConfigResult {
  config: BuildConfig;
  configPath: string;
  rootDir: string;
}

export function loadBuildConfig(rootDirOverride?: string): LoadBuildConfigResult {
  const rootDir = resolveProjectRoot(rootDirOverride);
  const configPath = resolveFromProjectRoot(rootDir, 'build-config.json');

  if (!fileExists(configPath)) {
    throw new Error(`build-config.json not found at: ${configPath}`);
  }

  const raw = readTextFile(configPath);
  let parsed: unknown;
  try {
    parsed = parseJson(raw);
  } catch (error) {
    throw new Error(`build-config.json is not valid JSON: ${error}`);
  }

  if (parsed && typeof parsed === 'object' && '$schema' in parsed) {
    delete (parsed as Record<string, unknown>).$schema;
  }

  const result = BuildConfigSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`build-config.json validation failed:\n${issues}`);
  }

  return {
    config: result.data,
    configPath,
    rootDir,
  };
}

export function resolveAssetPath(relativePath: string, rootDirOverride?: string): string {
  const rootDir = resolveProjectRoot(rootDirOverride);
  return resolveFromProjectRoot(rootDir, relativePath);
}
