/**
 * Cleopatra Demo Slot Configuration — Game Content Definition
 *
 * Demo-only math/config.
 * Not RTP-certified. Not production math.
 */ 

import type { SlotConfig } from '@fnx/sl-engine';
import { STOCK_BEHAVIOR_CLASSIC } from '@fnx/sl-engine';

/** Manifest spritesheet keys must match assets/manifest.json; animation names match each sheet JSON `animations` block. */
function animatedSheetSymbol(manifestSpritesheetKey: string) {
  return {
    scaleMode: 'fit' as const,
    displayType: 'animatedSprite' as const,
    spriteKey: manifestSpritesheetKey,
    animationSpeed : 0.45,
    /** Local alias: resolved against `spriteKey` sheet (see engine `resolveSymbolSpritesheetAnimation`). */
    spriteSheetAnimation: 'idle' as const,
    animations: {
      idle: 'idle',
      winStart: 'idle',
      winEnd: 'idle',
    },
  };
}

export const SYMBOL = {
  TEN: 0,
  J: 1,
  Q: 2,
  K: 3,
  A: 4,
  ANKH: 5,
  EYE: 6,
  LOTUS: 7,
  SHEN: 8,
  WICK: 9,
  WILD: 10,
  SCATTER: 11,
  BONUS: 12,
  FREESPIN: 13,
  JACKPOT: 14,
} as const;

