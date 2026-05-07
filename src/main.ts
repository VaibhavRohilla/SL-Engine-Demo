import { bootstrap, EngineEventRegistry } from '@fnx/sl-engine';
import type { BootstrapInput, GameHandle, IReelsView, LayoutState } from '@fnx/sl-engine';
import { gameDefinition } from './config/gameDefinition.ts';
import { runtimeShellConfig } from './config/hud/index.ts';
import {
  createTemplateHookPresentationSurfaces,
  notifyTemplateBootComplete,
  notifyTemplateBootStart,
  notifyTemplateError,
  notifyTemplateStartGame,
  registerTemplateHooks,
} from './config/registerTemplateHooks.ts';
import { templateHooks } from './config/templateHooks.ts';
import { createGameUI } from './game/GameUI.ts';
import { createWinFormatter } from './game/WinFormatter.ts';
import { createDefaultLocaleService } from './locales/createLocaleService.ts';

type StarterBrowserSmokeSpinResult = {
  kind: string;
  totalWin: number | null;
  spinId: string | null;
  stageCount: number | null;
  failure: string | null;
};

type StarterBrowserSmokeLayout = {
  rowsPerReel: number[];
};

type StarterBrowserSmokeBoard = {
  columns: Array<Array<number>>;
  columnLengths: number[];
};

type StarterBrowserSmokeState = {
  ready: boolean;
  bootCount: number;
  destroyCount: number;
  spinStartedCount: number;
  spinCompletedCount: number;
  lastSpin: StarterBrowserSmokeSpinResult | null;
  lastError: string | null;
  canvasConnected: boolean;
  canvasHostToken: string | null;
  handleDestroyed: boolean | null;
  handleRunning: boolean;
  layout: StarterBrowserSmokeLayout;
  board: StarterBrowserSmokeBoard | null;
};

declare global {
  interface Window {
    __SL_ENGINE_TEST__?: {
      waitForReady(): Promise<StarterBrowserSmokeState>;
      spinOnce(options?: { turbo?: boolean }): Promise<StarterBrowserSmokeSpinResult>;
      destroy(): Promise<StarterBrowserSmokeState>;
      reboot(): Promise<StarterBrowserSmokeState>;
      getState(): StarterBrowserSmokeState;
    };
  }
}

const browserSmokeState: StarterBrowserSmokeState = {
  ready: false,
  bootCount: 0,
  destroyCount: 0,
  spinStartedCount: 0,
  spinCompletedCount: 0,
  lastSpin: null,
  lastError: null,
  canvasConnected: false,
  canvasHostToken: null,
  handleDestroyed: null,
  handleRunning: false,
  layout: { rowsPerReel: [...gameDefinition.slotConfig.layout.rowsPerReel] },
  board: null,
};

let readyResolver: ((state: StarterBrowserSmokeState) => void) | null = null;
let readyRejecter: ((error: Error) => void) | null = null;
let readyPromise = createReadyPromise();
let smokeUnsubscribers: Array<() => void> = [];

function createReadyPromise(): Promise<StarterBrowserSmokeState> {
  return new Promise((resolve, reject) => {
    readyResolver = resolve;
    readyRejecter = reject;
  });
}

function isBrowserSmokeHookEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('slTest') === '1';
}

function readBrowserSmokeBoard(): StarterBrowserSmokeBoard | null {
  const reels = currentHandle?.getReelsView();
  if (!reels) return null;

  const readback = reels as IReelsView & {
    getReelSymbols?: (reelIndex: number) => number[];
  };
  const rowsPerReel = gameDefinition.slotConfig.layout.rowsPerReel;
  const columns = rowsPerReel.map((expectedRows, reel) => {
    if (typeof readback.getReelSymbols === 'function') {
      return [...readback.getReelSymbols(reel)];
    }

    const column: number[] = [];
    for (let row = 0; row < expectedRows; row += 1) {
      const symbol = reels.getSymbolAt(reel, row);
      if (!symbol) break;
      column.push(symbol.getSymbolId());
    }
    return column;
  });

  return {
    columns,
    columnLengths: columns.map((column) => column.length),
  };
}

