'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { TrackInfo } from '@/types/playback';
import { usePlayback } from '@/context/PlaybackContext';
import { useRoom } from '@/context/RoomContext';
import { useSettings } from '@/lib/settings/useSettings';
import type { RadioPresetSlot } from '@/lib/settings/settings-store';
import {
  AM_MAX,
  AM_MIN,
  FM_MAX,
  FM_MIN,
  generateStations,
  type RadioBand,
  type RadioStation,
} from '@/lib/radio/stations';
import {
  clampFrequency,
  evaluateReception,
  findMagneticSnapStation,
  scanStation,
  type ReceptionState,
} from '@/lib/radio/reception';
import {
  clearRadioPoolCache,
  ensureStationPool,
  getCachedStationPool,
  prefetchNeighborStations,
  prewarmBandStations,
} from '@/lib/radio/pool-manager';
import { computeFallbackJoinOffset, computeLiveBroadcast } from '@/lib/radio/schedule';
import { getRadioAudio } from '@/lib/radio/radio-audio';
import { pickRjScript, type RjScriptCategory } from '@/lib/radio/rj-scripts';
import { planRjTrigger } from '@/lib/radio/rj-planner';
import { playRandomCustomRjClip, speakRjLine, stopRjSpeech } from '@/lib/radio/rj-voice';
import { listCustomRjClips } from '@/lib/radio/custom-clips';

export interface RadioContextValue {
  isRadioActive: boolean;
  powerOn: boolean;
  band: RadioBand;
  frequency: number;
  stations: RadioStation[];
  reception: ReceptionState;
  activeStation: RadioStation | null;
  upcomingSchedule: { nextTrack: TrackInfo; nextNextTrack: TrackInfo } | null;
  weakSignal: boolean;
  isScanning: boolean;
  antennaLength: number; // 0..1
  antennaAngleDeg: number; // -45..45
  presets: RadioPresetSlot[];
  rjCaption: string | null;
  isRjSpeaking: boolean;
  lastAnnouncement: string;

  setRadioActive: (active: boolean) => void;
  togglePower: () => void;
  setPowerOn: (on: boolean) => void;
  setBand: (band: RadioBand) => void;
  tuneToFrequency: (freq: number, options?: { snap?: boolean; silent?: boolean }) => void;
  tuneToStation: (station: RadioStation) => void;
  scanNext: (direction: 1 | -1) => void;
  savePreset: (slot: number, station?: RadioStation) => void;
  recallPreset: (slot: number) => void;
  rescanStations: () => void;
  setAntenna: (length: number, angleDeg: number) => void;
  setRjSpeechState: (speaking: boolean, caption: string | null) => void;
  clearAllRadioData: () => void;
}

const RadioContext = createContext<RadioContextValue | null>(null);

