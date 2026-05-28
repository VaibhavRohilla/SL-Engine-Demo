/**
 * Asset Pipeline Types — Shared contracts for all pipeline tools.
 *
 * Defines issue codes, severity levels, and report structures
 * used across manifest generation, validation, production SFX gates,
 * and doctor checks. Every pipeline tool produces a PipelineReport
 * using these types, ensuring consistent output and machine-readable
 * quality gating.
 */

export type IssueSeverity = 'error' | 'warning' | 'advisory';

export const IssueCategory = {
  CONFIG: 'CONFIG',
  MANIFEST: 'MANIFEST',
  ASSET: 'ASSET',
  REFERENCED: 'REFERENCED',
  SPINE: 'SPINE',
  LOADING: 'LOADING',
  PIPELINE: 'PIPELINE',
} as const;

export type IssueCategoryType = (typeof IssueCategory)[keyof typeof IssueCategory];

export interface PipelineIssue {
  code: string;
  category: IssueCategoryType;
  severity: IssueSeverity;
  message: string;
  file?: string;
  context?: Record<string, unknown>;
}

export interface PipelineReport {
  tool: string;
  timestamp: string;
  passed: boolean;
  issues: PipelineIssue[];
  summary: {
    errors: number;
    warnings: number;
    advisories: number;
  };
  metadata?: Record<string, unknown>;
}

export const IssueCodes = {
  CONFIG_MISSING: 'CONFIG_MISSING',
  CONFIG_INVALID: 'CONFIG_INVALID',
  CONFIG_SCHEMA_DRIFT: 'CONFIG_SCHEMA_DRIFT',
  BUNDLE_EMPTY_EXPLICIT: 'BUNDLE_EMPTY_EXPLICIT',

  MANIFEST_MISSING: 'MANIFEST_MISSING',
  MANIFEST_INVALID_JSON: 'MANIFEST_INVALID_JSON',
  MANIFEST_SCHEMA_INVALID: 'MANIFEST_SCHEMA_INVALID',
  MANIFEST_DUPLICATE_KEY: 'MANIFEST_DUPLICATE_KEY',
  MANIFEST_MISSING_FILE: 'MANIFEST_MISSING_FILE',
  MANIFEST_STALE: 'MANIFEST_STALE',
  MANIFEST_KEY_COLLISION: 'MANIFEST_KEY_COLLISION',

  ASSET_ORPHANED: 'ASSET_ORPHANED',
  ASSET_JUNK_FILE: 'ASSET_JUNK_FILE',
  ASSET_OVERSIZED: 'ASSET_OVERSIZED',
  ASSET_OVERSIZED_CRITICAL: 'ASSET_OVERSIZED_CRITICAL',
  ASSET_MISSING_DIR: 'ASSET_MISSING_DIR',
  /** Required SFX on disk are byte-identical (starter placeholder tone). */
  SFX_PLACEHOLDER_BYTE_IDENTICAL: 'SFX_PLACEHOLDER_BYTE_IDENTICAL',
  /** Required SFX file missing from assets root. */
  SFX_FILE_MISSING: 'SFX_FILE_MISSING',
  /** Required SFX file is zero bytes. */
  SFX_FILE_EMPTY: 'SFX_FILE_EMPTY',

  SPINE_MISSING_SKELETON: 'SPINE_MISSING_SKELETON',
  SPINE_MISSING_ATLAS: 'SPINE_MISSING_ATLAS',
  SPINE_MISSING_TEXTURE: 'SPINE_MISSING_TEXTURE',
  SPINE_INVALID_SKELETON: 'SPINE_INVALID_SKELETON',

  LOADING_BUNDLE_NOT_IN_MANIFEST: 'LOADING_BUNDLE_NOT_IN_MANIFEST',
  LOADING_NO_PLAYABLE: 'LOADING_NO_PLAYABLE',
  LOADING_UNREFERENCED_BUNDLE: 'LOADING_UNREFERENCED_BUNDLE',
  LOADING_CLASSIFICATION_INFERRED: 'LOADING_CLASSIFICATION_INFERRED',
  LOADING_CLASSIFICATION_SUSPICIOUS: 'LOADING_CLASSIFICATION_SUSPICIOUS',

  REFERENCED_KEY_MISSING: 'REFERENCED_KEY_MISSING',

  PIPELINE_DIR_MISSING: 'PIPELINE_DIR_MISSING',
  PIPELINE_SDK_MISSING: 'PIPELINE_SDK_MISSING',
  /** `package.json` must pin the vendored SDK; registry drift breaks stock timeline lane wiring at runtime. */
  PIPELINE_SDK_NOT_VENDORED: 'PIPELINE_SDK_NOT_VENDORED',
  PIPELINE_ENTRY_MISSING: 'PIPELINE_ENTRY_MISSING',
  PIPELINE_HTML_MISSING: 'PIPELINE_HTML_MISSING',
  PIPELINE_CONFIG_MISSING: 'PIPELINE_CONFIG_MISSING',
  PIPELINE_GAME_FILE_MISSING: 'PIPELINE_GAME_FILE_MISSING',

  CONSUMER_INTERNAL_IMPORT: 'CONSUMER_INTERNAL_IMPORT',
  CONSUMER_DIRECT_GAME_CLASS: 'CONSUMER_DIRECT_GAME_CLASS',
  CONSUMER_MISSING_BOOTSTRAP: 'CONSUMER_MISSING_BOOTSTRAP',

  /** `runtimeShell.hud` failed `validateSlotHudConfig` / `resolveSlotRuntimeShellConfig`. */
  HUD_CONFIG_INVALID: 'HUD_CONFIG_INVALID',
  /** Expected `src/config/hud/index.ts` (and related HUD config modules) missing. */
  HUD_CONFIG_MISSING: 'HUD_CONFIG_MISSING',
} as const;

