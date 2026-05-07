import { loadBuildConfig } from '../config/buildConfigLoader.ts';
import {
  extractTemplateConfigAssetReferences,
  loadTemplateGameConfigSurface,
  readManifestKeys,
} from '../runtime-surfaces/templateGameConfigSurface.ts';
import {
  type PipelineIssue,
  IssueCategory,
  IssueCodes,
  createReport,
} from './pipelineTypes.ts';

const TEMPLATE_CONFIG_FILE = 'src/config/templateGameConfig.ts';
const SUPPORTED_SPIN_FEEL_PRESETS = ['premium', 'arcade', 'turbo', 'normal'] as const;
const SUPPORTED_SPIN_FEEL_PRESET_SET = new Set<string>(SUPPORTED_SPIN_FEEL_PRESETS);

/** Must match engine `BootImageScaleMode` / template `TemplateBackgroundFit`. */
const BOOT_START_BACKGROUND_FIT = new Set(['cover', 'contain', 'stretch', 'screen-cover']);

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function getPath(root: Record<string, unknown>, path: readonly string[]): unknown {
  let cursor: unknown = root;
  for (const part of path) {
    cursor = asRecord(cursor)?.[part];
  }
  return cursor;
}

function isBlank(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length === 0;
}

function addConfigIssue(issues: PipelineIssue[], message: string, field: string, exampleFix: string): void {
  issues.push({
    code: IssueCodes.CONFIG_INVALID,
    category: IssueCategory.CONFIG,
    severity: 'error',
    message: `${message} Fix: ${exampleFix}`,
    file: TEMPLATE_CONFIG_FILE,
    context: { field },
  });
}

function checkAssetKey(
  issues: PipelineIssue[],
  config: Record<string, unknown>,
  path: readonly string[],
  field: string,
): void {
  const record = asRecord(getPath(config, path));
  if (!record || !('assetKey' in record)) return;
  if (isBlank(record.assetKey)) {
    addConfigIssue(
      issues,
      `${field} asset key is empty.`,
      field,
      `set ${field} in ${TEMPLATE_CONFIG_FILE} to a manifest asset key or remove that config block.`,
    );
  }
}

/** When a scene background uses `assetKey`, optional `fit` must be a supported scale mode. */
function checkSceneImageBackgroundFit(
  issues: PipelineIssue[],
  config: Record<string, unknown>,
  path: readonly string[],
  field: string,
): void {
  const record = asRecord(getPath(config, path));
  if (!record || !('assetKey' in record)) return;
  const fit = record.fit;
  if (fit === undefined) return;
  if (typeof fit !== 'string' || !BOOT_START_BACKGROUND_FIT.has(fit)) {
    addConfigIssue(
      issues,
      `${field}.fit must be one of: cover, contain, stretch, screen-cover (got ${JSON.stringify(fit)}).`,
      `${field}.fit`,
      `set ${field}.fit in ${TEMPLATE_CONFIG_FILE} or remove the property.`,
    );
  }
}

/** `fit` applies only to image backgrounds (same as engine `imageScaleMode`). */
function checkBackgroundFitNotOnColor(
  issues: PipelineIssue[],
  config: Record<string, unknown>,
  path: readonly string[],
  field: string,
): void {
  const record = asRecord(getPath(config, path));
  if (!record) return;
  if ('color' in record && record.fit !== undefined) {
    addConfigIssue(
      issues,
      `${field}: "fit" is only valid with an image background (use assetKey), not with color.`,
      `${field}.fit`,
      `remove ${field}.fit in ${TEMPLATE_CONFIG_FILE} or switch to { assetKey: "…", fit?: "cover" | … }.`,
    );
  }
}

function checkPositive(
  issues: PipelineIssue[],
  config: Record<string, unknown>,
  path: readonly string[],
  field: string,
  whenConfiguredOnly: boolean,
): void {
  const value = getPath(config, path);
  if (value === undefined && whenConfiguredOnly) return;
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    addConfigIssue(
      issues,
      `${field} must be a positive number.`,
      field,
      `set ${field} in ${TEMPLATE_CONFIG_FILE} to a value greater than 0.`,
    );
  }
}

