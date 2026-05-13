import type { SpinFeelConfigOverrides, SpinFeelPresetName } from '@fnx/sl-engine';

export const STARTER_SPIN_FEEL_PRESETS = ['premium', 'arcade', 'turbo', 'normal'] as const satisfies readonly SpinFeelPresetName[];
export type StarterSpinFeelPresetName = (typeof STARTER_SPIN_FEEL_PRESETS)[number];

export type TemplateBackgroundFit = 'cover' | 'contain' | 'stretch' | 'screen-cover';

export type TemplateBackgroundConfig =
  | {
      color: number;
      alpha?: number;
    }
  | {
      assetKey: string;
      fit?: TemplateBackgroundFit;
      alpha?: number;
    };

export type TemplateBootBackgroundConfig =
  | {
      color: number;
    }
  | {
      assetKey: string;
      /** Same vocabulary as slot scene backgrounds (`scenes.slot.background`). */
      fit?: TemplateBackgroundFit;
    };

export interface TemplateViewportConfig {
  width?: number;
  height?: number;
}

export interface TemplateRectConfig {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TemplateBootSceneConfig {
  background?: TemplateBootBackgroundConfig;
}

export interface TemplateStartSceneConfig {
  background?: TemplateBootBackgroundConfig;
}

export interface TemplateSlotFrameConfig {
  assetKey: string;
  enabled?: boolean;
  layer?: 'overlay' | 'game';
  anchor?: 'center' | 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  anchorTarget?: 'reels' | 'viewport';
  offsetX?: number;
  offsetY?: number;
  scaleMode?: 'fit' | 'fill' | 'none';
  fitTarget?: 'viewport' | 'reels';
  reelsPaddingPx?: number;
  scale?: number;
  alpha?: number;
}

export interface TemplateSlotSceneConfig {
  background?: TemplateBackgroundConfig;
  frame?: TemplateSlotFrameConfig;
}

export interface TemplateReelWindowMaskConfig {
  enabled?: boolean;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  padding?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  debug?: boolean;
}

export interface TemplateSymbolLayoutConfig {
  width?: number;
  height?: number;
  /** Vertical pixel gap between symbols in the same reel. */
  gapY?: number;
  /** Horizontal pixel gap between reels. */
  reelGap?: number;
}

export interface TemplateSlotLayoutConfig {
  reelWindow: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    /**
     * Rectangular reel-local clipping mask. A single mask is broadcast to every reel by the engine.
     */
    mask?: TemplateReelWindowMaskConfig;
  };
  symbols?: TemplateSymbolLayoutConfig;
}

export interface TemplateSlotLayoutOverride {
  viewport?: TemplateViewportConfig;
  reelWindow?: Partial<TemplateSlotLayoutConfig['reelWindow']>;
  symbols?: TemplateSymbolLayoutConfig;
  /**
   * Merged shallowly onto `scenes.slot.frame`: set only fields that differ per orientation (e.g. `scale`).
   * Omitted ⇒ use scene frame as-is when orientation is portrait/landscape.
   */
  frame?: Partial<TemplateSlotFrameConfig>;
}

/**
 * Payline / line-win presentation overrides for the stock win presenter.
 * Forwarded to bootstrap as `scenes.game` + `SlotGameScene.fromContext` `winPresenterConfigOverrides`
 * (same nesting as engine `WinPresenterFullConfig`: `paylineStyle`, `global`, `visualizer`, `timing`, `textPosition`).
 */
