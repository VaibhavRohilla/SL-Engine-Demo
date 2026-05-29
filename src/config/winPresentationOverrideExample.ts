/**
 * Win presentation authoring — engine intent API at the composition boundary.
 *
 * Do not author `winPresentation`, `visualizer`, `enabledModules`, or low-level choreography here.
 * Use `winPresentationIntent` + optional `winPresentationLineStyles` in `templateGameConfig.ts`.
 */
import type { ClassicLineWinPresentationOptions } from '@fnx/sl-engine';

/** Example: balanced line wins with clip + overlay pulse, paylines, dynamic winOverlay timelines. */
export const exampleWinPresentationIntent = {
  intensity: 'balanced',
  symbolFeedback: 'clipWithOverlay',
  lineFeedback: 'payline',
  amountText: 'none',
  winOverlay: {
    default: {
      elements: { amount: { type: 'text', text: '{amount}', style: { fontSize: 48, fill: '#ffffff' } } },
      animation: {
        type: 'timeline',
        tracks: [{ target: 'amount', sequence: [{ op: 'countTo', durationMs: 700, to: 'stepAmount' }] }],
      },
    },
  },
} as const satisfies ClassicLineWinPresentationOptions;
