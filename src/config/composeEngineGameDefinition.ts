import type {
  BootConfig,
  BootConfigInput,
  BootstrapInput,
  ISpinResultSource,
  SlotConfig,
  SpinFeelConfig,
  SpinFeelPresetName,
} from '@fnx/sl-engine';
import type { StarterAudioProfile } from './audioConfig.ts';
import type { StarterFeatureConfig } from './featureConfig.ts';
import { STARTER_SPIN_FEEL_PRESETS } from './templateGameConfig.ts';
import type {
  TemplateBackgroundConfig,
  TemplateBootBackgroundConfig,
  TemplateGameConfig,
  TemplateReelWindowMaskConfig,
  TemplateSlotFrameConfig,
  TemplateSlotLayoutConfig,
  TemplateSlotLayoutOverride,
  TemplateSymbolLayoutConfig,
  TemplateViewportConfig,
} from './templateGameConfig.ts';

type EngineBackgroundConfig = NonNullable<BootstrapInput['background']>;
type EngineFrameConfig = NonNullable<BootstrapInput['frame']>;
type EngineLayoutInput = NonNullable<BootstrapInput['layout']>;
type EngineOrientationConfig = NonNullable<BootstrapInput['orientation']>;
type EngineReelMasks = NonNullable<BootstrapInput['reelMasks']>;
type EngineReelMask = EngineReelMasks[number];
type EngineViewportViewConfig = NonNullable<EngineOrientationConfig['landscape']>;

export interface StarterGameDefinition {
  slotConfig: SlotConfig;
  bootConfig: BootConfigInput;
  spinFeelPreset: SpinFeelPresetName;
  /**
   * Merged after the preset via engine `resolveSpinFeelConfig` (same channel as `bootstrap.spinFeelOverrides`).
   * Use for timings, `symbolStripStopSettle`, reel order, etc., without hand-authoring a full `SpinFeelConfig`.
   */
  spinFeelOverrides?: Partial<SpinFeelConfig>;
  audioConfig: StarterAudioProfile;
  featureConfig: StarterFeatureConfig;
  createResultSource: () => ISpinResultSource;
  background?: BootstrapInput['background'];
  frame?: BootstrapInput['frame'];
  layout?: BootstrapInput['layout'];
  reelMasks?: BootstrapInput['reelMasks'];
  orientation?: BootstrapInput['orientation'];
  /** Pixi canvas clear (`BootstrapInput.backgroundColor`). Mirrors template solid slot color when applicable. */
  canvasBackgroundColor: number;
}

export interface ComposeEngineGameDefinitionInputs {
  slotConfig: SlotConfig;
  bootConfig: BootConfigInput;
  fallbackSpinFeelPreset: SpinFeelPresetName;
  audioConfig: StarterAudioProfile;
  featureConfig: StarterFeatureConfig;
  createResultSource: () => ISpinResultSource;
  /**
   * When the slot scene uses an image background, `build-config.json` may still supply
   * `display.backgroundColor` for Pixi canvas clear / letterboxing. Omitted when the JSON key is absent.
   */
  canvasClearColorFromBuild?: number;
}

interface SlotShapeSummary {
  reelCount: number;
  maxRows: number;
}

interface ComposedLayoutProfile {
  viewport?: TemplateViewportConfig;
  layout: EngineLayoutInput;
  reelMasks?: EngineReelMasks;
}

type ResolvedTemplateSlotLayoutConfig = TemplateSlotLayoutConfig & {
  viewport?: TemplateViewportConfig;
};

const STARTER_DEFAULT_SYMBOLS = {
  width: 140,
  height: 140,
  gapY: 5,
  reelGap: 10,
} as const;

const STARTER_DEFAULT_VIEWPORT = {
  landscape: { width: 1280, height: 720 },
  portrait: { width: 720, height: 1280 },
} as const;

/** Letterbox / image-slot canvas clear fallback (aligned with engine `STARTUP_DEFAULTS.backgroundColor`). */
const ENGINE_DEFAULT_CANVAS_CLEAR = 0x1a1a2e as const;