export interface TemplateWinPresentationConfig {
  paylineStyle?: {
    lineColor?: number;
    lineThickness?: number;
    lineAlpha?: number;
    animateDrawing?: boolean;
    drawingDurationMs?: number;
    paylineStartInsetPx?: number;
    showLineLabel?: boolean;
    labelFontSize?: number;
    labelColor?: number;
    /** Pixi stroke cap: `round` for rounded line ends. */
    lineCap?: 'butt' | 'round' | 'square';
    /** Pixi stroke join: `round` for rounded corners along the path. */
    lineJoin?: 'miter' | 'round' | 'bevel';
  };
  /**
   * Win banner position relative to reel band (engine `WinPresenterFullConfig.textPosition`).
   * Positive `yOffset` moves the win text **down** (negative is above reel center).
   */
  textPosition?: {
    xOffset?: number;
    yOffset?: number;
  };
  /** Durations merged into engine `WinPresenterFullConfig.timing`. */
  timing?: {
    singleWinDurationMs?: number;
    betweenWinsDelayMs?: number;
    /** How long the combined win overlay stays visible after all wins resolve. */
    allWinsDurationMs?: number;
  };
  global?: {
    showPaylines?: boolean;
    showLineLabels?: boolean;
    /**
     * When `true`, each win event runs separately (clear between), which staggers line vs text.
     * When `false`, the engine shows one combined snapshot (line + highlights + win text together).
     */
    showIndividualWins?: boolean;
    clearBetweenEvents?: boolean;
    /** Clear overlay between repeat cycles when `visualizer.loopEnabled` is true (engine `global.clearBetweenCycles`). */
    clearBetweenCycles?: boolean;
    /**
     * Max full win-presentation cycles when looping (`WinVisualizerCore` / `global.winLoopLimit`).
     * Requires `visualizer.loopEnabled: true`.
     */
    winLoopLimit?: number;
    /** Optional win text / amount tween overrides (engine `global.winText`). */
    winText?: {
      amountTween?: {
        enabled?: boolean;
        durationMs?: number;
      };
    };
  };
  visualizer?: {
    linePresentationMode?: 'vector' | 'boundsOverlay';
    /** Stock default is `parallel` (line + text modules at once). Prefer explicit for templates. */
    executionMode?: 'parallel' | 'sequential';
    /**
     * When `true`, the win visualizer repeats the full presentation up to `global.winLoopLimit` times
     * (engine `visualizer.loopEnabled`).
     */
    loopEnabled?: boolean;
  };
}

export interface TemplateGameConfig {
  game: {
    id: string;
    name: string;
    version?: string;
  };
  scenes: {
    boot?: TemplateBootSceneConfig;
    start?: TemplateStartSceneConfig;
    slot: TemplateSlotSceneConfig;
  };
  layout: {
    base: TemplateSlotLayoutConfig;
    portrait?: TemplateSlotLayoutOverride;
    landscape?: TemplateSlotLayoutOverride;
  };
  /** Optional payline colors, thickness, draw animation, line mode — see `TemplateWinPresentationConfig`. */
  winPresentation?: TemplateWinPresentationConfig;
  spinFeel?: {
    /**
     * Supported preset ids are exactly `premium`, `arcade`, `turbo`, and `normal`.
     * Custom spinFeel via `overrides` is deep-merged then validated by the engine at bootstrap (`spinFeelOverrides`).
     * See `docs/STARTER_CONTRACT.md` and `@fnx/sl-engine` SpinFeel presets / validators.
     */
    preset: StarterSpinFeelPresetName;
    /**
     * Active `SpinFeelConfig` fields merged on top of the preset (same as `bootstrap.spinFeelOverrides`).
     * Nested objects are deep-merged, then the resolved spinFeel is validated.
     *
     * **Classic-only fields** (no-op in gravity mode, rejected if used there):
     * `startDelayMs`, `stopDelayMs`, `startMotion`, `stopMotion`, `snap`,
     * `reelStopOrder`, `stopTravelSymbolsMin`, `stopTravelSymbolsMax`,
     * `spinSpeedPxPerSec`, `maxScrollPerFrame`, `symbolStripStopSettle`.
     *
     * **Gravity-only fields** (no-op in classic mode, rejected if used there):
     * `gravityMotion`, `turbo.dropDurationMs`, `turbo.fillDurationMs`.
     *
     * **Shared fields** (valid in both modes):
     * `minSpinMs`, `maxSpinMs`, `symbolHeightPx`, `audioCues`, `turbo` (base fields).
     *
     * Invalid mode-specific overrides fail fast at boot — no silent no-ops.
     * Removed fields (`spinEase`, `snap.thresholdPx`, `anticipation`) are also rejected.
     *
     * Example: `{ symbolStripStopSettle: { mode: 'none' } }` removes the stock sprite stop bounce.
     */
    overrides?: SpinFeelConfigOverrides;
  };
}

