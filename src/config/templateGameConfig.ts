import type { SpinFeelConfig, SpinFeelPresetName } from '@fnx/sl-engine';

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
  spinFeel?: {
    /**
     * `premium` = slower/dramatic classic feel, `arcade` = faster/snappier,
     * `turbo` = fastest/minimal delay, `normal` = engine compatibility alias for `premium`.
     */
    preset: StarterSpinFeelPresetName;
    /**
     * Any `SpinFeelConfig` fields merged on top of the preset (same as `bootstrap.spinFeelOverrides`).
     * Example: `{ symbolStripStopSettle: { mode: 'none' } }` removes the stock sprite stop bounce; add
     * `ClassicStockStopHooks.symbolDisplay.onSymbolDisplayStripStopComplete` for custom settle polish.
     */
    overrides?: Partial<SpinFeelConfig>;
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
    y: 330,
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

export const templateGameConfig: TemplateGameConfig = {
  game: {
    id: 'classic-fruits',
    name: 'Classic Fruits',
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
        width: 780,
        height: 430,
        mask: {
          enabled: true,
          x: 0,
          y: 0,
        },
      },
      symbols: {
        width: 140,
        height: 140,
        gapY: 5,
        reelGap: 20,
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
        y: 430,
        width: CLASSIC_PORTRAIT_COMPOSITION.reelWindowRect.width,
        height: CLASSIC_PORTRAIT_COMPOSITION.reelWindowRect.height,
        mask: {
          enabled: true,
          x: 0,
          y: 0,
          width: CLASSIC_PORTRAIT_COMPOSITION.symbolWidth,
          height: CLASSIC_PORTRAIT_COMPOSITION.reelMaskRect.height,
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
        x: 250,
        y: 132,
      },
    },
  },

  spinFeel: {
    // Choose: 'premium' (classic dramatic), 'arcade' (faster), 'turbo' (fastest), or 'normal' (premium alias).
    preset: 'premium',
    // Optional: any SpinFeelConfig keys merged after the preset (timings, symbolStripStopSettle, reelStopOrder, …).
    // overrides: { symbolStripStopSettle: { mode: 'none' } },
  },
};
