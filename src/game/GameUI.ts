/**
 * Starter GameUI — ISlotUI Implementation
 *
 * The SDK requires a gameUI that manages balance, bet, and win state.
 * This is a starter-owned concern: every game must implement ISlotUI
 * because balance/bet management is host/operator-specific.
 *
 * This implementation provides a standalone demo balance for local
 * development. In production, this would integrate with the operator's
 * wallet/cashier API.
 */

import type { ISlotUI } from '@fnx/sl-engine';

export interface GameUIOptions {
  initialBalance?: number;
  defaultBet?: number;
  currency?: string;
}

export function createGameUI(options: GameUIOptions = {}): ISlotUI {
  const { initialBalance = 10_000, defaultBet = 1 } = options;

  let balance = initialBalance;
  let currentBet = defaultBet;
  let lastWinAmount = 0;

  const formatAmount = (amount: number): string =>
    `$${amount.toFixed(2)}`;

  return {
    getCurrentBet: () => currentBet,
    getBalance: () => balance,
    getFormattedBalance: () => formatAmount(balance),
    getLastWinAmount: () => lastWinAmount,
    getFormattedLastWin: () => formatAmount(lastWinAmount),

    canAffordBet: (bet: number) => balance >= bet,

    /** HUD / host bet ladder — updates selection only; spin still deducts via {@link deductBet}. */
    setBet: (bet: number) => {
      currentBet = bet;
    },

    deductBet: (amount: number) => {
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error(`GameUI.deductBet requires a finite positive amount. Received: ${String(amount)}`);
      }
      if (balance < amount) {
        throw new Error(`GameUI.deductBet rejected insufficient balance for amount: ${String(amount)}`);
      }
      balance -= amount;
    },

    addWin: (amount: number) => {
      balance += amount;
    },

    onSpinStart: () => {
      lastWinAmount = 0;
    },

    onSpinCycleSettledEvent: () => {},

    onWinUpdate: (amount: number) => {
      lastWinAmount = amount;
    },

    onBalanceUpdate: () => {},

    onJackpotWin: () => {},
    onJackpotMeterUpdate: () => {},
    onJackpotContribution: () => {},
  };
}
