/**
 * Starter Demo Result Source — local ISpinResultSource
 *
 * Purpose:
 * - Provides deterministic, real-feeling demo outcomes for starter games.
 * - Supports both line-based and ways-based slot configs.
 * - Produces a mix of no-win, single-line, multi-line, and strong 5-reel wins.
 * - Avoids fake zero-value win objects.
 * - Fails fast on invalid demo config.
 *
 * Important:
 * This is NOT a production math engine.
 * This is a deterministic visual demo director for local/starter gameplay.
 */

import type {
  ISpinResultSource,
  SpinOutcome,
  SpinRequest,
  SlotConfig,
} from '@fnx/sl-engine';
import { SCHEMA_VERSION, StageType } from '@fnx/sl-engine';

type DemoScenario =
  | 'dead'
  | 'smallLineWin'
  | 'mediumLineWin'
  | 'fiveOfKind'
  | 'multiLineWin'
  | 'bigMultiLineWin'
  | 'waysSmallWin'
  | 'waysMediumWin';

type PayingSymbol = {
  symbolId: number;
  multiplier: number;
};

type LineWinBuildInput = {
  payline: NonNullable<SlotConfig['paylines']>[number];
  symbolId: number;
  count: number;
  multiplier: number;
  request: SpinRequest;
  paylineCount: number;
};

const DETERMINISTIC_TIMESTAMP_BASE = 1_700_000_000_000;

function isBrowserSmokeTestMode(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('slTest') === '1';
}

/**
 * Real-feeling deterministic scenario rhythm.
 *
 * This creates visual pacing:
 * - dead spins for cleanup proof
 * - small wins for normal play
 * - medium and 5-reel wins for excitement
 * - multi-line wins for polished win presentation proof
 */
const LINE_SCENARIO_SCRIPT: readonly DemoScenario[] = [
  'dead',
  'smallLineWin',
  'dead',
  'mediumLineWin',
  'multiLineWin',
  'dead',
  'fiveOfKind',
  'smallLineWin',
  'dead',
  'bigMultiLineWin',
];

const WAYS_SCENARIO_SCRIPT: readonly DemoScenario[] = [
  'dead',
  'waysSmallWin',
  'dead',
  'waysMediumWin',
  'waysSmallWin',
  'dead',
];

function createDeterministicSpinId(spinCounter: number): string {
  const hex = spinCounter.toString(16).padStart(12, '0').slice(-12);

  return `00000000-0000-4000-8000-${hex}`;
}

function selectScenario(slotConfig: SlotConfig, spinCounter: number): DemoScenario {
  const script =
    slotConfig.evaluationMode === 'lines'
      ? LINE_SCENARIO_SCRIPT
      : WAYS_SCENARIO_SCRIPT;

  return script[(spinCounter - 1) % script.length]!;
}

function validateBaseConfig(slotConfig: SlotConfig): void {
  const reelCount = slotConfig.layout.reelCount;

  if (!Number.isInteger(reelCount) || reelCount <= 0) {
    throw new Error('DemoResultSource: layout.reelCount must be a positive integer');
  }

  if (!Array.isArray(slotConfig.layout.rowsPerReel)) {
    throw new Error('DemoResultSource: layout.rowsPerReel must be defined');
  }

  if (!slotConfig.reels?.strips || slotConfig.reels.strips.length < reelCount) {
    throw new Error(
      `DemoResultSource: reels.strips must contain at least ${reelCount} reel strips`,
    );
  }

  for (let reelIndex = 0; reelIndex < reelCount; reelIndex += 1) {
      const rows = requirePositiveInteger(
      slotConfig.layout.rowsPerReel[reelIndex],
      `DemoResultSource: rowsPerReel[${reelIndex}] must be a positive integer`,
    );

    const strip = slotConfig.reels.strips[reelIndex];

    if (!Array.isArray(strip) || strip.length === 0) {
      throw new Error(
        `DemoResultSource: reels.strips[${reelIndex}] must contain at least one symbol`,
      );
    }
  }

  if (!Array.isArray(slotConfig.paytable) || slotConfig.paytable.length === 0) {
    throw new Error('DemoResultSource: paytable must contain at least one paying symbol');
  }
}

