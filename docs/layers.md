# MyuJiku Layer & Stacking Context Architecture (docs/layers.md)

This document specifies the definitive z-index hierarchy and stacking rules for MyuJiku (Next.js web application and Tauri v2 desktop application).

## Z-Index Hierarchy Table

| Layer Tier | Z-Index Range / Class | Components | Responsibility | Interaction Rules |
| :--- | :--- | :--- | :--- | :--- |
| **Base Canvas** | `z-0` | Background canvas, word effects, ambient video | Canvas animations, ambient visuals | Non-interactive (`pointer-events-none`) or background only |
| **Stage & Content** | `z-10` to `z-20` | Main content views, playlist lists, lyrics stage | Main scrollable application content | Content interaction, standard scrolling |
| **Floating Scaffolding** | `z-30` to `z-40` | `SpotifyTopNav`, `SpotifyBottomPlayer`, sidebar | Navigation and playback controls | `pointer-events-auto`, no-drag on interactive controls |
| **Popovers & Menus** | `z-50` to `z-100` | Lyrics Settings Popover, User dropdown, Context menus | Small anchored popups | Dismiss on outside click, trapped or scoped focus |
| **Modals & Dialogs** | `z-[10000]` | `SettingsModal`, `CloseConfirmationModal`, `ShortcutsOverlayModal`, `AuthModal` | Full-screen overlays and configuration dialogs | Portaled directly to `document.body`, `data-no-drag="true"`, internal scroll container with `overscroll-contain` |
| **Temporary Overlays & Inspections** | `z-[20000]` | `LogoInspector` enlarged portal view | Temporary inspection overlays | Fullscreen backdrop dismiss, zoom and pan |
| **System Toasts & Notifications** | `z-[30000]` | Desktop tray notifications, sync toasts, copy notifications | Transient alerts | High-priority visibility, pointer-events-none on backdrop container |

---

## Window Dragging Rules (`-webkit-app-region`)

1. **Native Window Decorations Active**:
   - Because MyuJiku desktop enables native operating system window decorations (`resizable: true`, standard Windows titlebar), web page containers must **never** blanket-apply `-webkit-app-region: drag` to large headers, sidebars, or page containers.
2. **Modal Immunity**:
   - All modal dialogs (`SettingsModal`, confirmation modals, auth dialogs) are mounted via `createPortal(..., document.body)` and explicitly set `data-no-drag="true"` and `style={{ WebkitAppRegion: 'no-drag' }}`.
   - Child elements inherit `-webkit-app-region: no-drag !important` to ensure clicks, mouse wheel scrolls, and hold gestures are handled strictly by the browser DOM rather than intercepted as OS caption drags.
3. **No Window Shrinking / Restoration on Content Interaction**:
   - Holding down mouse buttons or interacting with buttons/sliders inside modals will never trigger an OS caption drag (`WM_NCLBUTTONDOWN`), preventing maximized desktop windows from unintentionally restoring (shrinking).
