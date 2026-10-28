'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useMemo } from 'react';
import { AmbientSoundConfig, AmbientSoundId, AmbientSoundState } from '@/types/audio';
import { AmbientSoundEngine } from '@/lib/ambient-engine';

export const AMBIENT_SOUNDS: AmbientSoundConfig[] = [
  {
    id: 'spooky',
    name: 'Spooky Vibes',
    icon: '🎃',
    description: 'Haunted Halloween lo-fi soundscape',
    defaultVolume: 0.65,
    youtubeId: 'PtOblpbdddA',
  },
  {
    id: 'rain',
    name: 'Gentle Rain',
    icon: '🌧️',
    description: 'Calming rhythmic rainfall',
    defaultVolume: 0.6,
    youtubeId: 'GGUwmUCbfYo',
  },
  {
    id: 'thunder',
    name: 'Rolling Thunder',
    icon: '⚡',
    description: 'Subtle rolling thunderclaps & lightning',
    defaultVolume: 0.5,
    youtubeId: 'xK_m77VZYnc',
  },
  {
    id: 'wind',
    name: 'Chill Wind',
    icon: '🍃',
    description: 'Soft howling mountain breeze',
    defaultVolume: 0.45,
    youtubeId: '5jlUVr6gkos',
  },
  {
    id: 'drums',
    name: 'Lo-Fi Drums',
    icon: '🥁',
    description: 'Mellow boom-bap acoustic beats',
    defaultVolume: 0.55,
    youtubeId: 'xUnt2ukgj48',
  },
  {
    id: 'fireplace',
    name: 'Fireplace',
    icon: '🔥',
    description: 'Warm hearth crackling embers',
    defaultVolume: 0.45,
    youtubeId: 'RjZvN8b_Yuk',
  },
  {
    id: 'birds',
    name: 'Forest Birds',
    icon: '🐦',
    description: 'Gentle woodland morning chirps',
    defaultVolume: 0.4,
    youtubeId: 'Qm846KdZN_c',
  },
];

interface AmbientContextType {
  ambientSounds: AmbientSoundConfig[];
  soundStates: Record<AmbientSoundId, AmbientSoundState>;
  masterVolume: number;
  isMasterMuted: boolean;
  activeCount: number;
  activePreset: string | null;
  toggleSound: (id: AmbientSoundId) => void;
  setSoundVolume: (id: AmbientSoundId, volume: number) => void;
  toggleSoundMute: (id: AmbientSoundId) => void;
  setMasterVolume: (volume: number) => void;
  toggleMasterMute: () => void;
  applyPreset: (preset: 'spookyNight' | 'rainyNight' | 'forestCanopy' | 'muteAll') => void;
}

const AmbientContext = createContext<AmbientContextType | null>(null);

