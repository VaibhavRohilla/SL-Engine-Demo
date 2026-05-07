import type { SpinAudioCues } from '@fnx/sl-engine';

/**
 * Canonical list of audio asset keys referenced by starter runtime config.
 * Tooling validates these keys against assets/manifest.json.
 */
export const REFERENCED_AUDIO_ASSET_KEYS = [
  'sfx_spin_start',
  'sfx_reel_stop_a',
  'sfx_reel_stop_b',
  'sfx_win_small',
  'sfx_win_medium',
  'sfx_win_big',
  'sfx_win_mega',
] as const;

export type StarterAudioAssetKey = (typeof REFERENCED_AUDIO_ASSET_KEYS)[number];

export interface StarterAudioProfile {
  spinFeelAudioCues: SpinAudioCues;
}

export const audioProfile: StarterAudioProfile = {
  spinFeelAudioCues: {
    spinStart: 'sfx_spin_start',
    reelStop: ['sfx_reel_stop_a', 'sfx_reel_stop_b'],
  },
};