function resolveCanvasBackgroundColor(
  background: EngineBackgroundConfig | undefined,
  canvasClearColorFromBuild: number | undefined,
): number {
  if (background?.type === 'solid') {
    const c = background.color;
    if (c === undefined) {
      throw new Error('Starter template config: solid slot background must include color');
    }
    return c;
  }
  if (canvasClearColorFromBuild !== undefined) {
    return canvasClearColorFromBuild;
  }
  return ENGINE_DEFAULT_CANVAS_CLEAR;
}

function isBlank(value: string): boolean {
  return value.trim().length === 0;
}

function assertSpinFeelPreset(value: SpinFeelPresetName | undefined): SpinFeelPresetName | undefined {
  if (value === undefined) return undefined;
  if (!(STARTER_SPIN_FEEL_PRESETS as readonly string[]).includes(value)) {
    throw new Error(
      `Starter template config: spinFeel.preset "${value}" is not supported. Supported presets: ${STARTER_SPIN_FEEL_PRESETS.join(', ')}`,
    );
  }
  return value;
}

function assertPositive(value: number | undefined, field: string): void {
  if (value === undefined) return;
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Starter template config: ${field} must be a positive number`);
  }
}

function assertNonNegative(value: number | undefined, field: string): void {
  if (value === undefined) return;
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Starter template config: ${field} must be a non-negative number`);
  }
}

function assertFiniteNumber(value: number | undefined, field: string): void {
  if (value === undefined) return;
  if (!Number.isFinite(value)) {
    throw new Error(`Starter template config: ${field} must be a finite number`);
  }
}

function assertOpacity(value: number | undefined, field: string): void {
  if (value === undefined) return;
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`Starter template config: ${field} must be between 0 and 1`);
  }
}

function assertCompatibleDimension(actual: number, expected: number, field: string): void {
  if (Math.abs(actual - expected) > 0.001) {
    throw new Error(
      `Starter template config: ${field} conflicts with explicit symbol layout (expected ${expected}, got ${actual})`,
    );
  }
}

function getSlotShapeSummary(slotConfig: SlotConfig): SlotShapeSummary {
  return {
    reelCount: slotConfig.layout.reelCount,
    maxRows: Math.max(...slotConfig.layout.rowsPerReel),
  };
}

function composeSlotBackground(config: TemplateBackgroundConfig | undefined): EngineBackgroundConfig | undefined {
  if (!config) return undefined;
  assertOpacity(config.alpha, 'scenes.slot.background.alpha');
  const opacity = config.alpha ?? 1;
  if ('assetKey' in config) {
    if (isBlank(config.assetKey)) {
      throw new Error('Starter template config: background assetKey must be non-empty');
    }
    return {
      type: 'image',
      imageKey: config.assetKey,
      scaleMode: config.fit ?? 'cover',
      gradientAngle: 0,
      opacity,
    };
  }
  return {
    type: 'solid',
    color: config.color,
    scaleMode: 'cover',
    gradientAngle: 0,
    opacity,
  };
}

function composeBootBackground(config: TemplateBootBackgroundConfig | undefined): BootConfig['loading']['background'] | undefined {
  if (!config) return undefined;
  if ('assetKey' in config) {
    if (isBlank(config.assetKey)) {
      throw new Error('Starter template config: boot/start background assetKey must be non-empty');
    }
    return {
      type: 'image',
      value: config.assetKey,
      ...(config.fit !== undefined ? { imageScaleMode: config.fit } : {}),
    };
  }
  return { type: 'color', value: config.color };
}

function composeFrame(config: TemplateSlotFrameConfig | undefined): EngineFrameConfig | undefined {
  if (!config) return undefined;
  if (isBlank(config.assetKey)) {
    throw new Error('Starter template config: frame assetKey must be non-empty');
  }

  assertFiniteNumber(config.offsetX, 'scenes.slot.frame.offsetX');
  assertFiniteNumber(config.offsetY, 'scenes.slot.frame.offsetY');
  assertNonNegative(config.reelsPaddingPx, 'scenes.slot.frame.reelsPaddingPx');
  assertPositive(config.scale, 'scenes.slot.frame.scale');
  assertOpacity(config.alpha, 'scenes.slot.frame.alpha');

  return {
    enabled: config.enabled ?? true,
    imageKey: config.assetKey,
    layer: config.layer ?? 'overlay',
    anchor: config.anchor ?? 'center',
    anchorTarget: config.anchorTarget ?? 'reels',
    offset: [config.offsetX ?? 0, config.offsetY ?? 0],
    scaleMode: config.scaleMode ?? 'fit',
    fitTarget: config.fitTarget ?? 'viewport',
    reelsPaddingPx: config.reelsPaddingPx ?? 0,
    scale: config.scale ?? 1,
    zIndex: 100,
    opacity: config.alpha ?? 1,
  };
}

