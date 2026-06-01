import type {
  WinOverlayCompositionIntent,
  WinOverlayCompositionRuleIntent,
  WinOverlayTextStyleIntent,
} from '@fnx/sl-engine';

const ENTRANCE_MS = 220;

/** Stock-catalog drop shadow — matches default tier “WIN $amount” presentation. */
const STOCK_WIN_DROP_SHADOW = {
  color: 0x000000,
  blur: 4,
  distance: 2,
  angle: Math.PI / 4,
} as const satisfies NonNullable<WinOverlayTextStyleIntent['dropShadow']>;

/** Tier text styling aligned with stock win tiers + bold shadowed “WIN $amount” look. */
const TIER_TEXT = {
  normal: {
    fontSize: 48,
    fontWeight: 'bold',
    fill: 0xffdd00,
    stroke: { color: 0x000000, width: 4 },
    dropShadow: STOCK_WIN_DROP_SHADOW,
  },
  good: {
    fontSize: 56,
    fontWeight: 'bold',
    fill: 0xffaa00,
    stroke: { color: 0x000000, width: 5 },
    dropShadow: { color: 0x000000, blur: 6, distance: 3, angle: Math.PI / 4 },
  },
  big: {
    fontSize: 64,
    fontWeight: 'bold',
    fill: 0xff4444,
    stroke: { color: 0x000000, width: 6 },
    dropShadow: { color: 0xff0000, blur: 10, distance: 0, angle: 0 },
  },
  mega: {
    fontSize: 72,
    fontWeight: 'bold',
    fill: 0xff00ff,
    stroke: { color: 0x000000, width: 8 },
    dropShadow: { color: 0xff00ff, blur: 15, distance: 0, angle: 0 },
  },
  epic: {
    fontSize: 80,
    fontWeight: 'bold',
    fill: 0x00ffff,
    stroke: { color: 0x0066ff, width: 10 },
    dropShadow: { color: 0x00ffff, blur: 20, distance: 0, angle: 0 },
  },
} as const satisfies Record<string, WinOverlayTextStyleIntent>;

/**
 * Count-up durations — normal is the 5000ms baseline; higher tiers scale up from stock ratios.
 */
const COUNT_MS = {
  normal: 2000,
  good: 4200,
  big: 7000,
  mega: 10400,
  epic: 13700,
} as const;

const CLEOPATRA_WIN_OVERLAY_PLACEMENT = {
  anchor: 'reelsCenter',
  offset: { y: 250 },
} as const satisfies WinOverlayCompositionRuleIntent['placement'];

function amountRule(
  tier: keyof typeof TIER_TEXT,
  countMs: number = COUNT_MS[tier],
  amountStyle: WinOverlayTextStyleIntent = TIER_TEXT[tier],
): WinOverlayCompositionRuleIntent {
  return {
    elements: {
      amount: {
        type: 'text',
        text: 'WIN ${amount}',
        style: amountStyle,
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
    placement: CLEOPATRA_WIN_OVERLAY_PLACEMENT,
  };
}

/** Cleopatra dynamic win overlay — stock-style WIN $amount text with stroke + drop shadow. */
export const cleopatraWinOverlayPresentation: WinOverlayCompositionIntent = {
  default: amountRule('normal'),
  byTier: {
    good: amountRule('good'),
    big: amountRule('big'),
    mega: amountRule('mega', COUNT_MS.mega, {
      ...TIER_TEXT.mega,
      fontSize: 86,
      stroke: { color: 0x000000, width: 8 },
    }),
    epic: amountRule('epic', COUNT_MS.epic, {
      ...TIER_TEXT.epic,
      fontSize: 92,
      stroke: { color: 0x0066ff, width: 10 },
    }),
  },
};
