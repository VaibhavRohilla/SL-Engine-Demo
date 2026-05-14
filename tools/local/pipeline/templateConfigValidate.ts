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
  'color',
  'lineColor',
  'width',
  'lineThickness',
  'alpha',
  'lineAlpha',
  'animateDrawing',
  'drawingDurationMs',
  'paylineStartInsetPx',
  'showLineLabel',
  'labelFontSize',
  'labelColor',
  'lineCap',
  'lineJoin',
  'reveal',
  'glow',
]);

const WIN_PRESENTATION_LINE_CAP = new Set(['butt', 'round', 'square']);
const WIN_PRESENTATION_LINE_JOIN = new Set(['miter', 'round', 'bevel']);
const WIN_PRESENTATION_PAYLINE_REVEAL_KEYS = new Set(['enabled', 'durationMs', 'easing']);
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
const WIN_PRESENTATION_TOP_KEYS = new Set([
  'timingPrecedence',
  'paylineStyle',
  'global',
  'visualizer',
  'timing',
  'textPosition',
]);
const WIN_PRESENTATION_TIMING_PRECEDENCE = new Set(['presenterOverridesTier', 'tierOverridesPresenter']);
const WIN_PRESENTATION_GLOBAL_KEYS = new Set(['showPaylines', 'showLineLabels', 'winLoopLimit', 'showWinHighlight']);
const WIN_PRESENTATION_VISUALIZER_KEYS = new Set([
  'executionMode',
  'loopEnabled',
  'lifetime',
  'symbolWins',
  'lines',
  'winText',
  'linePresentationMode',
  'enabledModules',
]);
const WIN_PRESENTATION_VISUALIZER_MODULE_KEYS = new Set(['highlight', 'linePath', 'jackpot', 'winText']);
const WIN_PRESENTATION_LINE_MODES = new Set(['vector', 'boundsOverlay']);
const WIN_VISUALIZER_EXECUTION_MODES = new Set(['parallel', 'sequential']);
const WIN_PRESENTATION_DURATION_POLICIES = new Set(['fixedMs', 'untilNextSpin', 'once']);
const WIN_PRESENTATION_CHILD_LIFETIMES = new Set(['followPresentation', 'fixedMs', 'once']);
const WIN_PRESENTATION_SYMBOL_LOOP_POLICIES = new Set(['presentation', 'untilNextSpin', 'fixedMs', 'once']);
const WIN_PRESENTATION_SYMBOL_KEYS = new Set(['enabled', 'animation', 'overlay']);
const WIN_PRESENTATION_SYMBOL_ANIMATION_KEYS = new Set(['enabled', 'animationKey', 'loopPolicy', 'durationMs']);
const WIN_PRESENTATION_SYMBOL_OVERLAY_KEYS = new Set([
  'enabled',
  'type',
  'lifetime',
  'durationMs',
  'fill',
  'alpha',
  'stroke',
  'paddingPx',
  'cornerRadius',
  'pulse',
]);
const WIN_PRESENTATION_SYMBOL_OVERLAY_STROKE_KEYS = new Set(['color', 'width', 'alpha']);
const WIN_PRESENTATION_SYMBOL_OVERLAY_PULSE_KEYS = new Set(['enabled', 'alpha', 'durationMs']);
const WIN_PRESENTATION_CHILD_KEYS = new Set(['enabled', 'lifetime', 'durationMs']);

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
        `use only timingPrecedence, paylineStyle, global, visualizer, timing, and textPosition under winPresentation in ${TEMPLATE_CONFIG_FILE}.`,
      );
    }
  }

  const timingPrecedence = wp.timingPrecedence;
  if (
    timingPrecedence !== undefined &&
    (typeof timingPrecedence !== 'string' || !WIN_PRESENTATION_TIMING_PRECEDENCE.has(timingPrecedence))
  ) {
    addConfigIssue(
      issues,
      `winPresentation.timingPrecedence must be presenterOverridesTier | tierOverridesPresenter (got ${JSON.stringify(timingPrecedence)}).`,
      'winPresentation.timingPrecedence',
      `set timingPrecedence to "presenterOverridesTier" or "tierOverridesPresenter" in ${TEMPLATE_CONFIG_FILE}.`,
    );
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
        ['width', (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v > 0],
        ['lineAlpha', (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1],
        ['alpha', (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1],
        ['drawingDurationMs', (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0],
        ['paylineStartInsetPx', (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0],
        ['labelFontSize', (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v > 0],
        ['lineColor', isColorValue],
        ['color', isColorValue],
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
      const reveal = asRecord(paylineStyle.reveal);
      if (paylineStyle.reveal !== undefined) {
        if (!reveal) {
          addConfigIssue(
            issues,
            'winPresentation.paylineStyle.reveal must be a plain object when set.',
            'winPresentation.paylineStyle.reveal',
            `fix reveal in ${TEMPLATE_CONFIG_FILE} or remove it.`,
          );
        } else {
          for (const key of Object.keys(reveal)) {
            if (!WIN_PRESENTATION_PAYLINE_REVEAL_KEYS.has(key)) {
              addConfigIssue(
                issues,
                `winPresentation.paylineStyle.reveal has unknown key "${key}".`,
                `winPresentation.paylineStyle.reveal.${key}`,
                `remove the key or align with engine PaylineRevealConfig in ${TEMPLATE_CONFIG_FILE}.`,
              );
            }
          }
          checkBooleanField(issues, reveal.enabled, 'winPresentation.paylineStyle.reveal.enabled');
          checkFinitePositiveField(issues, reveal.durationMs, 'winPresentation.paylineStyle.reveal.durationMs');
          const easing = reveal.easing;
          if (easing !== undefined && (typeof easing !== 'string' || !WIN_PRESENTATION_EASING_NAMES.has(easing))) {
            addConfigIssue(
              issues,
              `winPresentation.paylineStyle.reveal.easing is invalid (got ${JSON.stringify(easing)}).`,
              'winPresentation.paylineStyle.reveal.easing',
              `use a known engine easing name in ${TEMPLATE_CONFIG_FILE}.`,
            );
          }
        }
      }
      const glow = asRecord(paylineStyle.glow);
      if (paylineStyle.glow !== undefined) {
        if (!glow) {
          addConfigIssue(
            issues,
            'winPresentation.paylineStyle.glow must be a plain object when set.',
            'winPresentation.paylineStyle.glow',
            `fix glow in ${TEMPLATE_CONFIG_FILE} or remove it.`,
          );
        } else {
          for (const key of Object.keys(glow)) {
            if (!WIN_PRESENTATION_PAYLINE_GLOW_KEYS.has(key)) {
              addConfigIssue(
                issues,
                `winPresentation.paylineStyle.glow has unknown key "${key}".`,
                `winPresentation.paylineStyle.glow.${key}`,
                `remove the key or align with engine PaylineGlowConfig in ${TEMPLATE_CONFIG_FILE}.`,
              );
            }
          }
          checkBooleanField(issues, glow.enabled, 'winPresentation.paylineStyle.glow.enabled');
          checkFinitePositiveField(issues, glow.width, 'winPresentation.paylineStyle.glow.width');
          checkAlphaField(issues, glow.alpha, 'winPresentation.paylineStyle.glow.alpha');
          if (glow.color !== undefined && !isColorValue(glow.color)) {
            addConfigIssue(
              issues,
              'winPresentation.paylineStyle.glow.color must be a finite number or 6-digit hex string.',
              'winPresentation.paylineStyle.glow.color',
              `set a valid glow.color in ${TEMPLATE_CONFIG_FILE}.`,
            );
          }
        }
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
            `use only showPaylines, showLineLabels, winLoopLimit, and showWinHighlight in ${TEMPLATE_CONFIG_FILE}.`,
          );
        }
      }
      for (const key of ['showPaylines', 'showLineLabels'] as const) {
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
      if (
        winLoopLimit !== undefined &&
        (typeof winLoopLimit !== 'number' || !Number.isInteger(winLoopLimit) || winLoopLimit < 1 || winLoopLimit > 100)
      ) {
        addConfigIssue(
          issues,
          'winPresentation.global.winLoopLimit must be an integer from 1 to 100 when set (engine playback safety clamp).',
          'winPresentation.global.winLoopLimit',
          `set winLoopLimit between 1 and 100 in ${TEMPLATE_CONFIG_FILE}.`,
        );
      }
      checkBooleanField(issues, global.showWinHighlight, 'winPresentation.global.showWinHighlight');
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
            `use only executionMode, loopEnabled, lifetime, symbolWins, lines, winText, linePresentationMode, and enabledModules in ${TEMPLATE_CONFIG_FILE} (template surface).`,
          );
        }
      }
      checkBooleanField(issues, visualizer.loopEnabled, 'winPresentation.visualizer.loopEnabled');
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
      validatePresentationLifetime(issues, visualizer.lifetime, 'winPresentation.visualizer.lifetime');
      validateVisualizerEnabledModules(issues, visualizer.enabledModules);
      validateSymbolWins(issues, visualizer.symbolWins);
      validatePresentationChild(issues, visualizer.lines, 'winPresentation.visualizer.lines');
      validatePresentationChild(issues, visualizer.winText, 'winPresentation.visualizer.winText');
    }
  }
}

