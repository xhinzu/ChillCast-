/**
 * Theme Applier Service for MyuJiku
 * Manages design token CSS variables, theme switching (Dark, Light, AMOLED, System),
 * live OS theme synchronization, and WCAG contrast enforcement.
 */

import { getSettings, type AppearanceSettings, type ThemeMode } from '@/lib/settings/settings-store';
import { isTauri } from '@/lib/desktop';

export const ACCENT_PRESETS: Record<string, string> = {
  emerald: '#10b981',
  spotify: '#1ed760',
  cyan: '#06b6d4',
  blue: '#3b82f6',
  violet: '#8b5cf6',
  magenta: '#d946ef',
  rose: '#f43f5e',
  amber: '#f59e0b',
  orange: '#f97316',
  lime: '#84cc16',
};

export function getLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  if (clean.length !== 6 && clean.length !== 3) return 0.5;
  const full = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean;
  const rgb = [
    parseInt(full.substring(0, 2), 16) / 255,
    parseInt(full.substring(2, 4), 16) / 255,
    parseInt(full.substring(4, 6), 16) / 255,
  ].map((val) => (val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4)));
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

export function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  const brightest = Math.max(l1, l2);
  const darkest = Math.min(l1, l2);
  return (brightest + 0.05) / (darkest + 0.05);
}

export function getContrastColor(hex: string): string {
  const ratioWithBlack = getContrastRatio(hex, '#000000');
  return ratioWithBlack >= 4.5 ? '#000000' : '#ffffff';
}

/**
 * Resolves current theme mode ('dark' | 'light' | 'amoled') based on mode and OS preferences.
 */
export function resolveTheme(mode: ThemeMode): 'dark' | 'light' | 'amoled' {
  if (mode === 'system') {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  }
  return mode;
}

/**
 * Applies the appearance settings to the document root element.
 * @param appearance Current appearance settings
 * @param coverArtPalette Optional primary color extracted from current track artwork
 */
export function applyTheme(appearance: AppearanceSettings, coverArtPalette?: string) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const resolved = resolveTheme(appearance.theme);

  // Set data-theme attribute
  root.setAttribute('data-theme', resolved);

  // Determine active accent
  let activeAccent = ACCENT_PRESETS[appearance.accentPreset] || '#10b981';
  if (appearance.followCoverArtAccent && coverArtPalette) {
    activeAccent = coverArtPalette;
  } else if (appearance.customAccent) {
    activeAccent = appearance.customAccent;
  }

  const accentContrast = getContrastColor(activeAccent);
  root.style.setProperty('--accent', activeAccent);
  root.style.setProperty('--accent-contrast', accentContrast);
  root.style.setProperty('--focus-ring', `${activeAccent}66`); // 40% alpha

  // Background and surface tint overrides
  if (appearance.backgroundTint) {
    root.style.setProperty('--bg-base', appearance.backgroundTint);
  } else {
    root.style.removeProperty('--bg-base');
  }

  if (appearance.surfaceTint) {
    root.style.setProperty('--surface', appearance.surfaceTint);
  } else {
    root.style.removeProperty('--surface');
  }

  // Text color: Theme color changes font color OR custom text color override
  if (appearance.themeColorChangesFontColor) {
    root.setAttribute('data-accent-font', 'true');
    root.style.setProperty('--text', activeAccent);
    root.style.setProperty('--foreground', activeAccent);
    root.style.setProperty('--text-muted', `color-mix(in srgb, ${activeAccent} 70%, #888888)`);
  } else {
    root.removeAttribute('data-accent-font');
    root.style.removeProperty('--text-muted');
    if (appearance.textColor) {
      const currentBg = appearance.backgroundTint || (resolved === 'light' ? '#f4f4f5' : (resolved === 'amoled' ? '#000000' : '#121212'));
      let textColor = appearance.textColor;
      if (getContrastRatio(textColor, currentBg) < 4.5) {
        // Auto-correct to accessible text color
        textColor = resolved === 'light' ? '#18181b' : '#ffffff';
      }
      root.style.setProperty('--text', textColor);
      root.style.setProperty('--foreground', textColor);
    } else {
      root.style.removeProperty('--text');
      root.style.removeProperty('--foreground');
    }
  }

  // Sync background color with body & Tauri window
  const computedBg = getComputedStyle(root).getPropertyValue('--bg-base').trim() || (resolved === 'light' ? '#f4f4f5' : (resolved === 'amoled' ? '#000000' : '#121212'));
  if (document.body) {
    document.body.style.backgroundColor = computedBg;
  }

  // Part 3b: UI Glow Synchronization
  try {
    const glow = getSettings().glow;
    if (glow) {
      root.setAttribute('data-ui-glow', glow.uiGlowEnabled ? 'true' : 'false');
      root.style.setProperty('--ui-glow-scale', String(glow.uiGlowIntensity || 0.6));
      const glowColor = glow.uiGlowColor === 'custom' && glow.uiGlowCustomColor
        ? glow.uiGlowCustomColor
        : activeAccent;
      root.style.setProperty('--ui-glow-color', glowColor);
    }
  } catch {}
}

/**
 * Initializes theme applier listeners (storage events and matchMedia changes).
 * Returns cleanup function.
 */
export function initThemeApplier(getCoverArtPalette?: () => string | undefined): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleUpdate = () => {
    const current = getSettings().appearance;
    const coverPalette = getCoverArtPalette ? getCoverArtPalette() : undefined;
    applyTheme(current, coverPalette);
  };

  // Initial application
  handleUpdate();

  // Listen for settings changes via custom event
  const onSettingsChange = () => handleUpdate();
  window.addEventListener('myujiku_settings_changed', onSettingsChange);

  // Listen for OS theme changes for 'system' theme mode
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const onSystemThemeChange = () => {
    if (getSettings().appearance.theme === 'system') {
      handleUpdate();
    }
  };

  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', onSystemThemeChange);
  } else {
    // Older Safari/browsers fallback
    mediaQuery.addListener(onSystemThemeChange);
  }

  return () => {
    window.removeEventListener('myujiku_settings_changed', onSettingsChange);
    if (mediaQuery.removeEventListener) {
      mediaQuery.removeEventListener('change', onSystemThemeChange);
    } else {
      mediaQuery.removeListener(onSystemThemeChange);
    }
  };
}
