'use client';

import React, { useEffect, useRef } from 'react';
import { usePlayback } from '@/context/PlaybackContext';
import { useRoom } from '@/context/RoomContext';
import {
  DISCORD_SETTINGS_CHANGED_EVENT,
  getDiscordPresenceEnabled,
  getDiscordPresenceShareRoom,
} from '@/lib/discord/presence-settings';

/**
 * Exposes current playback info in a single stable element (#myujiku-discord-presence)
 * for the PreMiD presence script.
 *
 * Privacy & Performance Rules:
 * - When toggle is OFF: Element contains nothing (no data attributes, no content).
 * - When toggle is ON: Exposes title, artist, cover image, duration, position, status, and room code (if permitted).
 * - Updates ONLY on track change, play/pause change, or user seek (NOT per-frame).
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

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    const isEnabled = getDiscordPresenceEnabled();
    const shareRoom = getDiscordPresenceShareRoom();
    const activeRoomCode = shareRoom && room && roomStatus === 'connected' ? room.code : '';

    // If disabled or no track: clear all data attributes
    if (!isEnabled || !currentTrack) {
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

    // Only update DOM attributes when track, play state, room, or seek changes (NOT per-frame)
    if (trackChanged || playStateChanged || roomCodeChanged || seekOccurred || !el.hasAttribute('data-title')) {
      lastTrackIdRef.current = currentTrack.id;
      lastIsPlayingRef.current = isPlaying;
      lastPositionRef.current = currentTime;
      lastWallClockRef.current = now;
      lastRoomCodeRef.current = activeRoomCode;

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
  }, [currentTrack, isPlaying, currentTime, duration, room, roomStatus]);

  // Synchronize when settings change via custom events or storage
  useEffect(() => {
    const handleSettingsChanged = () => {
      const el = elementRef.current;
      if (!el) return;
      const isEnabled = getDiscordPresenceEnabled();
      if (!isEnabled) {
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