function validateVisualizerEnabledModules(issues: PipelineIssue[], raw: unknown): void {
  if (raw === undefined) return;
  const em = asRecord(raw);
  const field = 'winPresentation.visualizer.enabledModules';
  if (!em) {
    addConfigIssue(
      issues,
      `${field} must be a plain object when set.`,
      field,
      `fix enabledModules in ${TEMPLATE_CONFIG_FILE} or remove it.`,
    );
    return;
  }
  for (const key of Object.keys(em)) {
    if (!WIN_PRESENTATION_VISUALIZER_MODULE_KEYS.has(key)) {
      addConfigIssue(
        issues,
        `${field} has unknown key "${key}".`,
        `${field}.${key}`,
        `use only highlight, linePath, jackpot, and winText under enabledModules in ${TEMPLATE_CONFIG_FILE}.`,
      );
    } else {
      checkBooleanField(issues, em[key], `${field}.${key}`);
    }
  }
}

function validatePresentationLifetime(issues: PipelineIssue[], raw: unknown, field: string): void {
  if (raw === undefined) return;
  const lifetime = asRecord(raw);
  if (!lifetime) {
    addConfigIssue(issues, `${field} must be a plain object when set.`, field, `fix ${field} in ${TEMPLATE_CONFIG_FILE} or remove it.`);
    return;
  }
  for (const key of Object.keys(lifetime)) {
    if (key !== 'durationPolicy' && key !== 'durationMs') {
      addConfigIssue(issues, `${field} has unknown key "${key}".`, `${field}.${key}`, `use only durationPolicy and durationMs under ${field}.`);
    }
  }
  const policy = lifetime.durationPolicy;
  if (policy !== undefined && (typeof policy !== 'string' || !WIN_PRESENTATION_DURATION_POLICIES.has(policy))) {
    addConfigIssue(
      issues,
      `${field}.durationPolicy must be fixedMs | untilNextSpin | once (got ${JSON.stringify(policy)}).`,
      `${field}.durationPolicy`,
      `set ${field}.durationPolicy in ${TEMPLATE_CONFIG_FILE}.`,
    );
  }
  checkFiniteNonNegativeField(issues, lifetime.durationMs, `${field}.durationMs`);
}