export const slotConfig: SlotConfig = {
  gameId: 'cleopatrademoslot',
  gameName: 'Cleopatra Demo Slot',
  version: '1.0.0',

  layout: {
    reelCount: 5,
    rowsPerReel: [3, 3, 3, 3, 3],
  },

  reels: {
    strips: [
      [SYMBOL.TEN, SYMBOL.J, SYMBOL.Q, SYMBOL.K, SYMBOL.A, SYMBOL.ANKH, SYMBOL.EYE, SYMBOL.LOTUS, SYMBOL.SHEN, SYMBOL.WICK, SYMBOL.WILD, SYMBOL.SCATTER, SYMBOL.TEN, SYMBOL.J, SYMBOL.Q, SYMBOL.A, SYMBOL.LOTUS, SYMBOL.EYE, SYMBOL.ANKH, SYMBOL.WILD, SYMBOL.K, SYMBOL.Q, SYMBOL.BONUS, SYMBOL.J, SYMBOL.TEN, SYMBOL.SHEN, SYMBOL.WICK, SYMBOL.A, SYMBOL.FREESPIN, SYMBOL.Q],
      [SYMBOL.J, SYMBOL.Q, SYMBOL.K, SYMBOL.A, SYMBOL.TEN, SYMBOL.EYE, SYMBOL.LOTUS, SYMBOL.ANKH, SYMBOL.WILD, SYMBOL.SHEN, SYMBOL.SCATTER, SYMBOL.Q, SYMBOL.K, SYMBOL.A, SYMBOL.TEN, SYMBOL.WICK, SYMBOL.EYE, SYMBOL.BONUS, SYMBOL.J, SYMBOL.Q, SYMBOL.LOTUS, SYMBOL.WILD, SYMBOL.ANKH, SYMBOL.K, SYMBOL.FREESPIN, SYMBOL.A, SYMBOL.TEN, SYMBOL.SHEN, SYMBOL.JACKPOT, SYMBOL.J],
      [SYMBOL.Q, SYMBOL.K, SYMBOL.A, SYMBOL.TEN, SYMBOL.J, SYMBOL.LOTUS, SYMBOL.WILD, SYMBOL.EYE, SYMBOL.ANKH, SYMBOL.SHEN, SYMBOL.SCATTER, SYMBOL.K, SYMBOL.A, SYMBOL.TEN, SYMBOL.J, SYMBOL.WICK, SYMBOL.LOTUS, SYMBOL.BONUS, SYMBOL.Q, SYMBOL.K, SYMBOL.EYE, SYMBOL.WILD, SYMBOL.ANKH, SYMBOL.A, SYMBOL.FREESPIN, SYMBOL.TEN, SYMBOL.SHEN, SYMBOL.WICK, SYMBOL.JACKPOT, SYMBOL.Q],
      [SYMBOL.K, SYMBOL.A, SYMBOL.TEN, SYMBOL.J, SYMBOL.Q, SYMBOL.ANKH, SYMBOL.EYE, SYMBOL.WILD, SYMBOL.LOTUS, SYMBOL.SHEN, SYMBOL.SCATTER, SYMBOL.A, SYMBOL.TEN, SYMBOL.J, SYMBOL.Q, SYMBOL.WICK, SYMBOL.EYE, SYMBOL.BONUS, SYMBOL.K, SYMBOL.A, SYMBOL.LOTUS, SYMBOL.WILD, SYMBOL.SHEN, SYMBOL.TEN, SYMBOL.FREESPIN, SYMBOL.J, SYMBOL.ANKH, SYMBOL.WICK, SYMBOL.JACKPOT, SYMBOL.K],
      [SYMBOL.A, SYMBOL.TEN, SYMBOL.J, SYMBOL.Q, SYMBOL.K, SYMBOL.SHEN, SYMBOL.WICK, SYMBOL.LOTUS, SYMBOL.EYE, SYMBOL.WILD, SYMBOL.SCATTER, SYMBOL.TEN, SYMBOL.J, SYMBOL.Q, SYMBOL.K, SYMBOL.ANKH, SYMBOL.SHEN, SYMBOL.BONUS, SYMBOL.A, SYMBOL.TEN, SYMBOL.LOTUS, SYMBOL.WILD, SYMBOL.EYE, SYMBOL.Q, SYMBOL.FREESPIN, SYMBOL.K, SYMBOL.WICK, SYMBOL.ANKH, SYMBOL.JACKPOT, SYMBOL.A],
    ],
  },

  symbols: [
    {
      id: SYMBOL.TEN,
      ...animatedSheetSymbol('Symbols/10'),
      name: '10',
      isHighValue: false,
    },
    {
      id: SYMBOL.J,
      ...animatedSheetSymbol('Symbols/J'),
      name: 'J',
      isHighValue: false,
    },
    {
      id: SYMBOL.Q,
      ...animatedSheetSymbol('Symbols/Q'),
      name: 'Q',
      isHighValue: false,
    },
    {
      id: SYMBOL.K,
      ...animatedSheetSymbol('Symbols/k'),
      name: 'K',
      isHighValue: false,
    },
    {
      id: SYMBOL.A,
      ...animatedSheetSymbol('Symbols/A'),
      name: 'A',
      isHighValue: false,
    },
    {
      id: SYMBOL.ANKH,
      ...animatedSheetSymbol('Symbols/Ankh'),
      name: 'Ankh',
      isHighValue: true,
    },
    {
      id: SYMBOL.EYE,
      ...animatedSheetSymbol('Symbols/Eye'),
      name: 'Eye',
      isHighValue: true,
    },
    {
      id: SYMBOL.LOTUS,
      ...animatedSheetSymbol('Symbols/Lotus'),
      name: 'Lotus',
      isHighValue: true,
    },
    {
      id: SYMBOL.SHEN,
      ...animatedSheetSymbol('Symbols/Shen'),
      name: 'Shen',
      isHighValue: true,
    },
    {
      id: SYMBOL.WICK,
      ...animatedSheetSymbol('Symbols/Wick'),
      name: 'Wick',
      isHighValue: true,
    },
    {
      id: SYMBOL.WILD,
      ...animatedSheetSymbol('Symbols/Wild'),
      name: 'Wild',
      isHighValue: true,
    },
    {
      id: SYMBOL.SCATTER,
      ...animatedSheetSymbol('Symbols/Scatter'),
      name: 'Scatter',
      isHighValue: false,
    },
    {
      id: SYMBOL.BONUS,
      ...animatedSheetSymbol('Symbols/Bonus'),
      name: 'Bonus',
      isHighValue: false,
    },
    {
      id: SYMBOL.FREESPIN,
      ...animatedSheetSymbol('Symbols/FreeSpin'),
      name: 'Freespin',
      isHighValue: false,
    },
    {
      id: SYMBOL.JACKPOT,
      ...animatedSheetSymbol('Symbols/Jackpot'),
      name: 'Jackpot',
      isHighValue: true,
    },
  ],

  paytable: [
    { symbolId: SYMBOL.TEN, payouts: { '3': 5, '4': 15, '5': 50 } },
    { symbolId: SYMBOL.J, payouts: { '3': 5, '4': 15, '5': 50 } },
    { symbolId: SYMBOL.Q, payouts: { '3': 8, '4': 20, '5': 70 } },
    { symbolId: SYMBOL.K, payouts: { '3': 8, '4': 20, '5': 70 } },
    { symbolId: SYMBOL.A, payouts: { '3': 10, '4': 30, '5': 100 } },
    { symbolId: SYMBOL.ANKH, payouts: { '3': 15, '4': 50, '5': 180 } },
    { symbolId: SYMBOL.EYE, payouts: { '3': 20, '4': 75, '5': 250 } },
    { symbolId: SYMBOL.LOTUS, payouts: { '3': 25, '4': 100, '5': 350 } },
    { symbolId: SYMBOL.SHEN, payouts: { '3': 30, '4': 125, '5': 500 } },
    { symbolId: SYMBOL.WICK, payouts: { '3': 40, '4': 175, '5': 750 } },
    { symbolId: SYMBOL.WILD, payouts: { '3': 50, '4': 250, '5': 1200 } },
    { symbolId: SYMBOL.JACKPOT, payouts: { '3': 100, '4': 1000, '5': 5000 } },
  ],

  wild: {
    wildIds: [SYMBOL.WILD],
    substitutesForAll: true,
    excludeIds: [SYMBOL.SCATTER, SYMBOL.BONUS, SYMBOL.FREESPIN, SYMBOL.JACKPOT],
  },

  scatter: {
    scatterIds: [SYMBOL.SCATTER, SYMBOL.BONUS, SYMBOL.FREESPIN],
    minTriggerCount: 3,
    payouts: { '3': 5, '4': 20, '5': 100 },
  },

  evaluationMode: 'lines',
  behavior: STOCK_BEHAVIOR_CLASSIC,

  paylines: [
    { id: 1, pattern: [1, 1, 1, 1, 1] },
    { id: 2, pattern: [0, 0, 0, 0, 0] },
    { id: 3, pattern: [2, 2, 2, 2, 2] },
    { id: 4, pattern: [0, 1, 2, 1, 0] },
    { id: 5, pattern: [2, 1, 0, 1, 2] },
    { id: 6, pattern: [0, 0, 1, 0, 0] },
    { id: 7, pattern: [2, 2, 1, 2, 2] },
    { id: 8, pattern: [1, 0, 0, 0, 1] },
    { id: 9, pattern: [1, 2, 2, 2, 1] },
    { id: 10, pattern: [0, 1, 0, 1, 0] },
  ],

  betConfig: {
    minBet: 0.2,
    maxBet: 100,
    defaultBet: 1,
    betSteps: [0.2, 0.5, 1, 2, 5, 10, 20, 50, 100],
  },
};