export function RadioProvider({ children }: { children: React.ReactNode }) {
  const { settings, updateSettings } = useSettings();
  const playback = usePlayback();
  const roomContext = useRoom();
  const isInRoom = Boolean(roomContext?.room && roomContext?.roomStatus === 'connected');

  const radioSettings = settings.radio;

  const [isRadioActive, setIsRadioActive] = useState(false);
  const [powerOn, setPowerOnState] = useState(true);
  const [band, setBandState] = useState<RadioBand>(radioSettings.defaultBand || 'FM');
  const [frequency, setFrequency] = useState<number>(88.5);
  const [weakSignal, setWeakSignal] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [antennaLength, setAntennaLength] = useState(1);
  const [antennaAngleDeg, setAntennaAngleDeg] = useState(0);
  const [rjCaption, setRjCaption] = useState<string | null>(null);
  const [isRjSpeaking, setIsRjSpeaking] = useState(false);
  const [lastAnnouncement, setLastAnnouncement] = useState('');
  const [upcomingSchedule, setUpcomingSchedule] = useState<{
    nextTrack: TrackInfo;
    nextNextTrack: TrackInfo;
  } | null>(null);

  const lastLockedStationIdRef = useRef<string | null>(null);
  const lastPassedStationIdRef = useRef<string | null>(null);
  const tuneDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tuneRequestIdRef = useRef<number>(0);
  const lastRjSpokeAtRef = useRef<number>(0);
  const recentRjTemplatesRef = useRef<string[]>([]);
  const hasCustomClipsRef = useRef<boolean>(false);
  const advancingTrackIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as unknown as { __MYUJIKU_RADIO_ACTIVE__?: boolean }).__MYUJIKU_RADIO_ACTIVE__ =
        isRadioActive && powerOn && !isInRoom;
    }
  }, [isRadioActive, powerOn, isInRoom]);

  useEffect(() => {
    advancingTrackIdRef.current = null;
  }, [playback.currentTrack?.id]);

  useEffect(() => {
    listCustomRjClips().then((list) => {
      hasCustomClipsRef.current = list.length > 0;
    }).catch(() => {});
  }, [isRadioActive]);

  const stations = useMemo(() => {
    const fm = generateStations(radioSettings.stationSeed, 'FM');
    const am = generateStations(radioSettings.stationSeed, 'AM');
    return [...fm, ...am];
  }, [radioSettings.stationSeed]);

  const reception = useMemo(
    () =>
      evaluateReception(
        frequency,
        stations,
        band,
        radioSettings.realisticReception,
        antennaLength,
        antennaAngleDeg
      ),
    [frequency, stations, band, radioSettings.realisticReception, antennaLength, antennaAngleDeg]
  );

  const activeStation = reception.locked ? reception.bestStation : null;

  // Sync Radio audio controller (static, voicing, SFX volume)
  useEffect(() => {
    const audio = getRadioAudio();
    audio.setSfxVolume(radioSettings.sfxVolume);
    audio.setStaticAmount(radioSettings.staticAmount);

    if (!isRadioActive || isInRoom) {
      audio.updateReceptionAudio({
        powerOn: false,
        muted: true,
        staticGain: 0,
        whistleGain: 0,
        whistleFreqHz: 1200,
        bandwidthHz: 16000,
        band,
        masterVolume: playback.volume,
        vintageEnabled: false,
        vintageAmount: 0,
      });
      return;
    }

    audio.updateReceptionAudio({
      powerOn,
      muted: playback.isMuted || !playback.isPlaying,
      staticGain: reception.staticGain,
      whistleGain: reception.whistleGain,
      whistleFreqHz: reception.whistleFreqHz,
      bandwidthHz: reception.bandwidthHz,
      band,
      masterVolume: playback.volume,
      vintageEnabled: radioSettings.vintageSoundEnabled,
      vintageAmount: radioSettings.vintageAmount,
    });
  }, [
    isRadioActive,
    isInRoom,
    powerOn,
    playback.isMuted,
    playback.isPlaying,
    playback.volume,
    reception,
    band,
    radioSettings.sfxVolume,
    radioSettings.staticAmount,
    radioSettings.vintageSoundEnabled,
    radioSettings.vintageAmount,
  ]);

  // Background pre-warm all stations on active band so channel switching is instant
  useEffect(() => {
    if (!isRadioActive || !powerOn || isInRoom) return;
    const bandStations = stations.filter((s) => s.band === band);
    const timer = setTimeout(() => {
      void prewarmBandStations(bandStations, () => isRadioActive && powerOn && !isInRoom);
    }, 1200);
    return () => clearTimeout(timer);
  }, [isRadioActive, powerOn, isInRoom, stations, band]);

  const tuneStationPlayback = useCallback(
    async (station: RadioStation) => {
      if (!powerOn || !isRadioActive || isInRoom) return;
      const reqId = ++tuneRequestIdRef.current;
      setWeakSignal(false);

      // Pause previous track immediately while tuning so old station doesn't linger
      if (playback.currentTrack && playback.isPlaying) {
        playback.pause();
      }

      // Immediate cached check or async fetch
      let pool = getCachedStationPool(station.id);
      if (!pool || pool.length === 0) {
        const res = await ensureStationPool(station);
        if (tuneRequestIdRef.current !== reqId) return;
        pool = res.tracks;
        setWeakSignal(res.weakSignal);
      }
      if (!pool || pool.length === 0 || tuneRequestIdRef.current !== reqId) return;

      prefetchNeighborStations(station, stations);

      const broadcast = computeLiveBroadcast(station.jingleSeed, Date.now(), pool);
      if (!broadcast || tuneRequestIdRef.current !== reqId) return;

      setUpcomingSchedule({
        nextTrack: broadcast.nextTrack,
        nextNextTrack: broadcast.nextNextTrack,
      });

      const unit = station.band === 'FM' ? 'megahertz' : 'kilohertz';
      setLastAnnouncement(
        `Tuned to ${station.name}, ${station.frequency} ${unit}, now playing ${broadcast.track.title} by ${broadcast.track.artist}`
      );

      if (playback.currentTrack?.id !== broadcast.track.id) {
        await playback.playCustomTrackList([broadcast.track], 0);
        if (tuneRequestIdRef.current !== reqId) return;
        const offset = broadcast.offsetSec || computeFallbackJoinOffset(station.jingleSeed, broadcast.track.duration);
        if (offset > 0) {
          playback.seek(offset);
        }
      } else if (!playback.isPlaying) {
        await playback.play();
      }
    },
    [powerOn, isRadioActive, isInRoom, stations, playback]
  );

  // Trigger station load when locked onto a new station
  useEffect(() => {
    if (!isRadioActive || !powerOn || isInRoom) return;
    if (!activeStation) {
      lastLockedStationIdRef.current = null;
      tuneRequestIdRef.current++;
      return;
    }
    if (lastLockedStationIdRef.current === activeStation.id) return;
    lastLockedStationIdRef.current = activeStation.id;

    if (tuneDebounceRef.current) clearTimeout(tuneDebounceRef.current);
    tuneDebounceRef.current = setTimeout(() => {
      void tuneStationPlayback(activeStation);
    }, 55);

    return () => {
      if (tuneDebounceRef.current) clearTimeout(tuneDebounceRef.current);
    };
  }, [isRadioActive, powerOn, isInRoom, activeStation, tuneStationPlayback]);

  const setRjSpeechState = useCallback((speaking: boolean, caption: string | null) => {
    setIsRjSpeaking(speaking);
    setRjCaption(caption);
    getRadioAudio().setRjDucking(speaking, radioSettings.rjDuckDb);
  }, [radioSettings.rjDuckDb]);

  // Keep broadcast advancing when a radio track nears completion & plan RJ speech
  useEffect(() => {
    if (!isRadioActive || !powerOn || !activeStation || isInRoom) return;

    // Plan RJ speech during intro or outro windows
    if (playback.isPlaying && playback.currentTrack && playback.duration > 30) {
      const nowMs = Date.now();
      const decision = planRjTrigger({
        frequency: radioSettings.rjFrequency,
        elapsedSec: playback.currentTime,
        durationSec: playback.duration,
        lastSpokeAtMs: lastRjSpokeAtRef.current,
        nowMs,
        customClipsEnabled: radioSettings.rjCustomClipsEnabled,
        hasCustomClips: hasCustomClipsRef.current,
        roll: Math.random(),
        clipRoll: Math.random(),
      });

      if (decision.shouldSpeak && !isRjSpeaking) {
        lastRjSpokeAtRef.current = nowMs;
        if (decision.useCustomClip) {
          void playRandomCustomRjClip({
            volume: radioSettings.rjVolume,
            onStart: (clipName) => {
              setRjSpeechState(true, `Studio Clip: ${clipName}`);
            },
            onEnd: () => {
              setRjSpeechState(false, null);
            },
          });
        } else {
          const cat: RjScriptCategory =
            decision.reason === 'Outro window'
              ? Math.random() < 0.5 ? 'intro' : 'backAnnounce'
              : Math.random() < 0.4 ? 'ident' : Math.random() < 0.5 ? 'timeCheck' : 'mood';
          const timeStr = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
          const picked = pickRjScript({
            category: cat,
            context: {
              song: playback.currentTrack.title,
              artist: playback.currentTrack.artist,
              nextSong: upcomingSchedule?.nextTrack.title,
              nextArtist: upcomingSchedule?.nextTrack.artist,
              station: activeStation,
              timeStr,
            },
            recentLines: recentRjTemplatesRef.current,
            seed: nowMs,
          });
          recentRjTemplatesRef.current.push(picked.template);
          if (recentRjTemplatesRef.current.length > 30) recentRjTemplatesRef.current.shift();

          void speakRjLine({
            text: picked.line,
            personaId: activeStation.rjPersonaId,
            volume: radioSettings.rjVolume,
            voiceOverride: radioSettings.rjPersonaVoices[activeStation.rjPersonaId],
            onStart: () => setRjSpeechState(true, `${picked.personaName}: "${picked.line}"`),
            onEnd: () => setRjSpeechState(false, null),
          });
        }
      }
    }

    const currentTrackId = playback.currentTrack?.id || null;
    const isNearEnd =
      playback.duration > 0 &&
      playback.currentTime >= playback.duration - 1.5 &&
      playback.isPlaying;
    const hasEnded = playback.playbackState === 'ended' && Boolean(currentTrackId);

    if ((isNearEnd || hasEnded) && advancingTrackIdRef.current !== currentTrackId) {
      const pool = getCachedStationPool(activeStation.id);
      if (!pool || pool.length === 0) return;
      const nextB = computeLiveBroadcast(activeStation.jingleSeed, Date.now() + 3000, pool);
      if (nextB) {
        const targetTrack =
          nextB.track.id !== currentTrackId ? nextB.track : nextB.nextTrack;
        if (targetTrack && targetTrack.id !== currentTrackId) {
          advancingTrackIdRef.current = currentTrackId || '__advancing__';
          getRadioAudio().playStationIdentChime(activeStation.jingleSeed);
          void playback.playCustomTrackList([targetTrack], 0);
          setUpcomingSchedule({
            nextTrack: nextB.track.id !== currentTrackId ? nextB.nextTrack : nextB.nextNextTrack,
            nextNextTrack: nextB.nextNextTrack,
          });
        }
      }
    }
  }, [
    isRadioActive,
    powerOn,
    activeStation,
    isInRoom,
    playback,
    radioSettings.rjFrequency,
    radioSettings.rjCustomClipsEnabled,
    radioSettings.rjVolume,
    radioSettings.rjPersonaVoices,
    isRjSpeaking,
    upcomingSchedule,
    setRjSpeechState,
  ]);

  const setRadioActive = useCallback(
    (active: boolean) => {
      setIsRadioActive(active);
      if (!active) {
        stopRjSpeech();
        setRjCaption(null);
        setIsRjSpeaking(false);
        getRadioAudio().setRjDucking(false);
      }
    },
    []
  );

  const setPowerOn = useCallback(
    (on: boolean) => {
      setPowerOnState(on);
      getRadioAudio().playPowerToggle(on);
      if (!on) {
        stopRjSpeech();
        playback.pause();
        setRjCaption(null);
        setIsRjSpeaking(false);
        getRadioAudio().setRjDucking(false);
      } else if (activeStation) {
        lastLockedStationIdRef.current = null;
        void tuneStationPlayback(activeStation);
      }
    },
    [playback, activeStation, tuneStationPlayback]
  );

  const togglePower = useCallback(() => {
    setPowerOn(!powerOn);
  }, [powerOn, setPowerOn]);

  const setBand = useCallback(
    (nextBand: RadioBand) => {
      if (nextBand === band) return;
      getRadioAudio().playButtonClick(620);
      getRadioAudio().playStaticBurst(0.18);
      setBandState(nextBand);
      updateSettings('radio', { defaultBand: nextBand });
      const targetFreq = nextBand === 'FM' ? 88.5 : 550;
      setFrequency(targetFreq);
      lastLockedStationIdRef.current = null;
    },
    [band, updateSettings]
  );

  const tuneToFrequency = useCallback(
    (rawFreq: number, options?: { snap?: boolean; silent?: boolean }) => {
      const min = band === 'FM' ? FM_MIN : AM_MIN;
      const max = band === 'FM' ? FM_MAX : AM_MAX;
      if ((rawFreq <= min && frequency > min) || (rawFreq >= max && frequency < max)) {
        if (!options?.silent) getRadioAudio().playBandEndThunk();
      }

      let nextFreq = clampFrequency(rawFreq, band);
      if (options?.snap) {
        const snapTarget = findMagneticSnapStation(nextFreq, stations, band);
        if (snapTarget) nextFreq = snapTarget.frequency;
      }

      if (!options?.silent && nextFreq !== frequency) {
        const near = findMagneticSnapStation(nextFreq, stations, band);
        const passedNew = Boolean(near && near.id !== lastPassedStationIdRef.current);
        if (near) lastPassedStationIdRef.current = near.id;
        getRadioAudio().playDialTick(passedNew);
      }

      setFrequency(nextFreq);
    },
    [band, frequency, stations]
  );

  const tuneToStation = useCallback(
    (station: RadioStation) => {
      if (station.band !== band) {
        setBandState(station.band);
      }
      stopRjSpeech();
      setRjSpeechState(false, null);
      getRadioAudio().playStaticBurst(0.2);
      setFrequency(station.frequency);
      lastLockedStationIdRef.current = null;
      if (!powerOn) setPowerOn(true);
    },
    [band, powerOn, setPowerOn]
  );

  const scanNext = useCallback(
    (direction: 1 | -1) => {
      const next = scanStation(frequency, stations, direction, band);
      if (!next) return;
      setIsScanning(true);
      getRadioAudio().playStaticBurst(0.28);
      setFrequency(next.frequency);
      lastLockedStationIdRef.current = null;
      setTimeout(() => setIsScanning(false), 360);
    },
    [frequency, stations, band]
  );

  const savePreset = useCallback(
    (slot: number, targetStation?: RadioStation) => {
      const st = targetStation || activeStation || reception.bestStation;
      if (!st || slot < 1 || slot > 6) return;
      getRadioAudio().playButtonClick(840);
      const nextPresets = radioSettings.presets.filter((p) => p.slot !== slot);
      nextPresets.push({
        slot,
        stationId: st.id,
        frequency: st.frequency,
        band: st.band,
        name: st.name,
      });
      nextPresets.sort((a, b) => a.slot - b.slot);
      updateSettings('radio', { presets: nextPresets });
    },
    [activeStation, reception.bestStation, radioSettings.presets, updateSettings]
  );

  const recallPreset = useCallback(
    (slot: number) => {
      const preset = radioSettings.presets.find((p) => p.slot === slot);
      if (!preset) return;
      getRadioAudio().playButtonClick(760);
      const match = stations.find((s) => s.id === preset.stationId) || {
        id: preset.stationId,
        frequency: preset.frequency,
        band: preset.band,
        name: preset.name,
        tag: 'Preset',
        language: 'Mixed',
        queries: ['chill music'],
        rjPersonaId: 'mara',
        jingleSeed: 4000 + slot,
      };
      tuneToStation(match);
    },
    [radioSettings.presets, stations, tuneToStation]
  );

  const rescanStations = useCallback(() => {
    clearRadioPoolCache();
    const newSeed = Math.floor(Math.random() * 899999) + 100000;
    updateSettings('radio', { stationSeed: newSeed });
    lastLockedStationIdRef.current = null;
    getRadioAudio().playStaticBurst(0.3);
  }, [updateSettings]);

  const setAntenna = useCallback((length: number, angleDeg: number) => {
    setAntennaLength(Math.max(0.2, Math.min(1, length)));
    setAntennaAngleDeg(Math.max(-45, Math.min(45, angleDeg)));
  }, []);

  const clearAllRadioData = useCallback(() => {
    clearRadioPoolCache();
    updateSettings('radio', { presets: [], stationSeed: 4242 });
    lastLockedStationIdRef.current = null;
  }, [updateSettings]);

  return (
    <RadioContext.Provider
      value={{
        isRadioActive,
        powerOn,
        band,
        frequency,
        stations,
        reception,
        activeStation,
        upcomingSchedule,
        weakSignal,
        isScanning,
        antennaLength,
        antennaAngleDeg,
        presets: radioSettings.presets,
        rjCaption,
        isRjSpeaking,
        lastAnnouncement,
        setRadioActive,
        togglePower,
        setPowerOn,
        setBand,
        tuneToFrequency,
        tuneToStation,
        scanNext,
        savePreset,
        recallPreset,
        rescanStations,
        setAntenna,
        setRjSpeechState,
        clearAllRadioData,
      }}
    >
      {children}
    </RadioContext.Provider>
  );
}

export function useRadio() {
  const ctx = useContext(RadioContext);
  if (!ctx) throw new Error('useRadio must be used within a RadioProvider');
  return ctx;
}

