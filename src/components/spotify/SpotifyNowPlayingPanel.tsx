'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { usePlayback } from '@/context/PlaybackContext';
import { SavedPlaylistItem, CustomPlaylistTrack } from '@/components/spotify/AddSourceModal';
import {
  MusicNoteIcon,
  HeartIcon,
} from '@/components/common/MinimalIcons';
import LyricSpeedSlider from '@/components/lyrics/LyricSpeedSlider';
import Popover from '@/components/common/Popover';
import Toast from '@/components/common/Toast';
import AddToPlaylistMenu from './AddToPlaylistMenu';
import { Z_INDEX } from '@/constants/zIndex';

interface SpotifyNowPlayingPanelProps {
  isOpen?: boolean;
  onClose: () => void;
}

function formatDuration(secs: number): string {
  if (isNaN(secs) || secs < 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export default function SpotifyNowPlayingPanel({
  isOpen,
  onClose,
}: SpotifyNowPlayingPanelProps) {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    isSpatial8D,
    isMuffled,
  } = usePlayback();

  const [savedPlaylists, setSavedPlaylists] = useState<SavedPlaylistItem[]>([]);
  const [hasLyrics, setHasLyrics] = useState<boolean>(false);
  const [showPlaylistMenu, setShowPlaylistMenu] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const playlistButtonRef = useRef<HTMLButtonElement | null>(null);

  // Sync playlists from localStorage
  useEffect(() => {
    const loadPlaylists = () => {
      try {
        const stored = localStorage.getItem('chillify_saved_playlists');
        if (stored) setSavedPlaylists(JSON.parse(stored));
      } catch {}
    };
    loadPlaylists();
    window.addEventListener('storage', loadPlaylists);
    window.addEventListener('chillify_playlists_updated', loadPlaylists);
    return () => {
      window.removeEventListener('storage', loadPlaylists);
      window.removeEventListener('chillify_playlists_updated', loadPlaylists);
    };
  }, []);

  // Derive isLiked directly from currentTrack and savedPlaylists
  const isLiked = Boolean(
    currentTrack &&
      savedPlaylists
        .find((p) => p.id === 'liked-songs')
        ?.tracks?.some((t) => t.id === currentTrack.id)
  );

  // Check lyrics availability for rendering the LyricSpeedSlider
  useEffect(() => {
    if (!currentTrack) return;

    let isMounted = true;
    try {
      const cached = sessionStorage.getItem(`chillify_has_lyrics:${currentTrack.id}`);
      if (cached !== null) {
        queueMicrotask(() => {
          if (isMounted) {
            setHasLyrics(cached === '1');
          }
        });
      }
    } catch {}

    const handleLyricsStatus = (e: Event) => {
      const customEvent = e as CustomEvent<{ trackId: string; hasLyrics: boolean }>;
      if (customEvent.detail && customEvent.detail.trackId === currentTrack.id) {
        setHasLyrics(customEvent.detail.hasLyrics);
      }
    };

    window.addEventListener('chillify_lyrics_status', handleLyricsStatus);

    const durationParam = currentTrack.duration > 0 ? `&duration=${encodeURIComponent(currentTrack.duration)}` : '';
    fetch(`/api/lyrics?id=${encodeURIComponent(currentTrack.id)}&title=${encodeURIComponent(currentTrack.title)}&artist=${encodeURIComponent(currentTrack.artist || '')}${durationParam}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted) return;
        const exists = !!(data && !data.instrumental && ((data.lines && data.lines.length > 0) || data.plainLyrics));
        setHasLyrics(exists);
        try {
          sessionStorage.setItem(`chillify_has_lyrics:${currentTrack.id}`, exists ? '1' : '0');
        } catch {}
      })
      .catch(() => {});

    return () => {
      isMounted = false;
      window.removeEventListener('chillify_lyrics_status', handleLyricsStatus);
    };
  }, [currentTrack]);

  const handleToggleLike = () => {
    if (!currentTrack) return;
    try {
      const stored = localStorage.getItem('chillify_saved_playlists');
      let playlists: SavedPlaylistItem[] = stored ? JSON.parse(stored) : [];

      let likedList = playlists.find((p) => p.id === 'liked-songs');
      if (!likedList) {
        likedList = {
          id: 'liked-songs',
          title: 'Liked Songs',
          subtitle: 'Liked Songs',
          type: 'custom',
          targetUrl: '',
          icon: 'heart',
          tracks: [],
          description: 'Your favorite liked tracks on MyuJiku',
          createdAt: Date.now(),
        };
        playlists = [likedList, ...playlists];
      }

      if (!likedList.tracks) likedList.tracks = [];

      const exists = likedList.tracks.some((t) => t.id === currentTrack.id);
      if (exists) {
        likedList.tracks = likedList.tracks.filter((t) => t.id !== currentTrack.id);
      } else {
        const newTrack: CustomPlaylistTrack = {
          id: currentTrack.id,
          title: currentTrack.title,
          artist: currentTrack.artist,
          duration: formatDuration(currentTrack.duration || 180),
          thumbnail: currentTrack.artworkUrl,
          addedAt: Date.now(),
        };
        likedList.tracks.unshift(newTrack);
        setToastMessage('Added to Liked Songs');
      }

      likedList.subtitle = `${likedList.tracks.length} ${
        likedList.tracks.length === 1 ? 'song' : 'songs'
      }`;

      const updated = playlists.map((p) => (p.id === 'liked-songs' ? likedList! : p));
      localStorage.setItem('chillify_saved_playlists', JSON.stringify(updated));
      setSavedPlaylists(updated);
      window.dispatchEvent(new Event('chillify_playlists_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch {
      // ignore
    }
  };

  if (!isOpen) return null;

  return (
    <aside
      className="w-72 xl:w-80 h-full bg-[#121212] border-l border-[#202020] p-4 flex flex-col shrink-0 select-none overflow-hidden animate-in slide-in-from-right duration-200"
      style={{ zIndex: Z_INDEX.nowPlayingPanel }}
    >
      {/* 1. Header with Close Button */}
      <div className="flex items-center justify-between pb-3 border-b border-[#242424] shrink-0">
        <h3 className="text-sm font-bold text-white tracking-tight">Now Playing</h3>
        <button
          type="button"
          onClick={onClose}
          className="w-7 h-7 rounded-full bg-[#1e1e1e] hover:bg-[#2a2a2a] text-[#888888] hover:text-white flex items-center justify-center text-xs transition-colors cursor-pointer"
          title="Close panel"
        >
          ✕
        </button>
      </div>

      {/* 2. Main Content Body */}
      <div className="flex-1 overflow-y-auto py-3 space-y-4 pr-1">
        {!currentTrack ? (
          /* Idle State: ONLY show "No songs playing" without any other text/buttons */
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#888888]">
            <p className="text-sm font-semibold text-[#888888]">No songs playing</p>
          </div>
        ) : (
          /* Active Playing State */
          <>
            {/* Large Artwork */}
            <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-black shadow-2xl border border-[#282828] group">
              {currentTrack.artworkUrl ? (
                <Image
                  src={currentTrack.artworkUrl}
                  alt={currentTrack.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[#181818] text-[#555555]">
                  <MusicNoteIcon className="w-12 h-12" />
                </div>
              )}

              {/* Dynamic Equalizer Overlay when playing */}
              {isPlaying && (
                <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/10 flex items-center gap-1.5 shadow-lg">
                  <div className="flex items-end gap-0.5 h-3">
                    <span className="w-0.5 bg-white rounded-full animate-bounce h-2" />
                    <span className="w-0.5 bg-white rounded-full animate-bounce h-3 delay-75" />
                    <span className="w-0.5 bg-white rounded-full animate-bounce h-1.5 delay-150" />
                  </div>
                  <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                    Playing
                  </span>
                </div>
              )}
            </div>

            {/* Song Title, Artist, Like Button & Add to Playlist */}
            <div className="flex items-start justify-between gap-3 pt-1">
              <div className="min-w-0 flex-1">
                <h4
                  className="text-base font-bold text-white truncate hover:text-zinc-200 transition-colors cursor-pointer"
                  title={currentTrack.title}
                >
                  {currentTrack.title}
                </h4>
                <p className="text-xs text-[#888888] truncate mt-0.5">
                  {currentTrack.artist || 'Unknown Artist'}
                </p>
                {currentTrack.album && (
                  <p className="text-[11px] text-[#666666] truncate mt-0.5">
                    {currentTrack.album}
                  </p>
                )}
              </div>

              {/* Actions: Like & Add to Playlist */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={handleToggleLike}
                  className={`p-1.5 rounded-full hover:scale-110 transition-transform cursor-pointer ${
                    isLiked ? 'text-white' : 'text-[#666666] hover:text-white'
                  }`}
                  title={isLiked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
                >
                  <HeartIcon filled={isLiked} className="w-5 h-5" />
                </button>

                <div className="relative">
                  <button
                    ref={playlistButtonRef}
                    type="button"
                    onClick={() => setShowPlaylistMenu(!showPlaylistMenu)}
                    aria-haspopup="menu"
                    aria-expanded={showPlaylistMenu}
                    className="p-1.5 rounded-full text-[#888888] hover:text-white hover:scale-110 transition-transform cursor-pointer font-bold text-sm"
                    title="Add to Playlist"
                  >
                    ＋
                  </button>
                  <Popover
                    triggerRef={playlistButtonRef}
                    isOpen={showPlaylistMenu}
                    onClose={() => setShowPlaylistMenu(false)}
                    placement="top"
                    align="end"
                    ariaLabel="Add to Playlist"
                  >
                    <AddToPlaylistMenu
                      currentTrack={currentTrack}
                      duration={duration}
                      savedPlaylists={savedPlaylists}
                      onClose={() => setShowPlaylistMenu(false)}
                      onAdded={(title) => setToastMessage(`Added to ${title}`)}
                    />
                  </Popover>
                </div>
              </div>
            </div>

            {/* Playback Badge & Active Effects */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#1c1c1c] text-[#888888] border border-[#2e2e2e]">
                {currentTrack.source === 'local' ? 'Local File' : 'YouTube Stream'}
              </span>

              {isSpatial8D && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/10 text-white border border-white/20 animate-pulse">
                  8D Spatial
                </span>
              )}

              {isMuffled && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                  Muffled
                </span>
              )}
            </div>

            {/* Progress Bar & Timestamps */}
            <div className="space-y-1 bg-[#181818] p-3 rounded-xl border border-[#242424]">
              <div className="flex items-center justify-between text-[11px] font-mono text-[#888888]">
                <span>{formatDuration(currentTime)}</span>
                <span>{formatDuration(duration)}</span>
              </div>
              <div className="w-full bg-[#2a2a2a] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-white h-full rounded-full transition-all duration-150"
                  style={{
                    width: duration > 0 ? `${Math.min(100, (currentTime / duration) * 100)}%` : '0%',
                  }}
                />
              </div>

              {/* Minimal translucent Lyric Speed slider directly UNDER the progress/time bar */}
              {hasLyrics && (
                <div className="pt-1.5">
                  <LyricSpeedSlider trackId={currentTrack.id} />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* 3. Footer Branding (only show when playing) */}
      {currentTrack && (
        <div className="pt-3 border-t border-[#242424] text-center text-[10px] text-[#666666] shrink-0">
          MyuJiku • Now Playing View
        </div>
      )}

      {/* Confirmation Toast */}
      <Toast
        message={toastMessage}
        onDismiss={() => setToastMessage(null)}
      />
    </aside>
  );
}
