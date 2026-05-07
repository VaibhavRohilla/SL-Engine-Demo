import type { SlotHudThemeConfig } from '@fnx/sl-engine';

/**
 * Template-owned HUD token overrides (merged over host theme + preset defaults).
 * Only keys supported by the engine HUD token contract are applied; omit fields you do not need.
 */
export const hudTheme = {
  panelBackgroundColor: 0x151926,
  panelBorderColor: 0x44506a,
  primaryButtonColor: 0x20b55b,
  primaryButtonDisabledColor: 0x343844,
  textPrimaryColor: 0xffffff,
  textSecondaryColor: 0xb8c1d6,
  valueTextColor: 0xffd76a,
  accentColor: 0x66d9ff,
  dangerColor: 0xd34b4b,
  activeColor: 0x22c768,
  radius: 14,
  gap: 8,
  fontFamily: 'Arial, sans-serif',
} satisfies SlotHudThemeConfig;