function readBrowserSmokeState(): StarterBrowserSmokeState {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
  browserSmokeState.canvasConnected = !!canvas?.isConnected;
  browserSmokeState.canvasHostToken = canvas?.dataset.slSmokeHostToken ?? null;
  browserSmokeState.handleDestroyed = currentHandle?.isDestroyed ?? null;
  browserSmokeState.handleRunning = currentHandle?.isRunning() ?? false;
  browserSmokeState.layout = { rowsPerReel: [...gameDefinition.slotConfig.layout.rowsPerReel] };
  browserSmokeState.board = readBrowserSmokeBoard();
  return {
    ...browserSmokeState,
    layout: { rowsPerReel: [...browserSmokeState.layout.rowsPerReel] },
    board: browserSmokeState.board
      ? {
          columns: browserSmokeState.board.columns.map((column) => [...column]),
          columnLengths: [...browserSmokeState.board.columnLengths],
        }
      : null,
    lastSpin: browserSmokeState.lastSpin ? { ...browserSmokeState.lastSpin } : null,
  };
}

function resetReadyWaiter(): void {
  readyPromise = createReadyPromise();
}

function markSmokeBootStarting(): void {
  if (!isBrowserSmokeHookEnabled()) return;
  browserSmokeState.ready = false;
  browserSmokeState.bootCount += 1;
  browserSmokeState.lastError = null;
  resetReadyWaiter();
}

function markSmokeReady(): void {
  if (!isBrowserSmokeHookEnabled()) return;
  browserSmokeState.ready = true;
  readyResolver?.(readBrowserSmokeState());
}

function markSmokeError(error: unknown): void {
  if (!isBrowserSmokeHookEnabled()) return;
  const message = error instanceof Error ? error.message : String(error);
  browserSmokeState.ready = false;
  browserSmokeState.lastError = message;
  readyRejecter?.(error instanceof Error ? error : new Error(message));
}

function clearSmokeSubscriptions(): void {
  for (const unsubscribe of smokeUnsubscribers) {
    unsubscribe();
  }
  smokeUnsubscribers = [];
}

function attachBrowserSmokeLifecycle(handle: GameHandle): void {
  if (!isBrowserSmokeHookEnabled()) return;
  clearSmokeSubscriptions();
  const { SPIN_KICKOFF_ACCEPTED, SPIN_CYCLE_COMPLETE, SPIN_TERMINAL_FAILURE } = EngineEventRegistry;
  smokeUnsubscribers = [
    handle.events?.on(SPIN_KICKOFF_ACCEPTED, () => {
      browserSmokeState.spinStartedCount += 1;
    }),
    handle.events?.on(SPIN_CYCLE_COMPLETE, () => {
      browserSmokeState.spinCompletedCount += 1;
    }),
    handle.events?.on(SPIN_TERMINAL_FAILURE, (payload) => {
      browserSmokeState.lastError = payload.error.message;
    }),
  ].filter((unsubscribe): unsubscribe is () => void => typeof unsubscribe === 'function');
}

async function destroyCurrentHandleForSmoke(): Promise<void> {
  clearSmokeSubscriptions();
  if (currentHandle && !currentHandle.isDestroyed) {
    await currentHandle.destroy();
  }
  currentHandle = null;
  browserSmokeState.ready = false;
  browserSmokeState.destroyCount += 1;
}

