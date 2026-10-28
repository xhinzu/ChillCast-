'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { TrackInfo } from '@/types/playback';
import { SavedPlaylistItem } from '@/components/spotify/AddSourceModal';
import SongSelectorModal from './SongSelectorModal';
import { YTPlayer } from '@/types/youtube';
import { usePlayback } from '@/context/PlaybackContext';

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
  const { setDeckPlayback } = usePlayback();

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

  // Synchronize active deck playback to global context for side and bottom panels
  useEffect(() => {
    if (isPlayingA && !isPlayingB) {
      if (trackA) {
        setDeckPlayback({
          deck: 'Deck A',
          track: trackA,
          isPlaying: true,
          currentTime: currentTimeA,
          duration: durationA || 210,
          volume: volumeA,
        });
      }
    } else if (isPlayingB && !isPlayingA) {
      if (trackB) {
        setDeckPlayback({
          deck: 'Deck B',
          track: trackB,
          isPlaying: true,
          currentTime: currentTimeB,
          duration: durationB || 210,
          volume: volumeB,
        });
      }
    } else if (isPlayingA && isPlayingB) {
      const activeDeck = crossfader <= 0 ? 'Deck A' : 'Deck B';
      const activeTr = activeDeck === 'Deck A' ? trackA : trackB;
      if (activeTr) {
        setDeckPlayback({
          deck: activeDeck,
          track: activeTr,
          isPlaying: true,
          currentTime: activeDeck === 'Deck A' ? currentTimeA : currentTimeB,
          duration: (activeDeck === 'Deck A' ? durationA : durationB) || 210,
          volume: activeDeck === 'Deck A' ? volumeA : volumeB,
        });
      }
    } else if (trackA || trackB) {
      // If paused, keep displaying the loaded track with paused status
      const pausedDeck = trackA ? 'Deck A' : 'Deck B';
      const pausedTr = pausedDeck === 'Deck A' ? trackA : trackB;
      if (pausedTr) {
        setDeckPlayback({
          deck: pausedDeck,
          track: pausedTr,
          isPlaying: false,
          currentTime: pausedDeck === 'Deck A' ? currentTimeA : currentTimeB,
          duration: (pausedDeck === 'Deck A' ? durationA : durationB) || 210,
          volume: pausedDeck === 'Deck A' ? volumeA : volumeB,
        });
      }
    } else {
      setDeckPlayback(null);
    }
  }, [
    isPlayingA,
    isPlayingB,
    trackA,
    trackB,
    currentTimeA,
    currentTimeB,
    durationA,
    durationB,
    volumeA,
    volumeB,
    crossfader,
    setDeckPlayback,
  ]);

  // Listen for bottom player deck remote controls
  useEffect(() => {
    const handleToggle = (e: Event) => {
      const custom = e as CustomEvent<{ deck?: 'Deck A' | 'Deck B' }>;
      const target = custom.detail?.deck;
      if (target === 'Deck A' || (!target && (isPlayingA || trackA))) {
        togglePlayA();
      } else if (target === 'Deck B' || (!target && (isPlayingB || trackB))) {
        togglePlayB();
      }
    };

    const handleSeek = (e: Event) => {
      const custom = e as CustomEvent<{ deck?: 'Deck A' | 'Deck B'; time: number }>;
      const { deck, time } = custom.detail || {};
      if (typeof time === 'number') {
        if (deck === 'Deck A' || (!deck && isPlayingA)) {
          seekA(time);
        } else if (deck === 'Deck B' || (!deck && isPlayingB)) {
          seekB(time);
        }
      }
    };

    window.addEventListener('chillify_deck_toggle', handleToggle);
    window.addEventListener('chillify_deck_seek', handleSeek);
    return () => {
      window.removeEventListener('chillify_deck_toggle', handleToggle);
      window.removeEventListener('chillify_deck_seek', handleSeek);
    };
  }, [isPlayingA, isPlayingB, trackA, trackB, togglePlayA, togglePlayB, seekA, seekB]);

  return (
    <div
      className={`rounded-2xl bg-gradient-to-b from-[#131018] via-[#0d0c11] to-[#07070a] border border-orange-500/30 p-4 sm:p-5 shadow-2xl shadow-orange-950/30 flex flex-col gap-4 relative overflow-hidden ${className}`}
    >
      {/* Hidden YouTube Iframe Targets */}
      <div className="absolute -left-[9999px] -top-[9999px] pointer-events-none opacity-0">
        <div id="mixer-yt-deck-a" />
        <div id="mixer-yt-deck-b" />
      </div>

      {/* Spooky Ambient Background Glows */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header with Halloween Graffiti Tag */}
      <div className="flex items-center justify-between border-b border-[#24202d] pb-3 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#ff7518] flex items-center justify-center text-black font-black text-sm shadow-md shadow-orange-500/30">
            🎃
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black tracking-tight text-white flex items-center gap-1.5">
                DUAL VINYL MUSIC MIXER <span className="text-orange-500 font-mono text-xs">v2.0</span>
              </h2>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-orange-950/60 border border-orange-500/40 text-orange-400 text-[10px] font-black uppercase tracking-wider">
                🦇 TRICK OR TREAT
              </span>
            </div>
            <p className="text-[11px] text-[#938f9d]">
              Independent two-deck audio engine • Mix any song concurrently
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={resetCrossfader}
            className="text-[10px] px-2.5 py-1 rounded-full bg-[#1b1822] hover:bg-[#282433] text-[#cfcbd8] hover:text-[#ff7518] border border-[#2e2a38] transition-colors cursor-pointer font-bold"
            title="Reset crossfader to center (50/50)"
          >
            🕸️ Center Mix
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TWO DECKS SIDE BY SIDE                                        */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 z-10">
        {/* ========================================================= */}
        {/* DECK A — LEFT TURNTABLE (PUMPKIN ORANGE)                  */}
        {/* ========================================================= */}
        <div className="flex flex-col items-center bg-[#0d0c11] border border-orange-500/25 hover:border-orange-500/50 rounded-2xl p-4 transition-all shadow-lg relative group">
          {/* Deck Badge & Song Selection Button */}
          <div className="w-full flex items-center justify-between mb-3">
            <span className="px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/40 text-[10px] font-black tracking-wider uppercase flex items-center gap-1">
              <span>🎃</span> DECK A
            </span>

            <button
              type="button"
              onClick={() => setSelectorDeck('Deck A')}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-950/40 hover:bg-[#ff7518] text-orange-400 hover:text-black border border-orange-500/40 text-[11px] font-black transition-all cursor-pointer shadow-sm"
            >
              <span>📂</span> {trackA ? 'Change Track' : 'Load Song'}
            </button>
          </div>

          {/* Vinyl Record */}
          <div className="relative my-2">
            <div
              className={`w-36 h-36 sm:w-44 sm:h-44 rounded-full relative flex items-center justify-center vinyl-grooves transition-shadow duration-300 ${
                isPlayingA
                  ? 'vinyl-rotating shadow-2xl shadow-orange-500/40 ring-2 ring-orange-500/50'
                  : 'vinyl-paused ring-1 ring-[#262230]'
              }`}
            >
              {/* Surface Sheen Reflection */}
              <div className="absolute inset-0 rounded-full vinyl-sheen-overlay pointer-events-none" />

              {/* Center Vinyl Label */}
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full relative overflow-hidden bg-gradient-to-br from-[#2a1708] to-[#120a04] border-2 border-orange-500/80 flex items-center justify-center shadow-inner">
                {trackA?.artworkUrl ? (
                  <Image
                    src={trackA.artworkUrl}
                    alt={trackA.title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-1">
                    <span className="text-xl">🎃</span>
                    <span className="text-[8px] font-black text-orange-400 tracking-tighter uppercase leading-none mt-0.5">
                      DECK A
                    </span>
                  </div>
                )}
                {/* Center Spindle Hole */}
                <div className="absolute w-3.5 h-3.5 rounded-full bg-black border border-orange-500/80 z-10" />
              </div>
            </div>

            {/* Turntable Stylus / Tone Arm Indicator */}
            <div
              className={`absolute top-0 right-2 w-1.5 h-16 bg-gradient-to-b from-[#888888] to-[#ff7518] rounded-full origin-top transition-transform duration-500 shadow-md ${
                isPlayingA ? 'rotate-16' : '-rotate-12'
              }`}
            />
          </div>

          {/* Track Metadata Info */}
          <div className="w-full text-center mt-2 px-1">
            <p className="text-xs font-black text-white truncate group-hover:text-orange-400 transition-colors">
              {trackA ? trackA.title : 'Ready to Mix • Deck A'}
            </p>
            <p className="text-[11px] text-[#8e8b98] truncate mt-0.5">
              {trackA ? trackA.artist : 'Click "Load Song" to choose track'}
            </p>
          </div>

          {/* Progress / Seek Slider */}
          <div className="w-full mt-3 space-y-1">
            <div className="flex items-center justify-between text-[10px] text-[#716e7a] font-mono">
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
              className="w-8 h-8 rounded-full bg-[#17151e] hover:bg-[#252130] text-[#a1a1aa] hover:text-white flex items-center justify-center text-xs transition-colors cursor-pointer border border-[#2c2738] disabled:opacity-40"
              title="Rewind 5 seconds"
            >
              -5s
            </button>

            <button
              type="button"
              onClick={togglePlayA}
              className="w-11 h-11 rounded-full bg-[#ff7518] hover:bg-[#ff8c00] text-black font-black flex items-center justify-center text-base transition-transform hover:scale-105 active:scale-95 cursor-pointer shadow-lg shadow-orange-500/30"
              title={isPlayingA ? 'Pause Deck A' : 'Play Deck A'}
            >
              {isLoadingA ? (
                <span className="text-xs animate-spin">⏳</span>
              ) : isPlayingA ? (
                '❚❚'
              ) : (
                '▶'
              )}
            </button>

            <button
              type="button"
              onClick={forwardA}
              disabled={!trackA}
              className="w-8 h-8 rounded-full bg-[#17151e] hover:bg-[#252130] text-[#a1a1aa] hover:text-white flex items-center justify-center text-xs transition-colors cursor-pointer border border-[#2c2738] disabled:opacity-40"
              title="Forward 5 seconds"
            >
              +5s
            </button>
          </div>

          {/* Deck A Volume Slider */}
          <div className="w-full mt-3 flex items-center gap-2 px-1">
            <span className="text-[10px] text-[#8e8b98] font-bold">Vol</span>
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
            <span className="text-[10px] text-[#8e8b98] font-mono w-7 text-right">
              {Math.round(volumeA * 100)}%
            </span>
          </div>

          {errorA && (
            <p className="text-[10px] text-orange-400 mt-1 font-semibold">{errorA}</p>
          )}
        </div>

        {/* ========================================================= */}
        {/* DECK B — RIGHT TURNTABLE (HAUNTED PURPLE)                 */}
        {/* ========================================================= */}
        <div className="flex flex-col items-center bg-[#0d0c11] border border-purple-500/25 hover:border-purple-500/50 rounded-2xl p-4 transition-all shadow-lg relative group">
          {/* Deck Badge & Song Selection Button */}
          <div className="w-full flex items-center justify-between mb-3">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/40 text-[10px] font-black tracking-wider uppercase flex items-center gap-1">
              <span>💀</span> DECK B
            </span>

            <button
              type="button"
              onClick={() => setSelectorDeck('Deck B')}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/40 hover:bg-[#a855f7] text-purple-400 hover:text-black border border-purple-500/40 text-[11px] font-black transition-all cursor-pointer shadow-sm"
            >
              <span>📂</span> {trackB ? 'Change Track' : 'Load Song'}
            </button>
          </div>

          {/* Vinyl Record */}
          <div className="relative my-2">
            <div
              className={`w-36 h-36 sm:w-44 sm:h-44 rounded-full relative flex items-center justify-center vinyl-grooves transition-shadow duration-300 ${
                isPlayingB
                  ? 'vinyl-rotating shadow-2xl shadow-purple-500/40 ring-2 ring-purple-500/50'
                  : 'vinyl-paused ring-1 ring-[#262230]'
              }`}
            >
              {/* Surface Sheen Reflection */}
              <div className="absolute inset-0 rounded-full vinyl-sheen-overlay pointer-events-none" />

              {/* Center Vinyl Label */}
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full relative overflow-hidden bg-gradient-to-br from-[#1b0826] to-[#0a0310] border-2 border-purple-500/80 flex items-center justify-center shadow-inner">
                {trackB?.artworkUrl ? (
                  <Image
                    src={trackB.artworkUrl}
                    alt={trackB.title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-1">
                    <span className="text-xl">💀</span>
                    <span className="text-[8px] font-black text-purple-400 tracking-tighter uppercase leading-none mt-0.5">
                      DECK B
                    </span>
                  </div>
                )}
                {/* Center Spindle Hole */}
                <div className="absolute w-3.5 h-3.5 rounded-full bg-black border border-purple-500/80 z-10" />
              </div>
            </div>

            {/* Turntable Stylus / Tone Arm Indicator */}
            <div
              className={`absolute top-0 right-2 w-1.5 h-16 bg-gradient-to-b from-[#888888] to-[#a855f7] rounded-full origin-top transition-transform duration-500 shadow-md ${
                isPlayingB ? 'rotate-16' : '-rotate-12'
              }`}
            />
          </div>

          {/* Track Metadata Info */}
          <div className="w-full text-center mt-2 px-1">
            <p className="text-xs font-black text-white truncate group-hover:text-purple-400 transition-colors">
              {trackB ? trackB.title : 'Ready to Mix • Deck B'}
            </p>
            <p className="text-[11px] text-[#8e8b98] truncate mt-0.5">
              {trackB ? trackB.artist : 'Click "Load Song" to choose track'}
            </p>
          </div>

          {/* Progress / Seek Slider */}
          <div className="w-full mt-3 space-y-1">
            <div className="flex items-center justify-between text-[10px] text-[#716e7a] font-mono">
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
              className="w-8 h-8 rounded-full bg-[#17151e] hover:bg-[#252130] text-[#a1a1aa] hover:text-white flex items-center justify-center text-xs transition-colors cursor-pointer border border-[#2c2738] disabled:opacity-40"
              title="Rewind 5 seconds"
            >
              -5s
            </button>

            <button
              type="button"
              onClick={togglePlayB}
              className="w-11 h-11 rounded-full bg-[#a855f7] hover:bg-[#b06cf7] text-black font-black flex items-center justify-center text-base transition-transform hover:scale-105 active:scale-95 cursor-pointer shadow-lg shadow-purple-500/30"
              title={isPlayingB ? 'Pause Deck B' : 'Play Deck B'}
            >
              {isLoadingB ? (
                <span className="text-xs animate-spin">⏳</span>
              ) : isPlayingB ? (
                '❚❚'
              ) : (
                '▶'
              )}
            </button>

            <button
              type="button"
              onClick={forwardB}
              disabled={!trackB}
              className="w-8 h-8 rounded-full bg-[#17151e] hover:bg-[#252130] text-[#a1a1aa] hover:text-white flex items-center justify-center text-xs transition-colors cursor-pointer border border-[#2c2738] disabled:opacity-40"
              title="Forward 5 seconds"
            >
              +5s
            </button>
          </div>

          {/* Deck B Volume Slider */}
          <div className="w-full mt-3 flex items-center gap-2 px-1">
            <span className="text-[10px] text-[#8e8b98] font-bold">Vol</span>
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
            <span className="text-[10px] text-[#8e8b98] font-mono w-7 text-right">
              {Math.round(volumeB * 100)}%
            </span>
          </div>

          {errorB && (
            <p className="text-[10px] text-purple-400 mt-1 font-semibold">{errorB}</p>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MASTER DJ CROSSFADER (DECK A <-> EQUAL <-> DECK B)           */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-[#0a090e] border border-[#24202c] rounded-xl p-3.5 flex flex-col gap-2 z-10 shadow-inner">
        <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider">
          <span className="text-orange-400 flex items-center gap-1">
            <span>🎃</span> DECK A
          </span>
          <span className="text-[#a1a1aa] text-[10px] font-mono">
            {crossfader === 0
              ? '⚖️ EQUAL BLEND'
              : crossfader < 0
              ? `🎃 DECK A +${Math.round(-crossfader * 100)}%`
              : `💀 DECK B +${Math.round(crossfader * 100)}%`}
          </span>
          <span className="text-purple-400 flex items-center gap-1">
            DECK B <span>💀</span>
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

        <div className="flex items-center justify-between text-[9px] text-[#716e7a] font-mono">
          <span>100% DECK A</span>
          <span className="text-[#a1a1aa]">CENTER BLEND</span>
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