function composeSymbolLayout(
  layoutConfig: TemplateSlotLayoutConfig,
  slotShape: SlotShapeSummary,
): EngineLayoutInput {
  const symbols: TemplateSymbolLayoutConfig = layoutConfig.symbols ?? {};
  const reelWindow = layoutConfig.reelWindow;

  assertPositive(symbols.width, 'layout.symbols.width');
  assertPositive(symbols.height, 'layout.symbols.height');
  assertNonNegative(symbols.gapY, 'layout.symbols.gapY');
  assertNonNegative(symbols.reelGap, 'layout.symbols.reelGap');
  assertFiniteNumber(reelWindow.x, 'layout.reelWindow.x');
  assertFiniteNumber(reelWindow.y, 'layout.reelWindow.y');
  assertPositive(reelWindow.width, 'layout.reelWindow.width');
  assertPositive(reelWindow.height, 'layout.reelWindow.height');

  let symbolWidth = symbols.width;
  let symbolHeight = symbols.height;
  let symbolGap = symbols.gapY;
  let reelGap = symbols.reelGap;

  if (reelWindow.width !== undefined) {
    const widthReelGap = reelGap ?? STARTER_DEFAULT_SYMBOLS.reelGap;
    const derivedWidth = (reelWindow.width - (slotShape.reelCount - 1) * widthReelGap) / slotShape.reelCount;
    assertPositive(derivedWidth, 'layout.reelWindow.width derived symbol width');
    if (symbolWidth === undefined) {
      symbolWidth = derivedWidth;
      reelGap = widthReelGap;
    } else {
      const actualWidth = slotShape.reelCount * symbolWidth + (slotShape.reelCount - 1) * widthReelGap;
      assertCompatibleDimension(actualWidth, reelWindow.width, 'layout.reelWindow.width');
      reelGap = widthReelGap;
    }
  }

  if (reelWindow.height !== undefined) {
    const heightGap = symbolGap ?? STARTER_DEFAULT_SYMBOLS.gapY;
    const derivedHeight = (reelWindow.height - Math.max(0, slotShape.maxRows - 1) * heightGap) / slotShape.maxRows;
    assertPositive(derivedHeight, 'layout.reelWindow.height derived symbol height');
    if (symbolHeight === undefined) {
      symbolHeight = derivedHeight;
      symbolGap = heightGap;
    } else {
      const actualHeight = slotShape.maxRows * symbolHeight + Math.max(0, slotShape.maxRows - 1) * heightGap;
      assertCompatibleDimension(actualHeight, reelWindow.height, 'layout.reelWindow.height');
      symbolGap = heightGap;
    }
  }

  return {
    ...(symbolWidth !== undefined ? { symbolWidth } : {}),
    ...(symbolHeight !== undefined ? { symbolHeight } : {}),
    ...(symbolGap !== undefined ? { symbolGap } : {}),
    ...(reelGap !== undefined ? { reelGap } : {}),
    ...(reelWindow.x !== undefined ? { reelsOffsetX: reelWindow.x } : {}),
    ...(reelWindow.y !== undefined ? { reelsOffsetY: reelWindow.y } : {}),
  };
}

