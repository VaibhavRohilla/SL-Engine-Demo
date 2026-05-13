/**
 * Starter Demo Result Source — local ISpinResultSource
 *
 * When `slotConfig.evaluationMode === 'lines'`, emits `winType: "line"` wins with
 * `meta.lineId` and positions aligned to configured paylines (required by SL-Engine
 * stock outcome policy). Otherwise uses a minimal `ways` sample for ways-mode configs.
 *
 * Implements the SDK contract: getSpinResult, isAvailable.
 */

import type { ISpinResultSource, SpinOutcome, SpinRequest, SlotConfig } from '@fnx/sl-engine';
import { SCHEMA_VERSION, StageType } from '@fnx/sl-engine';

function nextUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function buildGridFromStrips(slotConfig: SlotConfig, spinCounter: number, seedOffset: number): number[][] {
  const reelCount = slotConfig.layout.reelCount;
  const rowsPerReel = slotConfig.layout.rowsPerReel;
  const grid: number[][] = [];

  for (let reelIndex = 0; reelIndex < reelCount; reelIndex++) {
    const rows = rowsPerReel[reelIndex] ?? 3;
    const strip = slotConfig.reels.strips[reelIndex];
    if (!strip || strip.length === 0) {
      grid.push(Array.from({ length: rows }, () => 0));
      continue;
    }

    const startPos = (spinCounter * (reelIndex + 1) * (7 + seedOffset)) % strip.length;
    const col: number[] = [];
    for (let row = 0; row < rows; row++) {
      col.push(strip[(startPos + row) % strip.length] ?? 0);
    }
    grid.push(col);
  }

  return grid;
}

/** Place `symbolId` on the first `count` reels along `pattern` (row per reel). */
function forcePaylinePrefix(
  grid: number[][],
  pattern: readonly number[],
  symbolId: number,
  count: number,
): void {
  for (let reel = 0; reel < count; reel += 1) {
    const row = pattern[reel];
    if (row === undefined || (grid[reel]?.length ?? 0) === 0) return;
    if (row < 0 || row >= (grid[reel]?.length ?? 0)) return;
    grid[reel]![row] = symbolId;
  }
}

function paytableMultiplier(
  paytable: SlotConfig['paytable'],
  symbolId: number,
  consecutive: number,
): number {
  const entry = paytable.find((p) => p.symbolId === symbolId);
  if (!entry) return 0;
  const key = String(consecutive) as keyof typeof entry.payouts;
  const mult = entry.payouts[key];
  return typeof mult === 'number' ? mult : 0;
}

function buildLinesOutcome(slotConfig: SlotConfig, request: SpinRequest, spinCounter: number): SpinOutcome {
  const paylines = slotConfig.paylines ?? [];
  if (paylines.length === 0) {
    throw new Error('DemoResultSource: lines evaluation requires slotConfig.paylines');
  }

  const grid = buildGridFromStrips(slotConfig, spinCounter, 0);
  const columnCount = slotConfig.layout.reelCount;
  const payline = paylines[(spinCounter - 1) % paylines.length]!;
  if (payline.pattern.length !== columnCount) {
    throw new Error(
      `DemoResultSource: payline ${payline.id} pattern length ${payline.pattern.length} !== reelCount ${columnCount}`,
    );
  }

  let winSymbol = grid[0]?.[payline.pattern[0] ?? 0] ?? 0;
  const winCount = 3 + ((spinCounter - 1) % (columnCount - 2));
  let mult = paytableMultiplier(slotConfig.paytable, winSymbol, winCount);
  if (mult === 0) {
    winSymbol = 0;
    mult = paytableMultiplier(slotConfig.paytable, winSymbol, winCount);
  }
  forcePaylinePrefix(grid, payline.pattern, winSymbol, winCount);

  const lineBet = request.bet / paylines.length;
  const winAmount = lineBet * mult;

  const positions = Array.from({ length: winCount }, (_unused, reel) => ({
    reel,
    row: payline.pattern[reel]!,
  }));

  const lineWin = {
    symbolId: winSymbol,
    winAmount,
    positions,
    count: winCount,
    multiplicity: 1,
    winType: 'line' as const,
    meta: {
      lineId: payline.id,
      paylinePattern: [...payline.pattern],
      direction: 'left-to-right' as const,
    },
  };

  return {
    version: SCHEMA_VERSION,
    spinId: nextUUID(),
    sequence: spinCounter - 1,
    bet: request.bet,
    totalWin: lineWin.winAmount,
    stages: [
      {
        stageId: 0,
        stageType: StageType.BASE,
        grid,
        wins: [lineWin],
        stageWin: lineWin.winAmount,
        triggers: [],
      },
    ],
    timestamp: Date.now(),
  };
}

function buildClassicOutcome(slotConfig: SlotConfig, request: SpinRequest, spinCounter: number): SpinOutcome {
  if (slotConfig.evaluationMode === 'lines') {
    return buildLinesOutcome(slotConfig, request, spinCounter);
  }

  const grid = buildGridFromStrips(slotConfig, spinCounter, 0);
  const winSymbol = grid[0]?.[0] ?? 0;
  const winCount = Math.min(3, grid.length);
  for (let reel = 0; reel < winCount; reel += 1) {
    if ((grid[reel]?.length ?? 0) === 0) break;
    grid[reel]![0] = winSymbol;
  }

  const waysWin = {
    symbolId: winSymbol,
    winAmount: 7,
    positions: Array.from({ length: winCount }, (_unused, reel) => ({ reel, row: 0 })),
    count: winCount,
    multiplicity: 1,
    winType: 'ways' as const,
  };

  return {
    version: SCHEMA_VERSION,
    spinId: nextUUID(),
    sequence: spinCounter - 1,
    bet: request.bet,
    totalWin: waysWin.winAmount,
    stages: [
      {
        stageId: 0,
        stageType: StageType.BASE,
        grid,
        wins: [waysWin],
        stageWin: waysWin.winAmount,
        triggers: [],
      },
    ],
    timestamp: Date.now(),
  };
}

export function createDemoResultSource(slotConfig: SlotConfig): ISpinResultSource {
  let spinCounter = 0;

  return {
    async getSpinResult(request: SpinRequest): Promise<SpinOutcome> {
      spinCounter++;
      return buildClassicOutcome(slotConfig, request, spinCounter);
    },

    async isAvailable(): Promise<boolean> {
      return true;
    },
  };
}
