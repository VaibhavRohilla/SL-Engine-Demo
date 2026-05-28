import type { SpinAudioCues } from '@fnx/sl-engine';

/**
 * Cleopatra SFX manifest entries — sole authoring source for audio keys, paths, and tags.
 * `assetManifestIntent` imports these; runtime cues must reference keys declared here.
 */
export const cleopatraSfxManifestAssets = [
  { key: 'sfx_spin_start', path: 'sfx_spin_start.wav', tags: ['audio', 'sfx', 'spin'] as const },
  { key: 'sfx_reel_stop_a', path: 'sfx_reel_stop_a.wav', tags: ['audio', 'sfx', 'reel'] as const },
  { key: 'sfx_reel_stop_b', path: 'sfx_reel_stop_b.wav', tags: ['audio', 'sfx', 'reel'] as const },
  { key: 'sfx_win_small', path: 'sfx_win_small.wav', tags: ['audio', 'sfx', 'win'] as const },
  { key: 'sfx_win_medium', path: 'sfx_win_medium.wav', tags: ['audio', 'sfx', 'win'] as const },
  { key: 'sfx_win_big', path: 'sfx_win_big.wav', tags: ['audio', 'sfx', 'win'] as const },
  { key: 'sfx_win_mega', path: 'sfx_win_mega.wav', tags: ['audio', 'sfx', 'win'] as const },
] as const;

export type CleopatraSfxAssetKey = (typeof cleopatraSfxManifestAssets)[number]['key'];

export const cleopatraSfxManifestAssetKeys: readonly CleopatraSfxAssetKey[] =
  cleopatraSfxManifestAssets.map((entry) => entry.key);

export function buildCleopatraAudioIntentAssets(): Array<{
  key: CleopatraSfxAssetKey;
  type: 'audio';
  path: string;
  tags: string[];
}> {
  return cleopatraSfxManifestAssets.map((entry) => ({
    key: entry.key,
    type: 'audio',
    path: entry.path,
    tags: [...entry.tags],
  }));
}

/** Keys referenced by tooling — derived from manifest entries (no parallel manual list). */
export function getCleopatraReferencedAudioKeys(): readonly CleopatraSfxAssetKey[] {
  return cleopatraSfxManifestAssetKeys;
}

export const cleopatraSpinFeelAudioCues: SpinAudioCues = {
  spinStart: 'sfx_spin_start',
  reelStop: ['sfx_reel_stop_a', 'sfx_reel_stop_b'],
  winSmall: 'sfx_win_small',
  winMedium: 'sfx_win_medium',
  winBig: 'sfx_win_big',
  winMega: 'sfx_win_mega',
};

export function collectSpinAudioCueAssetKeys(cues: SpinAudioCues): Set<string> {
  const keys = new Set<string>();
  const add = (value: string | undefined): void => {
    if (value) keys.add(value);
  };
  const addReel = (value: string | readonly string[] | undefined): void => {
    if (!value) return;
    if (typeof value === 'string') {
      keys.add(value);
      return;
    }
    for (const reelKey of value) keys.add(reelKey);
  };

  add(cues.spinStart);
  add(cues.spinLoop);
  addReel(cues.reelStop);
  add(cues.gravityBaseBoardSettle);
  add(cues.anticipation);
  add(cues.winSmall);
  add(cues.winMedium);
  add(cues.winBig);
  add(cues.winMega);
  add(cues.scatterTrigger);
  return keys;
}

const manifestKeySet = new Set<string>(cleopatraSfxManifestAssetKeys);
for (const cueKey of collectSpinAudioCueAssetKeys(cleopatraSpinFeelAudioCues)) {
  if (!manifestKeySet.has(cueKey)) {
    throw new Error(
      `Cleopatra spinFeelAudioCues references "${cueKey}" which is not declared in cleopatraSfxManifestAssets`,
    );
  }
}

export interface CleopatraAudioProfile {
  spinFeelAudioCues: SpinAudioCues;
}

export const audioProfile: CleopatraAudioProfile = {
  spinFeelAudioCues: cleopatraSpinFeelAudioCues,
};
