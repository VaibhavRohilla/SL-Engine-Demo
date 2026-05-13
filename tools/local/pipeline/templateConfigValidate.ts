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

/** Must match engine `PaylineStyleConfig` / template `TemplateWinPresentationConfig.paylineStyle` surface. */
const WIN_PRESENTATION_PAYLINE_STYLE_KEYS = new Set<string>([
  'lineColor',
  'lineThickness',
  'lineAlpha',
  'animateDrawing',
  'drawingDurationMs',
  'paylineStartInsetPx',
  'showLineLabel',
  'labelFontSize',
  'labelColor',
  'lineCap',
  'lineJoin',
]);

const WIN_PRESENTATION_LINE_CAP = new Set(['butt', 'round', 'square']);
const WIN_PRESENTATION_LINE_JOIN = new Set(['miter', 'round', 'bevel']);
const WIN_PRESENTATION_TOP_KEYS = new Set([
  'paylineStyle',
  'global',
  'visualizer',
  'timing',
  'textPosition',
]);
const WIN_PRESENTATION_GLOBAL_KEYS = new Set([
  'showPaylines',
  'showLineLabels',
  'showIndividualWins',
  'clearBetweenEvents',
  'clearBetweenCycles',
  'winLoopLimit',
  'winText',
]);
const WIN_PRESENTATION_VISUALIZER_KEYS = new Set(['linePresentationMode', 'executionMode', 'loopEnabled']);
const WIN_PRESENTATION_LINE_MODES = new Set(['vector', 'boundsOverlay']);
const WIN_VISUALIZER_EXECUTION_MODES = new Set(['parallel', 'sequential']);

