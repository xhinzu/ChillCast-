'use client';

import React, { useEffect, useRef, useState } from 'react';
import { LocalTrack } from '@/types/audio';

const DEFAULT_TRACK: LocalTrack = {
  id: 'sample-chill-1',
  title: 'Midnight Rain Chords',
  artist: 'ChillCast Lo-Fi Sessions',
  album: 'Ambient Studies Vol. 1',
  duration: 24,
  src: '/audio/sample-chill.wav',
  coverUrl: '',
};

export default function LocalAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [currentTrack, setCurrentTrack] = useState<LocalTrack>(DEFAULT_TRACK);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(DEFAULT_TRACK.duration);
  const [volume, setVolume] = useState<number>(0.8);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isLooping, setIsLooping] = useState<boolean>(true);

  // Initialize audio volume & listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = volume;
    audio.loop = isLooping;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => {
      if (!isNaN(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };
    const handleEnded = () => {
      if (!isLooping) setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [isLooping, volume]);

  const togglePlay = React.useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch (err) {
        console.error('Audio play prevented:', err);
      }
    }
  }, [isPlaying]);

  // Spacebar toggle play/pause listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay]);

  const handleSeek = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = seconds;
    setCurrentTime(seconds);
  };

  const handleVolumeChange = (newVol: number) => {
    const audio = audioRef.current;
    setVolume(newVol);
    if (audio) {
      audio.volume = isMuted ? 0 : newVol;
    }
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (audio) {
      audio.volume = nextMuted ? 0 : volume;
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileUrl = URL.createObjectURL(file);
    const customTrack: LocalTrack = {
      id: `custom-${Date.now()}`,
      title: file.name.replace(/\.[^/.]+$/, ''),
      artist: 'Local Audio File',
      album: 'Custom Upload',
      duration: 0,
      src: fileUrl,
      coverUrl: '',
    };

    setCurrentTrack(customTrack);
    setIsPlaying(false);
    setCurrentTime(0);

    if (audioRef.current) {
      audioRef.current.src = fileUrl;
      audioRef.current.load();
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="w-full backdrop-blur-2xl bg-white/[0.04] border border-white/[0.08] rounded-3xl p-6 sm:p-7 shadow-2xl shadow-black/40 flex flex-col md:flex-row items-center gap-6">
      {/* Hidden native audio element */}
      <audio ref={audioRef} src={currentTrack.src} preload="metadata" />

      {/* Album Art / Vinyl Visualizer */}
      <div className="relative group w-32 h-32 sm:w-36 sm:h-36 shrink-0 flex items-center justify-center">
        {/* Glow effect */}
        <div
          className={`absolute inset-0 rounded-2xl bg-gradient-to-tr from-indigo-500/30 to-purple-500/30 blur-xl transition-opacity duration-700 ${
            isPlaying ? 'opacity-100' : 'opacity-30'
          }`}
        />

        {/* Vinyl disk record */}
        <div
          className={`relative w-full h-full rounded-2xl bg-gradient-to-br from-zinc-800 via-zinc-900 to-black border border-white/10 p-3 shadow-2xl flex items-center justify-center overflow-hidden ${
            isPlaying ? 'animate-[spin_12s_linear_infinite]' : ''
          }`}
        >
          {/* Concentric grooves */}
          <div className="w-24 h-24 rounded-full border border-white/5 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center bg-indigo-900/40">
              <div className="w-6 h-6 rounded-full bg-slate-900 border border-white/20 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-indigo-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Center play status overlay */}
        <button
          type="button"
          onClick={togglePlay}
          className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 text-white flex items-center justify-center transition-transform hover:scale-105 active:scale-95 shadow-xl cursor-pointer"
        >
          <span className="text-xl pl-0.5">{isPlaying ? '⏸' : '▶'}</span>
        </button>
      </div>

      {/* Track Info & Interactive Player Controls */}
      <div className="flex-1 w-full flex flex-col justify-between gap-4">
        {/* Track Title and File Picker */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Local Audio
              </span>
              <span className="text-xs text-slate-500">•</span>
              <span className="text-xs text-slate-400">{currentTrack.album}</span>
            </div>
            <h3 className="text-lg font-bold text-white mt-1 line-clamp-1">{currentTrack.title}</h3>
            <p className="text-xs text-slate-400">{currentTrack.artist}</p>
          </div>

          {/* Custom File Upload Button */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs text-slate-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
              title="Upload your own local music track"
            >
              <span>📁</span> Choose Audio
            </button>
          </div>
        </div>

        {/* Scrubbable Timeline Progress Bar */}
        <div className="space-y-1.5">
          <div className="relative flex items-center group">
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.1"
              value={currentTime}
              onChange={(e) => handleSeek(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-400 group-hover:h-2 transition-all"
            />
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Playback Controls Toolbar */}
        <div className="flex items-center justify-between gap-4 pt-1">
          {/* Main Actions: Loop, Rewind, Play/Pause, Forward */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setIsLooping(!isLooping)}
              className={`p-2 rounded-xl text-sm transition-colors cursor-pointer ${
                isLooping
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-white bg-white/[0.03]'
              }`}
              title={isLooping ? 'Looping enabled' : 'Looping disabled'}
            >
              🔁
            </button>
            <button
              type="button"
              onClick={() => handleSeek(Math.max(0, currentTime - 5))}
              className="p-2 rounded-xl text-sm text-slate-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] transition-colors cursor-pointer"
              title="Rewind 5s"
            >
              ⏪
            </button>
            <button
              type="button"
              onClick={togglePlay}
              className="px-4 py-2 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white font-medium text-xs flex items-center gap-2 transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-indigo-500/25 cursor-pointer"
            >
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
              <span>{isPlaying ? '⏸' : '▶'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleSeek(Math.min(duration, currentTime + 5))}
              className="p-2 rounded-xl text-sm text-slate-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] transition-colors cursor-pointer"
              title="Forward 5s"
            >
              ⏩
            </button>
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMute}
              className="text-slate-400 hover:text-white text-sm transition-colors cursor-pointer"
              title={isMuted ? 'Unmute track' : 'Mute track'}
            >
              {isMuted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-16 sm:w-20 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-400"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
