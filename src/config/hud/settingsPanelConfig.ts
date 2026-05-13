import type { SlotHudSystemSettingsPanelConfig } from '@fnx/sl-engine';

/** Supported items only — validated by `validateSlotHudConfig` / doctor. */
export const settingsPanelConfig = {
  title: 'System Settings',
  sections: [
    {
      id: 'audio',
      title: 'Audio',
      items: [{ id: 'sound', type: 'toggle', setting: 'sound', label: 'Sound' }],
    },
    {
      id: 'gameplay',
      title: 'Gameplay',
      items: [
        { id: 'turbo', type: 'toggle', setting: 'turbo', label: 'Turbo Spin' },
        { id: 'bet', type: 'bet-control', label: 'Bet Settings' },
      ],
    },
    {
      id: 'info',
      title: 'Info',
      items: [
        { id: 'paytable', type: 'action', action: 'openPaytable', label: 'Game Rules' },
        { id: 'close', type: 'action', action: 'closePanel', label: 'Close' },
      ],
    },
    
  ],
} satisfies SlotHudSystemSettingsPanelConfig;