function serializeSpinResult(result: Awaited<ReturnType<GameHandle['runSpin']>>): StarterBrowserSmokeSpinResult {
  if (result.kind !== 'accepted') {
    const failure =
      result.kind === 'failed'
        ? `${result.terminal.name}: ${result.terminal.message}; cause=${result.terminal.causeError?.name}: ${result.terminal.causeError?.message}; context=${JSON.stringify(result.terminal.context ?? {})}`
        : 'reason' in result
          ? String(result.reason)
          : null;
    return { kind: result.kind, totalWin: null, spinId: null, stageCount: null, failure };
  }
  const outcome = result.cycleSuccess.outcome;
  return {
    kind: result.kind,
    totalWin: outcome?.totalWin ?? null,
    spinId: outcome?.spinId ?? null,
    stageCount: outcome?.stages.length ?? null,
    failure: null,
  };
}

function ensureSmokeCanvasToken(canvas: HTMLCanvasElement): void {
  if (!isBrowserSmokeHookEnabled()) return;
  canvas.dataset.slSmokeHostToken ||= 'sl-engine-generated-smoke-host';
}

function installBrowserSmokeHook(): void {
  if (!isBrowserSmokeHookEnabled() || window.__SL_ENGINE_TEST__) return;

  window.__SL_ENGINE_TEST__ = {
    waitForReady: async () => {
      if (browserSmokeState.ready) return readBrowserSmokeState();
      return readyPromise;
    },
    spinOnce: async (options?: { turbo?: boolean }) => {
      if (!currentHandle || currentHandle.isDestroyed || !browserSmokeState.ready) {
        throw new Error('Starter browser smoke: engine is not ready for spin.');
      }
      const result = await currentHandle.runSpin(1, options?.turbo === true);
      const serialized = serializeSpinResult(result);
      browserSmokeState.lastSpin = serialized;
      if (result.kind !== 'accepted') {
        throw new Error(`Starter browser smoke: spin did not complete: ${JSON.stringify(serialized)}`);
      }
      return serialized;
    },
    destroy: async () => {
      await destroyCurrentHandleForSmoke();
      return readBrowserSmokeState();
    },
    reboot: async () => {
      await main();
      return readBrowserSmokeState();
    },
    getState: () => readBrowserSmokeState(),
  };
}

function buildBootstrapInput(): BootstrapInput {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
  if (!canvas) {
    throw new Error('Starter: #game-canvas element not found');
  }
  ensureSmokeCanvasToken(canvas);

  const localeService = createDefaultLocaleService();
  const audioProfile = gameDefinition.audioConfig;

  return {
    canvas,
    slotConfig: gameDefinition.slotConfig,
    backgroundColor: gameDefinition.canvasBackgroundColor,
    gameUI: createGameUI(),
    winFormatter: createWinFormatter(),
    spinFeel: gameDefinition.spinFeelPreset,
    spinFeelOverrides: {
      ...(gameDefinition.spinFeelOverrides ?? {}),
      audioCues: audioProfile.spinFeelAudioCues,
    },
    bootConfig: isBrowserSmokeHookEnabled()
      ? { ...gameDefinition.bootConfig, skipStartScreen: true }
      : gameDefinition.bootConfig,
    background: gameDefinition.background,
    frame: gameDefinition.frame,
    layout: gameDefinition.layout,
    reelMasks: gameDefinition.reelMasks,
    orientation: gameDefinition.orientation,
    resultSource: gameDefinition.createResultSource(),
    featurePacks: gameDefinition.featureConfig.featurePacks,
    governedPresentationSurfaces: [
      ...gameDefinition.featureConfig.governedPresentationSurfaces,
      ...createTemplateHookPresentationSurfaces(templateHooks, {
        reelCount: gameDefinition.slotConfig.layout.reelCount,
      }),
    ],

    locale: { locale: 'en', localeService },
    accessibility: { reducedMotion: false },

    // Optional runtime symbol presentation override.
    // Keep this strictly presentation-only (do not mutate symbol catalog authority).
    // symbolDefinitionResolver: (symbolId) =>
    //   symbolId === 0
    //     ? { ...gameDefinition.slotConfig.symbols[0]!, spriteKey: 'your_override_key' }
    //     : null,

    useDefaultHud: true,
    runtimeShell: runtimeShellConfig,
    maxDpr: 2,
    logLevel: 'debug',

    onLoadingSceneShown: () => {
      const preloader = document.getElementById('preloader');
      if (preloader) preloader.classList.add('hidden');
    },

    onBootLoadFailed: (error: Error) => {
      notifyTemplateError(templateHooks, { source: 'boot', error });
      console.error('[Starter] Boot load failed:', error.message);
      const preloader = document.getElementById('preloader');
      if (preloader) {
        preloader.classList.remove('hidden');
        const label = localeService.get('error.loadFailed');
        preloader.textContent = `${label}: ${error.message}`;
        preloader.style.color = '#e74c3c';
      }
    },
  };
}