function validateWinPresentation(issues: PipelineIssue[], config: Record<string, unknown>): void {
  const raw = getPath(config, ['winPresentation']);
  if (raw === undefined) return;

  const wp = asRecord(raw);
  if (!wp) {
    addConfigIssue(
      issues,
      'winPresentation must be a plain object when set.',
      'winPresentation',
      `fix or remove winPresentation in ${TEMPLATE_CONFIG_FILE}.`,
    );
    return;
  }

  for (const key of Object.keys(wp)) {
    if (!WIN_PRESENTATION_TOP_KEYS.has(key)) {
      addConfigIssue(
        issues,
        `winPresentation has unknown key "${key}".`,
        `winPresentation.${key}`,
        `use only paylineStyle, global, visualizer, timing, and textPosition under winPresentation in ${TEMPLATE_CONFIG_FILE}.`,
      );
    }
  }

  const paylineStyle = asRecord(wp.paylineStyle);
  if (wp.paylineStyle !== undefined) {
    if (!paylineStyle) {
      addConfigIssue(
        issues,
        'winPresentation.paylineStyle must be a plain object when set.',
        'winPresentation.paylineStyle',
        `fix paylineStyle in ${TEMPLATE_CONFIG_FILE} or remove it.`,
      );
    } else {
      for (const key of Object.keys(paylineStyle)) {
        if (!WIN_PRESENTATION_PAYLINE_STYLE_KEYS.has(key)) {
          addConfigIssue(
            issues,
            `winPresentation.paylineStyle has unknown key "${key}".`,
            `winPresentation.paylineStyle.${key}`,
            `remove the key or align with engine PaylineStyleConfig in ${TEMPLATE_CONFIG_FILE}.`,
          );
        }
      }
      const cap = paylineStyle.lineCap;
      if (cap !== undefined && (typeof cap !== 'string' || !WIN_PRESENTATION_LINE_CAP.has(cap))) {
        addConfigIssue(
          issues,
          `winPresentation.paylineStyle.lineCap must be butt | round | square (got ${JSON.stringify(cap)}).`,
          'winPresentation.paylineStyle.lineCap',
          `set lineCap in ${TEMPLATE_CONFIG_FILE}.`,
        );
      }
      const join = paylineStyle.lineJoin;
      if (join !== undefined && (typeof join !== 'string' || !WIN_PRESENTATION_LINE_JOIN.has(join))) {
        addConfigIssue(
          issues,
          `winPresentation.paylineStyle.lineJoin must be miter | round | bevel (got ${JSON.stringify(join)}).`,
          'winPresentation.paylineStyle.lineJoin',
          `set lineJoin in ${TEMPLATE_CONFIG_FILE}.`,
        );
      }
      for (const [field, checker] of [
        ['lineThickness', (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v > 0],
        ['lineAlpha', (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1],
        ['drawingDurationMs', (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0],
        ['paylineStartInsetPx', (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0],
        ['labelFontSize', (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v > 0],
        ['lineColor', (v: unknown) => typeof v === 'number' && Number.isFinite(v)],
      ] as const) {
        const v = paylineStyle[field];
        if (v === undefined) continue;
        if (!checker(v)) {
          addConfigIssue(
            issues,
            `winPresentation.paylineStyle.${field} has an invalid value (got ${String(v)}).`,
            `winPresentation.paylineStyle.${field}`,
            `set a valid ${field} in ${TEMPLATE_CONFIG_FILE}.`,
          );
        }
      }
      const animateDrawing = paylineStyle.animateDrawing;
      if (animateDrawing !== undefined && typeof animateDrawing !== 'boolean') {
        addConfigIssue(
          issues,
          'winPresentation.paylineStyle.animateDrawing must be a boolean when set.',
          'winPresentation.paylineStyle.animateDrawing',
          `set animateDrawing to true or false in ${TEMPLATE_CONFIG_FILE}.`,
        );
      }
      const showLineLabel = paylineStyle.showLineLabel;
      if (showLineLabel !== undefined && typeof showLineLabel !== 'boolean') {
        addConfigIssue(
          issues,
          'winPresentation.paylineStyle.showLineLabel must be a boolean when set.',
          'winPresentation.paylineStyle.showLineLabel',
          `set showLineLabel to true or false in ${TEMPLATE_CONFIG_FILE}.`,
        );
      }
    }
  }

  const global = asRecord(wp.global);
  if (wp.global !== undefined) {
    if (!global) {
      addConfigIssue(
        issues,
        'winPresentation.global must be a plain object when set.',
        'winPresentation.global',
        `fix global in ${TEMPLATE_CONFIG_FILE} or remove it.`,
      );
    } else {
      for (const key of Object.keys(global)) {
        if (!WIN_PRESENTATION_GLOBAL_KEYS.has(key)) {
          addConfigIssue(
            issues,
            `winPresentation.global has unknown key "${key}".`,
            `winPresentation.global.${key}`,
            `use only showPaylines, showLineLabels, showIndividualWins, clearBetweenEvents, clearBetweenCycles, winLoopLimit, and winText in ${TEMPLATE_CONFIG_FILE}.`,
          );
        }
      }
      for (const key of [
        'showPaylines',
        'showLineLabels',
        'showIndividualWins',
        'clearBetweenEvents',
        'clearBetweenCycles',
      ] as const) {
        const v = global[key];
        if (v !== undefined && typeof v !== 'boolean') {
          addConfigIssue(
            issues,
            `winPresentation.global.${key} must be a boolean when set.`,
            `winPresentation.global.${key}`,
            `set ${key} to true or false in ${TEMPLATE_CONFIG_FILE}.`,
          );
        }
      }

      const winLoopLimit = global.winLoopLimit;
      if (winLoopLimit !== undefined) {
        if (
          typeof winLoopLimit !== 'number' ||
          !Number.isInteger(winLoopLimit) ||
          winLoopLimit < 1 ||
          winLoopLimit > 100
        ) {
          addConfigIssue(
            issues,
            'winPresentation.global.winLoopLimit must be an integer from 1 to 100 when set.',
            'winPresentation.global.winLoopLimit',
            `set winLoopLimit (e.g. 3) in ${TEMPLATE_CONFIG_FILE}.`,
          );
        }
      }

      const winText = asRecord(global.winText);
      if (global.winText !== undefined) {
        if (!winText) {
          addConfigIssue(
            issues,
            'winPresentation.global.winText must be a plain object when set.',
            'winPresentation.global.winText',
            `fix winText in ${TEMPLATE_CONFIG_FILE} or remove it.`,
          );
        } else {
          for (const key of Object.keys(winText)) {
            if (key !== 'amountTween') {
              addConfigIssue(
                issues,
                `winPresentation.global.winText has unknown key "${key}".`,
                `winPresentation.global.winText.${key}`,
                `use only amountTween under winText in ${TEMPLATE_CONFIG_FILE}.`,
              );
            }
          }
          const amountTween = asRecord(winText.amountTween);
          if (winText.amountTween !== undefined) {
            if (!amountTween) {
              addConfigIssue(
                issues,
                'winPresentation.global.winText.amountTween must be a plain object when set.',
                'winPresentation.global.winText.amountTween',
                `fix amountTween in ${TEMPLATE_CONFIG_FILE} or remove it.`,
              );
            } else {
              for (const key of Object.keys(amountTween)) {
                if (key !== 'enabled' && key !== 'durationMs') {
                  addConfigIssue(
                    issues,
                    `winPresentation.global.winText.amountTween has unknown key "${key}".`,
                    `winPresentation.global.winText.amountTween.${key}`,
                    `use only enabled and durationMs in ${TEMPLATE_CONFIG_FILE}.`,
                  );
                }
              }
              if (amountTween.enabled !== undefined && typeof amountTween.enabled !== 'boolean') {
                addConfigIssue(
                  issues,
                  'winPresentation.global.winText.amountTween.enabled must be a boolean when set.',
                  'winPresentation.global.winText.amountTween.enabled',
                  `set enabled to true or false in ${TEMPLATE_CONFIG_FILE}.`,
                );
              }
              const dur = amountTween.durationMs;
              if (
                dur !== undefined &&
                (typeof dur !== 'number' || !Number.isFinite(dur) || dur <= 0)
              ) {
                addConfigIssue(
                  issues,
                  'winPresentation.global.winText.amountTween.durationMs must be a positive finite number when set.',
                  'winPresentation.global.winText.amountTween.durationMs',
                  `set durationMs in ${TEMPLATE_CONFIG_FILE}.`,
                );
              }
            }
          }
        }
      }
    }
  }

  const timing = asRecord(wp.timing);
  if (wp.timing !== undefined) {
    if (!timing) {
      addConfigIssue(
        issues,
        'winPresentation.timing must be a plain object when set.',
        'winPresentation.timing',
        `fix timing in ${TEMPLATE_CONFIG_FILE} or remove it.`,
      );
    } else {
      for (const key of Object.keys(timing)) {
        if (key !== 'singleWinDurationMs' && key !== 'betweenWinsDelayMs' && key !== 'allWinsDurationMs') {
          addConfigIssue(
            issues,
            `winPresentation.timing has unknown key "${key}".`,
            `winPresentation.timing.${key}`,
            `use only singleWinDurationMs, betweenWinsDelayMs, and allWinsDurationMs in ${TEMPLATE_CONFIG_FILE}.`,
          );
        }
      }
      for (const key of ['singleWinDurationMs', 'betweenWinsDelayMs', 'allWinsDurationMs'] as const) {
        const v = timing[key];
        if (v === undefined) continue;
        if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
          addConfigIssue(
            issues,
            `winPresentation.timing.${key} must be a non-negative finite number when set.`,
            `winPresentation.timing.${key}`,
            `set ${key} in ${TEMPLATE_CONFIG_FILE}.`,
          );
        }
      }
    }
  }

  const textPosition = asRecord(wp.textPosition);
  if (wp.textPosition !== undefined) {
    if (!textPosition) {
      addConfigIssue(
        issues,
        'winPresentation.textPosition must be a plain object when set.',
        'winPresentation.textPosition',
        `fix textPosition in ${TEMPLATE_CONFIG_FILE} or remove it.`,
      );
    } else {
      for (const key of Object.keys(textPosition)) {
        if (key !== 'xOffset' && key !== 'yOffset') {
          addConfigIssue(
            issues,
            `winPresentation.textPosition has unknown key "${key}".`,
            `winPresentation.textPosition.${key}`,
            `use only xOffset and yOffset in ${TEMPLATE_CONFIG_FILE}.`,
          );
        }
      }
      for (const key of ['xOffset', 'yOffset'] as const) {
        const v = textPosition[key];
        if (v === undefined) continue;
        if (typeof v !== 'number' || !Number.isFinite(v)) {
          addConfigIssue(
            issues,
            `winPresentation.textPosition.${key} must be a finite number when set.`,
            `winPresentation.textPosition.${key}`,
            `set ${key} in ${TEMPLATE_CONFIG_FILE}.`,
          );
        }
      }
    }
  }

  const visualizer = asRecord(wp.visualizer);
  if (wp.visualizer !== undefined) {
    if (!visualizer) {
      addConfigIssue(
        issues,
        'winPresentation.visualizer must be a plain object when set.',
        'winPresentation.visualizer',
        `fix visualizer in ${TEMPLATE_CONFIG_FILE} or remove it.`,
      );
    } else {
      for (const key of Object.keys(visualizer)) {
        if (!WIN_PRESENTATION_VISUALIZER_KEYS.has(key)) {
          addConfigIssue(
            issues,
            `winPresentation.visualizer has unknown key "${key}".`,
            `winPresentation.visualizer.${key}`,
            `use only linePresentationMode, executionMode, and loopEnabled in ${TEMPLATE_CONFIG_FILE} (template surface).`,
          );
        }
      }
      const loopEnabled = visualizer.loopEnabled;
      if (loopEnabled !== undefined && typeof loopEnabled !== 'boolean') {
        addConfigIssue(
          issues,
          'winPresentation.visualizer.loopEnabled must be a boolean when set.',
          'winPresentation.visualizer.loopEnabled',
          `set loopEnabled to true or false in ${TEMPLATE_CONFIG_FILE}.`,
        );
      }
      const mode = visualizer.linePresentationMode;
      if (mode !== undefined && (typeof mode !== 'string' || !WIN_PRESENTATION_LINE_MODES.has(mode))) {
        addConfigIssue(
          issues,
          `winPresentation.visualizer.linePresentationMode must be vector | boundsOverlay (got ${JSON.stringify(mode)}).`,
          'winPresentation.visualizer.linePresentationMode',
          `set linePresentationMode in ${TEMPLATE_CONFIG_FILE}.`,
        );
      }
      const exec = visualizer.executionMode;
      if (exec !== undefined && (typeof exec !== 'string' || !WIN_VISUALIZER_EXECUTION_MODES.has(exec))) {
        addConfigIssue(
          issues,
          `winPresentation.visualizer.executionMode must be parallel | sequential (got ${JSON.stringify(exec)}).`,
          'winPresentation.visualizer.executionMode',
          `set executionMode in ${TEMPLATE_CONFIG_FILE}.`,
        );
      }
    }
  }
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

function checkBaseMaskAuthority(issues: PipelineIssue[], config: Record<string, unknown>): void {
  const baseMask = asRecord(getPath(config, ['layout', 'base', 'reelWindow', 'mask']));
  if (baseMask) {
    addConfigIssue(
      issues,
      'layout.base.reelWindow.mask is not allowed. Masks must be declared per orientation profile.',
      'layout.base.reelWindow.mask',
      'move mask config to layout.portrait.reelWindow.mask and/or layout.landscape.reelWindow.mask.',
    );
  }
}

function getOrientationMask(config: Record<string, unknown>, orientation: 'portrait' | 'landscape'): Record<string, unknown> | null {
  return asRecord(getPath(config, ['layout', orientation, 'reelWindow', 'mask']));
}

function getOrientationValue(config: Record<string, unknown>, orientation: 'portrait' | 'landscape', key: string): number | undefined {
  const orientationValue = getPath(config, ['layout', orientation, 'symbols', key]);
  if (typeof orientationValue === 'number' && Number.isFinite(orientationValue)) return orientationValue;
  return undefined;
}

function checkOrientationMaskShape(issues: PipelineIssue[], config: Record<string, unknown>, orientation: 'portrait' | 'landscape'): void {
  const mask = getOrientationMask(config, orientation);
  if (!mask || mask.enabled === false) return;
  const sibling: 'portrait' | 'landscape' = orientation === 'portrait' ? 'landscape' : 'portrait';
  const siblingMask = getOrientationMask(config, sibling);
  const width = mask.width;
  const height = mask.height;
  const hasWidthKey = Object.prototype.hasOwnProperty.call(mask, 'width');
  const hasHeightKey = Object.prototype.hasOwnProperty.call(mask, 'height');
  const siblingHasWidthKey = siblingMask ? Object.prototype.hasOwnProperty.call(siblingMask, 'width') : false;
  const siblingHasHeightKey = siblingMask ? Object.prototype.hasOwnProperty.call(siblingMask, 'height') : false;
  const inheritedWidth = siblingMask?.enabled !== false ? siblingMask?.width : undefined;
  const inheritedHeight = siblingMask?.enabled !== false ? siblingMask?.height : undefined;
  if (!hasWidthKey && !siblingHasWidthKey) {
    addConfigIssue(
      issues,
      `layout.${orientation}.reelWindow.mask.enabled is true, but width is missing and no sibling orientation mask width can be inherited.`,
      `layout.${orientation}.reelWindow.mask.width`,
      `set layout.${orientation}.reelWindow.mask.width or define the sibling orientation mask width.`,
    );
  }
  if (!hasHeightKey && !siblingHasHeightKey) {
    addConfigIssue(
      issues,
      `layout.${orientation}.reelWindow.mask.enabled is true, but height is missing and no sibling orientation mask height can be inherited.`,
      `layout.${orientation}.reelWindow.mask.height`,
      `set layout.${orientation}.reelWindow.mask.height or define the sibling orientation mask height.`,
    );
  }

  const symbolWidth = getOrientationValue(config, orientation, 'width');
  const symbolHeight = getOrientationValue(config, orientation, 'height');
  const rowGap = getOrientationValue(config, orientation, 'gapY') ?? 0;
  const resolvedWidth = typeof width === 'number' && Number.isFinite(width)
    ? width
    : (typeof inheritedWidth === 'number' && Number.isFinite(inheritedWidth) ? inheritedWidth : undefined);
  const resolvedHeight = typeof height === 'number' && Number.isFinite(height)
    ? height
    : (typeof inheritedHeight === 'number' && Number.isFinite(inheritedHeight) ? inheritedHeight : undefined);
  if (typeof symbolWidth === 'number' && typeof resolvedWidth === 'number' && Math.abs(resolvedWidth - symbolWidth) > 0.001) {
    addConfigIssue(
      issues,
      `layout.${orientation}.reelWindow.mask.width must match symbol width (${symbolWidth}) for single-reel clipping.`,
      `layout.${orientation}.reelWindow.mask.width`,
      `set layout.${orientation}.reelWindow.mask.width to ${symbolWidth}.`,
    );
  }
  const expectedHeight = typeof symbolHeight === 'number' ? 3 * symbolHeight + 2 * rowGap : undefined;
  if (typeof expectedHeight === 'number' && typeof resolvedHeight === 'number' && Math.abs(resolvedHeight - expectedHeight) > 0.001) {
    addConfigIssue(
      issues,
      `layout.${orientation}.reelWindow.mask.height must match derived grid height (${expectedHeight}).`,
      `layout.${orientation}.reelWindow.mask.height`,
      `set layout.${orientation}.reelWindow.mask.height to ${expectedHeight}.`,
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

  // Authoring may derive these values via constants/helpers in templateGameConfig.ts.
  // Runtime composer remains authoritative and fail-fast on invalid geometry.
  checkPositive(issues, config, ['layout', 'base', 'reelWindow', 'width'], 'layout.base.reelWindow.width', true);
  checkPositive(issues, config, ['layout', 'base', 'reelWindow', 'height'], 'layout.base.reelWindow.height', true);
  checkPositive(issues, config, ['layout', 'base', 'reelWindow', 'mask', 'width'], 'layout.base.reelWindow.mask.width', true);
  checkPositive(issues, config, ['layout', 'base', 'reelWindow', 'mask', 'height'], 'layout.base.reelWindow.mask.height', true);
  checkPositive(issues, config, ['layout', 'base', 'symbols', 'width'], 'layout.base.symbols.width', true);
  checkPositive(issues, config, ['layout', 'base', 'symbols', 'height'], 'layout.base.symbols.height', true);
  checkBaseMaskAuthority(issues, config);
  checkOrientationMaskShape(issues, config, 'portrait');
  checkOrientationMaskShape(issues, config, 'landscape');

  const spinFeelPreset = getPath(config, ['spinFeel', 'preset']);
  if (spinFeelPreset !== undefined && (typeof spinFeelPreset !== 'string' || !SUPPORTED_SPIN_FEEL_PRESET_SET.has(spinFeelPreset))) {
    addConfigIssue(
      issues,
      `spinFeel.preset "${String(spinFeelPreset)}" is not supported.`,
      'spinFeel.preset',
      `use one of: ${SUPPORTED_SPIN_FEEL_PRESETS.join(', ')}.`,
    );
  }

  validateWinPresentation(issues, config);

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
