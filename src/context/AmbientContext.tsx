'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useMemo } from 'react';
import { AmbientSoundConfig, AmbientSoundId, AmbientSoundState } from '@/types/audio';
import { AmbientSoundEngine } from '@/lib/ambient-engine';

export const AMBIENT_SOUNDS: AmbientSoundConfig[] = [
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
  applyPreset: (preset: 'rainyNight' | 'forestCanopy' | 'muteAll') => void;
}

const AmbientContext = createContext<AmbientContextType | null>(null);

export function AmbientProvider({ children }: { children: React.ReactNode }) {
  const engineRef = useRef<AmbientSoundEngine | null>(null);
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

  useEffect(() => {
    engineRef.current = new AmbientSoundEngine();
    return () => {
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, []);

  const setMasterVolume = (newVol: number) => {
    setMasterVolumeState(newVol);
    if (!isMasterMuted && engineRef.current) {
      engineRef.current.setMasterVolume(newVol);
    }
  };

  const toggleMasterMute = () => {
    const nextMuted = !isMasterMuted;
    setIsMasterMuted(nextMuted);
    if (engineRef.current) {
      engineRef.current.setMasterVolume(nextMuted ? 0 : masterVolume);
    }
  };

  const toggleSound = (id: AmbientSoundId) => {
    const current = soundStates[id];
    const willPlay = !current.isPlaying;

    setSoundStates((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        isPlaying: willPlay,
      },
    }));
    setActivePreset(null);

    if (engineRef.current) {
      if (willPlay) {
        engineRef.current.startSound(id);
        engineRef.current.setChannelVolume(id, current.isMuted ? 0 : current.volume);
      } else {
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

    if (engineRef.current && soundStates[id].isPlaying) {
      engineRef.current.setChannelVolume(id, vol);
    }
  };

  const toggleSoundMute = (id: AmbientSoundId) => {
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

  const applyPreset = (preset: 'rainyNight' | 'forestCanopy' | 'muteAll') => {
    if (preset === 'muteAll') {
      setActivePreset(null);
      AMBIENT_SOUNDS.forEach((s) => {
        if (soundStates[s.id].isPlaying) {
          if (engineRef.current) engineRef.current.stopSound(s.id);
        }
      });
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

      if (engineRef.current) {
        if (target.play) {
          engineRef.current.startSound(s.id);
          engineRef.current.setChannelVolume(s.id, target.vol);
        } else {
          engineRef.current.stopSound(s.id);
        }
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
