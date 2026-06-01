import type { LineStyleRegistryConfig } from '@view/win/line-style/lineStyleTypes.ts';
import type { DeepPartial, WinPresenterFullConfig } from '@view/win/WinPresenterConfig.ts';
import {
  composeWinPresentationIntentToPresenterOverrides,
  isAuthoredWinPresenterOverrides,
  type ClassicLineWinPresentationOptions,
} from '@fnx/sl-engine';

export { isAuthoredWinPresenterOverrides };

export interface TemplateWinPresentationComposeInput {
  readonly intent?: ClassicLineWinPresentationOptions;
  readonly lineStyles?: LineStyleRegistryConfig;
}

/**
 * Resolves template win presentation intent at the Cleopatra composition boundary.
 * Delegates to the engine-owned compose helper — no local legacy winText forwarding.
 */
export function composeWinPresenterConfigOverrides(
  input: TemplateWinPresentationComposeInput,
): DeepPartial<WinPresenterFullConfig> | undefined {
  return composeWinPresentationIntentToPresenterOverrides({
    preset: 'classicLine',
    intent: input.intent,
    lineStyles: input.lineStyles,
  });
}
