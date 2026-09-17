'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AmbientSoundConfig, AmbientSoundId, AmbientSoundState } from '@/types/audio';
import { AmbientSoundEngine } from '@/lib/ambient-engine';

const AMBIENT_SOUNDS: AmbientSoundConfig[] = [
  {
    id: 'rain',
    name: 'Gentle Rain',
    icon: '🌧️',
    description: 'Calming rhythmic rainfall',
    defaultVolume: 0.6,
  },
  {
    id: 'wind',
    name: 'Chill Wind',
    icon: '🍃',
    description: 'Soft howling mountain breeze',
    defaultVolume: 0.45,
  },
  {
    id: 'birds',
    name: 'Forest Birds',
    icon: '🐦',
    description: 'Gentle woodland chirps',
    defaultVolume: 0.4,
  },
  {
    id: 'crickets',
    name: 'Night Crickets',
    icon: '🦗',
    description: 'Warm twilight field ambience',
    defaultVolume: 0.35,
  },
  {
    id: 'thunder',
    name: 'Distant Thunder',
    icon: '⚡',
    description: 'Subtle rolling thunderclaps',
    defaultVolume: 0.5,
  },
];

export default function AmbientSoundMixer() {
  const engineRef = useRef<AmbientSoundEngine | null>(null);
  const [masterVolume, setMasterVolume] = useState<number>(0.75);
  const [isMasterMuted, setIsMasterMuted] = useState<boolean>(false);

  const [soundStates, setSoundStates] = useState<Record<AmbientSoundId, AmbientSoundState>>(() => {
    const initial: Partial<Record<AmbientSoundId, AmbientSoundState>> = {};
    for (const s of AMBIENT_SOUNDS) {
      initial[s.id] = {
        volume: s.defaultVolume,
        isMuted: false,
        isPlaying: false,
      };
    }
    return initial as Record<AmbientSoundId, AmbientSoundState>;
  });

  // Initialize engine once on mount
  useEffect(() => {
    engineRef.current = new AmbientSoundEngine();
    return () => {
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, []);

  // Update master volume
  const handleMasterVolumeChange = (newVol: number) => {
    setMasterVolume(newVol);
    if (!isMasterMuted && engineRef.current) {
      engineRef.current.setMasterVolume(newVol);
    }
  };

  // Toggle master mute
  const toggleMasterMute = () => {
    const nextMuted = !isMasterMuted;
    setIsMasterMuted(nextMuted);
    if (engineRef.current) {
      engineRef.current.setMasterVolume(nextMuted ? 0 : masterVolume);
    }
  };

  // Toggle individual sound playback
  const toggleSound = (id: AmbientSoundId) => {
    const current = soundStates[id];
    const willPlay = !current.isPlaying;

    setSoundStates((prev) => ({
      ...prev,
      [id]: { ...prev[id], isPlaying: willPlay },
    }));

    if (engineRef.current) {
      if (willPlay) {
        engineRef.current.startSound(id);
        const effVol = current.isMuted ? 0 : current.volume;
        engineRef.current.setChannelVolume(id, effVol);
      } else {
        engineRef.current.stopSound(id);
      }
    }
  };

  // Individual volume slider
  const handleChannelVolumeChange = (id: AmbientSoundId, newVol: number) => {
    setSoundStates((prev) => ({
      ...prev,
      [id]: { ...prev[id], volume: newVol },
    }));

    if (engineRef.current && soundStates[id].isPlaying && !soundStates[id].isMuted) {
      engineRef.current.setChannelVolume(id, newVol);
    }
  };

  // Toggle individual mute
  const toggleChannelMute = (id: AmbientSoundId, e: React.MouseEvent) => {
    e.stopPropagation();
    const current = soundStates[id];
    const nextMuted = !current.isMuted;

    setSoundStates((prev) => ({
      ...prev,
      [id]: { ...prev[id], isMuted: nextMuted },
    }));

    if (engineRef.current && current.isPlaying) {
      engineRef.current.setChannelVolume(id, nextMuted ? 0 : current.volume);
    }
  };

  // Quick Presets
  const applyPreset = (preset: 'rainyNight' | 'forestCamp' | 'muteAll') => {
    if (preset === 'muteAll') {
      AMBIENT_SOUNDS.forEach((s) => {
        if (soundStates[s.id].isPlaying) {
          toggleSound(s.id);
        }
      });
      return;
    }

    const config: Partial<Record<AmbientSoundId, { play: boolean; vol: number }>> =
      preset === 'rainyNight'
        ? {
            rain: { play: true, vol: 0.7 },
            thunder: { play: true, vol: 0.5 },
            wind: { play: true, vol: 0.35 },
            birds: { play: false, vol: 0 },
            crickets: { play: false, vol: 0 },
          }
        : {
            birds: { play: true, vol: 0.65 },
            wind: { play: true, vol: 0.4 },
            crickets: { play: true, vol: 0.3 },
            rain: { play: false, vol: 0 },
            thunder: { play: false, vol: 0 },
          };

    AMBIENT_SOUNDS.forEach((s) => {
      const target = config[s.id];
      if (!target) return;

      setSoundStates((prev) => ({
        ...prev,
        [s.id]: {
          ...prev[s.id],
          volume: target.vol > 0 ? target.vol : prev[s.id].volume,
          isPlaying: target.play,
          isMuted: false,
        },
      }));

      if (engineRef.current) {
        if (target.play) {
          engineRef.current.startSound(s.id);
          engineRef.current.setChannelVolume(s.id, target.vol);
        } else {
          engineRef.current.stopSound(s.id);
        }
      }
    });
  };

  const activeCount = AMBIENT_SOUNDS.filter((s) => soundStates[s.id]?.isPlaying).length;

  return (
    <div className="w-full backdrop-blur-md bg-[#0c101b]/80 border border-white/[0.08] rounded-3xl p-6 sm:p-7 shadow-2xl shadow-black/50 flex flex-col gap-6 transform-gpu contain-paint">
      {/* Header & Master Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.07] pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xl">
            🎛️
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Ambient Soundscape Mixer
              {activeCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {activeCount} active
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400">Layer procedural atmospheric textures with your music</p>
          </div>
        </div>

        {/* Master Ambient Slider & Mute */}
        <div className="flex items-center gap-3 bg-black/20 px-3.5 py-2 rounded-2xl border border-white/[0.05]">
          <button
            type="button"
            onClick={toggleMasterMute}
            className="text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            title={isMasterMuted ? 'Unmute Ambient' : 'Mute Ambient'}
          >
            {isMasterMuted || masterVolume === 0 ? '🔇' : '🔊'}
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Master</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMasterMuted ? 0 : masterVolume}
              onChange={(e) => handleMasterVolumeChange(parseFloat(e.target.value))}
              className="w-24 sm:w-28 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-400"
            />
            <span className="text-[11px] font-mono text-slate-400 w-8 text-right">
              {Math.round((isMasterMuted ? 0 : masterVolume) * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Preset Buttons */}
      <div className="flex items-center gap-2 flex-wrap text-xs">
        <span className="text-slate-400 text-xs mr-1 font-medium">Quick Presets:</span>
        <button
          type="button"
          onClick={() => applyPreset('rainyNight')}
          className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-indigo-500/20 border border-white/[0.08] hover:border-indigo-500/30 text-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <span>🌧️</span> Rainy Night
        </button>
        <button
          type="button"
          onClick={() => applyPreset('forestCamp')}
          className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-emerald-500/20 border border-white/[0.08] hover:border-emerald-500/30 text-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <span>🏕️</span> Forest Canopy
        </button>
        <button
          type="button"
          onClick={() => applyPreset('muteAll')}
          className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-rose-500/20 border border-white/[0.08] hover:border-rose-500/30 text-slate-300 transition-all flex items-center gap-1.5 cursor-pointer ml-auto"
        >
          <span>⏹️</span> Stop All
        </button>
      </div>

      {/* 5 Ambient Channels Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {AMBIENT_SOUNDS.map((sound) => {
          const state = soundStates[sound.id];
          const isPlaying = state?.isPlaying ?? false;
          const isMuted = state?.isMuted ?? false;
          const volume = state?.volume ?? 0.5;

          return (
            <div
              key={sound.id}
              onClick={() => toggleSound(sound.id)}
              className={`group relative rounded-2xl p-4 transition-colors duration-150 border cursor-pointer select-none flex flex-col justify-between min-h-[170px] ${
                isPlaying
                  ? 'bg-indigo-500/10 border-indigo-500/40 shadow-lg shadow-indigo-500/10'
                  : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.12]'
              }`}
            >
              {/* Top row: Icon & Status Indicator */}
              <div className="flex items-start justify-between">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl transition-transform duration-300 ${
                    isPlaying ? 'scale-110 bg-indigo-500/20 shadow-inner' : 'bg-white/[0.04] group-hover:scale-105'
                  }`}
                >
                  {sound.icon}
                </div>

                <div className="flex items-center gap-1.5">
                  {isPlaying && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Active" />
                  )}
                  <button
                    type="button"
                    onClick={(e) => toggleChannelMute(sound.id, e)}
                    className={`p-1.5 rounded-lg text-xs transition-colors ${
                      isMuted
                        ? 'text-rose-400 bg-rose-500/15'
                        : isPlaying
                        ? 'text-slate-300 hover:text-white bg-white/5'
                        : 'opacity-0 group-hover:opacity-100 text-slate-400'
                    }`}
                    title={isMuted ? 'Unmute' : 'Mute channel'}
                  >
                    {isMuted ? '🔇' : '🔉'}
                  </button>
                </div>
              </div>

              {/* Title & Description */}
              <div className="my-2">
                <div className="font-semibold text-sm text-slate-100 group-hover:text-white flex items-center justify-between">
                  <span>{sound.name}</span>
                </div>
                <div className="text-[11px] text-slate-400 line-clamp-1">{sound.description}</div>
              </div>

              {/* Volume Slider */}
              <div
                className="mt-auto pt-2 border-t border-white/[0.06] flex items-center gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMuted ? 0 : volume}
                  disabled={!isPlaying}
                  onChange={(e) => handleChannelVolumeChange(sound.id, parseFloat(e.target.value))}
                  className={`w-full h-1 rounded-lg appearance-none cursor-pointer transition-opacity ${
                    isPlaying
                      ? 'bg-indigo-950 accent-indigo-400 opacity-100'
                      : 'bg-white/5 opacity-40 cursor-not-allowed'
                  }`}
                />
                <span className="text-[10px] font-mono text-slate-400 w-7 text-right">
                  {isPlaying ? (isMuted ? '0%' : `${Math.round(volume * 100)}%`) : 'Off'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
