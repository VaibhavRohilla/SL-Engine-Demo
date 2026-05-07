import { createDemoResultSource } from '../game/DemoResultSource.ts';
import { audioProfile } from './audioConfig.ts';
import { bootConfig } from './bootConfig.ts';
import { starterRuntimeBuildConfig } from './buildConfigRuntime.ts';
import { composeEngineGameDefinition, type StarterGameDefinition } from './composeEngineGameDefinition.ts';
import { featureConfig } from './featureConfig.ts';
import { slotConfig } from './slotConfig.ts';
import { templateGameConfig } from './templateGameConfig.ts';

/**
 * Canonical starter composition root — classic reels baseline.
 * Variant is selected at generation time by the CLI, not at runtime.
 */
export const gameDefinition: StarterGameDefinition = composeEngineGameDefinition(templateGameConfig, {
  slotConfig,
  bootConfig,
  fallbackSpinFeelPreset: starterRuntimeBuildConfig.spinFeelPreset,
  audioConfig: audioProfile,
  featureConfig,
  createResultSource: () => createDemoResultSource(slotConfig),
  canvasClearColorFromBuild: starterRuntimeBuildConfig.display.canvasClearColorFromBuild,
});
