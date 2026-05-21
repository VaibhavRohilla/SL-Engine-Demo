import type { SlotHudBetPanelConfig } from '@fnx/sl-engine';
import { STARTER_TOTAL_BET_STEPS } from '../starterTotalBetSteps.ts';

/** Must match `slotConfig.betConfig.betSteps` (same source: `starterTotalBetSteps`). */
export const betPanelConfig = {
  mode: 'total-bet-steps',
  title: 'Bet',
  totalBetSteps: [...STARTER_TOTAL_BET_STEPS],
  defaultTotalBet: 1,
  allowBetMax: true,
  showQuickStepper: true,
  format: 'currency',
} satisfies SlotHudBetPanelConfig;
