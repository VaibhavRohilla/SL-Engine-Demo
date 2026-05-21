import type { SpinFeelPresetName } from '@fnx/sl-engine';
import buildConfig from '../../build-config.json';

const SPIN_FEEL_PRESETS = ['classic', 'premium', 'snappy', 'heavy', 'arcade'] as const;
const SPIN_FEEL_PRESET_SET = new Set<string>(SPIN_FEEL_PRESETS);

interface StarterRawBuildConfig {
  display?: Record<string, unknown>;
  spinFeel?: { preset?: unknown };
  boot?: {
    manifestUrl?: unknown;
    startSceneBundles?: unknown;
    skipStartScreen?: unknown;
  };
}

interface StarterRuntimeBootFragment {
  manifestUrl: string;
  startSceneBundles: string[];
  skipStartScreen: boolean;
}

export interface StarterRuntimeDisplayConfig {
  width: number;
  height: number;
  /**
   * Present only when `build-config.json` explicitly sets `display.backgroundColor`.
   * Used as Pixi canvas clear when the slot template uses an image background (no solid color to mirror).
   */
  canvasClearColorFromBuild?: number;
}

export interface StarterRuntimeBuildConfig {
  spinFeelPreset: SpinFeelPresetName;
  boot: StarterRuntimeBootFragment;
  display: StarterRuntimeDisplayConfig;
}

const rawBuildConfig = buildConfig as StarterRawBuildConfig;

function parseString(value: unknown, field: string, fallback: string): string {
  if (value === undefined) return fallback;
  if (typeof value !== 'string') {
    throw new Error(`Starter: ${field} must be a string`);
  }
  return value;
}

function parseBoolean(value: unknown, field: string, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  if (typeof value !== 'boolean') {
    throw new Error(`Starter: ${field} must be a boolean`);
  }
  return value;
}

function parseStringArray(value: unknown, field: string, fallback: string[]): string[] {
  if (value === undefined) return fallback;
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    throw new Error(`Starter: ${field} must be an array of strings`);
  }
  return [...value];
}

function parseSpinFeelPreset(value: unknown): SpinFeelPresetName {
  if (value === undefined) return 'premium';
  if (typeof value !== 'string') {
    throw new Error(
      `Starter: build-config.spinFeel.preset must be a string. Supported presets: ${SPIN_FEEL_PRESETS.join(', ')}`,
    );
  }
  if (!SPIN_FEEL_PRESET_SET.has(value)) {
    throw new Error(
      `Starter: invalid spinFeel preset "${value}". Supported presets: ${SPIN_FEEL_PRESETS.join(', ')}`,
    );
  }
  return value as SpinFeelPresetName;
}

function parseRuntimeBootFragment(raw: StarterRawBuildConfig['boot']): StarterRuntimeBootFragment {
  return {
    manifestUrl: parseString(raw?.manifestUrl, 'build-config.boot.manifestUrl', 'assets/manifest.json'),
    startSceneBundles: parseStringArray(raw?.startSceneBundles, 'build-config.boot.startSceneBundles', ['main']),
    skipStartScreen: parseBoolean(raw?.skipStartScreen, 'build-config.boot.skipStartScreen', false),
  };
}

function parsePositiveInt(value: unknown, field: string, fallback: number): number {
  if (value === undefined) return fallback;
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new Error(`Starter: ${field} must be a positive integer`);
  }
  return value;
}

/**
 * Parses `0xRRGGBB`, `#RRGGBB`, or `RRGGBB` (6 hex digits). Rejects alpha-only 8-digit forms for canvas clear.
 */
function parseHexColorString(value: unknown, field: string): number {
  if (typeof value !== 'string') {
    throw new Error(`Starter: ${field} must be a string hex color`);
  }
  const trimmed = value.trim();
  const body = trimmed.startsWith('0x') || trimmed.startsWith('0X')
    ? trimmed.slice(2)
    : trimmed.startsWith('#')
      ? trimmed.slice(1)
      : trimmed;
  if (!/^[0-9a-fA-F]{6}$/.test(body)) {
    throw new Error(
      `Starter: ${field} must be a 6-digit hex string (e.g. "0x1a1a2e" or "#1a1a2e"); got "${value}"`,
    );
  }
  return parseInt(body, 16);
}

function parseDisplay(raw: StarterRawBuildConfig['display']): StarterRuntimeDisplayConfig {
  if (raw === undefined) {
    return { width: 1280, height: 720 };
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error('Starter: build-config.display must be an object');
  }
  const width = parsePositiveInt(raw.width, 'build-config.display.width', 1280);
  const height = parsePositiveInt(raw.height, 'build-config.display.height', 720);
  const explicitCanvas = Object.prototype.hasOwnProperty.call(raw, 'backgroundColor');
  if (!explicitCanvas) {
    return { width, height };
  }
  return {
    width,
    height,
    canvasClearColorFromBuild: parseHexColorString(raw.backgroundColor, 'build-config.display.backgroundColor'),
  };
}

export const starterRuntimeBuildConfig: StarterRuntimeBuildConfig = {
  spinFeelPreset: parseSpinFeelPreset(rawBuildConfig.spinFeel?.preset),
  boot: parseRuntimeBootFragment(rawBuildConfig.boot),
  display: parseDisplay(rawBuildConfig.display),
};
