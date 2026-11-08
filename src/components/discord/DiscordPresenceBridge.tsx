'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePlayback } from '@/context/PlaybackContext';
import { useRoom } from '@/context/RoomContext';
import {
  DISCORD_SETTINGS_CHANGED_EVENT,
  getDiscordPresenceEnabled,
  getDiscordPresenceHideDetails,
  getDiscordPresenceShareRoom,
  getDiscordCustomClientId,
} from '@/lib/discord/presence-settings';
import {
  isTauri,
  setDesktopPresence,
  clearDesktopPresence,
  getDiscordStatus,
  listenDiscordStatus,
  setDesktopDiscordClientId,
  type DiscordConnectionStatus,
} from '@/lib/desktop';
import { updateWebhookNowPlaying, handleWebhookPlaybackStopped } from '@/lib/discord/webhook';

const FIRST_RUN_TOAST_KEY = 'myujiku_discord_toast_dismissed';

/**
 * Exposes current playback info:
 * 1. Native Tauri Desktop IPC (set_presence / clear_presence) with automatic background worker.
 * 2. PreMiD presence script via hidden DOM element (#myujiku-discord-presence).
 * 3. Discord Now Playing Webhook integration.
 * 4. First-run connection notification toast.
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

  // First-run toast state
  const [showToast, setShowToast] = useState<boolean>(false);
  const [discordUser, setDiscordUser] = useState<string>('');

  // Handle first-run toast and custom client ID initialization on desktop
  useEffect(() => {
    if (!isTauri()) return;

    // Apply any saved custom client ID to desktop backend
    const savedCustomId = getDiscordCustomClientId();
    if (savedCustomId) {
      setDesktopDiscordClientId(savedCustomId);
    }

    const checkStatus = (status: DiscordConnectionStatus) => {
      if (status.status === 'Connected') {
        const u = status.data.displayName || status.data.username;
        setDiscordUser(u);

        const dismissed = localStorage.getItem(FIRST_RUN_TOAST_KEY) === 'true';
        if (!dismissed) {
          setShowToast(true);
        }
      }
    };

    // Initial status check
    getDiscordStatus().then(checkStatus);

    // Subscribe to live status changes
    let unlisten: (() => void) | undefined;
    listenDiscordStatus(checkStatus).then((fn) => {
      unlisten = fn;
    });

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const handleDismissToast = () => {
    try {
      localStorage.setItem(FIRST_RUN_TOAST_KEY, 'true');
    } catch {
      // ignore
    }
    setShowToast(false);
  };

  useEffect(() => {
    const el = elementRef.current;
    const isEnabled = getDiscordPresenceEnabled();
    const hideDetails = getDiscordPresenceHideDetails();
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

      // Compute reliable square 512x512 cover URL via Next.js serverless route
      const ytId = (() => {
        if (!currentTrack) return null;
        if (/^[A-Za-z0-9_-]{11}$/.test(currentTrack.id)) return currentTrack.id;
        if (currentTrack.artworkUrl) {
          const m = currentTrack.artworkUrl.match(/\/vi\/([A-Za-z0-9_-]{11})/);
          if (m) return m[1];
        }
        if (currentTrack.sourceUrl) {
          const m = currentTrack.sourceUrl.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
          if (m) return m[1];
        }
        return null;
      })();

      const coverUrl = ytId
        ? `https://myujiku.vercel.app/api/cover?id=${ytId}`
        : currentTrack.artworkUrl?.startsWith('https://')
        ? currentTrack.artworkUrl
        : undefined;

      if (el) {
        el.setAttribute('data-app-name', 'MyuJiku');
        el.setAttribute('data-title', hideDetails ? 'MyuJiku' : (currentTrack.title || 'Untitled Track'));
        el.setAttribute('data-artist', hideDetails ? 'Lo-Fi Soundscapes' : (currentTrack.artist || 'Unknown Artist'));
        el.setAttribute('data-cover-url', coverUrl || currentTrack.artworkUrl || '');
        el.setAttribute('data-duration', Math.round(duration || currentTrack.duration || 0).toString());
        el.setAttribute('data-position', Math.round(currentTime).toString());
        el.setAttribute('data-status', isPlaying ? 'playing' : 'paused');
        el.setAttribute('data-room-code', activeRoomCode || '');
        el.setAttribute('data-updated-at', now.toString());
      }

      // Native Tauri Desktop Presence IPC (rate-limited to ~15s except on track change, play state change, or seek)
      if (isTauri()) {
        const timeSinceLastIpc = now - lastIpcTimeRef.current;
        if (trackChanged || playStateChanged || seekOccurred || timeSinceLastIpc >= 14000) {
          lastIpcTimeRef.current = now;
          const trackDur = duration || currentTrack.duration || 0;
          const startTs = isPlaying ? Math.floor(now / 1000) - Math.floor(currentTime) : undefined;
          const endTs = isPlaying && trackDur > 0 ? (startTs || Math.floor(now / 1000)) + Math.floor(trackDur) : undefined;
          const roomUrl = activeRoomCode ? `https://myujiku.vercel.app/together/${activeRoomCode}` : undefined;

          setDesktopPresence({
            title: currentTrack.title || 'Untitled Track',
            artist: currentTrack.artist || 'Unknown Artist',
            album: currentTrack.album,
            coverUrl,
            startTimestamp: startTs,
            endTimestamp: endTs,
            paused: !isPlaying,
            roomUrl,
            hideDetails,
          });
        }
      }

      // Discord Now Playing Webhook update
      if (isPlaying) {
        updateWebhookNowPlaying({
          title: currentTrack.title || 'Untitled Track',
          artist: currentTrack.artist || 'Unknown Artist',
          coverUrl: coverUrl || currentTrack.artworkUrl,
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
    <>
      <div
        ref={elementRef}
        id="myujiku-discord-presence"
        style={{ display: 'none' }}
        aria-hidden="true"
      />

      {/* Non-intrusive first-run desktop connection toast */}
      {showToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 right-6 z-50 max-w-sm p-4 bg-[#18181f]/95 backdrop-blur-md border border-[#5865F2]/40 rounded-xl shadow-2xl text-white animate-in slide-in-from-bottom-4 duration-300 flex items-start gap-3"
        >
          <div className="w-8 h-8 rounded-full bg-[#5865F2] flex items-center justify-center shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
          </div>
          <div className="flex-1 space-y-1">
            <h5 className="text-xs font-semibold text-white">
              Connected to Discord {discordUser ? `(${discordUser})` : ''}
            </h5>
            <p className="text-[11px] text-zinc-300 leading-relaxed">
              Your status will update automatically when music plays.
            </p>
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleDismissToast}
                className="px-3 py-1 rounded-md bg-[#5865F2] hover:bg-[#4752c4] text-white text-[11px] font-semibold transition-colors cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