function validateLinesConfig(slotConfig: SlotConfig): void {
  validateBaseConfig(slotConfig);

  const reelCount = slotConfig.layout.reelCount;

  if (reelCount < 3) {
    throw new Error('DemoResultSource: line demo outcomes require at least 3 reels');
  }

  const paylines = slotConfig.paylines ?? [];

  if (paylines.length === 0) {
    throw new Error('DemoResultSource: lines evaluation requires slotConfig.paylines');
  }

  for (const payline of paylines) {
    if (payline.pattern.length !== reelCount) {
      throw new Error(
        `DemoResultSource: payline ${payline.id} pattern length ${payline.pattern.length} !== reelCount ${reelCount}`,
      );
    }

    for (let reelIndex = 0; reelIndex < reelCount; reelIndex += 1) {
      const row = requirePaylineRow(payline, reelIndex);

      const rowsForReel = requirePositiveInteger(
        slotConfig.layout.rowsPerReel[reelIndex],
        `DemoResultSource: rowsPerReel[${reelIndex}] must be a positive integer`,
      );
      
      if (row < 0 || row >= rowsForReel) {
        throw new Error(
          `DemoResultSource: payline ${payline.id} has invalid row ${row} for reel ${reelIndex}`,
        );
      }
    }
  }
}

function deterministicIndex(seed: number, length: number): number {
  if (length <= 0) return 0;

  let value = seed;
  value ^= value << 13;
  value ^= value >> 17;
  value ^= value << 5;

  return Math.abs(value) % length;
}

function buildGridFromStrips(slotConfig: SlotConfig, spinCounter: number): number[][] {
  const reelCount = slotConfig.layout.reelCount;
  const grid: number[][] = [];

  for (let reelIndex = 0; reelIndex < reelCount; reelIndex += 1) {
    const rows = slotConfig.layout.rowsPerReel[reelIndex] ?? 3;
    const strip = slotConfig.reels.strips[reelIndex];

    if (!strip || strip.length === 0) {
      throw new Error(`DemoResultSource: missing reel strip for reel ${reelIndex}`);
    }

    const startPos = deterministicIndex(
      spinCounter * 1009 + reelIndex * 9176 + rows * 37,
      strip.length,
    );

    const column: number[] = [];

    for (let row = 0; row < rows; row += 1) {
      column.push(strip[(startPos + row) % strip.length] ?? strip[0] ?? 0);
    }

    grid.push(column);
  }

  return grid;
}

function getMultiplier(
  paytable: SlotConfig['paytable'],
  symbolId: number,
  count: number,
): number {
  const entry = paytable.find((item) => item.symbolId === symbolId);

  if (!entry) {
    return 0;
  }

  const multiplier = entry.payouts[String(count) as keyof typeof entry.payouts];

  return typeof multiplier === 'number' && Number.isFinite(multiplier)
    ? multiplier
    : 0;
}

function findPayingSymbol(
  paytable: SlotConfig['paytable'],
  count: number,
  preferredOffset = 0,
): PayingSymbol {
  const eligibleSymbols = paytable
    .map((entry) => ({
      symbolId: entry.symbolId,
      multiplier: entry.payouts[String(count) as keyof typeof entry.payouts],
    }))
    .filter(
      (entry): entry is PayingSymbol =>
        typeof entry.multiplier === 'number' &&
        Number.isFinite(entry.multiplier) &&
        entry.multiplier > 0,
    );

  if (eligibleSymbols.length === 0) {
    throw new Error(`DemoResultSource: no paying symbol found for ${count}-of-kind`);
  }

  return eligibleSymbols[Math.abs(preferredOffset) % eligibleSymbols.length]!;
}

function findDifferentSymbol(
  slotConfig: SlotConfig,
  currentSymbol: number,
  reelIndex: number,
): number {
  const strip = slotConfig.reels.strips[reelIndex] ?? [];

  const stripCandidate = strip.find((symbolId) => symbolId !== currentSymbol);

  if (typeof stripCandidate === 'number') {
    return stripCandidate;
  }

  const paytableCandidate = slotConfig.paytable.find(
    (entry) => entry.symbolId !== currentSymbol,
  );

  if (paytableCandidate) {
    return paytableCandidate.symbolId;
  }

  return currentSymbol + 1;
}

