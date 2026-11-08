# Theming & Design Token Architecture

## Design Token System

MyuJiku uses a unified design-token system implemented with CSS variables. These variables adapt dynamically to the selected theme (`dark`, `light`, `amoled`, and `system`), with custom user accents, background/surface tints, and contrast safety checks.

### Core Tokens

| Token | Dark Default | AMOLED Default | Light Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `--bg-base` | `#121214` | `#000000` | `#f4f4f6` | Base canvas and window background |
| `--surface` | `#18181b` | `#070708` | `#ffffff` | Primary panel / card surface |
| `--surface-2` | `#222226` | `#121214` | `#eaecef` | Secondary elevated surface |
| `--surface-3` | `#2a2a30` | `#1a1a1e` | `#dfe2e6` | Hovered interactive elements |
| `--border` | `rgba(255,255,255,0.1)` | `#222226` | `rgba(0,0,0,0.12)` | Structural separation borders |
| `--text` | `#ffffff` | `#ffffff` | `#111114` | High-contrast primary copy |
| `--text-muted` | `#a1a1aa` | `#88888e` | `#5e6066` | Secondary labels and metadata |
| `--accent` | `#10b981` | `#10b981` | `#059669` | Interactive accent / brand highlights |
| `--accent-contrast`| `#000000` | `#000000` | `#ffffff` | Contrast-safe text color for accent badges |
| `--success` | `#22c55e` | `#22c55e` | `#16a34a` | Positive indicator |
| `--warning` | `#f59e0b` | `#f59e0b` | `#d97706` | Warning indicator |
| `--danger` | `#ef4444` | `#ef4444` | `#dc2626` | Destructive actions / errors |
| `--overlay` | `rgba(0,0,0,0.75)` | `rgba(0,0,0,0.92)`| `rgba(0,0,0,0.45)` | Backdrop for modals |
| `--focus-ring` | `rgba(16,185,129,0.4)`| `rgba(16,185,129,0.5)`| `rgba(5,150,105,0.35)` | Accessible keyboard focus outline |
| `--shadow-color` | `rgba(0,0,0,0.5)` | `rgba(0,0,0,0.85)`| `rgba(0,0,0,0.08)` | Elevation drop shadows |

---

## Anti-Flash Initialization (Zero FOUC)

Before the React tree mounts or the browser paints the first frame, an inline script in `src/app/layout.tsx` inspects `localStorage` for `myujiku_settings_v2`. If configured to `system`, it queries `window.matchMedia('(prefers-color-scheme: dark)')`. The resolved `data-theme` and `backgroundColor` are immediately stamped onto `document.documentElement` and the body, eliminating any flash of unstyled content.

---

## Accents & WCAG Contrast Auto-Correction

- **10 Curated Presets:** Emerald, Spotify Green, Cyan, Ocean Blue, Violet, Magenta, Rose, Amber Gold, Sunset Orange, and Electric Lime.
- **Dynamic Cover Art Palette Extraction:** When "Follow Cover Art" is toggled, vibrant colors are sampled from the currently playing album artwork using color quantization (`usePalette`).
- **WCAG AA Compliance (4.5:1 Minimum):** The theme applier calculates relative luminance ($L = 0.2126R + 0.7152G + 0.0722B$) and contrast ratio. If user-defined text tints or custom background colors drop below 4.5:1, the app alerts the user with an "Auto-Correct" action that restores accessible contrast.

---

## Screen Audit & Refactoring Summary

1. **Top Navigation (`SpotifyTopNav.tsx`):** Refactored to `--surface` and `--border`, ensuring search input and quick action pills render cleanly in Light and AMOLED themes.
2. **Left Sidebar (`SpotifySidebar.tsx`):** Mapped library lists and playlist items to `--surface` and `--text-muted`.
3. **Now Playing Panel (`SpotifyNowPlayingPanel.tsx`):** Track info and lyrics preview card follow active theme tokens.
4. **Bottom Player (`SpotifyBottomPlayer.tsx`):** Scrub bar and volume sliders use `--accent`, with track title and duration adapting to `--text` and `--text-muted`.
5. **Settings Modal (`SettingsModal.tsx`):** 9 sections fully audited; background, left navigation tabs, inputs, and toggles all conform to token hierarchy.
6. **Lyrics Stage (`LyricsPage.tsx`):** Defaults to immersive pure black (`bg-black`) for optimal lyrics legibility. Users can toggle "Lyrics stage follows theme" in Appearance settings to synchronize the lyrics canvas with light or dark themes.
7. **Desktop Window Integration:** In Tauri desktop builds, the window background is bound to `--bg-base`.
