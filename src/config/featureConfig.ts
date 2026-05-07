import type { BootstrapInput, SlotFeaturePack } from '@fnx/sl-engine';

type GovernedPresentationSurfaces = NonNullable<BootstrapInput['governedPresentationSurfaces']>;

export interface StarterFeatureConfig {
  featurePacks: readonly SlotFeaturePack[];
  governedPresentationSurfaces: GovernedPresentationSurfaces;
}

export const featureConfig: StarterFeatureConfig = {
  featurePacks: [],
  governedPresentationSurfaces: [],
};
