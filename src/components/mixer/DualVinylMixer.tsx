'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { TrackInfo } from '@/types/playback';
import { SavedPlaylistItem } from '@/components/spotify/AddSourceModal';
import SongSelectorModal from './SongSelectorModal';
import { YTPlayer } from '@/types/youtube';
import {
  MixerSlidersIcon,
  FolderIcon,
  PlayIcon,
  PauseIcon,
} from '@/components/common/MinimalIcons';

interface DualVinylMixerProps {
  savedPlaylists: SavedPlaylistItem[];
  className?: string;
}

function formatTime(secs: number): string {
  if (isNaN(secs) || secs < 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export default function DualVinylMixer({
  savedPlaylists,
  className = '',
}: DualVinylMixerProps) {
  // -------------------------------------------------------------
  // DECK A STATES (Starts with NO song loaded)
  // -------------------------------------------------------------
  const [trackA, setTrackA] = useState<TrackInfo | null>(null);
  const [isPlayingA, setIsPlayingA] = useState(false);
  const [currentTimeA, setCurrentTimeA] = useState(0);
  const [durationA, setDurationA] = useState(0);
  const [volumeA, setVolumeA] = useState(0.85);
  const [isLoadingA, setIsLoadingA] = useState(false);
  const [errorA, setErrorA] = useState<string | null>(null);

  // -------------------------------------------------------------
  // DECK B STATES (Starts with NO song loaded)
  // -------------------------------------------------------------
  const [trackB, setTrackB] = useState<TrackInfo | null>(null);
  const [isPlayingB, setIsPlayingB] = useState(false);
  const [currentTimeB, setCurrentTimeB] = useState(0);
  const [durationB, setDurationB] = useState(0);
  const [volumeB, setVolumeB] = useState(0.85);
  const [isLoadingB, setIsLoadingB] = useState(false);
  const [errorB, setErrorB] = useState<string | null>(null);

  // -------------------------------------------------------------
  // CROSSFADER STATE (-1 = Full Deck A, 0 = Both 100%, +1 = Full Deck B)
  // -------------------------------------------------------------
  const [crossfader, setCrossfader] = useState(0);

  // Song Selector Modal state
  const [selectorDeck, setSelectorDeck] = useState<'Deck A' | 'Deck B' | null>(null);

  // HTMLAudioElement references for local / blob audio tracks
  const localAudioRefA = useRef<HTMLAudioElement | null>(null);
  const localAudioRefB = useRef<HTMLAudioElement | null>(null);

  // YouTube Player instances for YouTube tracks
  const ytPlayerA = useRef<YTPlayer | null>(null);
  const ytPlayerB = useRef<YTPlayer | null>(null);
  const [isYtApiReady, setIsYtApiReady] = useState(false);

  // -------------------------------------------------------------
  // DJ CONTOUR GAIN CALCULATION
  // -------------------------------------------------------------
  const getGains = useCallback((cf: number) => {
    let gainA = 1;
    let gainB = 1;
    if (cf < 0) {
      gainA = 1;
      gainB = Math.max(0, 1 + cf);
    } else if (cf > 0) {
      gainB = 1;
      gainA = Math.max(0, 1 - cf);
    }
    return { gainA, gainB };
  }, []);

  // Ensure YouTube Iframe API is loaded in browser
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.YT && window.YT.Player) {
      setIsYtApiReady(true);
      return;
    }

    const scriptTag = document.getElementById('youtube-iframe-api');
    if (!scriptTag) {
      const tag = document.createElement('script');
      tag.id = 'youtube-iframe-api';
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScript = document.getElementsByTagName('script')[0];
      firstScript?.parentNode?.insertBefore(tag, firstScript);
    }

    const prevOnReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prevOnReady) prevOnReady();
      setIsYtApiReady(true);
    };
  }, []);

  // Initialize YouTube Iframe Players for Deck A and Deck B
  useEffect(() => {
    if (!isYtApiReady || typeof window === 'undefined' || !window.YT) return;

    // Deck A YT Player
    if (!ytPlayerA.current && document.getElementById('mixer-yt-deck-a')) {
      try {
        ytPlayerA.current = new window.YT.Player('mixer-yt-deck-a', {
          height: '1',
          width: '1',
          playerVars: {
            autoplay: 0,
            controls: 0,
            playsinline: 1,
            rel: 0,
            origin: window.location.origin,
          },
          events: {
            onStateChange: (e: { data: number }) => {
              if (e.data === 1) setIsPlayingA(true);
              if (e.data === 2 || e.data === 0) setIsPlayingA(false);
            },
          },
        });
      } catch (err) {
        console.warn('Mixer YT Player A init:', err);
      }
    }

    // Deck B YT Player
    if (!ytPlayerB.current && document.getElementById('mixer-yt-deck-b')) {
      try {
        ytPlayerB.current = new window.YT.Player('mixer-yt-deck-b', {
          height: '1',
          width: '1',
          playerVars: {
            autoplay: 0,
            controls: 0,
            playsinline: 1,
            rel: 0,
            origin: window.location.origin,
          },
          events: {
            onStateChange: (e: { data: number }) => {
              if (e.data === 1) setIsPlayingB(true);
              if (e.data === 2 || e.data === 0) setIsPlayingB(false);
            },
          },
        });
      } catch (err) {
        console.warn('Mixer YT Player B init:', err);
      }
    }
  }, [isYtApiReady]);

  // Synchronize Volumes (Combined Deck Volume * Crossfader Gain)
  useEffect(() => {
    const { gainA, gainB } = getGains(crossfader);

    // Deck A
    const effectiveVolA = Math.max(0, Math.min(1, volumeA * gainA));
    if (localAudioRefA.current) {
      localAudioRefA.current.volume = effectiveVolA;
    }
    if (ytPlayerA.current && typeof ytPlayerA.current.setVolume === 'function') {
      try {
        ytPlayerA.current.setVolume(Math.round(effectiveVolA * 100));
      } catch {}
    }

    // Deck B
    const effectiveVolB = Math.max(0, Math.min(1, volumeB * gainB));
    if (localAudioRefB.current) {
      localAudioRefB.current.volume = effectiveVolB;
    }
    if (ytPlayerB.current && typeof ytPlayerB.current.setVolume === 'function') {
      try {
        ytPlayerB.current.setVolume(Math.round(effectiveVolB * 100));
      } catch {}
    }
  }, [volumeA, volumeB, crossfader, getGains]);

  // Polling position timer for active decks
  useEffect(() => {
    const timer = setInterval(() => {
      // Deck A timer
      if (isPlayingA) {
        if (trackA?.source === 'local' && localAudioRefA.current) {
          setCurrentTimeA(localAudioRefA.current.currentTime);
          if (localAudioRefA.current.duration) {
            setDurationA(localAudioRefA.current.duration);
          }
        } else if (ytPlayerA.current && typeof ytPlayerA.current.getCurrentTime === 'function') {
          try {
            const t = ytPlayerA.current.getCurrentTime();
            if (typeof t === 'number') setCurrentTimeA(t);
            const d = ytPlayerA.current.getDuration();
            if (typeof d === 'number' && d > 0) setDurationA(d);
          } catch {}
        }
      }

      // Deck B timer
      if (isPlayingB) {
        if (trackB?.source === 'local' && localAudioRefB.current) {
          setCurrentTimeB(localAudioRefB.current.currentTime);
          if (localAudioRefB.current.duration) {
            setDurationB(localAudioRefB.current.duration);
          }
        } else if (ytPlayerB.current && typeof ytPlayerB.current.getCurrentTime === 'function') {
          try {
            const t = ytPlayerB.current.getCurrentTime();
            if (typeof t === 'number') setCurrentTimeB(t);
            const d = ytPlayerB.current.getDuration();
            if (typeof d === 'number' && d > 0) setDurationB(d);
          } catch {}
        }
      }
    }, 400);

    return () => clearInterval(timer);
  }, [isPlayingA, isPlayingB, trackA, trackB]);

  // -------------------------------------------------------------
  // DECK A PLAYBACK ACTIONS
  // -------------------------------------------------------------
  const loadTrackA = (newTrack: TrackInfo) => {
    setTrackA(newTrack);
    setCurrentTimeA(0);
    setErrorA(null);
    setIsLoadingA(false);
    setIsPlayingA(false);

    if (newTrack.duration && newTrack.duration > 0) {
      setDurationA(newTrack.duration);
    }

    if (newTrack.source === 'local' && newTrack.sourceUrl) {
      if (!localAudioRefA.current) {
        localAudioRefA.current = new Audio();
      }
      localAudioRefA.current.src = newTrack.sourceUrl;
      localAudioRefA.current.currentTime = 0;
    } else if (ytPlayerA.current && typeof ytPlayerA.current.cueVideoById === 'function') {
      try {
        ytPlayerA.current.cueVideoById({ videoId: newTrack.id, startSeconds: 0 });
      } catch (err) {
        console.warn('Error loading video on Deck A:', err);
      }
    }
  };

  const togglePlayA = async () => {
    if (!trackA) {
      setSelectorDeck('Deck A');
      return;
    }

    try {
      if (isPlayingA) {
        if (trackA.source === 'local' && localAudioRefA.current) {
          localAudioRefA.current.pause();
        } else if (ytPlayerA.current && typeof ytPlayerA.current.pauseVideo === 'function') {
          ytPlayerA.current.pauseVideo();
        }
        setIsPlayingA(false);
      } else {
        setIsLoadingA(true);
        if (trackA.source === 'local' && localAudioRefA.current) {
          await localAudioRefA.current.play();
          setIsPlayingA(true);
        } else if (ytPlayerA.current && typeof ytPlayerA.current.playVideo === 'function') {
          ytPlayerA.current.playVideo();
          setIsPlayingA(true);
        }
        setIsLoadingA(false);
      }
    } catch {
      setIsLoadingA(false);
      setIsPlayingA(false);
      setErrorA('Click play to begin mixing');
    }
  };

  const seekA = (secs: number) => {
    const clamped = Math.max(0, Math.min(durationA || 300, secs));
    setCurrentTimeA(clamped);

    if (trackA?.source === 'local' && localAudioRefA.current) {
      localAudioRefA.current.currentTime = clamped;
    } else if (ytPlayerA.current && typeof ytPlayerA.current.seekTo === 'function') {
      try {
        ytPlayerA.current.seekTo(clamped, true);
      } catch {}
    }
  };

  const rewindA = () => seekA(currentTimeA - 5);
  const forwardA = () => seekA(currentTimeA + 5);

  // -------------------------------------------------------------
  // DECK B PLAYBACK ACTIONS
  // -------------------------------------------------------------
  const loadTrackB = (newTrack: TrackInfo) => {
    setTrackB(newTrack);
    setCurrentTimeB(0);
    setErrorB(null);
    setIsLoadingB(false);
    setIsPlayingB(false);

    if (newTrack.duration && newTrack.duration > 0) {
      setDurationB(newTrack.duration);
    }

    if (newTrack.source === 'local' && newTrack.sourceUrl) {
      if (!localAudioRefB.current) {
        localAudioRefB.current = new Audio();
      }
      localAudioRefB.current.src = newTrack.sourceUrl;
      localAudioRefB.current.currentTime = 0;
    } else if (ytPlayerB.current && typeof ytPlayerB.current.cueVideoById === 'function') {
      try {
        ytPlayerB.current.cueVideoById({ videoId: newTrack.id, startSeconds: 0 });
      } catch (err) {
        console.warn('Error loading video on Deck B:', err);
      }
    }
  };

  const togglePlayB = async () => {
    if (!trackB) {
      setSelectorDeck('Deck B');
      return;
    }

    try {
      if (isPlayingB) {
        if (trackB.source === 'local' && localAudioRefB.current) {
          localAudioRefB.current.pause();
        } else if (ytPlayerB.current && typeof ytPlayerB.current.pauseVideo === 'function') {
          ytPlayerB.current.pauseVideo();
        }
        setIsPlayingB(false);
      } else {
        setIsLoadingB(true);
        if (trackB.source === 'local' && localAudioRefB.current) {
          await localAudioRefB.current.play();
          setIsPlayingB(true);
        } else if (ytPlayerB.current && typeof ytPlayerB.current.playVideo === 'function') {
          ytPlayerB.current.playVideo();
          setIsPlayingB(true);
        }
        setIsLoadingB(false);
      }
    } catch {
      setIsLoadingB(false);
      setIsPlayingB(false);
      setErrorB('Click play to begin mixing');
    }
  };

  const seekB = (secs: number) => {
    const clamped = Math.max(0, Math.min(durationB || 300, secs));
    setCurrentTimeB(clamped);

    if (trackB?.source === 'local' && localAudioRefB.current) {
      localAudioRefB.current.currentTime = clamped;
    } else if (ytPlayerB.current && typeof ytPlayerB.current.seekTo === 'function') {
      try {
        ytPlayerB.current.seekTo(clamped, true);
      } catch {}
    }
  };

  const rewindB = () => seekB(currentTimeB - 5);
  const forwardB = () => seekB(currentTimeB + 5);

  const resetCrossfader = () => setCrossfader(0);

  return (
    <div
      className={`rounded-2xl bg-[#141414] border border-[#242424] p-4 sm:p-5 shadow-2xl flex flex-col gap-4 relative overflow-hidden ${className}`}
    >
      {/* Hidden YouTube Iframe Targets */}
      <div className="absolute -left-[9999px] -top-[9999px] pointer-events-none opacity-0">
        <div id="mixer-yt-deck-a" />
        <div id="mixer-yt-deck-b" />
      </div>

      {/* Subtle ambient shading */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-white/[0.02] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/[0.02] rounded-full blur-3xl pointer-events-none" />

      {/* Header - Minimal Black & Grey */}
      <div className="flex items-center justify-between border-b border-[#242424] pb-3 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#222222] border border-[#333333] flex items-center justify-center text-zinc-300 shadow-md">
            <MixerSlidersIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                Dual Vinyl Music Mixer
              </h2>
            </div>
            <p className="text-[11px] text-[#888888]">
              Independent two-deck audio engine • Mix any song concurrently
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={resetCrossfader}
            className="text-[10px] px-3 py-1.5 rounded-full bg-[#1c1c1c] hover:bg-[#282828] text-[#888888] hover:text-white border border-[#2e2e2e] transition-colors cursor-pointer font-bold tracking-tight"
            title="Reset crossfader to center (50/50)"
          >
            Center Mix (50/50)
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TWO DECKS SIDE BY SIDE (Minimal Black & Grey)                 */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 z-10">
        {/* ========================================================= */}
        {/* DECK A — LEFT TURNTABLE                                   */}
        {/* ========================================================= */}
        <div className="flex flex-col items-center bg-[#181818] border border-[#262626] hover:border-[#383838] rounded-2xl p-4 transition-all shadow-lg relative group">
          {/* Deck Badge & Song Selection Button */}
          <div className="w-full flex items-center justify-between mb-3">
            <span className="px-2.5 py-0.5 rounded-full bg-[#222222] text-zinc-300 border border-[#383838] text-[10px] font-bold tracking-wider uppercase">
              DECK A
            </span>

            <button
              type="button"
              onClick={() => setSelectorDeck('Deck A')}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#222222] hover:bg-[#2c2c2c] text-[#a1a1aa] hover:text-white border border-[#333333] text-[11px] font-semibold transition-all cursor-pointer shadow-sm"
            >
              <FolderIcon className="w-3.5 h-3.5" />
              <span>{trackA ? 'Change Track' : 'Load Song'}</span>
            </button>
          </div>

          {/* Vinyl Record */}
          <div className="relative my-2">
            <div
              className={`w-36 h-36 sm:w-44 sm:h-44 rounded-full relative flex items-center justify-center vinyl-grooves transition-shadow duration-300 ${
                isPlayingA
                  ? 'vinyl-rotating shadow-2xl shadow-black ring-1 ring-zinc-500/50'
                  : 'vinyl-paused ring-1 ring-[#282828]'
              }`}
            >
              {/* Surface Sheen Reflection */}
              <div className="absolute inset-0 rounded-full vinyl-sheen-overlay pointer-events-none" />

              {/* Center Vinyl Label */}
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full relative overflow-hidden bg-gradient-to-br from-[#1a1a1a] to-[#0e0e0e] border-2 border-[#333333] flex items-center justify-center shadow-inner">
                {trackA?.artworkUrl ? (
                  <Image
                    src={trackA.artworkUrl}
                    alt={trackA.title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-1 select-none pointer-events-none">
                    <span className="text-[9px] font-black text-zinc-300 tracking-wider uppercase leading-none">
                      DECK A
                    </span>
                    <span className="text-[7px] text-[#666666] tracking-tighter mt-0.5 font-mono">
                      33 RPM
                    </span>
                  </div>
                )}
                {/* Center Spindle Hole - Clean, No white emoji behind it */}
                <div className="absolute w-3.5 h-3.5 rounded-full bg-[#080808] border border-[#3a3a3a] shadow-inner z-20 pointer-events-none" />
              </div>
            </div>

            {/* Turntable Stylus / Tone Arm Indicator (Sleek Slate) */}
            <div
              className={`absolute top-0 right-2 w-1.5 h-16 bg-gradient-to-b from-[#666666] to-[#d4d4d8] rounded-full origin-top transition-transform duration-500 shadow-md ${
                isPlayingA ? 'rotate-16' : '-rotate-12'
              }`}
            />
          </div>

          {/* Track Metadata Info */}
          <div className="w-full text-center mt-2 px-1">
            <p className="text-xs font-bold text-white truncate group-hover:text-zinc-200 transition-colors">
              {trackA ? trackA.title : 'Ready to Mix • Deck A'}
            </p>
            <p className="text-[11px] text-[#888888] truncate mt-0.5">
              {trackA ? trackA.artist : 'Click "Load Song" to choose track'}
            </p>
          </div>

          {/* Progress / Seek Slider */}
          <div className="w-full mt-3 space-y-1">
            <div className="flex items-center justify-between text-[10px] text-[#777777] font-mono">
              <span>{formatTime(currentTimeA)}</span>
              <span>{formatTime(durationA)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={durationA || 100}
              step={1}
              value={currentTimeA}
              onChange={(e) => seekA(Number(e.target.value))}
              disabled={!trackA}
              className="w-full spotify-slider"
              title="Seek position"
            />
          </div>

          {/* Playback Controls (-5s, Play/Pause, +5s) */}
          <div className="flex items-center justify-center gap-3 mt-3 w-full">
            <button
              type="button"
              onClick={rewindA}
              disabled={!trackA}
              className="w-8 h-8 rounded-full bg-[#222222] hover:bg-[#2c2c2c] text-[#888888] hover:text-white flex items-center justify-center text-xs font-medium transition-colors cursor-pointer border border-[#333333] disabled:opacity-40"
              title="Rewind 5 seconds"
            >
              -5s
            </button>

            <button
              type="button"
              onClick={togglePlayA}
              className="w-11 h-11 rounded-full bg-white hover:bg-zinc-200 text-black font-bold flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer shadow-lg shadow-white/10"
              title={isPlayingA ? 'Pause Deck A' : 'Play Deck A'}
            >
              {isLoadingA ? (
                <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : isPlayingA ? (
                <PauseIcon className="w-4 h-4 fill-current" />
              ) : (
                <PlayIcon className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={forwardA}
              disabled={!trackA}
              className="w-8 h-8 rounded-full bg-[#222222] hover:bg-[#2c2c2c] text-[#888888] hover:text-white flex items-center justify-center text-xs font-medium transition-colors cursor-pointer border border-[#333333] disabled:opacity-40"
              title="Forward 5 seconds"
            >
              +5s
            </button>
          </div>

          {/* Deck A Volume Slider */}
          <div className="w-full mt-3 flex items-center gap-2 px-1">
            <span className="text-[10px] text-[#888888] font-bold uppercase">Vol</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volumeA}
              onChange={(e) => setVolumeA(Number(e.target.value))}
              className="flex-1 spotify-slider"
              title={`Deck A Volume: ${Math.round(volumeA * 100)}%`}
            />
            <span className="text-[10px] text-[#888888] font-mono w-7 text-right">
              {Math.round(volumeA * 100)}%
            </span>
          </div>

          {errorA && (
            <p className="text-[10px] text-zinc-400 mt-1 font-semibold">{errorA}</p>
          )}
        </div>

        {/* ========================================================= */}
        {/* DECK B — RIGHT TURNTABLE                                  */}
        {/* ========================================================= */}
        <div className="flex flex-col items-center bg-[#181818] border border-[#262626] hover:border-[#383838] rounded-2xl p-4 transition-all shadow-lg relative group">
          {/* Deck Badge & Song Selection Button */}
          <div className="w-full flex items-center justify-between mb-3">
            <span className="px-2.5 py-0.5 rounded-full bg-[#222222] text-zinc-300 border border-[#383838] text-[10px] font-bold tracking-wider uppercase">
              DECK B
            </span>

            <button
              type="button"
              onClick={() => setSelectorDeck('Deck B')}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#222222] hover:bg-[#2c2c2c] text-[#a1a1aa] hover:text-white border border-[#333333] text-[11px] font-semibold transition-all cursor-pointer shadow-sm"
            >
              <FolderIcon className="w-3.5 h-3.5" />
              <span>{trackB ? 'Change Track' : 'Load Song'}</span>
            </button>
          </div>

          {/* Vinyl Record */}
          <div className="relative my-2">
            <div
              className={`w-36 h-36 sm:w-44 sm:h-44 rounded-full relative flex items-center justify-center vinyl-grooves transition-shadow duration-300 ${
                isPlayingB
                  ? 'vinyl-rotating shadow-2xl shadow-black ring-1 ring-zinc-500/50'
                  : 'vinyl-paused ring-1 ring-[#282828]'
              }`}
            >
              {/* Surface Sheen Reflection */}
              <div className="absolute inset-0 rounded-full vinyl-sheen-overlay pointer-events-none" />

              {/* Center Vinyl Label */}
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full relative overflow-hidden bg-gradient-to-br from-[#1a1a1a] to-[#0e0e0e] border-2 border-[#333333] flex items-center justify-center shadow-inner">
                {trackB?.artworkUrl ? (
                  <Image
                    src={trackB.artworkUrl}
                    alt={trackB.title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-1 select-none pointer-events-none">
                    <span className="text-[9px] font-black text-zinc-300 tracking-wider uppercase leading-none">
                      DECK B
                    </span>
                    <span className="text-[7px] text-[#666666] tracking-tighter mt-0.5 font-mono">
                      33 RPM
                    </span>
                  </div>
                )}
                {/* Center Spindle Hole - Clean, No white emoji behind it */}
                <div className="absolute w-3.5 h-3.5 rounded-full bg-[#080808] border border-[#3a3a3a] shadow-inner z-20 pointer-events-none" />
              </div>
            </div>

            {/* Turntable Stylus / Tone Arm Indicator (Sleek Slate) */}
            <div
              className={`absolute top-0 right-2 w-1.5 h-16 bg-gradient-to-b from-[#666666] to-[#d4d4d8] rounded-full origin-top transition-transform duration-500 shadow-md ${
                isPlayingB ? 'rotate-16' : '-rotate-12'
              }`}
            />
          </div>

          {/* Track Metadata Info */}
          <div className="w-full text-center mt-2 px-1">
            <p className="text-xs font-bold text-white truncate group-hover:text-zinc-200 transition-colors">
              {trackB ? trackB.title : 'Ready to Mix • Deck B'}
            </p>
            <p className="text-[11px] text-[#888888] truncate mt-0.5">
              {trackB ? trackB.artist : 'Click "Load Song" to choose track'}
            </p>
          </div>

          {/* Progress / Seek Slider */}
          <div className="w-full mt-3 space-y-1">
            <div className="flex items-center justify-between text-[10px] text-[#777777] font-mono">
              <span>{formatTime(currentTimeB)}</span>
              <span>{formatTime(durationB)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={durationB || 100}
              step={1}
              value={currentTimeB}
              onChange={(e) => seekB(Number(e.target.value))}
              disabled={!trackB}
              className="w-full spotify-slider"
              title="Seek position"
            />
          </div>

          {/* Playback Controls (-5s, Play/Pause, +5s) */}
          <div className="flex items-center justify-center gap-3 mt-3 w-full">
            <button
              type="button"
              onClick={rewindB}
              disabled={!trackB}
              className="w-8 h-8 rounded-full bg-[#222222] hover:bg-[#2c2c2c] text-[#888888] hover:text-white flex items-center justify-center text-xs font-medium transition-colors cursor-pointer border border-[#333333] disabled:opacity-40"
              title="Rewind 5 seconds"
            >
              -5s
            </button>

            <button
              type="button"
              onClick={togglePlayB}
              className="w-11 h-11 rounded-full bg-white hover:bg-zinc-200 text-black font-bold flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer shadow-lg shadow-white/10"
              title={isPlayingB ? 'Pause Deck B' : 'Play Deck B'}
            >
              {isLoadingB ? (
                <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : isPlayingB ? (
                <PauseIcon className="w-4 h-4 fill-current" />
              ) : (
                <PlayIcon className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={forwardB}
              disabled={!trackB}
              className="w-8 h-8 rounded-full bg-[#222222] hover:bg-[#2c2c2c] text-[#888888] hover:text-white flex items-center justify-center text-xs font-medium transition-colors cursor-pointer border border-[#333333] disabled:opacity-40"
              title="Forward 5 seconds"
            >
              +5s
            </button>
          </div>

          {/* Deck B Volume Slider */}
          <div className="w-full mt-3 flex items-center gap-2 px-1">
            <span className="text-[10px] text-[#888888] font-bold uppercase">Vol</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volumeB}
              onChange={(e) => setVolumeB(Number(e.target.value))}
              className="flex-1 spotify-slider"
              title={`Deck B Volume: ${Math.round(volumeB * 100)}%`}
            />
            <span className="text-[10px] text-[#888888] font-mono w-7 text-right">
              {Math.round(volumeB * 100)}%
            </span>
          </div>

          {errorB && (
            <p className="text-[10px] text-zinc-400 mt-1 font-semibold">{errorB}</p>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MASTER DJ CROSSFADER (DECK A <-> EQUAL <-> DECK B)           */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-[#181818] border border-[#242424] rounded-xl p-3.5 flex flex-col gap-2 z-10 shadow-inner">
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider">
          <span className="text-zinc-300 flex items-center gap-1">
            DECK A
          </span>
          <span className="text-[#888888] text-[10px] font-mono">
            {crossfader === 0
              ? 'EQUAL BLEND'
              : crossfader < 0
              ? `DECK A +${Math.round(-crossfader * 100)}%`
              : `DECK B +${Math.round(crossfader * 100)}%`}
          </span>
          <span className="text-zinc-300 flex items-center gap-1">
            DECK B
          </span>
        </div>

        {/* Crossfader Range Control */}
        <div className="relative py-1">
          <input
            type="range"
            min={-1}
            max={1}
            step={0.02}
            value={crossfader}
            onChange={(e) => setCrossfader(Number(e.target.value))}
            className="w-full crossfader-slider"
            title="DJ Crossfader"
          />
        </div>

        <div className="flex items-center justify-between text-[9px] text-[#666666] font-mono">
          <span>100% DECK A</span>
          <span className="text-[#888888]">CENTER BLEND</span>
          <span>100% DECK B</span>
        </div>
      </div>

      {/* Song Selector Modal */}
      {selectorDeck && (
        <SongSelectorModal
          isOpen={!!selectorDeck}
          onClose={() => setSelectorDeck(null)}
          deckName={selectorDeck}
          savedPlaylists={savedPlaylists}
          onSelectSong={(chosenTrack) => {
            if (selectorDeck === 'Deck A') {
              loadTrackA(chosenTrack);
            } else {
              loadTrackB(chosenTrack);
            }
          }}
        />
      )}
    </div>
  );
}