function forcePaylinePrefix(
  grid: number[][],
  payline: NonNullable<SlotConfig['paylines']>[number],
  symbolId: number,
  count: number,
): void {
  for (let reelIndex = 0; reelIndex < count; reelIndex += 1) {
    const row = requirePaylineRow(payline, reelIndex);
    const column = requireGridColumn(grid, reelIndex);

    if (row < 0 || row >= column.length) {
      throw new Error(
        `DemoResultSource: invalid payline row ${row} for reel ${reelIndex}`,
      );
    }

    column[row] = symbolId;
  }
}
function breakPaylinePrefix(
  slotConfig: SlotConfig,
  grid: number[][],
  payline: NonNullable<SlotConfig['paylines']>[number],
): void {
  if (payline.pattern.length < 2) {
    return;
  }

  const firstRow = requirePaylineRow(payline, 0);
  const secondRow = requirePaylineRow(payline, 1);

  const firstColumn = grid[0];
  const secondColumn = grid[1];

  if (!firstColumn || !secondColumn) {
    return;
  }

  if (
    firstRow < 0 ||
    firstRow >= firstColumn.length ||
    secondRow < 0 ||
    secondRow >= secondColumn.length
  ) {
    return;
  }

  const firstSymbol = firstColumn[firstRow];

  if (typeof firstSymbol !== 'number') {
    return;
  }

  secondColumn[secondRow] = findDifferentSymbol(slotConfig, firstSymbol, 1);
}

function buildLineWin(input: LineWinBuildInput) {
  const lineBet = input.request.bet / input.paylineCount;
  const winAmount = Number((lineBet * input.multiplier).toFixed(2));

  if (!Number.isFinite(winAmount) || winAmount <= 0) {
    throw new Error(
      `DemoResultSource: attempted to build invalid line win amount ${winAmount}`,
    );
  }

  const positions = Array.from({ length: input.count }, (_unused, reel) => ({
    reel,
    row: requirePaylineRow(input.payline, reel),
  }));

  return {
    symbolId: input.symbolId,
    winAmount,
    positions,
    count: input.count,
    multiplicity: 1,
    winType: 'line' as const,
    meta: {
      lineId: input.payline.id,
      paylinePattern: [...input.payline.pattern],
      direction: 'left-to-right' as const,
    },
  };
}

function buildNoWinOutcome(
  slotConfig: SlotConfig,
  request: SpinRequest,
  spinCounter: number,
): SpinOutcome {
  const grid = buildGridFromStrips(slotConfig, spinCounter);

  if (slotConfig.evaluationMode === 'lines') {
    const paylines = slotConfig.paylines ?? [];

    for (const payline of paylines.slice(0, 5)) {
      breakPaylinePrefix(slotConfig, grid, payline);
    }
  }

  return {
    version: SCHEMA_VERSION,
    spinId: createDeterministicSpinId(spinCounter),
    sequence: spinCounter - 1,
    bet: request.bet,
    totalWin: 0,
    stages: [
      {
        stageId: 0,
        stageType: StageType.BASE,
        grid,
        wins: [],
        stageWin: 0,
        triggers: [],
      },
    ],
    timestamp: DETERMINISTIC_TIMESTAMP_BASE + spinCounter,
  };
}

function buildSingleLineOutcome(
  slotConfig: SlotConfig,
  request: SpinRequest,
  spinCounter: number,
  count: number,
  preferredSymbolOffset = 0,
): SpinOutcome {
  validateLinesConfig(slotConfig);

  const paylines = slotConfig.paylines ?? [];
  const reelCount = slotConfig.layout.reelCount;
  const safeCount = Math.max(3, Math.min(count, reelCount));
  const grid = buildGridFromStrips(slotConfig, spinCounter);
  const payline = paylines[(spinCounter - 1) % paylines.length]!;

  const payingSymbol = findPayingSymbol(
    slotConfig.paytable,
    safeCount,
    preferredSymbolOffset,
  );

  forcePaylinePrefix(grid, payline, payingSymbol.symbolId, safeCount);

  const lineWin = buildLineWin({
    payline,
    symbolId: payingSymbol.symbolId,
    count: safeCount,
    multiplier: payingSymbol.multiplier,
    request,
    paylineCount: paylines.length,
  });

  return {
    version: SCHEMA_VERSION,
    spinId: createDeterministicSpinId(spinCounter),
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
    timestamp: DETERMINISTIC_TIMESTAMP_BASE + spinCounter,
  };
}