function validatePresentationChild(issues: PipelineIssue[], raw: unknown, field: string): void {
  if (raw === undefined) return;
  const child = asRecord(raw);
  if (!child) {
    addConfigIssue(issues, `${field} must be a plain object when set.`, field, `fix ${field} in ${TEMPLATE_CONFIG_FILE} or remove it.`);
    return;
  }
  for (const key of Object.keys(child)) {
    if (!WIN_PRESENTATION_CHILD_KEYS.has(key)) {
      addConfigIssue(issues, `${field} has unknown key "${key}".`, `${field}.${key}`, `use only enabled, lifetime, and durationMs under ${field}.`);
    }
  }
  checkBooleanField(issues, child.enabled, `${field}.enabled`);
  const lifetime = child.lifetime;
  if (lifetime !== undefined && (typeof lifetime !== 'string' || !WIN_PRESENTATION_CHILD_LIFETIMES.has(lifetime))) {
    addConfigIssue(
      issues,
      `${field}.lifetime must be followPresentation | fixedMs | once (got ${JSON.stringify(lifetime)}).`,
      `${field}.lifetime`,
      `set ${field}.lifetime in ${TEMPLATE_CONFIG_FILE}.`,
    );
  }
  checkFiniteNonNegativeField(issues, child.durationMs, `${field}.durationMs`);
}

