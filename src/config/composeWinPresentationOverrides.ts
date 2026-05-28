import {
  createClassicLineWinPresentation,
  type ClassicLineWinPresentationOptions,
} from '@fnx/sl-engine';
import type { DeepPartial, WinChoreographyConfig, WinPresenterFullConfig } from '@view/win/WinPresenterConfig.ts';
import type { LineStyleRegistryConfig } from '@view/win/line-style/lineStyleTypes.ts';
import type { WinTextPresentationConfig } from '@view/win/text/WinTextTypes.ts';

/** Cleopatra-owned presenter timing / placement patches (valid engine override surface). */
export interface CleopatraPresenterLayoutOverrides {
  readonly timingPrecedence?: WinPresenterFullConfig['timingPrecedence'];
  readonly timing?: DeepPartial<WinPresenterFullConfig['timing']>;
  /**
   * Choreography step windows (overlay duration validation uses these, not root `timing`).
   * Engine raises floors at finalize when count-up duration exceeds authored step timing.
   */
  readonly choreographyStepTiming?: DeepPartial<WinChoreographyConfig['stepTiming']>;
  /**
   * Count-up duration (0 → win amount). With `timingPrecedence: 'presenterOverridesTier'`,
   * wins over catalog tier tweens (normal 450 … epic 1500).
   */
  readonly amountTweenDurationMs?: number;
  readonly textPosition?: DeepPartial<WinPresenterFullConfig['textPosition']>;
  readonly global?: DeepPartial<WinPresenterFullConfig['global']>;
}

export interface TemplateWinPresentationComposeInput {
  readonly intent?: ClassicLineWinPresentationOptions;
  readonly lineStyles?: LineStyleRegistryConfig;
  readonly presenterLayout?: CleopatraPresenterLayoutOverrides;
}

type ResolvedPresentationProfile = ReturnType<typeof createClassicLineWinPresentation> & {
  readonly text?: WinTextPresentationConfig;
};

function isNonArrayObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasAuthoredLineStyleEntry(entry: unknown): boolean {
  if (!isNonArrayObject(entry)) return false;
  const line = entry.line;
  if (isNonArrayObject(line) && line.type === 'graphic' && Object.keys(line).length > 1) return true;
  const label = entry.label;
  if (isNonArrayObject(label) && Object.keys(label).length > 0) return true;
  return false;
}

function hasAuthoredLineStyles(
  lineStyles: LineStyleRegistryConfig | DeepPartial<WinPresenterFullConfig['lineStyles']> | undefined,
): boolean {
  if (!isNonArrayObject(lineStyles)) return false;
  if (hasAuthoredLineStyleEntry(lineStyles.default)) return true;
  const byLineId = lineStyles.byLineId;
  if (!isNonArrayObject(byLineId)) return false;
  return Object.values(byLineId).some((entry) => hasAuthoredLineStyleEntry(entry));
}

/**
 * Resolves template win presentation intent at the composition boundary into
 * engine `winPresenterConfigOverrides` (choreography, optional global win text,
 * Cleopatra layout patches, payline theme).
 */
export function composeWinPresenterConfigOverrides(
  input: TemplateWinPresentationComposeInput,
): DeepPartial<WinPresenterFullConfig> | undefined {
  const overrides: DeepPartial<WinPresenterFullConfig> = {};

  if (input.intent != null) {
    const profile: ResolvedPresentationProfile = createClassicLineWinPresentation(input.intent);
    overrides.choreography = profile.choreography;
    // Do not merge profile.text → global.winText here: catalog tier amount tweens apply unless
    // winPresenterLayout.amountTweenDurationMs is set (presenterOverridesTier).
  }

  const layout = input.presenterLayout;
  const stepTimingPatch = layout?.choreographyStepTiming;
  if (isNonArrayObject(stepTimingPatch) && Object.keys(stepTimingPatch).length > 0) {
    overrides.choreography = {
      ...overrides.choreography,
      enabled: overrides.choreography?.enabled ?? true,
      stepTiming: {
        ...overrides.choreography?.stepTiming,
        ...stepTimingPatch,
      },
    };
  }
  if (layout?.timingPrecedence !== undefined) {
    overrides.timingPrecedence = layout.timingPrecedence;
  }
  if (isNonArrayObject(layout?.timing) && Object.keys(layout.timing).length > 0) {
    overrides.timing = { ...overrides.timing, ...layout.timing };
  }
  if (isNonArrayObject(layout?.textPosition) && Object.keys(layout.textPosition).length > 0) {
    overrides.textPosition = { ...overrides.textPosition, ...layout.textPosition };
  }
  if (isNonArrayObject(layout?.global) && Object.keys(layout.global).length > 0) {
    overrides.global = { ...overrides.global, ...layout.global };
  }
  if (layout?.amountTweenDurationMs !== undefined) {
    overrides.global = {
      ...overrides.global,
      winText: {
        ...(overrides.global?.winText ?? {}),
        amountTween: {
          enabled: true,
          from: 'zero',
          durationMs: layout.amountTweenDurationMs,
          easing: 'quadOut',
        },
      },
    };
  }

  if (hasAuthoredLineStyles(input.lineStyles)) {
    overrides.lineStyles = input.lineStyles;
  }

  return isAuthoredWinPresenterOverrides(overrides) ? overrides : undefined;
}

/**
 * True when composed overrides carry choreography, layout patches, and/or authored payline theme.
 */
export function isAuthoredWinPresenterOverrides(
  overrides: DeepPartial<WinPresenterFullConfig> | undefined,
): overrides is DeepPartial<WinPresenterFullConfig> {
  if (overrides == null) return false;
  if (overrides.choreography != null) return true;
  if (overrides.timingPrecedence !== undefined) return true;
  if (isNonArrayObject(overrides.timing) && Object.keys(overrides.timing).length > 0) return true;
  if (isNonArrayObject(overrides.textPosition) && Object.keys(overrides.textPosition).length > 0) return true;
  if (hasAuthoredLineStyles(overrides.lineStyles)) return true;
  return false;
}
