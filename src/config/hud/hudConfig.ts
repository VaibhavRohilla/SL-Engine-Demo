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
  closeButtonPlacement: 'top-right' as const,
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
    statusDisplay: {
      enabled: true,
      idleMessage: 'PLACE YOUR BETS!',
      spinningMessage: 'GOOD LUCK!',
      noWinMessage: 'PLACE YOUR BETS!',
      showZeroWinAmount: false,
      preservePreviousWinUntilNextSpin: false,
      visibility: {
        idleMessage: false,
        spinningMessage: false,
        noWinMessage: false,
        win: false,
        winDetail: false,
      },
      creditLabel: 'CREDIT',
      betLabel: 'BET',
      winLabel: 'WIN',
      linePaysTemplate: 'LINE {lineId} PAYS {amount}',
      fallbackWinDetailTemplate: 'TOTAL WIN {amount}',
      pairSpacingPx: 6,
      sideGroupGapPx: 12,
      layout: {
        pad: 12,
        sideLayout: 'stacked-left',
        stackRowGapPx: 4,
        portraitCenterOffsetY: -2,
        clusters: {
          credit: { groupAnchor: 'center', offsetX: 0, offsetY: 0 },
          bet: { groupAnchor: 'center', offsetX: 0, offsetY: 0 },
          center: { groupAnchor: 'center', offsetX: -80, offsetY: 0 },
          detail: { groupAnchor: 'center', offsetX: -80, offsetY: 0 }        },
      },
      styles: {
        creditLabel: {
          fontSize: 24,
          fontWeight: 'normal',
          align: 'left',
          fill: 0xffd54f,
          strokeThickness: 0,
        },
        betLabel: {
          fontSize: 24,
          fontWeight: 'normal',
          align: 'left',
          fill: 0xffd54f,
          strokeThickness: 0,
        },
        winLabel: {

          fontSize: 24,
          fontWeight: 'normal',
          align: 'left',
          fill: 0xffd54f,
          strokeThickness: 0,
        },
        creditAmount: {
          fontSize: 24,
          fontWeight: 'normal',
          align: 'left',
          fill: 0xffffff,
          strokeThickness: 0,
        },
        betAmount: {
          fontSize: 24,
          fontWeight: 'normal',
          align: 'left',
          fill: 0xffffff,
          strokeThickness: 0,
        },
        winAmount: {
          fontSize: 24,
          fontWeight: 'normal',
          align: 'left',
          fill: 0xffffff,
          strokeThickness: 0,
        },
        idleMessage: { fontSize: 32, fontWeight: 'normal', fill: 0xffffff, align: 'center', strokeThickness: 0 },
        spinningMessage: { fontSize: 32, fontWeight: 'normal', fill: 0xe3f2fd, align: 'center' },
        noWinMessage: { fontSize: 32, fontWeight: 'normal', fill: 0xffffff, align: 'center' },
        detail: { fontSize: 24, fill: 0xb0bec5, align: 'center', minFontSize: 16, maxFontSize: 24, strokeThickness: 0 },
      },
    },
    layout: {
      mode: 'bottom-console',
      margins: { top: 12, right: 12, bottom: 20, left: 12 },
      spinClusterSize: { width: 228, height: 72 },
      utilityClusterSize: { width: 168, height: 60 },
      bottomBarHeight: 80,
      statusCenterMinFontSize: 11,
      statusDetailMinFontSize: 9,
      statusCreditClusterWidth: 200,
      statusBetClusterWidth: 130,
      controlStrips: {
        utility: { anchor: 'left', padX: 4, gap: 6, fitToLabels: true, labelPadX: 12 },
        spin: { anchor: 'right', padX: 8, gap: 6, fitToLabels: true, labelPadX: 12 },
      },
    },
    /** Visual-only; does not change zone layout rects — see engine docs (COMMERCIAL_HUD_CONTRACT). */
    skin: {
      zoneCornerRadius: 10,
      zoneContentInset: 4,
      spinClusterRingAlpha: 0,
      spinClusterFillBoostAlpha: 0,
      zoneOverrides: {
        leftFeatureRail: {
          zoneBackgroundAlpha: 0,
          zoneBorderAlpha: 0,
        },
        rightActionRail: {
          zoneBackgroundAlpha: 0,
          zoneBorderAlpha: 0,
        },
        bottomHudBar: {
          zoneBackgroundAlpha: 0.55,
          zoneBorderAlpha: 0.22,
        },
        spinControlCluster: {
          zoneBackgroundAlpha: 0,
          zoneBorderAlpha: 0,
        },
        utilityControlCluster: {
          zoneBackgroundAlpha: 0,
          zoneBorderAlpha: 0,
        },
      },
    },
    board: {
      enabled: false,
      layers: ['overlay'],
      elements: {
        brandLogo: {
          type: 'sprite',
          layer: 'overlay',
          assetKey: 'Vase',
          anchorTo: 'viewport',
          anchor: 'top-left',
          offset: { x: 28, y: 26 },
          zIndex: 10,
        },
        promoButton: {
          type: 'button',
          enabled: false,
          layer: 'overlay',
          action: 'panel.paytable.open',
          enabledWhen: 'spin.canOpenPanel',
          anchorTo: 'element',
          target: 'brandLogo',
          anchor: 'bottom-left',
          offset: { x: 0, y: 18 },
          width: 132,
          height: 40,
          scale: 1.5,
          zIndex: 20,
          label: {
            type: 'text',
            textKey: 'hud.board.bonusInfo',
            styleRole: 'buttonLabel',
            offset: { x: 0, y: 12 },
          },
          states: {
            hover: { scale: 1.04 },
            pressed: { scale: 0.98 },
            disabled: { alpha: 0.5 },
          },
        },
        balanceValue: {
          type: 'text',
          layer: 'overlay',
          textFrom: 'balance.formatted',
          styleRole: 'statusPrimary',
          anchorTo: 'viewport',
          anchor: 'top-right',
          offset: { x: -30, y: 28 },
          scale: 1.55,
          zIndex: 30,
        },
        betValue: {
          type: 'text',
          layer: 'overlay',
          textFrom: 'bet.formatted',
          styleRole: 'statusPrimary',
          anchorTo: 'element',
          target: 'balanceValue',
          anchor: 'bottom-right',
          offset: { x: 0, y: 16 },
          scale: 1.55,
          zIndex: 31,
        },
        winValue: {
          type: 'text',
          layer: 'overlay',
          textFrom: 'win.formatted',
          styleRole: 'statusPrimary',
          visibleWhen: 'win.visible',
          anchorTo: 'element',
          target: 'betValue',
          anchor: 'bottom-right',
          offset: { x: 0, y: 16 },
          scale: 1.55,
          zIndex: 32,
        },
      },
      portrait: {
        elements: {
          brandLogo: {
            anchor: 'top-center',
            offset: { x: 0, y: 28 },
          },
          promoButton: {
            anchor: 'bottom-center',
            offset: { x: 0, y: 22 },
          },
          balanceValue: {
            offset: { x: -26, y: 32 },
          },
        },
      },
      landscape: {
        elements: {
          brandLogo: {
            anchor: 'top-left',
            offset: { x: 28, y: 26 },
          },
          promoButton: {
            anchor: 'bottom-left',
            offset: { x: 0, y: 18 },
          },
          balanceValue: {
            offset: { x: -30, y: 28 },
          },
        },
      },
    },
    zones: {
      topBrandLayer: {
        enabled: false,
        titleKey: 'hud.brand.title',
      },
      leftFeatureRail: {
        enabled: false,
        items: [
          {
            id: 'free-spins-20',
            labelKey: 'hud.leftRail.twentyFreeSpins',
            state: 'active',
            interactive: false,
          },
        ],
      },
      rightActionRail: {
        enabled: false,
        betSummary: {
          enabled: true,
          labelKey: 'hud.rightRail.bet',
        },
        buyFeatureButtons: [],
      },
      bottomHudBar: {
        enabled: true,
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
        placement: 'bottom-bar-left',
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
      position: { anchor: 'bottom-left', x: 500, y: -500 },
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
      backdrop: 'dim' ,
      closeButton: true,

      position: { anchor: 'center', x: -210, y: -250 },
      settings: settingsPanelConfig,
    },
    soundPopover: {
      enabled: true,

      title: 'Sound',
      backdrop: 'dim',
      closeButton: false,
      position: { anchor: 'bottom-left', x: 130, y: -230 },
    },
  },
} satisfies SlotHudConfig;
