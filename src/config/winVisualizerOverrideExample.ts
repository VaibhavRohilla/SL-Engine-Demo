import { Container } from 'pixi.js';
import {
  SlotGameScene,
  type GameSceneContext,
  type IWinVisualModule,
  type SpinFlow,
  type StockSpinExecutionAuthority,
  type WinEvent,
} from '@fnx/sl-engine';

class StarterProofPulseModule implements IWinVisualModule {
  public readonly name = 'StarterProofPulseModule';
  private root: Container | null = null;

  initialize(container: Container): void {
    this.root = container;
  }

  async play(event: WinEvent): Promise<void> {
    if (!this.root) return;
    this.clear();
    const marker = new Container();
    marker.label = `StarterProofPulse_${event.id}`;
    this.root.addChild(marker);
  }

  applyFinal(event: WinEvent): void {
    if (!this.root) return;
    this.clear();
    const marker = new Container();
    marker.label = `StarterProofFinal_${event.id}`;
    this.root.addChild(marker);
  }

  clear(): void {
    this.root?.removeChildren();
  }

  destroy(): void {
    this.clear();
    this.root = null;
  }
}

/**
 * Canonical advanced `scenes.game` example: uses {@link SlotGameScene.fromContext} + `slotSceneConfigOverrides`
 * so symbol authority, presentation facets, layout gaps, and `viewLifecycleEmit` stay aligned with bootstrap.
 */
export function createStarterWinVisualizerScene(
  ctx: GameSceneContext,
  spinFlow: SpinFlow,
  stockSpinExecutionAuthority: StockSpinExecutionAuthority,
): SlotGameScene {
  return SlotGameScene.fromContext(ctx, spinFlow, stockSpinExecutionAuthority, {
    slotSceneConfigOverrides: {
      winPresenterConfigOverrides: {
        timingPrecedence: 'presenterOverridesTier',
        timing:{
          singleWinDurationMs: 3200,
          betweenWinsDelayMs: 0,
          allWinsDurationMs: 3600,
        },
        global: {
          showPaylines: true,
          winLoopLimit: 100,
        },
        visualizer: {
          executionMode : 'parallel',
          loopEnabled: true,
          lifetime: { durationPolicy: 'untilNextSpin' },
          symbolWins: {
            enabled: true,
            animation: { enabled: true, animationKey: 'winStart', loopPolicy: 'presentation' },
            overlay: {
              enabled: true,
              type: 'graphic',
              lifetime: 'followPresentation',
              fill: 0xffd36a,
              alpha: 0.22,
              stroke: { color: 0xfff1a8, width: 2, alpha: 0.52 },
              paddingPx: 4,
              cornerRadius: 10,
              pulse: { enabled: true, alpha: 0.07, durationMs: 900 },
            },
          },
          lines: { enabled: true, lifetime: 'followPresentation' },
          winText: { enabled: true, lifetime: 'followPresentation' },
          linePresentationMode: 'vector',
        },
      },
      additionalWinModules: () => [new StarterProofPulseModule()],
    },
  });
}