function buildMultiLineOutcome(
  slotConfig: SlotConfig,
  request: SpinRequest,
  spinCounter: number,
  options: {
    lineCount: number;
    winCount: number;
    symbolOffset?: number;
  },
): SpinOutcome {
  validateLinesConfig(slotConfig);

  const paylines = slotConfig.paylines ?? [];
  const reelCount = slotConfig.layout.reelCount;
  const safeWinCount = Math.max(3, Math.min(options.winCount, reelCount));
  const safeLineCount = Math.max(2, Math.min(options.lineCount, paylines.length));
  const grid = buildGridFromStrips(slotConfig, spinCounter);

  const selectedPaylines = Array.from({ length: safeLineCount }, (_unused, index) => {
    const paylineIndex = (spinCounter - 1 + index * 2) % paylines.length;
    return paylines[paylineIndex]!;
  });

  const payingSymbol = findPayingSymbol(
    slotConfig.paytable,
    safeWinCount,
    options.symbolOffset ?? spinCounter,
  );

  const wins = selectedPaylines.map((payline) => {
    forcePaylinePrefix(grid, payline, payingSymbol.symbolId, safeWinCount);

    return buildLineWin({
      payline,
      symbolId: payingSymbol.symbolId,
      count: safeWinCount,
      multiplier: payingSymbol.multiplier,
      request,
      paylineCount: paylines.length,
    });
  });

  const totalWin = Number(
    wins.reduce((sum, win) => sum + win.winAmount, 0).toFixed(2),
  );

  if (!Number.isFinite(totalWin) || totalWin <= 0) {
    throw new Error('DemoResultSource: multi-line outcome produced invalid totalWin');
  }

  return {
    version: SCHEMA_VERSION,
    spinId: createDeterministicSpinId(spinCounter),
    sequence: spinCounter - 1,
    bet: request.bet,
    totalWin,
    stages: [
      {
        stageId: 0,
        stageType: StageType.BASE,
        grid,
        wins,
        stageWin: totalWin,
        triggers: [],
      },
    ],
    timestamp: DETERMINISTIC_TIMESTAMP_BASE + spinCounter,
  };
}

function buildWaysOutcome(
  slotConfig: SlotConfig,
  request: SpinRequest,
  spinCounter: number,
  count: number,
): SpinOutcome {
  validateBaseConfig(slotConfig);

  const reelCount = slotConfig.layout.reelCount;

  if (reelCount < 3) {
    throw new Error('DemoResultSource: ways demo outcomes require at least 3 reels');
  }

  const safeCount = Math.max(3, Math.min(count, reelCount));
  const grid = buildGridFromStrips(slotConfig, spinCounter);
  const payingSymbol = findPayingSymbol(slotConfig.paytable, safeCount, spinCounter);

  for (let reelIndex = 0; reelIndex < safeCount; reelIndex += 1) {
    if (!grid[reelIndex] || grid[reelIndex]!.length === 0) {
      throw new Error(`DemoResultSource: missing grid column for reel ${reelIndex}`);
    }

    grid[reelIndex]![0] = payingSymbol.symbolId;
  }

  const winAmount = Number((request.bet * payingSymbol.multiplier).toFixed(2));

  if (!Number.isFinite(winAmount) || winAmount <= 0) {
    throw new Error('DemoResultSource: ways outcome produced invalid winAmount');
  }

  const waysWin = {
    symbolId: payingSymbol.symbolId,
    winAmount,
    positions: Array.from({ length: safeCount }, (_unused, reel) => ({
      reel,
      row: 0,
    })),
    count: safeCount,
    multiplicity: 1,
    winType: 'ways' as const,
  };

  return {
    version: SCHEMA_VERSION,
    spinId: createDeterministicSpinId(spinCounter),
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
    timestamp: DETERMINISTIC_TIMESTAMP_BASE + spinCounter,
  };
}

