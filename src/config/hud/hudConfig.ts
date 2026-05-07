import type { SlotHudConfig } from '@fnx/sl-engine';
import { autoplayPanelConfig } from './autoplayPanelConfig.ts';
import { betPanelConfig } from './betPanelConfig.ts';
import { hudTheme } from './hudTheme.ts';
import { paytableConfig } from './paytableConfig.ts';
import { settingsPanelConfig } from './settingsPanelConfig.ts';

/**
 * HUD layout rules (read before editing):
 *
 * 1. SL-Engine ships one default HUD: `commercial-slot`.
 *
 * 2. **`commercial.zones`** controls the built-in HUD. Custom branded HUDs belong in the template/app layer:
 *    set `useDefaultHud: false`, use `GameHandle.getOverlayContainer()`, listen to `GameHandle.events`, and call
 *    public `GameHandle` actions.
 *
 * After changes: full page reload so `bootstrap()` passes fresh `runtimeShell` into the HUD.
 */
const betPanelShared = {
  enabled: true,
  title: 'Bet',
  backdrop: 'dim' as const,
  closeButton: true,
  bet: betPanelConfig,
};

/**
 * Commercial HUD shell — `preset` supplies composition; this object overrides labels, panels, theme, and responsive layout.
 *
 * The generated starter default is `commercial-slot` with the commercial shell enabled.
 *
 * `commercial.skin` holds visual-only chrome and optional control texture overrides. It is validated
 * like the rest of `commercial`; omit the `skin` key to rely on theme tokens plus engine defaults
 * when the commercial shell is enabled.
 */
export const hudConfig = {
  preset: 'commercial-slot',
  commercial: {
    enabled: true,
    preset: 'commercial-slot',
    presentationMode: 'demo',
    /** Visual-only; does not change zone layout rects — see engine docs (COMMERCIAL_HUD_CONTRACT). */
    skin: {
      zoneCornerRadius: 10,
      zoneContentInset: 4,
      // Keep default chrome for critical controls, but style side rails independently.
      zoneOverrides: {
        leftFeatureRail: {
          zoneBackgroundAlpha: 0,
          zoneBorderAlpha: 0,
        },
        rightActionRail: {
          zoneBackgroundAlpha: 0,
          zoneBorderAlpha: 0,
        },
      },
    },
    zones: {
      topBrandLayer: {
        enabled: true,
        titleKey: 'hud.brand.title',
      },
      leftFeatureRail: {
        enabled: true,
        items: [
          {
            id: 'free-spins-20',
            labelKey: 'hud.leftRail.twentyFreeSpins',
            state: 'demo',
            interactive: false,
          },
        ],
      },
      rightActionRail: {
        enabled: true,
        betSummary: {
          enabled: true,
          labelKey: 'hud.rightRail.bet',
        },
        buyFeatureButtons: [],
      },
      bottomHudBar: {
        enabled: false,
        showCredit: false,
        showBet: false,
        showWin: false,
        showTurboHint: false,
      },
      spinControlCluster: {
        enabled: true,
        showSpin: true,
        showAutoplay: true,
        showBetStepper: true,
        placement: 'bottom-right',
      },
      utilityControlCluster: {
        enabled: true,
        showMenu: true,
        showInfo: true,
        showSound: true,
      },
      modalLayer: {
        enabled: true,
        settingsPanel: true,
        autoplayPanel: true,
        paytablePanel: true,
        betPanel: true,
      },
    },
  },
  theme: hudTheme,
  panels: {
    paytableBook: {
      enabled: true,
      title: 'Game Rules',
      backdrop: 'dim',
      closeButton: true,
      position: { anchor: 'center', x: -260, y: -230 },
      paytable: paytableConfig,
    },
    betPanel: {
      ...betPanelShared,
      position: { anchor: 'bottom-left', x: 190, y: -332 },
    },
    autoplaySettingsPanel: {
      enabled: true,
      title: 'Autoplay',
      backdrop: 'dim',
      closeButton: true,
      position: { anchor: 'center', x: -180, y: -140 },
      autoplay: autoplayPanelConfig,
    },
    systemSettingsPanel: {
      enabled: true,
      title: 'System Settings',
      backdrop: 'dim',
      closeButton: true,
      position: { anchor: 'center', x: -210, y: -190 },
      settings: settingsPanelConfig,
    },
    soundPopover: {
      enabled: true,
      title: 'Sound',
      backdrop: 'none',
      closeButton: false,
      position: { anchor: 'bottom-right', x: -228, y: -212 },
    },
  },
} satisfies SlotHudConfig;
