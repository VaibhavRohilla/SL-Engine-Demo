/**
 * Auto-generated Asset Type Definitions
 *
 * This file is generated from assets/manifest.json. Do not edit manually.
 * Regenerate with: pnpm assets
 *
 * DX only — runtime does not depend on this file.
 * Generated: 2026-05-28T16:45:34.571Z
 */

export type AssetType = 'texture' | 'spritesheet' | 'spine' | 'audio' | 'audioSprite' | 'json' | 'font';

export type TextureAssetKey = 'Background' | 'CoinSheet' | 'PayLines' | 'SlotMachine_3x5' | 'Vase';

export type SpritesheetAssetKey = 'Fire/Fire' | 'Symbols/10' | 'Symbols/A' | 'Symbols/Ankh' | 'Symbols/Bonus' | 'Symbols/Eye' | 'Symbols/FreeSpin' | 'Symbols/J' | 'Symbols/Jackpot' | 'Symbols/Lotus' | 'Symbols/Q' | 'Symbols/Scatter' | 'Symbols/Shen' | 'Symbols/Wick' | 'Symbols/Wild' | 'Symbols/k' | 'ViewButtons/viewbuttons' | 'gui/Guibuttons';

export type SpineAssetKey = never;

export type AudioAssetKey = 'sfx_reel_stop_a' | 'sfx_reel_stop_b' | 'sfx_spin_start' | 'sfx_win_big' | 'sfx_win_medium' | 'sfx_win_mega' | 'sfx_win_small';

export type AudioSpriteAssetKey = never;

export type JsonAssetKey = never;

export type FontAssetKey = never;

export type AssetKey = TextureAssetKey | SpritesheetAssetKey | SpineAssetKey | AudioAssetKey | AudioSpriteAssetKey | JsonAssetKey | FontAssetKey;

export interface AssetEntry {
  key: AssetKey;
  type: AssetType;
  url: string;
  urls?: Record<string, string>;
  meta?: Record<string, unknown>;
}

export interface Bundle {
  name: string;
  priority: number;
  required: boolean;
  assets: AssetEntry[];
}

export interface Manifest {
  version: string;
  baseUrl: string;
  bundles: Bundle[];
}

/** Type-safe asset key lists by type (for autocomplete). */
export const AssetKeys = {
  texture: ['Background', 'CoinSheet', 'PayLines', 'SlotMachine_3x5', 'Vase'] as const satisfies readonly TextureAssetKey[],
  spritesheet: ['Fire/Fire', 'Symbols/10', 'Symbols/A', 'Symbols/Ankh', 'Symbols/Bonus', 'Symbols/Eye', 'Symbols/FreeSpin', 'Symbols/J', 'Symbols/Jackpot', 'Symbols/Lotus', 'Symbols/Q', 'Symbols/Scatter', 'Symbols/Shen', 'Symbols/Wick', 'Symbols/Wild', 'Symbols/k', 'ViewButtons/viewbuttons', 'gui/Guibuttons'] as const satisfies readonly SpritesheetAssetKey[],
  spine: [] as const satisfies readonly SpineAssetKey[],
  audio: ['sfx_reel_stop_a', 'sfx_reel_stop_b', 'sfx_spin_start', 'sfx_win_big', 'sfx_win_medium', 'sfx_win_mega', 'sfx_win_small'] as const satisfies readonly AudioAssetKey[],
  audioSprite: [] as const satisfies readonly AudioSpriteAssetKey[],
  json: [] as const satisfies readonly JsonAssetKey[],
  font: [] as const satisfies readonly FontAssetKey[],
} as const;

