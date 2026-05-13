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
        timing:{
          singleWinDurationMs: 10000,
          betweenWinsDelayMs: 10000,
          allWinsDurationMs: 10000,
        },
        visualizer: {
          executionMode : 'parallel',
          loopEnabled: true,
          linePresentationMode: 'vector',
          moduleOrder: ['winText', 'highlight', 'linePath', 'jackpot'],
          enabledModules: {
            highlight: true,
            linePath: true,
            jackpot: true,
            winText: true,
          },
        },
      },
      additionalWinModules: () => [new StarterProofPulseModule()],
    },
  });
}
