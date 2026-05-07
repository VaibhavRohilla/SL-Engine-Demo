/**
 * Single source of truth for starter total-bet ladder.
 * Use in {@link ./slotConfig.ts} `betConfig.betSteps` and HUD `betPanel` config so the bet panel never offers values the runtime rejects.
 */
export const STARTER_TOTAL_BET_STEPS = [0.2, 0.5, 1, 2, 5, 10, 20, 50, 100] as const;

export type StarterTotalBetStep = (typeof STARTER_TOTAL_BET_STEPS)[number];