function composeMask(
  mask: TemplateReelWindowMaskConfig | undefined,
  layout: EngineLayoutInput,
  slotShape: SlotShapeSummary,
): EngineReelMasks | undefined {
  if (!mask || mask.enabled === false) return undefined;

  assertPositive(mask.width, 'layout.reelWindow.mask.width');
  assertPositive(mask.height, 'layout.reelWindow.mask.height');
  assertFiniteNumber(mask.x, 'layout.reelWindow.mask.x');
  assertFiniteNumber(mask.y, 'layout.reelWindow.mask.y');
  assertNonNegative(mask.padding?.top, 'layout.reelWindow.mask.padding.top');
  assertNonNegative(mask.padding?.right, 'layout.reelWindow.mask.padding.right');
  assertNonNegative(mask.padding?.bottom, 'layout.reelWindow.mask.padding.bottom');
  assertNonNegative(mask.padding?.left, 'layout.reelWindow.mask.padding.left');

  const top = mask.padding?.top ?? 0;
  const right = mask.padding?.right ?? 0;
  const bottom = mask.padding?.bottom ?? 0;
  const left = mask.padding?.left ?? 0;
  const baseWidth = mask.width ?? layout.symbolWidth;
  const baseHeight =
    mask.height ??
    (layout.symbolHeight !== undefined
      ? slotShape.maxRows * layout.symbolHeight + Math.max(0, slotShape.maxRows - 1) * (layout.symbolGap ?? 0)
      : undefined);

  const reelMask: EngineReelMask = {
    ...(mask.x !== undefined || left > 0 ? { x: (mask.x ?? 0) - left } : {}),
    ...(mask.y !== undefined || top > 0 ? { y: (mask.y ?? 0) - top } : {}),
    ...(baseWidth !== undefined ? { width: baseWidth + left + right } : {}),
    ...(baseHeight !== undefined ? { height: baseHeight + top + bottom } : {}),
    ...(mask.debug !== undefined ? { debug: mask.debug } : {}),
  };

  return [reelMask];
}

function mergeSlotsFrameForOrientation(
  sceneSlotFrame: TemplateSlotFrameConfig | undefined,
  orientationOverride: Partial<TemplateSlotFrameConfig> | undefined,
): TemplateSlotFrameConfig | undefined {
  if (!sceneSlotFrame && !orientationOverride) return undefined;
  if (!orientationOverride) return sceneSlotFrame;
  return { ...(sceneSlotFrame ?? {}), ...orientationOverride } as TemplateSlotFrameConfig;
}

function mergeLayoutConfig(
  base: TemplateSlotLayoutConfig,
  override: TemplateSlotLayoutOverride | undefined,
): ResolvedTemplateSlotLayoutConfig {
  if (!override) return base;
  const baseMask = base.reelWindow.mask;
  const overrideMask = override.reelWindow?.mask;
  const mask =
    baseMask || overrideMask
      ? {
          ...baseMask,
          ...overrideMask,
          padding: {
            ...baseMask?.padding,
            ...overrideMask?.padding,
          },
        }
      : undefined;

  return {
    viewport: {
      ...override.viewport,
    },
    reelWindow: {
      ...base.reelWindow,
      ...override.reelWindow,
      ...(mask ? { mask } : {}),
    },
    symbols: {
      ...base.symbols,
      ...override.symbols,
    },
  };
}

function composeLayoutProfile(
  layoutConfig: ResolvedTemplateSlotLayoutConfig,
  slotShape: SlotShapeSummary,
): ComposedLayoutProfile {
  const layout = composeSymbolLayout(layoutConfig, slotShape);
  return {
    viewport: layoutConfig.viewport,
    layout,
    reelMasks: composeMask(layoutConfig.reelWindow.mask, layout, slotShape),
  };
}

function composeOrientationProfile(
  profile: ComposedLayoutProfile,
  fallbackViewport: { width: number; height: number },
  viewportFieldPrefix: string,
  slotBackground: EngineBackgroundConfig | undefined,
  frame: EngineFrameConfig | undefined,
): EngineViewportViewConfig {
  assertPositive(profile.viewport?.width, `${viewportFieldPrefix}.width`);
  assertPositive(profile.viewport?.height, `${viewportFieldPrefix}.height`);

  return {
    width: profile.viewport?.width ?? fallbackViewport.width,
    height: profile.viewport?.height ?? fallbackViewport.height,
    layout: profile.layout,
    ...(slotBackground ? { background: slotBackground } : {}),
    ...(frame ? { frame } : {}),
    ...(profile.reelMasks ? { reelMasks: profile.reelMasks } : {}),
  };
}