export function validateTemplateGameConfigObject(
  config: Record<string, unknown>,
  options: { manifestKeys?: ReadonlySet<string> } = {},
): PipelineIssue[] {
  const issues: PipelineIssue[] = [];

  checkAssetKey(issues, config, ['scenes', 'slot', 'background'], 'scenes.slot.background.assetKey');
  checkAssetKey(issues, config, ['scenes', 'slot', 'frame'], 'scenes.slot.frame.assetKey');
  checkAssetKey(issues, config, ['scenes', 'boot', 'background'], 'scenes.boot.background.assetKey');
  checkAssetKey(issues, config, ['scenes', 'start', 'background'], 'scenes.start.background.assetKey');
  checkBackgroundFitNotOnColor(issues, config, ['scenes', 'slot', 'background'], 'scenes.slot.background');
  checkBackgroundFitNotOnColor(issues, config, ['scenes', 'boot', 'background'], 'scenes.boot.background');
  checkBackgroundFitNotOnColor(issues, config, ['scenes', 'start', 'background'], 'scenes.start.background');
  checkSceneImageBackgroundFit(issues, config, ['scenes', 'slot', 'background'], 'scenes.slot.background');
  checkSceneImageBackgroundFit(issues, config, ['scenes', 'boot', 'background'], 'scenes.boot.background');
  checkSceneImageBackgroundFit(issues, config, ['scenes', 'start', 'background'], 'scenes.start.background');

  checkPositive(issues, config, ['layout', 'base', 'reelWindow', 'width'], 'layout.base.reelWindow.width', false);
  checkPositive(issues, config, ['layout', 'base', 'reelWindow', 'height'], 'layout.base.reelWindow.height', false);
  checkPositive(issues, config, ['layout', 'base', 'reelWindow', 'mask', 'width'], 'layout.base.reelWindow.mask.width', true);
  checkPositive(issues, config, ['layout', 'base', 'reelWindow', 'mask', 'height'], 'layout.base.reelWindow.mask.height', true);
  checkPositive(issues, config, ['layout', 'base', 'symbols', 'width'], 'layout.base.symbols.width', true);
  checkPositive(issues, config, ['layout', 'base', 'symbols', 'height'], 'layout.base.symbols.height', true);

  const spinFeelPreset = getPath(config, ['spinFeel', 'preset']);
  if (spinFeelPreset !== undefined && (typeof spinFeelPreset !== 'string' || !SUPPORTED_SPIN_FEEL_PRESET_SET.has(spinFeelPreset))) {
    addConfigIssue(
      issues,
      `spinFeel.preset "${String(spinFeelPreset)}" is not supported.`,
      'spinFeel.preset',
      `use one of: ${SUPPORTED_SPIN_FEEL_PRESETS.join(', ')}.`,
    );
  }

  if (options.manifestKeys) {
    const assetFields = [
      ['scenes', 'slot', 'background'],
      ['scenes', 'slot', 'frame'],
      ['scenes', 'boot', 'background'],
      ['scenes', 'start', 'background'],
    ] as const;

    for (const pathParts of assetFields) {
      const record = asRecord(getPath(config, pathParts));
      const key = typeof record?.assetKey === 'string' ? record.assetKey.trim() : '';
      if (key && !options.manifestKeys.has(key)) {
        const field = `${pathParts.join('.')}.assetKey`;
        issues.push({
          code: IssueCodes.REFERENCED_KEY_MISSING,
          category: IssueCategory.REFERENCED,
          severity: 'error',
          message: `Referenced asset key "${key}" (${field}) was not found in manifest. Fix: add the asset under assets/, run pnpm assets, or update ${field} in ${TEMPLATE_CONFIG_FILE}.`,
          file: TEMPLATE_CONFIG_FILE,
          context: { key, source: field },
        });
      }
    }
  }

  return issues;
}

export function validateTemplateGameConfig(rootDir?: string): ReturnType<typeof createReport> {
  const issues: PipelineIssue[] = [];
  const { config: buildConfig, rootDir: projectRoot } = loadBuildConfig(rootDir);
  const loaded = loadTemplateGameConfigSurface(projectRoot);

  if (!loaded.config) {
    issues.push({
      code: IssueCodes.CONFIG_MISSING,
      category: IssueCategory.CONFIG,
      severity: 'error',
      message: `Template config file is missing or unreadable. Fix: restore ${TEMPLATE_CONFIG_FILE}. ${loaded.error ?? ''}`.trim(),
      file: TEMPLATE_CONFIG_FILE,
    });
    return createReport('template-config:validate', issues);
  }

  const manifestKeys = readManifestKeys(projectRoot, buildConfig.assets.manifestPath);
  issues.push(...validateTemplateGameConfigObject(loaded.config, manifestKeys.size > 0 ? { manifestKeys } : {}));

  const refs = extractTemplateConfigAssetReferences(projectRoot);
  return createReport('template-config:validate', issues, {
    referencedTemplateAssetKeys: refs.map((ref) => ({ key: ref.key, source: ref.sourceLabel })),
  });
}
