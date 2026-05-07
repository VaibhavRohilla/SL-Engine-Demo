import type { SlotRuntimeShellConfig } from '@fnx/sl-engine';
import { hudConfig } from './hudConfig.ts';

export { hudConfig } from './hudConfig.ts';
export { hudTheme } from './hudTheme.ts';
export { paytableConfig } from './paytableConfig.ts';
export { betPanelConfig } from './betPanelConfig.ts';
export { autoplayPanelConfig } from './autoplayPanelConfig.ts';
export { settingsPanelConfig } from './settingsPanelConfig.ts';

export const runtimeShellConfig = {
  hud: hudConfig,
} satisfies SlotRuntimeShellConfig;
