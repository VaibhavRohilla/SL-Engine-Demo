export const STARTER_CONVENTIONS = {
  buildEntry: 'src/main.ts',
  buildOutDir: 'dist',
  sdkPackage: '@fnx/sl-engine',
  devPort: 8080,
  devHost: '0.0.0.0',
  audioSfxDir: 'assets/audio/sfx',
  audioSpriteOutDir: 'assets/audio/sprites',
  spineDir: 'assets/spine',
  symbolsDir: 'assets/symbols',
  assetTypesPath: 'src/Asset.d.ts',
  assetSuggestionsPath: 'generated/asset-suggestions.json',
} as const;