function subscribeToLayout(handle: GameHandle): void {
  const container = document.getElementById('game-container');
  const preloader = document.getElementById('preloader');
  if (!container) return;

  const applyLayout = (state: LayoutState): void => {
    container.setAttribute('data-orientation', state.orientation);
    container.setAttribute('data-scale', state.scale.toFixed(4));
    container.style.setProperty('--design-width', String(state.designWidth));
    container.style.setProperty('--design-height', String(state.designHeight));
    container.style.setProperty('--scale', String(state.scale));

    if (preloader && !preloader.classList.contains('hidden')) {
      const pxW = state.visibleBounds.width * state.scale;
      const pxH = state.visibleBounds.height * state.scale;
      preloader.style.width = `${Math.round(pxW)}px`;
      preloader.style.height = `${Math.round(pxH)}px`;
    }
  };

  applyLayout(handle.getAdvanced().layout);
  handle.events?.on(EngineEventRegistry.VIEW_LAYOUT_CHANGE, (state: LayoutState) => {
    applyLayout(state);
  });
}

let currentHandle: GameHandle | null = null;

async function main(): Promise<void> {
  try {
    markSmokeBootStarting();
    notifyTemplateBootStart(templateHooks, {
      gameId: gameDefinition.slotConfig.gameId,
      gameName: gameDefinition.slotConfig.gameName,
      version: gameDefinition.slotConfig.version,
    });

    if (currentHandle && !currentHandle.isDestroyed) {
      await currentHandle.destroy();
      currentHandle = null;
    }

    const handle = await bootstrap(buildBootstrapInput());
    currentHandle = handle;
    attachBrowserSmokeLifecycle(handle);
    const bootCompleteContext = {
      gameId: gameDefinition.slotConfig.gameId,
      gameName: gameDefinition.slotConfig.gameName,
      version: gameDefinition.slotConfig.version,
      spinFeelPreset: handle.resolvedConfig.spinFeelPreset ?? gameDefinition.spinFeelPreset,
      size: `${handle.resolvedConfig.width}x${handle.resolvedConfig.height}`,
    };
    registerTemplateHooks(handle, templateHooks);
    notifyTemplateBootComplete(templateHooks, bootCompleteContext);
    notifyTemplateStartGame(templateHooks, bootCompleteContext);

    const log = handle.getAdvanced().logger;
    log?.info('[Starter] Game started', {
      game: gameDefinition.slotConfig.gameId,
      spinFeelPreset: handle.resolvedConfig.spinFeelPreset,
      size: `${handle.resolvedConfig.width}x${handle.resolvedConfig.height}`,
    });

    subscribeToLayout(handle);

    const overlay = handle.getOverlayContainer();
    const reels: IReelsView | null = handle.getReelsView();
    if (overlay) log?.info('[Starter] Overlay container available');
    if (reels) log?.info('[Starter] Reels view available');
    markSmokeReady();
  } catch (error) {
    notifyTemplateError(templateHooks, { source: 'startup', error });
    markSmokeError(error);
    console.error('[Starter] Fatal startup error:', error);
    if (isBrowserSmokeHookEnabled()) {
      throw error;
    }
  }
}

installBrowserSmokeHook();
main();
