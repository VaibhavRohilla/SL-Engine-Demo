import { validateWinPresentationIntent } from '@fnx/sl-engine';
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
const SUPPORTED_SPIN_FEEL_PRESETS = ['classic', 'premium', 'snappy', 'heavy', 'arcade'] as const;
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

const WIN_PRESENTATION_LINE_CAP = new Set(['butt', 'round', 'square']);
const WIN_PRESENTATION_LINE_JOIN = new Set(['miter', 'round', 'bevel']);
const WIN_PRESENTATION_PAYLINE_REVEAL_KEYS = new Set(['enabled', 'durationMs', 'easing', 'mode']);
const WIN_PRESENTATION_PAYLINE_REVEAL_MODES = new Set(['fromLineStart', 'fromLineEnd', 'leftToRight', 'rightToLeft', 'instant']);
const WIN_PRESENTATION_PAYLINE_GLOW_KEYS = new Set(['enabled', 'width', 'alpha', 'color']);
const WIN_PRESENTATION_EASING_NAMES = new Set([
  'linear',
  'quadIn', 'quadOut', 'quadInOut',
  'cubicIn', 'cubicOut', 'cubicInOut',
  'quartIn', 'quartOut', 'quartInOut',
  'quintIn', 'quintOut', 'quintInOut',
  'sineIn', 'sineOut', 'sineInOut',
  'expoIn', 'expoOut', 'expoInOut',
  'circIn', 'circOut', 'circInOut',
  'elasticIn', 'elasticOut', 'elasticInOut',
  'backIn', 'backOut', 'backInOut',
  'bounceIn', 'bounceOut', 'bounceInOut',
  'reelStop', 'reelStopSmooth', 'symbolBounce', 'symbolSettle', 'anticipationSlow',
  'backOutSoft', 'backOutStrong',
]);

/** Removed top-level template keys — fail fast, no migration shims. */
const REMOVED_TEMPLATE_WIN_PRESENTATION_TOP_LEVEL_KEYS = [
  'winPresentation',
  'winVisualizer',
  'winPresentationConfig',
  'lineStyles',
] as const;
const WIN_PRESENTATION_LINE_STYLES_KEYS = new Set(['default', 'byLineId']);
const WIN_PRESENTATION_LINE_STYLE_ENTRY_KEYS = new Set(['line', 'label']);
const WIN_PRESENTATION_LINE_STYLE_LINE_KEYS = new Set(['type', 'color', 'width', 'alpha', 'lineCap', 'lineJoin', 'paylineStartInsetPx', 'reveal', 'glow']);
const WIN_PRESENTATION_LINE_STYLE_LABEL_KEYS = new Set(['enabled', 'position', 'background', 'text', 'offset']);
const WIN_PRESENTATION_LINE_STYLE_LABEL_BG_KEYS = new Set(['type', 'fill', 'alpha', 'stroke', 'strokeWidth', 'radius', 'paddingX', 'paddingY']);
const WIN_PRESENTATION_LINE_STYLE_LABEL_TEXT_KEYS = new Set(['enabled', 'valueMode', 'value', 'fontFamily', 'fontSize', 'fill', 'stroke', 'strokeWidth', 'fontWeight']);

