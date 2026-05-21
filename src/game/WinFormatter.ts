/**
 * Starter Win Formatter — IWinFormatter Implementation
 *
 * Provides locale-aware currency formatting for win amounts.
 * This is a starter-owned concern because currency formatting
 * depends on the operator's locale and currency settings.
 *
 * FUTURE: Localization support would make this
 * SDK-configurable via a locale config rather than starter-implemented.
 */

import type { IWinFormatter } from '@fnx/sl-engine';

export interface WinFormatterOptions {
  locale?: string;
  currency?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

export function createWinFormatter(options: WinFormatterOptions = {}): IWinFormatter {
  const {
    locale = 'en-US',
    currency = 'USD',
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
  } = options;

  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
  });

  return {
    formatWin: (amount: number) => formatter.format(amount),
    formatBalance: (amount: number) => formatter.format(amount),
  };
}
