import type { SlotHudPaytableBookConfig } from '@fnx/sl-engine';

/**
 * PaytableBook viewer content only — does not define math, RTP authority, or backend payouts.
 * Starter symbols 0–7 are fruit line pays; 8 = Scatter; 9 = Wild (matches `slotConfig.ts`).
 */
export const paytableConfig = {
  title: 'Game Rules',
  showPageCounter: true,
  showNavigationButtons: true,
  pages: [
    {
      id: 'symbol-payouts',
      type: 'symbol-payouts',
      title: 'Line Pays (starter)',
      symbols: [
        {
          symbolId: '7',
          label: 'Seven (high)',
          payouts: [
            { count: 5, pays: 'See slotConfig paytable' },
            { count: 4, pays: 'See slotConfig paytable' },
            { count: 3, pays: 'See slotConfig paytable' },
          ],
          description: 'Illustrative copy only — authoritative pays come from backend `SpinOutcome` and `slotConfig.paytable`.',
        },
        {
          symbolId: '0',
          label: 'Cherry (example low)',
          payouts: [
            { count: 5, pays: 'See slotConfig paytable' },
            { count: 4, pays: 'See slotConfig paytable' },
            { count: 3, pays: 'See slotConfig paytable' },
          ],
          description: 'Replace labels and payout text with your game’s regulated copy.',
        },
      ],
    },
    {
      id: 'wild-scatter',
      type: 'symbol-rules',
      title: 'Wild & Scatter',
      rules: [
        {
          symbolId: '9',
          label: 'Wild',
          description: 'This starter registers a wild (symbol id 9). Substitution rules follow `slotConfig.wild` and backend outcomes.',
        },
        {
          symbolId: '8',
          label: 'Scatter',
          description: 'This starter registers a scatter (symbol id 8). Trigger rules follow `slotConfig.scatter` and backend outcomes.',
        },
      ],
    },
    {
      id: 'features',
      type: 'feature-rules',
      title: 'Features',
      rules: [
        {
          title: 'Ways evaluation',
          description: 'This starter uses ways evaluation (`slotConfig.evaluationMode`). Feature stages are driven by backend-authoritative `SpinOutcome` only.',
        },
      ],
    },
    {
      id: 'controls',
      type: 'controls-rules',
      title: 'Controls',
      controls: [
        { label: 'Spin', description: 'Requests a spin through governed HUD actions when the game is idle.' },
        { label: 'Bet', description: 'Opens the bet panel when enabled; bet changes go through the same guarded path as gameplay.' },
        { label: 'Autoplay', description: 'Finite spin counts only; uses engine autoplay setup — no manual spin loops.' },
      ],
    },
    {
      id: 'about-demo',
      type: 'text-rules',
      title: 'About this starter',
      paragraphs: [
        'This is a developer starter, not a certified game. Replace all copy, art, and math with your regulated product data.',
        'The PaytableBook never calculates wins; it displays the text and tables you configure here.',
      ],
    },
  ],
} satisfies SlotHudPaytableBookConfig;
