import {
  EngineEventRegistry,
  governedClassicStockStopSurface,
  type ClassicReelStopCompletedPayload,
  type EngineEventPayloadFor,
  type GameHandle,
  type GovernedPresentationSurfaceRegistration,
} from '@fnx/sl-engine';
import type {
  TemplateAllReelsStoppedContext,
  TemplateBootCompleteContext,
  TemplateBootContext,
  TemplateErrorContext,
  TemplateHooks,
} from './templateHooks.ts';
type WinPresentStartPayload = EngineEventPayloadFor<typeof EngineEventRegistry.WIN_PRESENT_START>;

interface TemplateHookSurfaceOptions {
  reelCount: number;
}

function invokeTemplateHook(hooks: TemplateHooks, source: TemplateErrorContext['source'], fn: () => void): void {
  void source;
  try {
    fn();
  } catch (error) {
    try {
      hooks.onError?.({ source: 'hook', error });
    } catch {
      // Avoid recursive hook failures.
    }
    console.error('[Starter] template hook failed:', error);
  }
}

function bootContext(game: TemplateBootContext): TemplateBootContext {
  return {
    gameId: game.gameId,
    gameName: game.gameName,
    ...(game.version ? { version: game.version } : {}),
  };
}

function winTotal(payload: WinPresentStartPayload): number {
  return payload.wins.reduce((sum, win) => sum + win.winAmount, 0);
}

export function notifyTemplateBootStart(hooks: TemplateHooks, ctx: TemplateBootContext): void {
  invokeTemplateHook(hooks, 'startup', () => hooks.onBootStart?.(bootContext(ctx)));
}

export function notifyTemplateBootComplete(hooks: TemplateHooks, ctx: TemplateBootCompleteContext): void {
  invokeTemplateHook(hooks, 'startup', () => hooks.onBootComplete?.(ctx));
}

export function notifyTemplateStartGame(hooks: TemplateHooks, ctx: TemplateBootCompleteContext): void {
  invokeTemplateHook(hooks, 'startup', () => hooks.onStartGame?.(ctx));
}

export function notifyTemplateError(hooks: TemplateHooks, ctx: TemplateErrorContext): void {
  try {
    hooks.onError?.(ctx);
  } catch (error) {
    console.error('[Starter] template onError hook failed:', error);
  }
}

export function createTemplateHookPresentationSurfaces(
  hooks: TemplateHooks,
  options: TemplateHookSurfaceOptions,
): readonly GovernedPresentationSurfaceRegistration[] {
  if (!hooks.onReelStop && !hooks.onAllReelsStopped) return [];

  let currentSpinSeq: number | null = null;
  let completedSpinSeq: number | null = null;
  const stoppedReels = new Set<number>();
  const canFireAllReelsStopped = Number.isFinite(options.reelCount)
    && Number.isInteger(options.reelCount)
    && options.reelCount > 0;

  return [
    governedClassicStockStopSurface({
      extensionId: 'starter:template_hooks:classic_stock_stop',
      sortKey: 'starter:template_hooks:classic_stock_stop',
      hooks: {
        reel: {
          onReelStopCompleted: (payload: ClassicReelStopCompletedPayload) => {
            if (currentSpinSeq !== payload.spinSeq) {
              currentSpinSeq = payload.spinSeq;
              completedSpinSeq = null;
              stoppedReels.clear();
            }

            invokeTemplateHook(hooks, 'spin', () => {
              hooks.onReelStop?.({
                spinSeq: payload.spinSeq,
                reelIndex: payload.reelIndex,
                finalVisibleSymbolIds: payload.finalVisibleSymbolIds,
              });
            });

            if (!hooks.onAllReelsStopped || !canFireAllReelsStopped || completedSpinSeq === payload.spinSeq) {
              return;
            }

            stoppedReels.add(payload.reelIndex);
            if (stoppedReels.size >= options.reelCount) {
              const ctx: TemplateAllReelsStoppedContext = {
                spinSeq: payload.spinSeq,
                reelCount: options.reelCount,
              };
              completedSpinSeq = payload.spinSeq;
              invokeTemplateHook(hooks, 'spin', () => hooks.onAllReelsStopped?.(ctx));
            }
          },
        },
      },
    }),
  ];
}

export function registerTemplateHooks(handle: GameHandle, hooks: TemplateHooks): () => void {
  const eventBus = handle.events;
  if (!eventBus) return () => {};

  const unsubscribers = [
    eventBus.on(EngineEventRegistry.SPIN_KICKOFF_ACCEPTED, (payload) => {
      invokeTemplateHook(hooks, 'spin', () => hooks.onSpinStart?.({
        bet: payload.bet,
        spinId: payload.spinId,
      }));
    }),
    eventBus.on(EngineEventRegistry.SPIN_CYCLE_COMPLETE, (payload) => {
      invokeTemplateHook(hooks, 'spin', () => hooks.onRoundComplete?.({
        totalWin: payload.totalWin,
        result: payload.cycleSuccess.outcome,
      }));
    }),
    eventBus.on(EngineEventRegistry.SPIN_TERMINAL_FAILURE, (payload) => {
      notifyTemplateError(hooks, { source: 'spin', error: payload.error });
    }),
    eventBus.on(EngineEventRegistry.WIN_PRESENT_START, (payload) => {
      invokeTemplateHook(hooks, 'spin', () => hooks.onWinStart?.({
        wins: payload.wins,
        totalWin: winTotal(payload),
      }));
    }),
    eventBus.on(EngineEventRegistry.WIN_PRESENT_COMPLETE, () => {
      invokeTemplateHook(hooks, 'spin', () => hooks.onWinComplete?.());
    }),
    eventBus.on(EngineEventRegistry.VIEW_RESIZE, (payload) => {
      invokeTemplateHook(hooks, 'startup', () => hooks.onResize?.({
        rendererWidth: payload.rendererWidth,
        rendererHeight: payload.rendererHeight,
        stageScale: payload.stageScale,
        stageOffsetX: payload.stageOffsetX,
        stageOffsetY: payload.stageOffsetY,
      }));
    }),
    eventBus.on(EngineEventRegistry.VIEW_ORIENTATION_CHANGE, (payload) => {
      invokeTemplateHook(hooks, 'startup', () => hooks.onOrientationChange?.({
        orientation: payload.orientation,
        appliedLayoutOrientation: payload.appliedLayoutOrientation,
        width: payload.viewportWidth,
        height: payload.viewportHeight,
        designWidth: payload.designWidth,
        designHeight: payload.designHeight,
        layoutProfileCommitted: payload.layoutProfileCommitted,
        ...(payload.profileApplyDeferred !== undefined ? { profileApplyDeferred: payload.profileApplyDeferred } : {}),
      }));
    }),
    eventBus.on(EngineEventRegistry.STARTUP_LOAD_FAILED, (error) => {
      notifyTemplateError(hooks, { source: 'boot', error });
    }),
    eventBus.on(EngineEventRegistry.ENGINE_CONTEXT_LOST, (error) => {
      notifyTemplateError(hooks, { source: 'context', error });
    }),
  ];

  return () => {
    for (const unsubscribe of unsubscribers) unsubscribe();
  };
}