function validateSymbolWins(issues: PipelineIssue[], raw: unknown): void {
  if (raw === undefined) return;
  const symbolWins = asRecord(raw);
  if (!symbolWins) {
    addConfigIssue(issues, 'winPresentation.visualizer.symbolWins must be a plain object when set.', 'winPresentation.visualizer.symbolWins', `fix symbolWins in ${TEMPLATE_CONFIG_FILE} or remove it.`);
    return;
  }
  for (const key of Object.keys(symbolWins)) {
    if (!WIN_PRESENTATION_SYMBOL_KEYS.has(key)) {
      addConfigIssue(issues, `winPresentation.visualizer.symbolWins has unknown key "${key}".`, `winPresentation.visualizer.symbolWins.${key}`, 'use only enabled, animation, and overlay under symbolWins.');
    }
  }
  checkBooleanField(issues, symbolWins.enabled, 'winPresentation.visualizer.symbolWins.enabled');
  validateSymbolWinAnimation(issues, symbolWins.animation);
  validateSymbolWinOverlay(issues, symbolWins.overlay);
}

function validateSymbolWinAnimation(issues: PipelineIssue[], raw: unknown): void {
  if (raw === undefined) return;
  const animation = asRecord(raw);
  const field = 'winPresentation.visualizer.symbolWins.animation';
  if (!animation) {
    addConfigIssue(issues, `${field} must be a plain object when set.`, field, `fix ${field} in ${TEMPLATE_CONFIG_FILE} or remove it.`);
    return;
  }
  for (const key of Object.keys(animation)) {
    if (!WIN_PRESENTATION_SYMBOL_ANIMATION_KEYS.has(key)) {
      addConfigIssue(issues, `${field} has unknown key "${key}".`, `${field}.${key}`, `use only enabled, animationKey, loopPolicy, and durationMs under ${field}.`);
    }
  }
  checkBooleanField(issues, animation.enabled, `${field}.enabled`);
  if (animation.animationKey !== undefined && (typeof animation.animationKey !== 'string' || animation.animationKey.trim().length === 0)) {
    addConfigIssue(issues, `${field}.animationKey must be a non-empty string when set.`, `${field}.animationKey`, `set a valid animation key in ${TEMPLATE_CONFIG_FILE}.`);
  }
  const loopPolicy = animation.loopPolicy;
  if (loopPolicy !== undefined && (typeof loopPolicy !== 'string' || !WIN_PRESENTATION_SYMBOL_LOOP_POLICIES.has(loopPolicy))) {
    addConfigIssue(
      issues,
      `${field}.loopPolicy must be presentation | untilNextSpin | fixedMs | once (got ${JSON.stringify(loopPolicy)}).`,
      `${field}.loopPolicy`,
      `set ${field}.loopPolicy in ${TEMPLATE_CONFIG_FILE}.`,
    );
  }
  checkFiniteNonNegativeField(issues, animation.durationMs, `${field}.durationMs`);
}

