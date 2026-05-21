/**
 * Starter locale resources — English (default).
 * Starter-owned copy. Keys are stable; SDK HUD and starter use getLabel(key).
 */

export const en = {
  // HUD (used by SDK default components when localeService is provided)
  'hud.bet': 'Bet',
  'hud.balance': 'Balance',
  'hud.win': 'Win',
  'hud.spin': 'SPIN',
  'hud.spinning': '...',
  'hud.auto': 'Auto',
  'hud.stopAutoplay': 'Stop',
  'hud.turbo': 'Turbo',
  'hud.turboOn': 'Turbo ON',
  'hud.fast': 'Fast',
  'hud.fastOn': 'Fast ON',
  'hud.freeSpins': 'Free Spins',
  'hud.modal': 'Modal',
  'hud.loading': 'Loading...',
  'hud.reconnecting': 'Reconnecting...',
  'hud.brand.title': 'Fortune Spinner',
  'hud.board.bonusInfo': 'BONUS INFO',
  'hud.leftRail.twentyFreeSpins': 'Feature Preview',
  'hud.rightRail.bet': 'Bet',
  'hud.rightRail.buyFreeSpins': 'Bonus Preview',
  'hud.footer.holdForTurbo': 'Hold for Turbo',
  'hud.commercial.shell.logo': 'Logo {id}',
  'hud.commercial.shell.zone.topBrandLayer': 'Top Brand Layer ({placement})',
  'hud.commercial.shell.zone.leftFeatureRail': 'Left Feature Rail ({collapseMode})',
  'hud.commercial.shell.zone.rightActionRail': 'Right Action Rail ({collapseMode})',
  'hud.commercial.shell.zone.bottomHudBar': 'Bottom HUD Bar',
  'hud.commercial.shell.zone.spinControlCluster': 'Spin Control Cluster ({placement})',
  'hud.commercial.shell.zone.utilityControlCluster': 'Utility Control Cluster',
  'hud.commercial.placeholder.credit': 'Credit',
  'hud.commercial.placeholder.balance': 'Balance',
  'hud.commercial.placeholder.bet': 'Bet',
  'hud.commercial.placeholder.win': 'Win',
  'hud.commercial.placeholder.spin': 'Spin',
  'hud.commercial.placeholder.autoplay': 'Auto',
  'hud.commercial.placeholder.betStepper': 'Bets',
  'hud.commercial.placeholder.turboState': 'Turbo',
  'hud.commercial.placeholder.menu': 'Menu',
  'hud.commercial.placeholder.info': 'Info',
  'hud.commercial.placeholder.sound': 'Sound',
  'hud.commercial.placeholder.fullscreen': 'Fullscreen',
  'hud.commercial.placeholder.back': 'Back',
  'hud.commercial.placeholder.disabled': 'Disabled',
  'hud.commercial.placeholder.demo': 'Demo',
  'hud.commercial.placeholder.runtime': 'Runtime',

  // Boot / start screen (starter-owned)
  'boot.tapToPlay': 'Tap to Play',
  'boot.loading': 'Loading engine…',

  // Errors (starter-owned)
  'error.loadFailed': 'Load failed',
} as const;

export type EnKeys = keyof typeof en;