export const CLASSIC_PORTRAIT_COMPOSITION = {
  designWidth: 720,
  designHeight: 1280,
  frameRect: {
    x: 40,
    y: 310,
    width: 640,
    height: 424,
  },
  reelWindowRect: {
    x: 60,
    y: 430,
    width: 600,
    height: 384,
  },
  reelMaskRect: {
    x: 60,
    y: 330,
    width: 600,
    height: 384,

  },
  symbolWidth: 112,
  symbolHeight: 124,
  reelGap: 10,
  rowGap: 6,
  hudSafeArea: {
    bottomReservedHeight: 280,
  },
} as const satisfies {
  designWidth: number;
  designHeight: number;
  frameRect: TemplateRectConfig;
  reelWindowRect: TemplateRectConfig;
  reelMaskRect: TemplateRectConfig;
  symbolWidth: number;
  symbolHeight: number;
  reelGap: number;
  rowGap: number;
  hudSafeArea: {
    bottomReservedHeight: number;
  };
};

const REEL_COUNT = 5;
const VISIBLE_ROWS = 3;

const BASE_SYMBOL_WIDTH = 140;
const BASE_SYMBOL_HEIGHT = 140;
const BASE_REEL_GAP = 5;
const BASE_ROW_GAP = 5;

const LANDSCAPE_SYMBOL_WIDTH = 140;
const LANDSCAPE_SYMBOL_HEIGHT = 135;
const LANDSCAPE_REEL_GAP = 5;
const LANDSCAPE_ROW_GAP = 5;

function computeWindowWidth(symbolWidth: number, reelGap: number): number {
  return REEL_COUNT * symbolWidth + Math.max(0, REEL_COUNT - 1) * reelGap;
}

function computeWindowHeight(symbolHeight: number, rowGap: number): number {
  return VISIBLE_ROWS * symbolHeight + Math.max(0, VISIBLE_ROWS - 1) * rowGap;
}
 
