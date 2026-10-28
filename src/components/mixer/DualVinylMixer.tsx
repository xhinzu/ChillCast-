'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { TrackInfo } from '@/types/playback';
import { SavedPlaylistItem } from '@/components/spotify/AddSourceModal';
import SongSelectorModal from './SongSelectorModal';
import {
  TRENDING_ENGLISH_SONGS,
  TRENDING_MALAYALAM_SONGS,
  catalogSongToTrackInfo,
} from '@/lib/music-data';

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
  // DECK A STATES
  // -------------------------------------------------------------
  const [trackA, setTrackA] = useState<TrackInfo>(() =>
    catalogSongToTrackInfo(TRENDING_ENGLISH_SONGS[0])
  );
  const [isPlayingA, setIsPlayingA] = useState(false);
  const [currentTimeA, setCurrentTimeA] = useState(0);
  const [durationA, setDurationA] = useState(240);
  const [volumeA, setVolumeA] = useState(0.85);
  const [isLoadingA, setIsLoadingA] = useState(false);
  const [errorA, setErrorA] = useState<string | null>(null);

  // -------------------------------------------------------------
  // DECK B STATES
  // -------------------------------------------------------------
  const [trackB, setTrackB] = useState<TrackInfo>(() =>
    catalogSongToTrackInfo(TRENDING_MALAYALAM_SONGS[0])
  );
  const [isPlayingB, setIsPlayingB] = useState(false);
  const [currentTimeB, setCurrentTimeB] = useState(0);
  const [durationB, setDurationB] = useState(192);
  const [volumeB, setVolumeB] = useState(0.85);
  const [isLoadingB, setIsLoadingB] = useState(false);
  const [errorB, setErrorB] = useState<string | null>(null);

  // -------------------------------------------------------------
  // MIXER / CROSSFADER STATE (-1 = Full Deck A, 0 = Both 100%, +1 = Full Deck B)
  // -------------------------------------------------------------
  const [crossfader, setCrossfader] = useState(0);

  // Song Selector Modal state
  const [selectorDeck, setSelectorDeck] = useState<'Deck A' | 'Deck B' | null>(null);

  // Independent HTMLAudioElement references
  const audioRefA = useRef<HTMLAudioElement | null>(null);
  const audioRefB = useRef<HTMLAudioElement | null>(null);

  // Calculate DJ contour crossfader gains (both 100% in center, smooth fade to sides)
  const getGains = useCallback((cf: number) => {
    let gainA = 1;
    let gainB = 1;
    if (cf < 0) {
      // Moving left: A stays 1.0, B decreases to 0 at -1
      gainA = 1;
      gainB = Math.max(0, 1 + cf);
    } else if (cf > 0) {
      // Moving right: B stays 1.0, A decreases to 0 at +1
      gainB = 1;
      gainA = Math.max(0, 1 - cf);
    }
    return { gainA, gainB };
  }, []);

  // Update actual audio element volumes when volume or crossfader changes
  useEffect(() => {
    const { gainA, gainB } = getGains(crossfader);
    if (audioRefA.current) {
      audioRefA.current.volume = Math.max(0, Math.min(1, volumeA * gainA));
    }
    if (audioRefB.current) {
      audioRefB.current.volume = Math.max(0, Math.min(1, volumeB * gainB));
    }
  }, [volumeA, volumeB, crossfader, getGains]);

  // Resolve audio streaming source
  const getAudioSource = (track: TrackInfo): string => {
    if (track.sourceUrl && (track.sourceUrl.startsWith('http') || track.sourceUrl.startsWith('blob:'))) {
      return track.sourceUrl;
    }
    // Stream via backend YouTube stream proxy
    return `/api/youtube/stream?v=${encodeURIComponent(track.id)}`;
  };

  // -------------------------------------------------------------
  // DECK A AUDIO LIFECYCLE
  // -------------------------------------------------------------
  useEffect(() => {
    const audio = new Audio();
    audioRefA.current = audio;
    audio.crossOrigin = 'anonymous';
    audio.preload = 'metadata';

    const onTimeUpdate = () => setCurrentTimeA(audio.currentTime);
    const onLoadedMetadata = () => {
      setIsLoadingA(false);
      setErrorA(null);
      if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
        setDurationA(audio.duration);
      }
    };
    const onEnded = () => setIsPlayingA(false);
    const onPlay = () => setIsPlayingA(true);
    const onPause = () => setIsPlayingA(false);
    const onError = () => {
      setIsLoadingA(false);
      setIsPlayingA(false);
      // Fallback gracefully without breaking UI
      console.warn('Mixer Deck A stream fallback');
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('error', onError);

    // Initial track load
    audio.src = getAudioSource(trackA);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('error', onError);
      audio.src = '';
      audioRefA.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update track A source when trackA changes
  const changeTrackA = (newTrack: TrackInfo) => {
    setTrackA(newTrack);
    setCurrentTimeA(0);
    setErrorA(null);
    setIsLoadingA(true);
    if (audioRefA.current) {
      audioRefA.current.src = getAudioSource(newTrack);
      if (isPlayingA) {
        audioRefA.current.play().catch(() => setIsPlayingA(false));
      }
    }
  };

  const togglePlayA = async () => {
    if (!audioRefA.current) return;
    try {
      if (isPlayingA) {
        audioRefA.current.pause();
      } else {
        setIsLoadingA(true);
        await audioRefA.current.play();
        setIsLoadingA(false);
      }
    } catch {
      setIsLoadingA(false);
      setIsPlayingA(false);
      setErrorA('Playback prevented by browser or stream busy');
    }
  };

  const seekA = (secs: number) => {
    if (audioRefA.current) {
      const clamped = Math.max(0, Math.min(durationA, secs));
      audioRefA.current.currentTime = clamped;
      setCurrentTimeA(clamped);
    }
  };

  const rewindA = () => seekA(currentTimeA - 5);
  const forwardA = () => seekA(currentTimeA + 5);

  // -------------------------------------------------------------
  // DECK B AUDIO LIFECYCLE
  // -------------------------------------------------------------
  useEffect(() => {
    const audio = new Audio();
    audioRefB.current = audio;
    audio.crossOrigin = 'anonymous';
    audio.preload = 'metadata';

    const onTimeUpdate = () => setCurrentTimeB(audio.currentTime);
    const onLoadedMetadata = () => {
      setIsLoadingB(false);
      setErrorB(null);
      if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
        setDurationB(audio.duration);
      }
    };
    const onEnded = () => setIsPlayingB(false);
    const onPlay = () => setIsPlayingB(true);
    const onPause = () => setIsPlayingB(false);
    const onError = () => {
      setIsLoadingB(false);
      setIsPlayingB(false);
      console.warn('Mixer Deck B stream fallback');
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('error', onError);

    // Initial track load
    audio.src = getAudioSource(trackB);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('error', onError);
      audio.src = '';
      audioRefB.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeTrackB = (newTrack: TrackInfo) => {
    setTrackB(newTrack);
    setCurrentTimeB(0);
    setErrorB(null);
    setIsLoadingB(true);
    if (audioRefB.current) {
      audioRefB.current.src = getAudioSource(newTrack);
      if (isPlayingB) {
        audioRefB.current.play().catch(() => setIsPlayingB(false));
      }
    }
  };

  const togglePlayB = async () => {
    if (!audioRefB.current) return;
    try {
      if (isPlayingB) {
        audioRefB.current.pause();
      } else {
        setIsLoadingB(true);
        await audioRefB.current.play();
        setIsLoadingB(false);
      }
    } catch {
      setIsLoadingB(false);
      setIsPlayingB(false);
      setErrorB('Playback prevented by browser or stream busy');
    }
  };

  const seekB = (secs: number) => {
    if (audioRefB.current) {
      const clamped = Math.max(0, Math.min(durationB, secs));
      audioRefB.current.currentTime = clamped;
      setCurrentTimeB(clamped);
    }
  };

  const rewindB = () => seekB(currentTimeB - 5);
  const forwardB = () => seekB(currentTimeB + 5);

  const resetCrossfader = () => setCrossfader(0);

  return (
    <div
      className={`bg-gradient-to-b from-[#161922] via-[#12141c] to-[#0d0e14] border border-[#262c3d] rounded-2xl p-4 sm:p-5 shadow-2xl relative select-none flex flex-col justify-between ${className}`}
    >
      {/* Top Console Bar */}
      <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-[#232938]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1d90f5] to-[#7928ca] flex items-center justify-center text-sm shadow-md shadow-[#1d90f5]/20">
            🎛️
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-white tracking-tight flex items-center gap-2">
              Dual Vinyl Music Mixer
              {(isPlayingA || isPlayingB) && (
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#1d90f5]/20 text-[#1d90f5] border border-[#1d90f5]/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1d90f5] animate-ping" />
                  {isPlayingA && isPlayingB ? 'DUAL MIXING' : isPlayingA ? 'DECK A ACTIVE' : 'DECK B ACTIVE'}
                </span>
              )}
            </h2>
            <p className="text-[11px] text-[#8e98a8]">Two-deck interactive DJ mixer • Real independent audio playback</p>
          </div>
        </div>

        {/* Global Stop / Sync status */}
        {(isPlayingA || isPlayingB) && (
          <button
            type="button"
            onClick={() => {
              if (audioRefA.current) audioRefA.current.pause();
              if (audioRefB.current) audioRefB.current.pause();
              setIsPlayingA(false);
              setIsPlayingB(false);
            }}
            className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#222838] hover:bg-rose-900/40 text-[#a0aab8] hover:text-rose-200 border border-[#30384c] transition-colors cursor-pointer"
          >
            ⏹️ Stop Decks
          </button>
        )}
      </div>

      {/* Turntables Container (2 Decks Side-by-Side) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
        {/* ========================================================= */}
        {/* DECK A — LEFT TURNTABLE */}
        {/* ========================================================= */}
        <div
          className={`flex flex-col items-center bg-[#0e1017] p-3.5 sm:p-4 rounded-xl border transition-all duration-300 ${
            isPlayingA
              ? 'border-[#1d90f5]/60 shadow-lg shadow-[#1d90f5]/15 ring-1 ring-[#1d90f5]/40'
              : 'border-[#1f2433] hover:border-[#2d354a]'
          }`}
        >
          {/* Deck Header Badge */}
          <div className="w-full flex items-center justify-between mb-2">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-black tracking-wider uppercase bg-[#1d90f5]/20 text-[#1d90f5] border border-[#1d90f5]/40">
              Deck A
            </span>
            <button
              type="button"
              onClick={() => setSelectorDeck('Deck A')}
              className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-[#1b202e] hover:bg-[#1d90f5] text-[#b3b3b3] hover:text-white transition-colors cursor-pointer border border-[#283044]"
            >
              🔄 Load Song
            </button>
          </div>

          {/* Vinyl Record Turntable */}
          <div className="relative my-2 flex items-center justify-center">
            {/* Tone Arm / Stylus */}
            <div
              className={`absolute -top-1 -right-2 z-20 w-12 h-20 pointer-events-none transition-transform duration-500 origin-top-right ${
                isPlayingA ? 'rotate-12' : '-rotate-6 opacity-60'
              }`}
            >
              <div className="w-1.5 h-16 bg-gradient-to-b from-[#888888] to-[#444444] rounded-full shadow-md ml-auto mr-1" />
              <div className="w-3.5 h-3.5 rounded-sm bg-[#1d90f5] ml-auto -mt-1 shadow" />
            </div>

            {/* Circular Vinyl Disc */}
            <div
              className={`w-36 h-36 sm:w-44 sm:h-44 rounded-full vinyl-grooves relative flex items-center justify-center overflow-hidden transition-all duration-300 ${
                isPlayingA ? 'vinyl-rotating ring-2 ring-[#1d90f5] shadow-xl shadow-[#1d90f5]/25' : 'vinyl-paused'
              }`}
            >
              {/* Vinyl Sheen Overlay */}
              <div className="absolute inset-0 vinyl-sheen-overlay rounded-full pointer-events-none" />

              {/* Center Vinyl Label */}
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 border-[#1d90f5] shadow-inner bg-black flex items-center justify-center">
                <Image
                  src={trackA.artworkUrl || `https://img.youtube.com/vi/${trackA.id}/hqdefault.jpg`}
                  alt={trackA.title}
                  fill
                  className="object-cover opacity-85"
                  unoptimized
                />
                <div className="absolute inset-0 bg-[#1d90f5]/20 mix-blend-overlay" />

                {/* Center Spindle Hole */}
                <div className="relative z-10 w-3.5 h-3.5 rounded-full bg-[#111111] border border-white/60 shadow-sm" />
              </div>
            </div>
          </div>

          {/* Deck Track Info */}
          <div className="w-full text-center mt-1 px-1">
            <p className="text-xs font-bold text-white truncate" title={trackA.title}>
              {trackA.title}
            </p>
            <p className="text-[10px] text-[#8e98a8] truncate">{trackA.artist}</p>
          </div>

          {/* Scrubbing Seek Slider */}
          <div className="w-full mt-2.5 space-y-1">
            <input
              type="range"
              min="0"
              max={durationA || 100}
              step="0.5"
              value={currentTimeA}
              onChange={(e) => seekA(parseFloat(e.target.value))}
              className="w-full spotify-slider"
              title="Seek Position"
            />
            <div className="flex items-center justify-between text-[10px] font-mono text-[#8e98a8]">
              <span>{formatTime(currentTimeA)}</span>
              <span>{formatTime(durationA)}</span>
            </div>
          </div>

          {/* Playback Controls (-5s, Play/Pause, +5s) */}
          <div className="flex items-center justify-center gap-3 mt-2.5">
            <button
              type="button"
              onClick={rewindA}
              className="w-8 h-8 rounded-full bg-[#1b202e] hover:bg-[#252c40] text-[#a0aab8] hover:text-white text-xs font-bold flex items-center justify-center transition-colors cursor-pointer border border-[#283044]"
              title="Rewind 5 seconds"
            >
              ⏪
            </button>

            <button
              type="button"
              onClick={togglePlayA}
              disabled={isLoadingA}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg ${
                isPlayingA
                  ? 'bg-[#1d90f5] text-white scale-105 shadow-[#1d90f5]/40'
                  : 'bg-white hover:bg-[#1d90f5] text-black hover:text-white'
              }`}
              title={isPlayingA ? 'Pause Deck A' : 'Play Deck A'}
            >
              {isLoadingA ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : isPlayingA ? (
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
              ) : (
                <svg className="w-4 h-4 fill-current ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              )}
            </button>

            <button
              type="button"
              onClick={forwardA}
              className="w-8 h-8 rounded-full bg-[#1b202e] hover:bg-[#252c40] text-[#a0aab8] hover:text-white text-xs font-bold flex items-center justify-center transition-colors cursor-pointer border border-[#283044]"
              title="Forward 5 seconds"
            >
              ⏩
            </button>
          </div>

          {/* Deck A Volume Slider */}
          <div className="w-full flex items-center gap-2 mt-3 pt-2 border-t border-[#1b202e]">
            <span className="text-[10px] text-[#8e98a8] font-bold">Vol</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volumeA}
              onChange={(e) => setVolumeA(parseFloat(e.target.value))}
              className="flex-1 spotify-slider"
              title={`Deck A Volume: ${Math.round(volumeA * 100)}%`}
            />
            <span className="text-[10px] text-[#8e98a8] font-mono w-7 text-right">
              {Math.round(volumeA * 100)}%
            </span>
          </div>

          {errorA && <p className="text-[10px] text-rose-400 mt-1">{errorA}</p>}
        </div>

        {/* ========================================================= */}
        {/* DECK B — RIGHT TURNTABLE */}
        {/* ========================================================= */}
        <div
          className={`flex flex-col items-center bg-[#0e1017] p-3.5 sm:p-4 rounded-xl border transition-all duration-300 ${
            isPlayingB
              ? 'border-[#a855f7]/60 shadow-lg shadow-[#a855f7]/15 ring-1 ring-[#a855f7]/40'
              : 'border-[#1f2433] hover:border-[#2d354a]'
          }`}
        >
          {/* Deck Header Badge */}
          <div className="w-full flex items-center justify-between mb-2">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-black tracking-wider uppercase bg-[#a855f7]/20 text-[#c084fc] border border-[#a855f7]/40">
              Deck B
            </span>
            <button
              type="button"
              onClick={() => setSelectorDeck('Deck B')}
              className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-[#1b202e] hover:bg-[#a855f7] text-[#b3b3b3] hover:text-white transition-colors cursor-pointer border border-[#283044]"
            >
              🔄 Load Song
            </button>
          </div>

          {/* Vinyl Record Turntable */}
          <div className="relative my-2 flex items-center justify-center">
            {/* Tone Arm / Stylus */}
            <div
              className={`absolute -top-1 -right-2 z-20 w-12 h-20 pointer-events-none transition-transform duration-500 origin-top-right ${
                isPlayingB ? 'rotate-12' : '-rotate-6 opacity-60'
              }`}
            >
              <div className="w-1.5 h-16 bg-gradient-to-b from-[#888888] to-[#444444] rounded-full shadow-md ml-auto mr-1" />
              <div className="w-3.5 h-3.5 rounded-sm bg-[#a855f7] ml-auto -mt-1 shadow" />
            </div>

            {/* Circular Vinyl Disc */}
            <div
              className={`w-36 h-36 sm:w-44 sm:h-44 rounded-full vinyl-grooves relative flex items-center justify-center overflow-hidden transition-all duration-300 ${
                isPlayingB ? 'vinyl-rotating ring-2 ring-[#a855f7] shadow-xl shadow-[#a855f7]/25' : 'vinyl-paused'
              }`}
            >
              {/* Vinyl Sheen Overlay */}
              <div className="absolute inset-0 vinyl-sheen-overlay rounded-full pointer-events-none" />

              {/* Center Vinyl Label */}
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 border-[#a855f7] shadow-inner bg-black flex items-center justify-center">
                <Image
                  src={trackB.artworkUrl || `https://img.youtube.com/vi/${trackB.id}/hqdefault.jpg`}
                  alt={trackB.title}
                  fill
                  className="object-cover opacity-85"
                  unoptimized
                />
                <div className="absolute inset-0 bg-[#a855f7]/20 mix-blend-overlay" />

                {/* Center Spindle Hole */}
                <div className="relative z-10 w-3.5 h-3.5 rounded-full bg-[#111111] border border-white/60 shadow-sm" />
              </div>
            </div>
          </div>

          {/* Deck Track Info */}
          <div className="w-full text-center mt-1 px-1">
            <p className="text-xs font-bold text-white truncate" title={trackB.title}>
              {trackB.title}
            </p>
            <p className="text-[10px] text-[#8e98a8] truncate">{trackB.artist}</p>
          </div>

          {/* Scrubbing Seek Slider */}
          <div className="w-full mt-2.5 space-y-1">
            <input
              type="range"
              min="0"
              max={durationB || 100}
              step="0.5"
              value={currentTimeB}
              onChange={(e) => seekB(parseFloat(e.target.value))}
              className="w-full spotify-slider"
              title="Seek Position"
            />
            <div className="flex items-center justify-between text-[10px] font-mono text-[#8e98a8]">
              <span>{formatTime(currentTimeB)}</span>
              <span>{formatTime(durationB)}</span>
            </div>
          </div>

          {/* Playback Controls (-5s, Play/Pause, +5s) */}
          <div className="flex items-center justify-center gap-3 mt-2.5">
            <button
              type="button"
              onClick={rewindB}
              className="w-8 h-8 rounded-full bg-[#1b202e] hover:bg-[#252c40] text-[#a0aab8] hover:text-white text-xs font-bold flex items-center justify-center transition-colors cursor-pointer border border-[#283044]"
              title="Rewind 5 seconds"
            >
              ⏪
            </button>

            <button
              type="button"
              onClick={togglePlayB}
              disabled={isLoadingB}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg ${
                isPlayingB
                  ? 'bg-[#a855f7] text-white scale-105 shadow-[#a855f7]/40'
                  : 'bg-white hover:bg-[#a855f7] text-black hover:text-white'
              }`}
              title={isPlayingB ? 'Pause Deck B' : 'Play Deck B'}
            >
              {isLoadingB ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : isPlayingB ? (
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
              ) : (
                <svg className="w-4 h-4 fill-current ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              )}
            </button>

            <button
              type="button"
              onClick={forwardB}
              className="w-8 h-8 rounded-full bg-[#1b202e] hover:bg-[#252c40] text-[#a0aab8] hover:text-white text-xs font-bold flex items-center justify-center transition-colors cursor-pointer border border-[#283044]"
              title="Forward 5 seconds"
            >
              ⏩
            </button>
          </div>

          {/* Deck B Volume Slider */}
          <div className="w-full flex items-center gap-2 mt-3 pt-2 border-t border-[#1b202e]">
            <span className="text-[10px] text-[#8e98a8] font-bold">Vol</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volumeB}
              onChange={(e) => setVolumeB(parseFloat(e.target.value))}
              className="flex-1 spotify-slider"
              title={`Deck B Volume: ${Math.round(volumeB * 100)}%`}
            />
            <span className="text-[10px] text-[#8e98a8] font-mono w-7 text-right">
              {Math.round(volumeB * 100)}%
            </span>
          </div>

          {errorB && <p className="text-[10px] text-rose-400 mt-1">{errorB}</p>}
        </div>
      </div>

      {/* ========================================================= */}
      {/* MIXING CONSOLE / DJ CROSSFADER */}
      {/* ========================================================= */}
      <div className="mt-4 pt-3.5 border-t border-[#232938] bg-[#0b0c12] p-3.5 rounded-xl border border-[#1b202e]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase text-[#1d90f5]">◄ Deck A</span>
            <span className="text-[10px] text-[#6e7787]">•</span>
            <span className="text-[11px] font-bold text-[#a0aab8]">DJ Crossfader</span>
            <span className="text-[10px] text-[#6e7787]">•</span>
            <span className="text-[11px] font-black uppercase text-[#c084fc]">Deck B ►</span>
          </div>

          <button
            type="button"
            onClick={resetCrossfader}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
              crossfader === 0
                ? 'bg-[#1d90f5]/20 text-[#1d90f5] border border-[#1d90f5]/30'
                : 'bg-[#1f2536] hover:bg-[#2b334a] text-[#8e98a8] hover:text-white'
            }`}
            title="Reset Crossfader to Center"
          >
            RESET CENTER
          </button>
        </div>

        {/* Crossfader Track with Center Notch */}
        <div className="relative flex items-center py-1">
          <input
            type="range"
            min="-1"
            max="1"
            step="0.02"
            value={crossfader}
            onChange={(e) => setCrossfader(parseFloat(e.target.value))}
            className="w-full crossfader-slider"
            title={`Crossfader: ${crossfader < 0 ? `Deck A +${Math.round(-crossfader * 100)}%` : crossfader > 0 ? `Deck B +${Math.round(crossfader * 100)}%` : 'Center 50/50'}`}
          />
          {/* Visual Center Indicator Dot */}
          <div className="absolute left-1/2 -translate-x-1/2 w-1.5 h-3 bg-[#444444] rounded-full pointer-events-none" />
        </div>

        <div className="flex items-center justify-between text-[10px] text-[#6e7787] mt-1 font-mono">
          <span className={crossfader < 0 ? 'text-[#1d90f5] font-bold' : ''}>
            {crossfader <= 0 ? '100%' : `${Math.round(Math.max(0, 1 - crossfader) * 100)}%`}
          </span>
          <span className="text-[9px] uppercase tracking-wider text-[#8e98a8]">
            {crossfader === 0 ? 'Equal Blend' : crossfader < 0 ? 'Favoring Deck A' : 'Favoring Deck B'}
          </span>
          <span className={crossfader > 0 ? 'text-[#c084fc] font-bold' : ''}>
            {crossfader >= 0 ? '100%' : `${Math.round(Math.max(0, 1 + crossfader) * 100)}%`}
          </span>
        </div>
      </div>

      {/* Song Selection Popover */}
      {selectorDeck && (
        <SongSelectorModal
          isOpen={true}
          deckName={selectorDeck}
          onClose={() => setSelectorDeck(null)}
          onSelectSong={(song) => {
            if (selectorDeck === 'Deck A') {
              changeTrackA(song);
            } else {
              changeTrackB(song);
            }
          }}
          savedPlaylists={savedPlaylists}
        />
      )}
    </div>
  );
}
