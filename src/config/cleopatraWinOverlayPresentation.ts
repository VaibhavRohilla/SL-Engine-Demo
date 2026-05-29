import type {
  WinOverlayCompositionIntent,
  WinOverlayCompositionRuleIntent,
  WinOverlayTextStyleIntent,
} from '@fnx/sl-engine';

const ENTRANCE_MS = 220;

/** Stock tier colors with heavier stroke (thicker outline) than stock amountText. */
const TIER_TEXT = {
  normal: { fill: 0xffdd00, stroke: { color: 0x000000, width: 8 }, fontSize: 48 },
  good: { fill: 0xffaa00, stroke: { color: 0x000000, width: 10 }, fontSize: 56 },
  big: { fill: 0xff4444, stroke: { color: 0x000000, width: 12 }, fontSize: 64 },
  mega: { fill: 0xff00ff, stroke: { color: 0x000000, width: 14 }, fontSize: 72 },
  epic: { fill: 0x00ffff, stroke: { color: 0x0066ff, width: 16 }, fontSize: 80 },
} as const satisfies Record<string, WinOverlayTextStyleIntent>;

/**
 * Count-up durations — normal is the 5000ms baseline; higher tiers scale up from stock ratios.
 */
const COUNT_MS = {
  normal: 5000,
  good: 7200,
  big: 10000,
  mega: 13400,
  epic: 16700,
} as const;

function amountRule(
  tier: keyof typeof TIER_TEXT,
  countMs: number = COUNT_MS[tier],
): WinOverlayCompositionRuleIntent {
  return {
    elements: {
      amount: {
        type: 'text',
        text: '{amount}',
        style: TIER_TEXT[tier],
      },
    },
    animation: {
      type: 'timeline',
      tracks: [
        {
          target: 'amount',
          sequence: [
            { op: 'set', props: { alpha: 0, scale: 0.8 } },
            { op: 'to', durationMs: ENTRANCE_MS, ease: 'backOut', props: { alpha: 1, scale: 1.1 } },
            {
              op: 'countTo',
              durationMs: countMs,
              from: 0,
              to: 'stepAmount',
              ease: 'quadOut',
              emit: 'amountCountComplete',
            },
          ],
        },
      ],
    },
  };
}

/** Cleopatra dynamic win overlay — slower count-up, thicker strokes, tier-scaled pacing. */
export const cleopatraWinOverlayPresentation: WinOverlayCompositionIntent = {
  default: amountRule('normal'),
  byTier: {
    good: amountRule('good'),
    big: amountRule('big'),
    mega: {
      elements: {
        title: {
          type: 'text',
          text: 'MEGA WIN',
          style: TIER_TEXT.mega,
        },
        amount: {
          type: 'text',
          text: '{amount}',
          style: {
            ...TIER_TEXT.mega,
            fontSize: 86,
            stroke: { color: 0x000000, width: 16 },
          },
        },
      },
      animation: {
        type: 'timeline',
        tracks: [
          {
            target: 'title',
            sequence: [
              { op: 'set', props: { alpha: 0, scale: 0.6 } },
              { op: 'to', durationMs: 300, ease: 'backOut', props: { alpha: 1, scale: 1.25 } },
              {
                op: 'to',
                durationMs: 250,
                ease: 'quadOut',
                props: { scale: 1 },
                emit: 'megaTitleSettled',
              },
            ],
          },
          {
            target: 'amount',
            sequence: [
              { op: 'wait', durationMs: 250 },
              {
                op: 'countTo',
                durationMs: COUNT_MS.mega,
                from: 0,
                to: 'stepAmount',
                ease: 'quadOut',
                emit: 'megaAmountCountComplete',
              },
            ],
          },
        ],
      },
    },
    epic: {
      elements: {
        title: {
          type: 'text',
          text: 'EPIC WIN',
          style: TIER_TEXT.epic,
        },
        amount: {
          type: 'text',
          text: '{amount}',
          style: {
            ...TIER_TEXT.epic,
            fontSize: 92,
            stroke: { color: 0x0066ff, width: 18 },
          },
        },
      },
      animation: {
        type: 'timeline',
        tracks: [
          {
            target: 'title',
            sequence: [
              { op: 'set', props: { alpha: 0, scale: 0.5 } },
              { op: 'to', durationMs: 350, ease: 'backOut', props: { alpha: 1, scale: 1.3 } },
              {
                op: 'to',
                durationMs: 300,
                ease: 'quadOut',
                props: { scale: 1 },
                emit: 'epicTitleSettled',
              },
            ],
          },
          {
            target: 'amount',
            sequence: [
              { op: 'wait', durationMs: 300 },
              {
                op: 'countTo',
                durationMs: COUNT_MS.epic,
                from: 0,
                to: 'stepAmount',
                ease: 'quadOut',
                emit: 'epicAmountCountComplete',
              },
            ],
          },
        ],
      },
    },
  },
};