export const templateGameConfig: TemplateGameConfig = {
  game: {
    id: 'cleopatrademoslot',
    name: 'Cleopatra Demo Slot',
    version: '1.0.0',
  },

  scenes: {
    boot: {
      /** Must match manifest key `Background` (`assets/manifest.json`). Overrides `bootConfig.loading.background` via `composeBootConfig`. */
      background: { assetKey: 'Background', fit: 'screen-cover' },
    },
    start: {
      background: { assetKey: 'Background', fit: 'screen-cover' },
    },
    slot: {
      background: { assetKey: 'Background', fit: 'screen-cover' },
      // Example after adding assets/frames/main.png and running `pnpm assets`:
      frame: { assetKey: 'SlotMachine_3x5', enabled: true, fitTarget: 'viewport', layer : 'game', anchor : 'center', anchorTarget : 'viewport', offsetX : 0, offsetY : 0, scaleMode : 'fill', scale : 1, alpha : 1 },
    },
  },

  layout: {
    base: {
      reelWindow: {
        x: 250,
        y: 132,
        width: computeWindowWidth(BASE_SYMBOL_WIDTH, BASE_REEL_GAP),
        height: computeWindowHeight(BASE_SYMBOL_HEIGHT, BASE_ROW_GAP),
      },
      symbols: {
        width: BASE_SYMBOL_WIDTH,
        height: BASE_SYMBOL_HEIGHT,
        gapY: BASE_ROW_GAP,
        reelGap: BASE_REEL_GAP,
      },
    },
    portrait: {
      viewport: {
        width: CLASSIC_PORTRAIT_COMPOSITION.designWidth,
        height: CLASSIC_PORTRAIT_COMPOSITION.designHeight,
      },
      frame: {
        scaleMode :'none',
        scale: 0.6,
      },
      reelWindow: {
        x: CLASSIC_PORTRAIT_COMPOSITION.reelWindowRect.x,
        y: CLASSIC_PORTRAIT_COMPOSITION.reelWindowRect.y,
        width: 600,
        height: 384,
        mask: {
          enabled: true,
          x: 0,
          y: 0,
          width: CLASSIC_PORTRAIT_COMPOSITION.symbolWidth,
          height: 384,
        },
      },
      symbols: {
        width: CLASSIC_PORTRAIT_COMPOSITION.symbolWidth,
        height: CLASSIC_PORTRAIT_COMPOSITION.symbolHeight,
        gapY: CLASSIC_PORTRAIT_COMPOSITION.rowGap,
        reelGap: CLASSIC_PORTRAIT_COMPOSITION.reelGap,
      },
    },
    landscape: {
      viewport: { width: 1280, height: 720 },
      reelWindow: {
        x: 280,
        y: 132,
        width: computeWindowWidth(LANDSCAPE_SYMBOL_WIDTH, LANDSCAPE_REEL_GAP),
        height: computeWindowHeight(LANDSCAPE_SYMBOL_HEIGHT, LANDSCAPE_ROW_GAP),
        mask: {
          enabled: true,
          x: 0,
          y: 0,
          width: LANDSCAPE_SYMBOL_WIDTH,
          height: computeWindowHeight(LANDSCAPE_SYMBOL_HEIGHT, LANDSCAPE_ROW_GAP),
        },
      },
      symbols: {
        width: LANDSCAPE_SYMBOL_WIDTH,
        height: LANDSCAPE_SYMBOL_HEIGHT,
        reelGap: LANDSCAPE_REEL_GAP,
        gapY: LANDSCAPE_ROW_GAP,
      },
    },
  },
  spinFeel: {
    preset: 'normal',
    overrides: {
      symbolHeightPx: CLASSIC_PORTRAIT_COMPOSITION.symbolHeight,
  
      spinSpeedPxPerSec: 2400,
      minSpinMs: 1600,
  
      startDelayMs: [0, 90, 180, 270, 360],
      stopDelayMs: [0, 100, 200, 300, 400],
  
      startMotion: {
        durationMs: 450,
      },
  
      stopMotion: {
        ease: 'expoOut',
        durationMs: 100,
      },
      symbolStripStopSettle: { mode: 'none' },
      turbo: {
        skipWinAnimations: false,
        stopDelayMs: 50,
        startDelayMs: 200,
        minSpinMs: 1400,
        stopMotionDurationMs: 140,
        snapDurationMs: 12,
      },
    },
  },

  /** Line wins: payline path styling (omit to use engine catalog defaults only). */
  winPresentation: {
    /** Lower than stock catalog `-70` (positive = further down from reel container origin). */
    textPosition: { yOffset: 200 },

    /**
     * Durations merged to engine `WinPresenterFullConfig.timing`.
     * `allWinsDurationMs` is the combined-win linger and turbo apply-final hold (see engine tier resolver).
     */
    timing: {
      singleWinDurationMs: 10000,
      betweenWinsDelayMs: 10000,
      allWinsDurationMs: 10000,
    },

    global: {
      showPaylines: true,
      showLineLabels: false,
    /** Clear modules between loop cycles so each repeat is a fresh draw (pairs with `visualizer.loopEnabled`). */
    clearBetweenCycles: true,
    /** Repeat full win presentation this many times when `visualizer.loopEnabled` is true (engine `global.winLoopLimit`). */
    winLoopLimit: 4,
      winText: {
        amountTween: {
          enabled: true,
          durationMs: 900,
        },
      },
      
    },
    paylineStyle: {
      lineColor: 0xffcc44,
      lineThickness: 7,
      lineJoin: 'bevel',
      lineAlpha: 0.95,
      animateDrawing: true,
      drawingDurationMs: 100,
      showLineLabel: false,
    },
    visualizer: {
      /** Run the full win sequence multiple times (see `global.winLoopLimit`). */
      loopEnabled: true,
      executionMode: 'parallel',
    },
  },
};
