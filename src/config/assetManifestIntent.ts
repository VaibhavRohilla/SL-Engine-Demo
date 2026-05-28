/**
 * Cleopatra asset manifest intent — authoring source of truth for asset keys, paths, and bundles.
 * Runtime `assets/manifest.json` is generated from this intent (`pnpm assets`); doctor drift-checks against it.
 */

import { defineSlotAssetManifest } from '@fnx/sl-engine';
import { buildCleopatraAudioIntentAssets, cleopatraSfxManifestAssetKeys } from './audioConfig.ts';

const MAIN_BUNDLE_ASSET_KEYS = [
  'Background',
  'CoinSheet',
  'Fire/Fire',
  'gui/Guibuttons',
  'PayLines',
  ...cleopatraSfxManifestAssetKeys,
  'SlotMachine_3x5',
  'Symbols/10',
  'Symbols/A',
  'Symbols/Ankh',
  'Symbols/Bonus',
  'Symbols/Eye',
  'Symbols/FreeSpin',
  'Symbols/J',
  'Symbols/Jackpot',
  'Symbols/k',
  'Symbols/Lotus',
  'Symbols/Q',
  'Symbols/Scatter',
  'Symbols/Shen',
  'Symbols/Wick',
  'Symbols/Wild',
  'Vase',
  'ViewButtons/viewbuttons',
] as const;

export const cleopatraAssetManifestIntent = defineSlotAssetManifest({
  assets: [
    { key: 'Background', type: 'image', path: 'Background.png', tags: ['scene'] },
    { key: 'CoinSheet', type: 'image', path: 'CoinSheet.png', tags: ['fx'] },
    { key: 'Fire/Fire', type: 'spritesheet', path: 'Fire/Fire.json', tags: ['fx'] },
    { key: 'gui/Guibuttons', type: 'spritesheet', path: 'gui/Guibuttons.json', tags: ['hud'] },
    { key: 'PayLines', type: 'image', path: 'PayLines.png', tags: ['payline'] },
    ...buildCleopatraAudioIntentAssets(),
    { key: 'SlotMachine_3x5', type: 'image', path: 'SlotMachine_3x5.png', tags: ['frame'] },
    { key: 'Symbols/10', type: 'spritesheet', path: 'Symbols/10.json', tags: ['symbol'], metadata: { symbolId: '0' } },
    { key: 'Symbols/J', type: 'spritesheet', path: 'Symbols/J.json', tags: ['symbol'], metadata: { symbolId: '1' } },
    { key: 'Symbols/Q', type: 'spritesheet', path: 'Symbols/Q.json', tags: ['symbol'], metadata: { symbolId: '2' } },
    { key: 'Symbols/k', type: 'spritesheet', path: 'Symbols/k.json', tags: ['symbol'], metadata: { symbolId: '3' } },
    { key: 'Symbols/A', type: 'spritesheet', path: 'Symbols/A.json', tags: ['symbol'], metadata: { symbolId: '4' } },
    { key: 'Symbols/Ankh', type: 'spritesheet', path: 'Symbols/Ankh.json', tags: ['symbol'], metadata: { symbolId: '5' } },
    { key: 'Symbols/Eye', type: 'spritesheet', path: 'Symbols/Eye.json', tags: ['symbol'], metadata: { symbolId: '6' } },
    { key: 'Symbols/Lotus', type: 'spritesheet', path: 'Symbols/Lotus.json', tags: ['symbol'], metadata: { symbolId: '7' } },
    { key: 'Symbols/Shen', type: 'spritesheet', path: 'Symbols/Shen.json', tags: ['symbol'], metadata: { symbolId: '8' } },
    { key: 'Symbols/Wick', type: 'spritesheet', path: 'Symbols/Wick.json', tags: ['symbol'], metadata: { symbolId: '9' } },
    { key: 'Symbols/Wild', type: 'spritesheet', path: 'Symbols/Wild.json', tags: ['symbol'], metadata: { symbolId: '10' } },
    { key: 'Symbols/Scatter', type: 'spritesheet', path: 'Symbols/Scatter.json', tags: ['symbol'], metadata: { symbolId: '11' } },
    { key: 'Symbols/Bonus', type: 'spritesheet', path: 'Symbols/Bonus.json', tags: ['symbol'], metadata: { symbolId: '12' } },
    { key: 'Symbols/FreeSpin', type: 'spritesheet', path: 'Symbols/FreeSpin.json', tags: ['symbol'], metadata: { symbolId: '13' } },
    { key: 'Symbols/Jackpot', type: 'spritesheet', path: 'Symbols/Jackpot.json', tags: ['symbol'], metadata: { symbolId: '14' } },
    { key: 'Vase', type: 'image', path: 'Vase.png', tags: ['scene'] },
    { key: 'ViewButtons/viewbuttons', type: 'spritesheet', path: 'ViewButtons/viewbuttons.json', tags: ['hud'] },
  ],
  bundles: [
    {
      id: 'main',
      preload: true,
      assets: [...MAIN_BUNDLE_ASSET_KEYS],
    },
  ],
});