function isColorValue(v: unknown): boolean {
  if (typeof v === 'number' && Number.isFinite(v)) return true;
  if (typeof v !== 'string') return false;
  const hex = v.trim().replace(/^#/, '').replace(/^0x/i, '');
  return /^[0-9a-fA-F]{6}$/.test(hex);
}

function checkBooleanField(issues: PipelineIssue[], value: unknown, field: string): void {
  if (value !== undefined && typeof value !== 'boolean') {
    addConfigIssue(issues, `${field} must be a boolean when set.`, field, `set ${field} to true or false in ${TEMPLATE_CONFIG_FILE}.`);
  }
}

function checkFiniteNonNegativeField(issues: PipelineIssue[], value: unknown, field: string): void {
  if (value !== undefined && (typeof value !== 'number' || !Number.isFinite(value) || value < 0)) {
    addConfigIssue(issues, `${field} must be a non-negative finite number when set.`, field, `set a valid ${field} in ${TEMPLATE_CONFIG_FILE}.`);
  }
}

function checkFinitePositiveField(issues: PipelineIssue[], value: unknown, field: string): void {
  if (value !== undefined && (typeof value !== 'number' || !Number.isFinite(value) || value <= 0)) {
    addConfigIssue(issues, `${field} must be a positive finite number when set.`, field, `set a valid ${field} in ${TEMPLATE_CONFIG_FILE}.`);
  }
}

function checkAlphaField(issues: PipelineIssue[], value: unknown, field: string): void {
  if (value !== undefined && (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1)) {
    addConfigIssue(issues, `${field} must be a number from 0 to 1 when set.`, field, `set a valid ${field} in ${TEMPLATE_CONFIG_FILE}.`);
  }
}

function validateTemplateWinPresentation(issues: PipelineIssue[], config: Record<string, unknown>): void {
  for (const removedKey of REMOVED_TEMPLATE_WIN_PRESENTATION_TOP_LEVEL_KEYS) {
    if (getPath(config, [removedKey]) !== undefined) {
      const message =
        removedKey === 'winPresentation'
          ? 'winPresentation is removed; use winPresentationIntent and winPresentationLineStyles instead.'
          : removedKey === 'lineStyles'
            ? 'lineStyles is removed at template root; use winPresentationLineStyles instead.'
            : `"${removedKey}" is removed; use winPresentationIntent and winPresentationLineStyles instead.`;
      addConfigIssue(issues, message, removedKey, `remove ${removedKey} from ${TEMPLATE_CONFIG_FILE}.`);
    }
  }

  const intentRaw = getPath(config, ['winPresentationIntent']);
  if (intentRaw !== undefined) {
    const intentRecord = asRecord(intentRaw);
    if (!intentRecord) {
      addConfigIssue(
        issues,
        'winPresentationIntent must be a plain object when set.',
        'winPresentationIntent',
        `fix winPresentationIntent in ${TEMPLATE_CONFIG_FILE} or remove it.`,
      );
    } else {
      const result = validateWinPresentationIntent(
        { ...intentRecord, preset: 'classicLine' },
        { pathPrefix: 'winPresentationIntent.' },
      );
      for (const issue of result.errors) {
        addConfigIssue(issues, issue.message, issue.path, `fix winPresentationIntent in ${TEMPLATE_CONFIG_FILE}.`);
      }
    }
  }

  validateWinPresentationLineStyles(issues, getPath(config, ['winPresentationLineStyles']));
}

function validateWinPresentationLineStyles(issues: PipelineIssue[], raw: unknown): void {
  if (raw === undefined) return;
  const lineStyles = asRecord(raw);
  if (!lineStyles) {
    addConfigIssue(
      issues,
      'winPresentationLineStyles must be a plain object when set.',
      'winPresentationLineStyles',
      `fix winPresentationLineStyles in ${TEMPLATE_CONFIG_FILE} or remove it.`,
    );
    return;
  }
  for (const key of Object.keys(lineStyles)) {
    if (!WIN_PRESENTATION_LINE_STYLES_KEYS.has(key)) {
      addConfigIssue(
        issues,
        `winPresentationLineStyles has unknown key "${key}".`,
        `winPresentationLineStyles.${key}`,
        `use only default and byLineId under winPresentationLineStyles in ${TEMPLATE_CONFIG_FILE}.`,
      );
    }
  }
  validateLineStyleEntry(issues, lineStyles.default, 'winPresentationLineStyles.default');
  const byLineId = asRecord(lineStyles.byLineId);
  if (lineStyles.byLineId !== undefined) {
    if (!byLineId) {
      addConfigIssue(
        issues,
        'winPresentationLineStyles.byLineId must be a plain object when set.',
        'winPresentationLineStyles.byLineId',
        `fix byLineId in ${TEMPLATE_CONFIG_FILE}.`,
      );
    } else {
      for (const lineId of Object.keys(byLineId)) {
        if (typeof lineId !== 'string' || lineId.trim().length === 0) {
          addConfigIssue(
            issues,
            'winPresentationLineStyles.byLineId keys must be non-empty strings.',
            'winPresentationLineStyles.byLineId',
            `use non-empty line id keys in ${TEMPLATE_CONFIG_FILE}.`,
          );
          continue;
        }
        validateLineStyleEntry(issues, byLineId[lineId], `winPresentationLineStyles.byLineId.${lineId}`);
      }
    }
  }
}

function validateLineStyleEntry(
  issues: PipelineIssue[],
  entryRaw: unknown,
  path: string,
): void {
  const entry = asRecord(entryRaw);
  if (!entry) {
    addConfigIssue(issues, `${path} must be a plain object.`, path, `fix ${path} in ${TEMPLATE_CONFIG_FILE}.`);
    return;
  }
  for (const key of Object.keys(entry)) {
    if (!WIN_PRESENTATION_LINE_STYLE_ENTRY_KEYS.has(key)) {
      addConfigIssue(issues, `${path} has unknown key "${key}".`, `${path}.${key}`, `remove ${key} from ${path}.`);
    }
  }

  const line = asRecord(entry.line);
  if (entry.line !== undefined) {
    if (!line) {
      addConfigIssue(issues, `${path}.line must be a plain object.`, `${path}.line`, `fix ${path}.line in ${TEMPLATE_CONFIG_FILE}.`);
    } else {
      for (const key of Object.keys(line)) {
        if (!WIN_PRESENTATION_LINE_STYLE_LINE_KEYS.has(key)) {
          addConfigIssue(issues, `${path}.line has unknown key "${key}".`, `${path}.line.${key}`, `remove ${key} from ${path}.line.`);
        }
      }
      if (line.type !== undefined && line.type !== 'graphic') {
        addConfigIssue(issues, `${path}.line.type must be "graphic".`, `${path}.line.type`, `set ${path}.line.type to "graphic".`);
      }
      for (const [field, checker] of [
        ['color', isColorValue],
        ['width', (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v > 0],
        ['alpha', (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1],
        ['paylineStartInsetPx', (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0],
      ] as const) {
        const value = line[field];
        if (value !== undefined && !checker(value)) {
          addConfigIssue(issues, `${path}.line.${field} has invalid value.`, `${path}.line.${field}`, `set a valid ${field}.`);
        }
      }
      if (line.lineCap !== undefined && (typeof line.lineCap !== 'string' || !WIN_PRESENTATION_LINE_CAP.has(line.lineCap))) {
        addConfigIssue(issues, `${path}.line.lineCap must be butt | round | square.`, `${path}.line.lineCap`, 'set a valid lineCap.');
      }
      if (line.lineJoin !== undefined && (typeof line.lineJoin !== 'string' || !WIN_PRESENTATION_LINE_JOIN.has(line.lineJoin))) {
        addConfigIssue(issues, `${path}.line.lineJoin must be miter | round | bevel.`, `${path}.line.lineJoin`, 'set a valid lineJoin.');
      }
      const reveal = asRecord(line.reveal);
      if (line.reveal !== undefined) {
        if (!reveal) {
          addConfigIssue(issues, `${path}.line.reveal must be a plain object.`, `${path}.line.reveal`, `fix ${path}.line.reveal.`);
        } else {
          for (const key of Object.keys(reveal)) {
            if (!WIN_PRESENTATION_PAYLINE_REVEAL_KEYS.has(key)) {
              addConfigIssue(issues, `${path}.line.reveal has unknown key "${key}".`, `${path}.line.reveal.${key}`, `remove ${key}.`);
            }
          }
          if (reveal.enabled !== undefined && typeof reveal.enabled !== 'boolean') {
            addConfigIssue(issues, `${path}.line.reveal.enabled must be boolean.`, `${path}.line.reveal.enabled`, 'set enabled true/false.');
          }
          if (reveal.durationMs !== undefined && (typeof reveal.durationMs !== 'number' || !Number.isFinite(reveal.durationMs) || reveal.durationMs < 0)) {
            addConfigIssue(issues, `${path}.line.reveal.durationMs must be a finite number >= 0.`, `${path}.line.reveal.durationMs`, 'set a valid durationMs.');
          }
          if (reveal.easing !== undefined && (typeof reveal.easing !== 'string' || !WIN_PRESENTATION_EASING_NAMES.has(reveal.easing))) {
            addConfigIssue(issues, `${path}.line.reveal.easing is invalid.`, `${path}.line.reveal.easing`, 'use a known easing name.');
          }
          if (reveal.mode !== undefined && (typeof reveal.mode !== 'string' || !WIN_PRESENTATION_PAYLINE_REVEAL_MODES.has(reveal.mode))) {
            addConfigIssue(issues, `${path}.line.reveal.mode is invalid.`, `${path}.line.reveal.mode`, 'use fromLineStart/fromLineEnd/leftToRight/rightToLeft/instant.');
          }
        }
      }
      const glow = asRecord(line.glow);
      if (line.glow !== undefined) {
        if (!glow) {
          addConfigIssue(issues, `${path}.line.glow must be a plain object.`, `${path}.line.glow`, `fix ${path}.line.glow.`);
        } else {
          for (const key of Object.keys(glow)) {
            if (!WIN_PRESENTATION_PAYLINE_GLOW_KEYS.has(key)) {
              addConfigIssue(issues, `${path}.line.glow has unknown key "${key}".`, `${path}.line.glow.${key}`, `remove ${key}.`);
            }
          }
          if (glow.enabled !== undefined && typeof glow.enabled !== 'boolean') {
            addConfigIssue(issues, `${path}.line.glow.enabled must be boolean.`, `${path}.line.glow.enabled`, 'set enabled true/false.');
          }
          if (glow.width !== undefined && (typeof glow.width !== 'number' || !Number.isFinite(glow.width) || glow.width < 0)) {
            addConfigIssue(issues, `${path}.line.glow.width must be a finite number >= 0.`, `${path}.line.glow.width`, 'set a valid glow width.');
          }
          if (glow.alpha !== undefined && (typeof glow.alpha !== 'number' || !Number.isFinite(glow.alpha) || glow.alpha < 0 || glow.alpha > 1)) {
            addConfigIssue(issues, `${path}.line.glow.alpha must be 0..1.`, `${path}.line.glow.alpha`, 'set a valid glow alpha.');
          }
          if (glow.color !== undefined && !isColorValue(glow.color)) {
            addConfigIssue(issues, `${path}.line.glow.color must be a valid color.`, `${path}.line.glow.color`, 'set a valid glow color.');
          }
        }
      }
    }
  }

  const label = asRecord(entry.label);
  if (entry.label !== undefined) {
    if (!label) {
      addConfigIssue(issues, `${path}.label must be a plain object.`, `${path}.label`, `fix ${path}.label in ${TEMPLATE_CONFIG_FILE}.`);
    } else {
      for (const key of Object.keys(label)) {
        if (!WIN_PRESENTATION_LINE_STYLE_LABEL_KEYS.has(key)) {
          addConfigIssue(issues, `${path}.label has unknown key "${key}".`, `${path}.label.${key}`, `remove ${key}.`);
        }
      }
      if (label.enabled !== undefined && typeof label.enabled !== 'boolean') {
        addConfigIssue(issues, `${path}.label.enabled must be boolean.`, `${path}.label.enabled`, 'set enabled true/false.');
      } else if (label.enabled === undefined && (label.background !== undefined || label.text !== undefined)) {
        addConfigIssue(
          issues,
          `${path}.label.enabled is required when label.background or label.text is set (engine validates byLineId entries before default merge).`,
          `${path}.label.enabled`,
          `set ${path}.label.enabled to true in ${TEMPLATE_CONFIG_FILE}.`,
        );
      }
      if (
        label.position !== undefined
        && (typeof label.position !== 'string' || !new Set(['start', 'end', 'bothEnds', 'left', 'right']).has(label.position))
      ) {
        addConfigIssue(issues, `${path}.label.position must be start|end|bothEnds|left|right.`, `${path}.label.position`, 'set a valid position.');
      }
      const background = asRecord(label.background);
      if (label.background !== undefined) {
        if (!background) {
          addConfigIssue(issues, `${path}.label.background must be a plain object.`, `${path}.label.background`, 'fix background config.');
        } else {
          for (const key of Object.keys(background)) {
            if (!WIN_PRESENTATION_LINE_STYLE_LABEL_BG_KEYS.has(key)) {
              addConfigIssue(issues, `${path}.label.background has unknown key "${key}".`, `${path}.label.background.${key}`, `remove ${key}.`);
            }
          }
          if (background.type !== undefined && background.type !== 'graphic') {
            addConfigIssue(issues, `${path}.label.background.type must be "graphic".`, `${path}.label.background.type`, 'set type to graphic.');
          }
          if (background.fill !== undefined && !isColorValue(background.fill)) addConfigIssue(issues, `${path}.label.background.fill must be a valid color.`, `${path}.label.background.fill`, 'set valid fill.');
          if (background.stroke !== undefined && !isColorValue(background.stroke)) addConfigIssue(issues, `${path}.label.background.stroke must be a valid color.`, `${path}.label.background.stroke`, 'set valid stroke.');
          if (background.alpha !== undefined && (typeof background.alpha !== 'number' || !Number.isFinite(background.alpha) || background.alpha < 0 || background.alpha > 1)) addConfigIssue(issues, `${path}.label.background.alpha must be 0..1.`, `${path}.label.background.alpha`, 'set valid alpha.');
          for (const n of ['strokeWidth', 'radius', 'paddingX', 'paddingY'] as const) {
            const v = background[n];
            if (v !== undefined && (typeof v !== 'number' || !Number.isFinite(v) || v < 0)) addConfigIssue(issues, `${path}.label.background.${n} must be >= 0.`, `${path}.label.background.${n}`, `set valid ${n}.`);
          }
        }
      }
      const text = asRecord(label.text);
      if (label.text !== undefined) {
        if (!text) {
          addConfigIssue(issues, `${path}.label.text must be a plain object.`, `${path}.label.text`, 'fix text config.');
        } else {
          for (const key of Object.keys(text)) {
            if (!WIN_PRESENTATION_LINE_STYLE_LABEL_TEXT_KEYS.has(key)) {
              addConfigIssue(issues, `${path}.label.text has unknown key "${key}".`, `${path}.label.text.${key}`, `remove ${key}.`);
            }
          }
          if (text.enabled !== undefined && typeof text.enabled !== 'boolean') {
            addConfigIssue(issues, `${path}.label.text.enabled must be boolean.`, `${path}.label.text.enabled`, 'set enabled true/false.');
          } else if (text.enabled === undefined && Object.keys(text).length > 0) {
            addConfigIssue(
              issues,
              `${path}.label.text.enabled is required when label.text is set.`,
              `${path}.label.text.enabled`,
              `set ${path}.label.text.enabled to true in ${TEMPLATE_CONFIG_FILE}.`,
            );
          }
          if (text.valueMode !== undefined && (typeof text.valueMode !== 'string' || !new Set(['lineNumber', 'lineId', 'custom']).has(text.valueMode))) {
            addConfigIssue(issues, `${path}.label.text.valueMode must be lineNumber|lineId|custom.`, `${path}.label.text.valueMode`, 'set a valid valueMode.');
          }
          if (text.valueMode === 'custom' && (typeof text.value !== 'string' || text.value.trim().length === 0)) {
            addConfigIssue(issues, `${path}.label.text.value is required when valueMode is custom.`, `${path}.label.text.value`, 'set custom label text value.');
          }
          if (text.fontSize !== undefined && (typeof text.fontSize !== 'number' || !Number.isFinite(text.fontSize) || text.fontSize <= 0)) {
            addConfigIssue(issues, `${path}.label.text.fontSize must be > 0.`, `${path}.label.text.fontSize`, 'set valid fontSize.');
          }
          if (text.fill !== undefined && !isColorValue(text.fill)) addConfigIssue(issues, `${path}.label.text.fill must be a valid color.`, `${path}.label.text.fill`, 'set valid fill.');
          if (text.stroke !== undefined && !isColorValue(text.stroke)) addConfigIssue(issues, `${path}.label.text.stroke must be a valid color.`, `${path}.label.text.stroke`, 'set valid stroke.');
          if (text.strokeWidth !== undefined && (typeof text.strokeWidth !== 'number' || !Number.isFinite(text.strokeWidth) || text.strokeWidth < 0)) {
            addConfigIssue(issues, `${path}.label.text.strokeWidth must be >= 0.`, `${path}.label.text.strokeWidth`, 'set valid strokeWidth.');
          }
        }
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

  validateTemplateWinPresentation(issues, config);

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
