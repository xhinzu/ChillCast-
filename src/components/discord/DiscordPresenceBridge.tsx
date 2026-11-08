'use client';

import React, { useEffect, useRef } from 'react';
import { usePlayback } from '@/context/PlaybackContext';
import { useRoom } from '@/context/RoomContext';
import {
  DISCORD_SETTINGS_CHANGED_EVENT,
  getDiscordPresenceEnabled,
  getDiscordPresenceShareRoom,
} from '@/lib/discord/presence-settings';
import { isTauri, setDesktopPresence, clearDesktopPresence } from '@/lib/desktop';
import { updateWebhookNowPlaying, handleWebhookPlaybackStopped } from '@/lib/discord/webhook';

/**
 * Exposes current playback info:
 * 1. PreMiD presence script via hidden DOM element (#myujiku-discord-presence).
 * 2. Native Tauri Desktop IPC (set_presence / clear_presence).
 * 3. Discord Now Playing Webhook integration.
 *
 * Privacy & Performance Rules:
 * - When toggle is OFF: Element contains nothing and no presence is sent.
 * - Updates ONLY on track change, play/pause change, or user seek (NOT per-frame).
 * - Rich Presence updates are throttled to ~15s except on track change.
 */
export default function DiscordPresenceBridge() {
  const { currentTrack, isPlaying, currentTime, duration } = usePlayback();
  const { room, roomStatus } = useRoom();
  const elementRef = useRef<HTMLDivElement | null>(null);

  // Keep track of values to detect real state changes vs normal 1-second ticks
  const lastTrackIdRef = useRef<string | null>(null);
  const lastIsPlayingRef = useRef<boolean>(false);
  const lastPositionRef = useRef<number>(0);
  const lastWallClockRef = useRef<number>(0);
  const lastRoomCodeRef = useRef<string>('');
  const lastIpcTimeRef = useRef<number>(0);

  useEffect(() => {
    const el = elementRef.current;
    const isEnabled = getDiscordPresenceEnabled();
    const shareRoom = getDiscordPresenceShareRoom();
    const activeRoomCode = shareRoom && room && roomStatus === 'connected' ? room.code : '';

    // If disabled or no track: clear DOM attributes & desktop presence
    if (!isEnabled || !currentTrack) {
      if (el) {
        el.removeAttribute('data-app-name');
        el.removeAttribute('data-title');
        el.removeAttribute('data-artist');
        el.removeAttribute('data-cover-url');
        el.removeAttribute('data-duration');
        el.removeAttribute('data-position');
        el.removeAttribute('data-status');
        el.removeAttribute('data-room-code');
        el.removeAttribute('data-updated-at');
        el.innerHTML = '';
      }
      if (isTauri()) {
        clearDesktopPresence();
      }
      handleWebhookPlaybackStopped();

      lastTrackIdRef.current = null;
      lastIsPlayingRef.current = false;
      lastPositionRef.current = 0;
      lastWallClockRef.current = 0;
      lastRoomCodeRef.current = '';
      return;
    }

    const now = Date.now();
    const trackChanged = currentTrack.id !== lastTrackIdRef.current;
    const playStateChanged = isPlaying !== lastIsPlayingRef.current;
    const roomCodeChanged = activeRoomCode !== lastRoomCodeRef.current;

    // Detect seeks: if playing, check if currentTime diverged from expected wall-clock progression by > 2.5s
    let seekOccurred = false;
    if (!trackChanged && !playStateChanged) {
      if (isPlaying) {
        const elapsedSec = (now - lastWallClockRef.current) / 1000;
        const expectedPos = lastPositionRef.current + elapsedSec;
        if (Math.abs(currentTime - expectedPos) > 2.5) {
          seekOccurred = true;
        }
      } else {
        // When paused, any change in currentTime > 0.5s is a seek
        if (Math.abs(currentTime - lastPositionRef.current) > 0.5) {
          seekOccurred = true;
        }
      }
    }

    // Only update DOM attributes & IPC when track, play state, room, or seek changes (NOT per-frame)
    if (trackChanged || playStateChanged || roomCodeChanged || seekOccurred || (el && !el.hasAttribute('data-title'))) {
      lastTrackIdRef.current = currentTrack.id;
      lastIsPlayingRef.current = isPlaying;
      lastPositionRef.current = currentTime;
      lastWallClockRef.current = now;
      lastRoomCodeRef.current = activeRoomCode;

      if (el) {
        el.setAttribute('data-app-name', 'MyuJiku');
        el.setAttribute('data-title', currentTrack.title || 'Untitled Track');
        el.setAttribute('data-artist', currentTrack.artist || 'Unknown Artist');
        el.setAttribute('data-cover-url', currentTrack.artworkUrl || '');
        el.setAttribute('data-duration', Math.round(duration || currentTrack.duration || 0).toString());
        el.setAttribute('data-position', Math.round(currentTime).toString());
        el.setAttribute('data-status', isPlaying ? 'playing' : 'paused');
        el.setAttribute('data-room-code', activeRoomCode || '');
        el.setAttribute('data-updated-at', now.toString());
      }

      // Native Tauri Desktop Presence IPC (rate-limited to ~15s except on track change)
      if (isTauri()) {
        const timeSinceLastIpc = now - lastIpcTimeRef.current;
        if (trackChanged || timeSinceLastIpc >= 14000) {
          lastIpcTimeRef.current = now;
          const trackDur = duration || currentTrack.duration || 0;
          const startTs = isPlaying ? Math.floor(now / 1000) - Math.floor(currentTime) : undefined;
          const endTs = isPlaying && trackDur > 0 ? (startTs || Math.floor(now / 1000)) + Math.floor(trackDur) : undefined;
          const roomUrl = activeRoomCode ? `https://myujiku.vercel.app/together/${activeRoomCode}` : undefined;

          setDesktopPresence({
            title: currentTrack.title || 'Untitled Track',
            artist: currentTrack.artist || 'Unknown Artist',
            coverUrl: currentTrack.artworkUrl,
            startTimestamp: startTs,
            endTimestamp: endTs,
            paused: !isPlaying,
            roomUrl,
          });
        }
      }

      // Discord Now Playing Webhook update
      if (isPlaying) {
        updateWebhookNowPlaying({
          title: currentTrack.title || 'Untitled Track',
          artist: currentTrack.artist || 'Unknown Artist',
          coverUrl: currentTrack.artworkUrl,
          duration: duration || currentTrack.duration,
          roomCode: activeRoomCode,
        });
      }
    }
  }, [currentTrack, isPlaying, currentTime, duration, room, roomStatus]);

  // Synchronize when settings change via custom events or storage
  useEffect(() => {
    const handleSettingsChanged = () => {
      const el = elementRef.current;
      const isEnabled = getDiscordPresenceEnabled();
      if (!isEnabled) {
        if (el) {
          el.removeAttribute('data-app-name');
          el.removeAttribute('data-title');
          el.removeAttribute('data-artist');
          el.removeAttribute('data-cover-url');
          el.removeAttribute('data-duration');
          el.removeAttribute('data-position');
          el.removeAttribute('data-status');
          el.removeAttribute('data-room-code');
          el.removeAttribute('data-updated-at');
          el.innerHTML = '';
        }
        if (isTauri()) {
          clearDesktopPresence();
        }
      }
    };

    window.addEventListener(DISCORD_SETTINGS_CHANGED_EVENT, handleSettingsChanged);
    window.addEventListener('storage', handleSettingsChanged);
    return () => {
      window.removeEventListener(DISCORD_SETTINGS_CHANGED_EVENT, handleSettingsChanged);
      window.removeEventListener('storage', handleSettingsChanged);
    };
  }, []);

  return (
    <div
      ref={elementRef}
      id="myujiku-discord-presence"
      style={{ display: 'none' }}
      aria-hidden="true"
    />
  );
}
