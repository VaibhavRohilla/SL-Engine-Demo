import type {
  ClassicLineWinPresentationOptions,
  SpinFeelAuthoringConfigOverrides,
  SpinFeelPresetName,
} from '@fnx/sl-engine';
import type { LineStyleRegistryConfig } from '@view/win/line-style/lineStyleTypes.ts';
import { cleopatraWinOverlayPresentation } from './cleopatraWinOverlayPresentation.ts';

export const STARTER_SPIN_FEEL_PRESETS = ['classic', 'premium', 'snappy', 'heavy', 'arcade'] as const satisfies readonly SpinFeelPresetName[];
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

/** Template-owned payline / label theme styling (forwarded as `winPresenterConfigOverrides.lineStyles`). */
export type TemplateWinPresentationLineStyles = LineStyleRegistryConfig;

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
  /**
   * High-level classic-line win presentation intent.
   * Resolved at composition via engine `createClassicLineWinPresentation`.
   */
  winPresentationIntent?: ClassicLineWinPresentationOptions;
  /** Optional payline / label theme styling. */
  winPresentationLineStyles?: TemplateWinPresentationLineStyles;
  spinFeel?: {
    /**
     * Supported preset ids: `classic`, `premium`, `snappy`, `heavy`, `arcade`.
     * Custom spinFeel via `overrides` uses the nested authoring API (see docs/REEL_PRESENTATION.md).
     */
    preset: StarterSpinFeelPresetName;
    /**
     * Partial nested authoring merged on top of the preset (same as `bootstrap.spinFeelOverrides`).
     * Use `speed`, `timing`, `startFeel`, `stopFeel`, `turbo`, and optional `audioCues`.
     *
     * Example: `{ stopFeel: { symbolSettle: { mode: 'none' } } }` removes the stock sprite stop bounce.
     */
    overrides?: SpinFeelAuthoringConfigOverrides;
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
    preset: 'premium',
    overrides: {
      speed: { pxPerSec: 3000 },
      timing: {
      minSpinMs: 1200,
        startDelayMs: [0, 70, 140, 210, 280],
        stopDelayMs: [0, 90, 180, 270, 360],
      },
      startFeel: {
        motion: {
          accelerationEase: 'quadOut',
          accelerationDurationMs: 400,
          anticipation: 'pushUp',
          anticipationReleaseRatio: 0.5,
          anticipationDistanceRatio: 0.5,
        
          anticipationDurationMs: 400,

        },

      },
      stopFeel: {
        motion: { durationMs: 280 },
        settle: {
  
          enabled: true,
  
          ease: 'symbolBounce',
  
          strength: 0.9,
  
          symbolHeightRatio: 0.3,
  
          durationMs: 200
  
        },
        symbolSettle: { mode: 'none' },
        completion:{
          postStopHoldMs: 0,
        }

  
      },
      turbo: {
        skipWinAnimations: false,
        stopDelayMs: 40,
        startDelayMs: 120,
        minSpinMs: 700,
        stopMotionDurationMs: 140,
        postStopHoldMs: 12,
      },
    },
  },

  /**
   * Line wins: engine intent (choreography + overlay layers) + Cleopatra payline theme.
   * `clipWithOverlay` keeps symbol clip + overlay pulse visible when win clips alias idle.
   */
  winPresentationIntent: {
    intensity: 'balanced',
    symbolFeedback: 'clipWithOverlay',
    lineFeedback: 'payline',
    amountText: 'none',
    winOverlay: cleopatraWinOverlayPresentation,
    timing: {
      defaultStepTiming: {
        individualWinDurationMs: 5300,
        allWinsDurationMs: 5500,
        betweenStepsDelayMs: 100,
      },
      tierStepTiming: {
        // Must fit winOverlay entrance (220ms) + tier countTo duration in cleopatraWinOverlayPresentation.
        good: {
          individualWinDurationMs: 7500,
          allWinsDurationMs: 7600,
          betweenStepsDelayMs: 100,
        },
        big: {
          individualWinDurationMs: 10300,
          allWinsDurationMs: 10500,
          betweenStepsDelayMs: 125,
        },
        mega: {
          individualWinDurationMs: 13700,
          allWinsDurationMs: 14000,
          betweenStepsDelayMs: 160,
        },
        epic: {
          individualWinDurationMs: 17000,
          allWinsDurationMs: 17500,
          betweenStepsDelayMs: 200,
        },
      },
    },
    layout: {
      textPosition: { yOffset: 250 },
      showPaylines: true,
    },
  },
  winPresentationLineStyles: {
      default: {
        line: {
          type: 'graphic',
          color: 0xffd700,
          width: 5,
          alpha: 1,
          reveal: {
            mode: 'instant',
            enabled: false,
            durationMs: 280,
          },
          glow: {
            enabled: true,
            color: 0xfff1a8,
            width: 8,
            alpha: 0.55,
          },
        },
        label: {
          enabled: true,
          position: 'start',
          background: {
            type: 'graphic',
            fill: 0x3a1a00,
            alpha: 0.95,
            stroke: 0xffd700,
            strokeWidth: 2,
            radius: 12,
            paddingX: 8,
            paddingY: 5,
          },
          text: {
            enabled: true,
            valueMode: 'lineId',
            fontSize: 15,
            fill: 0xffffff,
            stroke: 0x000000,
            strokeWidth: 2,
          },
        },
      },
      byLineId: {
        '1': {
          line: { color: 0xff3b30 },
          label: {
            enabled: false,
            background: { type: 'graphic', fill: 0xff3b30, stroke: 0xffffff },
            text: { enabled: true, valueMode: 'lineId', fill: 0xffffff },
          },
        },
        '2': {
          line: { color: 0x007aff },
          label: {
            enabled: false,
            background: { type: 'graphic', fill: 0x007aff, stroke: 0xffffff },
            text: { enabled: true, valueMode: 'lineId', fill: 0xffffff },
          },
        },
        '3': {
          line: { color: 0x34c759 },
          label: {
            enabled: false,
            background: { type: 'graphic', fill: 0x34c759, stroke: 0xffffff },
            text: { enabled: true, valueMode: 'lineId', fill: 0xffffff },
          },
        },
        '4': {
          line: { color: 0xffcc00 },
          label: {
            enabled: false,
            background: { type: 'graphic', fill: 0xffcc00, stroke: 0x000000 },
            text: { enabled: true, valueMode: 'lineId', fill: 0x000000, stroke: 0xffffff },
          },
        },
        '5': {
          line: { color: 0xaf52de },
          label: {
            enabled: false,
            background: { type: 'graphic', fill: 0xaf52de, stroke: 0xffffff },
            text: { enabled: true, valueMode: 'lineId', fill: 0xffffff },
          },
        },
      },
  },
};