function buildLinesOutcome(
  slotConfig: SlotConfig,
  request: SpinRequest,
  spinCounter: number,
): SpinOutcome {
  const scenario = selectScenario(slotConfig, spinCounter);
  const reelCount = slotConfig.layout.reelCount;

  switch (scenario) {
    case 'dead':
      return buildNoWinOutcome(slotConfig, request, spinCounter);

    case 'smallLineWin':
      return buildSingleLineOutcome(slotConfig, request, spinCounter, 3, spinCounter);

    case 'mediumLineWin':
      return buildSingleLineOutcome(
        slotConfig,
        request,
        spinCounter,
        Math.min(4, reelCount),
        spinCounter + 1,
      );

    case 'fiveOfKind':
      return buildSingleLineOutcome(
        slotConfig,
        request,
        spinCounter,
        reelCount,
        spinCounter + 2,
      );

    case 'multiLineWin':
      return buildMultiLineOutcome(slotConfig, request, spinCounter, {
        lineCount: 3,
        winCount: 3,
        symbolOffset: spinCounter + 3,
      });

    case 'bigMultiLineWin':
      return buildMultiLineOutcome(slotConfig, request, spinCounter, {
        lineCount: 5,
        winCount: Math.min(5, reelCount),
        symbolOffset: spinCounter + 4,
      });

    default:
      return buildNoWinOutcome(slotConfig, request, spinCounter);
  }
}

function buildClassicOutcome(
  slotConfig: SlotConfig,
  request: SpinRequest,
  spinCounter: number,
): SpinOutcome {
  if (slotConfig.evaluationMode === 'lines') {
    return buildLinesOutcome(slotConfig, request, spinCounter);
  }

  const scenario = selectScenario(slotConfig, spinCounter);

  switch (scenario) {
    case 'dead':
      return buildNoWinOutcome(slotConfig, request, spinCounter);

    case 'waysMediumWin':
      return buildWaysOutcome(
        slotConfig,
        request,
        spinCounter,
        Math.min(4, slotConfig.layout.reelCount),
      );

    case 'waysSmallWin':
    default:
      return buildWaysOutcome(slotConfig, request, spinCounter, 3);
  }
}

export function createDemoResultSource(slotConfig: SlotConfig): ISpinResultSource {
  let spinCounter = 0;

  validateBaseConfig(slotConfig);

  if (slotConfig.evaluationMode === 'lines') {
    validateLinesConfig(slotConfig);
  }

  return {
    async getSpinResult(request: SpinRequest): Promise<SpinOutcome> {
      spinCounter += 1;
      if (isBrowserSmokeTestMode()) {
        return spinCounter % 2 === 0
          ? buildNoWinOutcome(slotConfig, request, spinCounter)
          : slotConfig.evaluationMode === 'lines'
            ? buildSingleLineOutcome(slotConfig, request, spinCounter, 3)
            : buildWaysOutcome(slotConfig, request, spinCounter, 3);
      }
      return buildClassicOutcome(slotConfig, request, spinCounter);
    },

    async isAvailable(): Promise<boolean> {
      return true;
    },
  };
}
function requireNumber(value: number | undefined, message: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(message);
  }

  return value;
}

function requirePositiveInteger(value: number | undefined, message: string): number {
  if (!Number.isInteger(value) || value === undefined || value <= 0) {
    throw new Error(message);
  }

  return value;
}

function requireGridColumn(grid: number[][], reelIndex: number): number[] {
  const column = grid[reelIndex];

  if (!column) {
    throw new Error(`DemoResultSource: missing grid column for reel ${reelIndex}`);
  }

  return column;
}

function requirePaylineRow(
  payline: NonNullable<SlotConfig['paylines']>[number],
  reelIndex: number,
): number {
  const row = payline.pattern[reelIndex];

  if (!Number.isInteger(row) || row === undefined) {
    throw new Error(
      `DemoResultSource: payline ${payline.id} missing valid row for reel ${reelIndex}`,
    );
  }

  return row;
}