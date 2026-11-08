'use client';

import { useEffect, useRef } from 'react';
import { useSettings } from '@/lib/settings/useSettings';
import { usePlayback } from '@/context/PlaybackContext';
import { DEFAULT_KEY_BINDINGS } from '@/lib/settings/settings-store';

interface UseKeyboardShortcutsOptions {
  onOpenLyrics?: () => void;
  onOpenSettings?: () => void;
  onToggleShortcutsOverlay?: () => void;
  onCloseModals?: () => void;
  onFocusSearch?: () => void;
  volumeStep?: number;
}

/**
 * Checks if the event target is an interactive text input
 */
function isInputElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toUpperCase();
  if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') return true;
  return target.isContentEditable;
}

/**
 * Normalizes keyboard event into key string like 'ctrl+ArrowLeft' or 'KeyM' or 'Space'
 */
function getEventKeyString(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push('ctrl');
  if (e.altKey) parts.push('alt');
  if (e.shiftKey && e.code !== 'ShiftLeft' && e.code !== 'ShiftRight') {
    // Only add shift modifier if not pure slash
    if (e.key === '?') {
      return 'Shift+Slash';
    }
    parts.push('shift');
  }

  // Use e.code for predictable layout-independent keys, fallback to e.key
  const code = e.code;
  if (parts.length > 0 && !parts.includes(code)) {
    parts.push(code);
    return parts.join('+');
  }

  // Handle special single keys
  if (e.key === ' ' || code === 'Space') return 'Space';
  if (e.key === '?') return 'Shift+Slash';
  if (e.key === '/') return 'Slash';
  if (code) return code;
  return e.key;
}

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
  const { settings } = useSettings();
  const bindings = { ...DEFAULT_KEY_BINDINGS, ...(settings.shortcuts?.bindings || {}) };

  const playback = usePlayback();
  const gPressedTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isGPressedRef = useRef<boolean>(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow Escape even if typing in input (to blur input)
      if (e.key === 'Escape') {
        if (isInputElement(e.target)) {
          (e.target as HTMLElement).blur();
          return;
        }
        options.onCloseModals?.();
        window.dispatchEvent(new CustomEvent('myujiku_close_modals'));
        return;
      }

      // Ignore all other shortcuts when typing in inputs/textareas
      if (isInputElement(e.target)) {
        return;
      }

      const keyString = getEventKeyString(e);

      // Two-key sequence support: G then L
      if (e.code === 'KeyG' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        isGPressedRef.current = true;
        if (gPressedTimerRef.current) clearTimeout(gPressedTimerRef.current);
        gPressedTimerRef.current = setTimeout(() => {
          isGPressedRef.current = false;
        }, 1000);
        return;
      }

      if (isGPressedRef.current && e.code === 'KeyL' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        isGPressedRef.current = false;
        if (gPressedTimerRef.current) clearTimeout(gPressedTimerRef.current);
        e.preventDefault();
        options.onOpenLyrics?.();
        window.dispatchEvent(new CustomEvent('myujiku_navigate_view', { detail: 'lyrics' }));
        return;
      }

      // Match against configured bindings
      for (const [actionId, boundKey] of Object.entries(bindings)) {
        const matches =
          boundKey.toLowerCase() === keyString.toLowerCase() ||
          (boundKey === 'Shift+Slash' && e.key === '?') ||
          (boundKey === 'Slash' && e.key === '/') ||
          (boundKey === 'Space' && (e.code === 'Space' || e.key === ' '));

        if (matches) {
          e.preventDefault();

          switch (actionId) {
            case 'play_pause':
              playback.togglePlay();
              break;

            case 'seek_backward':
              playback.seek(Math.max(0, playback.currentTime - 5));
              break;

            case 'seek_forward':
              playback.seek(playback.currentTime + 5);
              break;

            case 'prev_track':
              playback.previousTrack();
              break;

            case 'next_track':
              playback.nextTrack();
              break;

            case 'volume_down':
              playback.setVolume(Math.max(0, playback.volume - (options.volumeStep || 0.05)));
              break;

            case 'volume_up':
              playback.setVolume(Math.min(1, playback.volume + (options.volumeStep || 0.05)));
              break;

            case 'toggle_mute':
              playback.toggleMute();
              break;

            case 'toggle_shuffle':
              playback.toggleShuffle();
              break;

            case 'toggle_repeat':
              playback.toggleRepeat();
              break;

            case 'toggle_like':
              window.dispatchEvent(new CustomEvent('myujiku_toggle_like'));
              break;

            case 'focus_search':
              if (options.onFocusSearch) {
                options.onFocusSearch();
              } else {
                const searchInput = document.querySelector<HTMLInputElement>(
                  'input[type="search"], input[placeholder*="Search"], input[placeholder*="search"]'
                );
                if (searchInput) {
                  searchInput.focus();
                  searchInput.select();
                }
              }
              break;

            case 'open_lyrics':
              options.onOpenLyrics?.();
              window.dispatchEvent(new CustomEvent('myujiku_navigate_view', { detail: 'lyrics' }));
              break;

            case 'fullscreen_lyrics':
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
              } else {
                document.exitFullscreen().catch(() => {});
              }
              break;

            case 'toggle_8d':
              playback.toggleSpatial8D();
              break;

            case 'toggle_muffled':
              playback.toggleMuffled();
              break;

            case 'open_settings':
              options.onOpenSettings?.();
              window.dispatchEvent(new CustomEvent('myujiku_open_settings'));
              break;

            case 'show_shortcuts_overlay':
              options.onToggleShortcutsOverlay?.();
              window.dispatchEvent(new CustomEvent('myujiku_toggle_shortcuts_overlay'));
              break;

            case 'close_dialog':
              options.onCloseModals?.();
              window.dispatchEvent(new CustomEvent('myujiku_close_modals'));
              break;

            default:
              break;
          }
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (gPressedTimerRef.current) clearTimeout(gPressedTimerRef.current);
    };
  }, [bindings, playback, options]);
}
