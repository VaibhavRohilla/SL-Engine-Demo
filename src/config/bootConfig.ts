/**
 * Starter Boot Configuration
 *
 * Bundle lists are the TS source of truth. Only manifestUrl, startSceneBundles,
 * and skipStartScreen cross the JSON boundary (shared with tooling).
 *
 * **Loading / start visuals:** `composeBootConfig` applies `templateGameConfig.scenes.boot` /
 * `.start` **after** this object: if either template block sets `background`, it **fully replaces**
 * the corresponding `loading.background` / `start.background` below (starter colors were overwriting
 * image keys). Prefer defining boot/start/slot imagery in `templateGameConfig.ts` so all scenes match.
 */

import type { BootConfigInput } from '@fnx/sl-engine';
import { starterRuntimeBuildConfig } from './buildConfigRuntime.ts';
import { en } from '../locales/en.ts';

const runtimeBoot = starterRuntimeBuildConfig.boot;

/** Bundle groups — TS-authoritative. Tooling imports these directly. */
export const BOOT_VISUAL_BUNDLES: readonly string[] = [];
export const POST_TAP_CORE_BUNDLES: readonly string[] = [];
export const FIRST_SPIN_BUNDLES: readonly string[] = [];
export const DEFERRED_BUNDLES: readonly string[] = [];

export const bootConfig: BootConfigInput = {
  manifestUrl: runtimeBoot.manifestUrl,

  bootVisualBundles: [...BOOT_VISUAL_BUNDLES],
  startSceneBundles: runtimeBoot.startSceneBundles,
  postTapCoreBundles: [...POST_TAP_CORE_BUNDLES],
  firstSpinBundles: [...FIRST_SPIN_BUNDLES],
  deferredBundles: [...DEFERRED_BUNDLES],

  skipStartScreen: runtimeBoot.skipStartScreen,

  loading: {
    background: { type: 'image', value: 'Background' },
    loader: {
      type: 'bar',
      bar: {
        widthPct: 0.6,
        height: 8,
        borderRadius: 4,
        offsetX: 0,
        offsetY: 0,
        track: { type: 'graphics', color: 0x333344, alpha: 0.6, offsetX: 0, offsetY: 0, scale: { x: 1, y: 1 }, borderWidth: 0 },
        fill: { type: 'graphics', color: 0x4a9eff, offsetX: 0, offsetY: 0, scale: { x: 1, y: 1 } },
      },
    },
    labels: {
      showPercent: true,
      showStatus: false,
      textColor: 0x888899,
      fontFamily: 'Arial',
      percentFontSize: 14,
      statusFontSize: 14,
    },
  },

  start: {
    background: { type: 'image', value: 'Background' },
    ctaType: 'text',
    ctaText: en['boot.tapToPlay'],
    ctaTextColor: 0xffffff,
    ctaFontFamily: 'Arial',
    ctaFontSize: 28,
    ctaFontWeight: 'bold',
    ctaImageScale: { x: 1, y: 1 },
    ctaPadding: 20,
    ctaPulseAnimation: true,
    requireTap: true,
  },
};
