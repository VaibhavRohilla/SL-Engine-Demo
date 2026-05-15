import type { EasingName, SpinFeelConfigOverrides, SpinFeelPresetName } from '@fnx/sl-engine';

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
 * (same nesting as engine `WinPresenterFullConfig`: `lineStyles`, `global`, `visualizer`, `choreography`, `timing`, `textPosition`).
 */
export interface TemplateWinPresentationConfig {
  /** Shared per-event timing authority. Cleopatra owns authored root timing for WV-3. */
  timingPrecedence?: 'presenterOverridesTier' | 'tierOverridesPresenter';
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
    allWinsDurationMs?: number;
  };
  lineStyles?: {
    default: {
      line?: {
        type?: 'graphic';
        color?: number | string;
        width?: number;
        alpha?: number;
        lineCap?: 'butt' | 'round' | 'square';
        lineJoin?: 'miter' | 'round' | 'bevel';
        paylineStartInsetPx?: number;
        reveal?: {
          enabled?: boolean;
          durationMs?: number;
          easing?: EasingName;
          mode?: 'fromLineStart' | 'fromLineEnd' | 'leftToRight' | 'rightToLeft' | 'instant';
        };
        glow?: {
          enabled?: boolean;
          width?: number;
          alpha?: number;
          color?: number | string;
        };
      };
      label?: {
        enabled?: boolean;
        position?: 'start' | 'end' | 'bothEnds' | 'left' | 'right';
        background?: {
          type?: 'graphic';
          fill?: number | string;
          alpha?: number;
          stroke?: number | string;
          strokeWidth?: number;
          radius?: number;
          paddingX?: number;
          paddingY?: number;
        };
        text?: {
          enabled?: boolean;
          valueMode?: 'lineNumber' | 'lineId' | 'custom';
          value?: string;
          fontFamily?: string;
          fontSize?: number;
          fill?: number | string;
          stroke?: number | string;
          strokeWidth?: number;
          fontWeight?: string;
        };
        offset?: {
          x?: number;
          y?: number;
        };
      };
    };
    byLineId?: Record<string, {
      line?: {
        type?: 'graphic';
        color?: number | string;
        width?: number;
        alpha?: number;
        lineCap?: 'butt' | 'round' | 'square';
        lineJoin?: 'miter' | 'round' | 'bevel';
        paylineStartInsetPx?: number;
        reveal?: {
          enabled?: boolean;
          durationMs?: number;
          easing?: EasingName;
          mode?: 'fromLineStart' | 'fromLineEnd' | 'leftToRight' | 'rightToLeft' | 'instant';
        };
        glow?: {
          enabled?: boolean;
          width?: number;
          alpha?: number;
          color?: number | string;
        };
      };
      label?: {
        enabled?: boolean;
        position?: 'start' | 'end' | 'bothEnds' | 'left' | 'right';
        background?: {
          type?: 'graphic';
          fill?: number | string;
          alpha?: number;
          stroke?: number | string;
          strokeWidth?: number;
          radius?: number;
          paddingX?: number;
          paddingY?: number;
        };
        text?: {
          enabled?: boolean;
          valueMode?: 'lineNumber' | 'lineId' | 'custom';
          value?: string;
          fontFamily?: string;
          fontSize?: number;
          fill?: number | string;
          stroke?: number | string;
          strokeWidth?: number;
          fontWeight?: string;
        };
        offset?: {
          x?: number;
          y?: number;
        };
      };
    }>;
  };
  global?: {
    showPaylines?: boolean;
    /**
     * Cleopatra compose maps `false` → engine `visualizer.enabledModules.highlight: false` (tier rectangle highlights).
     * Omitted leaves stock highlight module on. Stripped before bootstrap merge — not an engine `global` key.
     */
    showWinHighlight?: boolean;
  };
  visualizer?: {
    executionMode?: 'parallel' | 'sequential';
    lifetime?: {
      durationPolicy?: 'fixedMs' | 'untilNextSpin' | 'once';
      durationMs?: number;
    };
    symbolWins?: {
      enabled?: boolean;
      animation?: {
        enabled?: boolean;
        animationKey?: string;
        loopPolicy?: 'presentation' | 'step' | 'untilNextSpin' | 'fixedMs' | 'once';
        durationMs?: number;
      };
      overlay?:
        | { enabled: false }
        | {
            enabled?: true;
            type?: 'graphic';
            lifetime?: 'followPresentation' | 'fixedMs' | 'once';
            durationMs?: number;
            fill?: number | string;
            alpha?: number;
            stroke?: { color?: number | string; width?: number; alpha?: number };
            paddingPx?: number;
            cornerRadius?: number;
            pulse?: { enabled: boolean; alpha?: number; durationMs?: number };
          };
    };
    lines?: {
      enabled?: boolean;
      lifetime?: 'followPresentation' | 'followStep' | 'fixedMs' | 'once';
      durationMs?: number;
    };
    winText?: {
      enabled?: boolean;
      lifetime?: 'followPresentation' | 'followStep' | 'fixedMs' | 'once';
      durationMs?: number;
    };
    linePresentationMode?: 'vector' | 'boundsOverlay';
    enabledModules?: Partial<Record<'highlight' | 'linePath' | 'jackpot' | 'winText', boolean>>;
  };
  choreography?: {
    enabled?: boolean;
    sequence?: Array<'all' | 'each'>;
    repeat?: {
      policy?: 'once' | 'fixedCycles' | 'untilNextSpin' | 'fixedMs';
      cycles?: number;
      durationMs?: number;
    };
    singleGroupBehavior?: 'collapseToEach' | 'preserveSequence';
    stepTiming?: {
      allWinsDurationMs?: number;
      individualWinDurationMs?: number;
      betweenStepsDelayMs?: number;
    };
    amount?: {
      allStep?: 'total' | 'none';
      individualStep?: 'group' | 'total' | 'none';
    };
    render?: {
      symbols?: boolean;
      lines?: true | false | 'whenAvailable';
      winText?: boolean;
      overlays?: boolean;
    };
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
        ease: 'quartOut',
        durationMs: 450,
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

  /** Line wins: WV-3 choreography + WV-5 canonical lineStyles. */
  winPresentation: {
    timingPrecedence: 'presenterOverridesTier',
    /** Reel-center placement (stock default). Positive y moves down; keep near 0 so text stays in the reel window. */
    textPosition: { yOffset: 280 },
    timing: {
      singleWinDurationMs: 1200,
      betweenWinsDelayMs: 150,
      allWinsDurationMs: 1800,
    },
    global: {
      showPaylines: true,
      showWinHighlight: false,
    },
    visualizer: {
      executionMode: 'parallel',
      lifetime: {
        durationPolicy: 'untilNextSpin',
      },
      symbolWins: {
        enabled: true,
        animation: {
          enabled: true,
          animationKey: 'winStart',
          loopPolicy: 'step',
        },
        overlay: {
          enabled: true,
          type: 'graphic',
          lifetime: 'followPresentation',
        },
      },
      lines: {
        enabled: true,
        lifetime: 'followStep',
      },
      winText: {
        enabled: true,
        lifetime: 'followStep',
      },
      linePresentationMode: 'vector',
    },
    choreography: {
      enabled: true,
      sequence: ['all', 'each', 'all'],
      repeat: {
        policy: 'untilNextSpin',
      },
      singleGroupBehavior: 'collapseToEach',
      stepTiming: {
        allWinsDurationMs: 1800,
        individualWinDurationMs: 1200,
        betweenStepsDelayMs: 150,
      },
      amount: {
        allStep: 'total',
        individualStep: 'group',
      },
      render: {
        symbols: true,
        lines: 'whenAvailable',
        winText: true,
        overlays: true,
      },
    },
    lineStyles: {
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
            enabled: true,
            background: { type: 'graphic', fill: 0xff3b30, stroke: 0xffffff },
            text: { enabled: true, valueMode: 'lineId', fill: 0xffffff },
          },
        },
        '2': {
          line: { color: 0x007aff },
          label: {
            enabled: true,
            background: { type: 'graphic', fill: 0x007aff, stroke: 0xffffff },
            text: { enabled: true, valueMode: 'lineId', fill: 0xffffff },
          },
        },
        '3': {
          line: { color: 0x34c759 },
          label: {
            enabled: true,
            background: { type: 'graphic', fill: 0x34c759, stroke: 0xffffff },
            text: { enabled: true, valueMode: 'lineId', fill: 0xffffff },
          },
        },
        '4': {
          line: { color: 0xffcc00 },
          label: {
            enabled: true,
            background: { type: 'graphic', fill: 0xffcc00, stroke: 0x000000 },
            text: { enabled: true, valueMode: 'lineId', fill: 0x000000, stroke: 0xffffff },
          },
        },
        '5': {
          line: { color: 0xaf52de },
          label: {
            enabled: true,
            background: { type: 'graphic', fill: 0xaf52de, stroke: 0xffffff },
            text: { enabled: true, valueMode: 'lineId', fill: 0xffffff },
          },
        },
      },
    },
  },
};
