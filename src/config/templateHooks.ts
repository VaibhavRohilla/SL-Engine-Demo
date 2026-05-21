import type { SpinOutcome } from '@fnx/sl-engine';

export interface TemplateBootContext {
  gameId: string;
  gameName: string;
  version?: string;
}

export interface TemplateBootCompleteContext extends TemplateBootContext {
  spinFeelPreset: string;
  size: string;
}

export interface TemplateSpinStartContext {
  bet: number;
  spinId: string;
}

export interface TemplateReelStopContext {
  spinSeq: number;
  reelIndex: number;
  finalVisibleSymbolIds: readonly number[];
}

export interface TemplateAllReelsStoppedContext {
  spinSeq: number;
  reelCount: number;
}

export interface TemplateWinStartContext {
  wins: readonly unknown[];
  totalWin: number;
}

export interface TemplateRoundCompleteContext {
  totalWin: number;
  result: SpinOutcome | null;
}

export interface TemplateResizeContext {
  rendererWidth: number;
  rendererHeight: number;
  stageScale: number;
  stageOffsetX: number;
  stageOffsetY: number;
}

export interface TemplateOrientationChangeContext {
  orientation: 'landscape' | 'portrait';
  appliedLayoutOrientation: 'landscape' | 'portrait';
  width: number;
  height: number;
  designWidth: number;
  designHeight: number;
  layoutProfileCommitted: boolean;
  profileApplyDeferred?: boolean;
}

export interface TemplateErrorContext {
  source: 'boot' | 'spin' | 'context' | 'hook' | 'startup';
  error: unknown;
}

export interface TemplateHooks {
  onBootStart?(ctx: TemplateBootContext): void;
  onBootComplete?(ctx: TemplateBootCompleteContext): void;
  onStartGame?(ctx: TemplateBootCompleteContext): void;
  onSpinStart?(ctx: TemplateSpinStartContext): void;
  onReelStop?(ctx: TemplateReelStopContext): void;
  onAllReelsStopped?(ctx: TemplateAllReelsStoppedContext): void;
  onWinStart?(ctx: TemplateWinStartContext): void;
  onWinComplete?(): void;
  onRoundComplete?(ctx: TemplateRoundCompleteContext): void;
  onResize?(ctx: TemplateResizeContext): void;
  onOrientationChange?(ctx: TemplateOrientationChangeContext): void;
  onError?(ctx: TemplateErrorContext): void;
}

export const templateHooks: TemplateHooks = {
  // onSpinStart: ({ spinId }) => console.log('[Hooks] spin start', spinId),
  // onWinStart: ({ totalWin }) => console.log('[Hooks] win start', totalWin),
  // onOrientationChange: ({ orientation, width, height }) => console.log('[Hooks] orientation', orientation, width, height),
};