export function createReport(
  tool: string,
  issues: PipelineIssue[],
  metadata?: Record<string, unknown>,
): PipelineReport {
  const errors = issues.filter(i => i.severity === 'error').length;
  const warnings = issues.filter(i => i.severity === 'warning').length;
  const advisories = issues.filter(i => i.severity === 'advisory').length;

  return {
    tool,
    timestamp: new Date().toISOString(),
    passed: errors === 0,
    issues,
    summary: { errors, warnings, advisories },
    metadata,
  };
}

export function printReport(report: PipelineReport): void {
  const icons: Record<IssueSeverity, string> = {
    error: '✗',
    warning: '!',
    advisory: '·',
  };

  for (const issue of report.issues) {
    const icon = icons[issue.severity];
    const loc = issue.file ? ` (${issue.file})` : '';
    console.log(`  ${icon} [${issue.code}] ${issue.message}${loc}`);
  }

  if (report.issues.length > 0) {
    console.log(
      `\n  ${report.summary.errors} errors, ${report.summary.warnings} warnings, ${report.summary.advisories} advisories`,
    );
  }
}

/**
 * Artifact classification for generated output policy.
 * Used by doctor and pipeline to verify artifact expectations.
 */
export const ArtifactPolicy = {
  'assets/manifest.json': {
    type: 'generated',
    committed: true,
    requiredBeforeRuntime: true,
    generatedBy: 'manifest:generate',
    description: 'Asset manifest consumed by runtime ManifestProvider',
  },
  'generated/': {
    type: 'generated',
    committed: false,
    requiredBeforeRuntime: false,
    generatedBy: 'doctor / pipeline',
    description: 'Diagnostic reports and validation snapshots',
  },
  'src/Asset.d.ts': {
    type: 'generated',
    committed: true,
    requiredBeforeRuntime: false,
    generatedBy: 'pipeline / assets',
    description: 'TypeScript asset key types for IDE autocomplete (DX only)',
  },
  'generated/asset-suggestions.json': {
    type: 'generated',
    committed: false,
    requiredBeforeRuntime: false,
    generatedBy: 'pipeline / assets',
    description: 'Asset key suggestions for IDE (DX only)',
  },
  'dist/': {
    type: 'build-output',
    committed: false,
    requiredBeforeRuntime: false,
    generatedBy: 'build',
    description: 'Production build output',
  },
} as const;

export type ArtifactPolicyEntry = {
  type: 'generated' | 'build-output';
  committed: boolean;
  requiredBeforeRuntime: boolean;
  generatedBy: string;
  description: string;
};