function composeOrientation(
  templateConfig: TemplateGameConfig,
  slotShape: SlotShapeSummary,
  slotBackground: EngineBackgroundConfig | undefined,
  sceneSlotFrame: TemplateSlotFrameConfig | undefined,
): EngineOrientationConfig | undefined {
  const hasPortrait = templateConfig.layout.portrait !== undefined;
  const hasLandscape = templateConfig.layout.landscape !== undefined;
  if (!hasPortrait && !hasLandscape) return undefined;

  const orientation: EngineOrientationConfig = {
    enabled: true,
    orientationMode: 'aspect',
  };

  if (hasLandscape) {
    const merged = mergeLayoutConfig(templateConfig.layout.base, templateConfig.layout.landscape);
    const landscapeFrame = composeFrame(
      mergeSlotsFrameForOrientation(sceneSlotFrame, templateConfig.layout.landscape?.frame),
    );
    orientation.landscape = composeOrientationProfile(
      composeLayoutProfile(merged, slotShape),
      STARTER_DEFAULT_VIEWPORT.landscape,
      'layout.landscape.viewport',
      slotBackground,
      landscapeFrame,
    );
  }

  if (hasPortrait) {
    const merged = mergeLayoutConfig(templateConfig.layout.base, templateConfig.layout.portrait);
    const portraitFrame = composeFrame(
      mergeSlotsFrameForOrientation(sceneSlotFrame, templateConfig.layout.portrait?.frame),
    );
    orientation.portrait = composeOrientationProfile(
      composeLayoutProfile(merged, slotShape),
      STARTER_DEFAULT_VIEWPORT.portrait,
      'layout.portrait.viewport',
      slotBackground,
      portraitFrame,
    );
  }

  return orientation;
}

function composeBootConfig(
  baseBootConfig: BootConfigInput,
  templateConfig: TemplateGameConfig,
): BootConfigInput {
  const loadingBackground = composeBootBackground(templateConfig.scenes.boot?.background);
  const startBackground = composeBootBackground(templateConfig.scenes.start?.background);

  return {
    ...baseBootConfig,
    loading: {
      ...baseBootConfig.loading,
      ...(loadingBackground ? { background: loadingBackground } : {}),
    },
    start: {
      ...baseBootConfig.start,
      ...(startBackground ? { background: startBackground } : {}),
    },
  };
}

export function composeEngineGameDefinition(
  templateConfig: TemplateGameConfig,
  inputs: ComposeEngineGameDefinitionInputs,
): StarterGameDefinition {
  const slotShape = getSlotShapeSummary(inputs.slotConfig);
  const baseProfile = composeLayoutProfile(templateConfig.layout.base, slotShape);
  const background = composeSlotBackground(templateConfig.scenes.slot.background);
  const sceneSlotFrame = templateConfig.scenes.slot.frame;
  const frame = composeFrame(sceneSlotFrame);
  const orientation = composeOrientation(templateConfig, slotShape, background, sceneSlotFrame);
  const canvasBackgroundColor = resolveCanvasBackgroundColor(background, inputs.canvasClearColorFromBuild);

  return {
    slotConfig: {
      ...inputs.slotConfig,
      gameId: templateConfig.game.id,
      gameName: templateConfig.game.name,
      ...(templateConfig.game.version ? { version: templateConfig.game.version } : {}),
    },
    bootConfig: composeBootConfig(inputs.bootConfig, templateConfig),
    spinFeelPreset: assertSpinFeelPreset(templateConfig.spinFeel?.preset) ?? inputs.fallbackSpinFeelPreset,
    spinFeelOverrides: templateConfig.spinFeel?.overrides,
    audioConfig: inputs.audioConfig,
    featureConfig: inputs.featureConfig,
    createResultSource: inputs.createResultSource,
    background,
    frame,
    layout: baseProfile.layout,
    reelMasks: baseProfile.reelMasks,
    orientation,
    canvasBackgroundColor,
  };
}
