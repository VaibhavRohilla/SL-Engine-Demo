/**
 * Win presentation authoring — engine intent API at the composition boundary.
 *
 * Do not author `winPresentation`, `visualizer`, `enabledModules`, or low-level choreography here.
 * Use `winPresentationIntent` + optional `winPresentationLineStyles` in `templateGameConfig.ts`.
 */
import type { ClassicLineWinPresentationOptions } from '@fnx/sl-engine';

/** Example: balanced line wins with clip + overlay pulse, paylines, count-up amount. */
export const exampleWinPresentationIntent = {
  intensity: 'balanced',
  symbolFeedback: 'clipWithOverlay',
  lineFeedback: 'payline',
  amountText: 'countUp',
} as const satisfies ClassicLineWinPresentationOptions;