export function AmbientProvider({ children }: { children: React.ReactNode }) {
  const engineRef = useRef<AmbientSoundEngine | null>(null);
  const audioNodesRef = useRef<Map<AmbientSoundId, HTMLAudioElement>>(new Map());

  const [masterVolume, setMasterVolumeState] = useState<number>(0.75);
  const [isMasterMuted, setIsMasterMuted] = useState<boolean>(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);

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

  // Initialize procedural fallback audio engine once
  useEffect(() => {
    engineRef.current = new AmbientSoundEngine();
    return () => {
      // Cleanup all audio streams on unmount
      audioNodesRef.current.forEach((audio) => {
        try {
          audio.pause();
          audio.src = '';
        } catch {}
      });
      audioNodesRef.current.clear();

      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, []);

  // Helper to get or lazily instantiate an HTMLAudioElement with YouTube audio stream
  const getOrCreateAudio = (soundConfig: AmbientSoundConfig): HTMLAudioElement => {
    let audio = audioNodesRef.current.get(soundConfig.id);
    if (!audio) {
      audio = new Audio();
      audio.loop = true;
      audio.preload = 'auto';
      if (soundConfig.youtubeId) {
        audio.src = `/api/youtube/stream?v=${soundConfig.youtubeId}`;
      }
      audioNodesRef.current.set(soundConfig.id, audio);
    }
    return audio;
  };

  const setMasterVolume = (newVol: number) => {
    setMasterVolumeState(newVol);

    // Sync master volume to all playing HTML audio elements
    audioNodesRef.current.forEach((audio, id) => {
      const state = soundStates[id];
      if (state && state.isPlaying) {
        const effVol = (state.isMuted ? 0 : state.volume) * (isMasterMuted ? 0 : newVol);
        audio.volume = Math.max(0, Math.min(1, effVol));
      }
    });

    if (!isMasterMuted && engineRef.current) {
      engineRef.current.setMasterVolume(newVol);
    }
  };

  const toggleMasterMute = () => {
    const nextMuted = !isMasterMuted;
    setIsMasterMuted(nextMuted);

    audioNodesRef.current.forEach((audio, id) => {
      const state = soundStates[id];
      if (state && state.isPlaying) {
        const effVol = (state.isMuted ? 0 : state.volume) * (nextMuted ? 0 : masterVolume);
        audio.volume = Math.max(0, Math.min(1, effVol));
      }
    });

    if (engineRef.current) {
      engineRef.current.setMasterVolume(nextMuted ? 0 : masterVolume);
    }
  };

  const toggleSound = (id: AmbientSoundId) => {
    const current = soundStates[id] || { volume: 0.5, isMuted: false, isPlaying: false };
    const willPlay = !current.isPlaying;

    setSoundStates((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        isPlaying: willPlay,
      },
    }));
    setActivePreset(null);

    const cfg = AMBIENT_SOUNDS.find((s) => s.id === id);
    const effVol = (current.isMuted ? 0 : current.volume) * (isMasterMuted ? 0 : masterVolume);

    if (willPlay) {
      if (cfg?.youtubeId) {
        const audio = getOrCreateAudio(cfg);
        audio.volume = Math.max(0, Math.min(1, effVol));
        audio.play().catch((err) => {
          console.warn(`Direct audio stream fallback for ${id}:`, err);
          if (engineRef.current) {
            engineRef.current.startSound(id);
            engineRef.current.setChannelVolume(id, effVol);
          }
        });
      } else if (engineRef.current) {
        engineRef.current.startSound(id);
        engineRef.current.setChannelVolume(id, effVol);
      }
    } else {
      const audio = audioNodesRef.current.get(id);
      if (audio) {
        audio.pause();
      }
      if (engineRef.current) {
        engineRef.current.stopSound(id);
      }
    }
  };

  const setSoundVolume = (id: AmbientSoundId, vol: number) => {
    setSoundStates((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        volume: vol,
        isMuted: false,
      },
    }));

    const effVol = vol * (isMasterMuted ? 0 : masterVolume);
    const audio = audioNodesRef.current.get(id);
    if (audio) {
      audio.volume = Math.max(0, Math.min(1, effVol));
    }

    if (engineRef.current && soundStates[id]?.isPlaying) {
      engineRef.current.setChannelVolume(id, effVol);
    }
  };

  const toggleSoundMute = (id: AmbientSoundId) => {
    const current = soundStates[id];
    if (!current) return;
    const nextMuted = !current.isMuted;

    setSoundStates((prev) => ({
      ...prev,
      [id]: { ...prev[id], isMuted: nextMuted },
    }));

    const effVol = (nextMuted ? 0 : current.volume) * (isMasterMuted ? 0 : masterVolume);
    const audio = audioNodesRef.current.get(id);
    if (audio) {
      audio.volume = Math.max(0, Math.min(1, effVol));
    }

    if (engineRef.current && current.isPlaying) {
      engineRef.current.setChannelVolume(id, effVol);
    }
  };

  const applyPreset = (preset: 'spookyNight' | 'rainyNight' | 'forestCanopy' | 'muteAll') => {
    if (preset === 'muteAll') {
      setActivePreset(null);
      audioNodesRef.current.forEach((audio) => audio.pause());
      if (engineRef.current) engineRef.current.stopAll();

      setSoundStates((prev) => {
        const next = { ...prev };
        for (const s of AMBIENT_SOUNDS) {
          next[s.id] = { ...next[s.id], isPlaying: false };
        }
        return next;
      });
      return;
    }

    setActivePreset(preset);
    const config: Partial<Record<AmbientSoundId, { play: boolean; vol: number }>> =
      preset === 'spookyNight'
        ? {
            spooky: { play: true, vol: 0.75 },
            wind: { play: true, vol: 0.5 },
            thunder: { play: true, vol: 0.4 },
            rain: { play: false, vol: 0 },
            drums: { play: false, vol: 0 },
            fireplace: { play: false, vol: 0 },
            birds: { play: false, vol: 0 },
          }
        : preset === 'rainyNight'
        ? {
            rain: { play: true, vol: 0.7 },
            thunder: { play: true, vol: 0.5 },
            wind: { play: true, vol: 0.35 },
            spooky: { play: false, vol: 0 },
            drums: { play: false, vol: 0 },
            fireplace: { play: false, vol: 0 },
            birds: { play: false, vol: 0 },
          }
        : {
            birds: { play: true, vol: 0.65 },
            wind: { play: true, vol: 0.35 },
            fireplace: { play: true, vol: 0.4 },
            rain: { play: false, vol: 0 },
            thunder: { play: false, vol: 0 },
            spooky: { play: false, vol: 0 },
            drums: { play: false, vol: 0 },
          };

    AMBIENT_SOUNDS.forEach((s) => {
      const target = config[s.id];
      if (!target) return;

      const effVol = target.vol * (isMasterMuted ? 0 : masterVolume);

      if (target.play) {
        if (s.youtubeId) {
          const audio = getOrCreateAudio(s);
          audio.volume = Math.max(0, Math.min(1, effVol));
          audio.play().catch(() => {
            engineRef.current?.startSound(s.id);
            engineRef.current?.setChannelVolume(s.id, effVol);
          });
        } else if (engineRef.current) {
          engineRef.current.startSound(s.id);
          engineRef.current.setChannelVolume(s.id, effVol);
        }
      } else {
        const audio = audioNodesRef.current.get(s.id);
        if (audio) audio.pause();
        if (engineRef.current) engineRef.current.stopSound(s.id);
      }
    });

    setSoundStates((prev) => {
      const next = { ...prev };
      for (const s of AMBIENT_SOUNDS) {
        const target = config[s.id];
        if (target) {
          next[s.id] = {
            ...next[s.id],
            volume: target.vol > 0 ? target.vol : next[s.id].volume,
            isPlaying: target.play,
            isMuted: false,
          };
        }
      }
      return next;
    });
  };

  const activeCount = useMemo(() => {
    return AMBIENT_SOUNDS.filter((s) => soundStates[s.id]?.isPlaying).length;
  }, [soundStates]);

  const value = useMemo(
    () => ({
      ambientSounds: AMBIENT_SOUNDS,
      soundStates,
      masterVolume,
      isMasterMuted,
      activeCount,
      activePreset,
      toggleSound,
      setSoundVolume,
      toggleSoundMute,
      setMasterVolume,
      toggleMasterMute,
      applyPreset,
    }),
    [soundStates, masterVolume, isMasterMuted, activeCount, activePreset]
  );

  return <AmbientContext.Provider value={value}>{children}</AmbientContext.Provider>;
}

export function useAmbient() {
  const context = useContext(AmbientContext);
  if (!context) {
    throw new Error('useAmbient must be used within an AmbientProvider');
  }
  return context;
}
