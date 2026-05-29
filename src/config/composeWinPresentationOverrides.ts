import {
  applyWinPresentationLayoutIntentToOverrides,
  applyWinPresentationOverlayLayersToTiers,
  applyWinPresentationTimingIntentToTiers,
  createClassicLineWinPresentation,
  profileUsesIntentOwnedOverlayLayer,
  type ClassicLineWinPresentationOptions,
} from '@fnx/sl-engine';
import {
  CATALOG_MANUAL_WIN_PRESENTER_MERGE_BASE,
  type DeepPartial,
  type WinPresenterFullConfig,
} from '@view/win/WinPresenterConfig.ts';
import type { LineStyleRegistryConfig } from '@view/win/line-style/lineStyleTypes.ts';
import type { WinTextPresentationConfig } from '@view/win/text/WinTextTypes.ts';

export interface TemplateWinPresentationComposeInput {
  readonly intent?: ClassicLineWinPresentationOptions;
  readonly lineStyles?: LineStyleRegistryConfig;
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
 * engine `winPresenterConfigOverrides` (choreography shell, tier timing, layout, payline theme).
 */
export function composeWinPresenterConfigOverrides(
  input: TemplateWinPresentationComposeInput,
): DeepPartial<WinPresenterFullConfig> | undefined {
  const overrides: DeepPartial<WinPresenterFullConfig> = {};

  if (input.intent != null) {
    const profile: ResolvedPresentationProfile = createClassicLineWinPresentation(input.intent);
    const { stepTiming: _profileStepTiming, ...choreographyShell } = profile.choreography;
    overrides.choreography = {
      ...choreographyShell,
      stepTiming: { ...CATALOG_MANUAL_WIN_PRESENTER_MERGE_BASE.choreography.stepTiming },
    };
    const overlayLayers = profile.overlay.layers ?? [];
    const needsTierOverrides = input.intent.timing != null || profileUsesIntentOwnedOverlayLayer(overlayLayers);
    if (needsTierOverrides) {
      let tiers = applyWinPresentationTimingIntentToTiers({
        timing: input.intent.timing,
        intensity: input.intent.intensity,
      });
      if (profileUsesIntentOwnedOverlayLayer(overlayLayers)) {
        tiers = applyWinPresentationOverlayLayersToTiers({
          tiers,
          layers: overlayLayers,
        });
      }
      overrides.tiers = tiers;
    }

    const layoutOverrides = applyWinPresentationLayoutIntentToOverrides(input.intent.layout);
    if (layoutOverrides?.textPosition != null) {
      overrides.textPosition = {
        ...(overrides.textPosition ?? {}),
        ...layoutOverrides.textPosition,
      };
    }
    if (layoutOverrides?.global != null) {
      overrides.global = {
        ...(overrides.global ?? {}),
        ...layoutOverrides.global,
      };
    }
  }

  if (hasAuthoredLineStyles(input.lineStyles)) {
    overrides.lineStyles = input.lineStyles;
  }

  return isAuthoredWinPresenterOverrides(overrides) ? overrides : undefined;
}

export function isAuthoredWinPresenterOverrides(
  overrides: DeepPartial<WinPresenterFullConfig> | undefined,
): overrides is DeepPartial<WinPresenterFullConfig> {
  if (overrides == null) return false;
  if (overrides.choreography != null) return true;
  if (overrides.tiers != null) return true;
  if (isNonArrayObject(overrides.textPosition) && Object.keys(overrides.textPosition).length > 0) return true;
  if (isNonArrayObject(overrides.global) && Object.keys(overrides.global).length > 0) return true;
  if (hasAuthoredLineStyles(overrides.lineStyles)) return true;
  return false;
}