function validateSymbolWinOverlay(issues: PipelineIssue[], raw: unknown): void {
  if (raw === undefined) return;
  const overlay = asRecord(raw);
  const field = 'winPresentation.visualizer.symbolWins.overlay';
  if (!overlay) {
    addConfigIssue(issues, `${field} must be a plain object when set.`, field, `fix ${field} in ${TEMPLATE_CONFIG_FILE} or remove it.`);
    return;
  }
  for (const key of Object.keys(overlay)) {
    if (!WIN_PRESENTATION_SYMBOL_OVERLAY_KEYS.has(key)) {
      addConfigIssue(issues, `${field} has unknown key "${key}".`, `${field}.${key}`, `use only supported graphic overlay keys under ${field}.`);
    }
  }
  if (overlay.enabled !== undefined && typeof overlay.enabled !== 'boolean') {
    addConfigIssue(issues, `${field}.enabled must be a boolean when set.`, `${field}.enabled`, `set ${field}.enabled to true or false in ${TEMPLATE_CONFIG_FILE}.`);
  }
  if (overlay.enabled === false) return;
  if (overlay.type !== undefined && overlay.type !== 'graphic') {
    addConfigIssue(issues, `${field}.type must be graphic (got ${JSON.stringify(overlay.type)}).`, `${field}.type`, `set ${field}.type to "graphic" in ${TEMPLATE_CONFIG_FILE}.`);
  }
  const lifetime = overlay.lifetime;
  if (lifetime !== undefined && (typeof lifetime !== 'string' || !WIN_PRESENTATION_CHILD_LIFETIMES.has(lifetime))) {
    addConfigIssue(
      issues,
      `${field}.lifetime must be followPresentation | fixedMs | once (got ${JSON.stringify(lifetime)}).`,
      `${field}.lifetime`,
      `set ${field}.lifetime in ${TEMPLATE_CONFIG_FILE}.`,
    );
  }
  checkFiniteNonNegativeField(issues, overlay.durationMs, `${field}.durationMs`);
  if (overlay.fill !== undefined && !isColorValue(overlay.fill)) {
    addConfigIssue(issues, `${field}.fill must be a finite number or 6-digit hex string.`, `${field}.fill`, `set a valid fill in ${TEMPLATE_CONFIG_FILE}.`);
  }
  checkAlphaField(issues, overlay.alpha, `${field}.alpha`);
  checkFiniteNonNegativeField(issues, overlay.paddingPx, `${field}.paddingPx`);
  checkFiniteNonNegativeField(issues, overlay.cornerRadius, `${field}.cornerRadius`);
  validateSymbolWinOverlayStroke(issues, overlay.stroke);
  validateSymbolWinOverlayPulse(issues, overlay.pulse);
}

function validateSymbolWinOverlayStroke(issues: PipelineIssue[], raw: unknown): void {
  if (raw === undefined) return;
  const field = 'winPresentation.visualizer.symbolWins.overlay.stroke';
  const stroke = asRecord(raw);
  if (!stroke) {
    addConfigIssue(issues, `${field} must be a plain object when set.`, field, `fix ${field} in ${TEMPLATE_CONFIG_FILE} or remove it.`);
    return;
  }
  for (const key of Object.keys(stroke)) {
    if (!WIN_PRESENTATION_SYMBOL_OVERLAY_STROKE_KEYS.has(key)) {
      addConfigIssue(issues, `${field} has unknown key "${key}".`, `${field}.${key}`, `use only color, width, and alpha under ${field}.`);
    }
  }
  if (stroke.color !== undefined && !isColorValue(stroke.color)) {
    addConfigIssue(issues, `${field}.color must be a finite number or 6-digit hex string.`, `${field}.color`, `set a valid stroke color in ${TEMPLATE_CONFIG_FILE}.`);
  }
  checkFiniteNonNegativeField(issues, stroke.width, `${field}.width`);
  checkAlphaField(issues, stroke.alpha, `${field}.alpha`);
}

function validateSymbolWinOverlayPulse(issues: PipelineIssue[], raw: unknown): void {
  if (raw === undefined) return;
  const field = 'winPresentation.visualizer.symbolWins.overlay.pulse';
  const pulse = asRecord(raw);
  if (!pulse) {
    addConfigIssue(issues, `${field} must be a plain object when set.`, field, `fix ${field} in ${TEMPLATE_CONFIG_FILE} or remove it.`);
    return;
  }
  for (const key of Object.keys(pulse)) {
    if (!WIN_PRESENTATION_SYMBOL_OVERLAY_PULSE_KEYS.has(key)) {
      addConfigIssue(issues, `${field} has unknown key "${key}".`, `${field}.${key}`, `use only enabled, alpha, and durationMs under ${field}.`);
    }
  }
  checkBooleanField(issues, pulse.enabled, `${field}.enabled`);
  checkAlphaField(issues, pulse.alpha, `${field}.alpha`);
  checkFinitePositiveField(issues, pulse.durationMs, `${field}.durationMs`);
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
