import type { SlotHudAutoplayPanelConfig } from '@fnx/sl-engine';

/** Finite counts only — options the engine validates (no infinite, quickSpin, skipScreens, bonus/balance stops). */
export const autoplayPanelConfig = {
  title: 'Autoplay',
  allowedSpinCounts: [10, 25, 50, 100],
  defaultSpinCount: 25,
  allowTurboSpin: true,
  stopPolicy: 'after_current',
} satisfies SlotHudAutoplayPanelConfig;
