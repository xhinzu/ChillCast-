/**
 * Global Z-Index scale
 * Ensures a single, predictable stacking order across the entire application:
 * content < sidebar < nowPlayingPanel < playerBar < popovers/menus < modals < toasts
 */
export const Z_INDEX = {
  content: 10,
  sidebar: 20,
  nowPlayingPanel: 30,
  playerBar: 40,
  popovers: 60,         // Popovers and floating dropdown menus (above player bar, sidebars, panels)
  modals: 80,           // Full-screen overlays and dialog modals
  toasts: 90,           // High-priority transient toast notifications
  fullscreenMax: 99999, // Max priority within fullscreen container
} as const;

export type ZIndexLevel = keyof typeof Z_INDEX;
