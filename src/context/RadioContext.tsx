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
} from '@/lib/radio/pool-manager';
import { computeFallbackJoinOffset, computeLiveBroadcast } from '@/lib/radio/schedule';
import { getRadioAudio } from '@/lib/radio/radio-audio';

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

  const tuneStationPlayback = useCallback(
    async (station: RadioStation) => {
      if (!powerOn || !isRadioActive || isInRoom) return;
      setWeakSignal(false);

      // Immediate cached check or async fetch
      let pool = getCachedStationPool(station.id);
      if (!pool || pool.length === 0) {
        const res = await ensureStationPool(station);
        pool = res.tracks;
        setWeakSignal(res.weakSignal);
      }
      if (!pool || pool.length === 0) return;

      prefetchNeighborStations(station, stations);

      const broadcast = computeLiveBroadcast(station.jingleSeed, Date.now(), pool);
      if (!broadcast) return;

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
        const offset = broadcast.offsetSec || computeFallbackJoinOffset(station.jingleSeed, broadcast.track.duration);
        setTimeout(() => {
          playback.seek(offset);
        }, 450);
      }
    },
    [powerOn, isRadioActive, isInRoom, stations, playback]
  );

  // Trigger station load when locked onto a new station
  useEffect(() => {
    if (!isRadioActive || !powerOn || isInRoom) return;
    if (!activeStation) {
      lastLockedStationIdRef.current = null;
      return;
    }
    if (lastLockedStationIdRef.current === activeStation.id) return;
    lastLockedStationIdRef.current = activeStation.id;

    if (tuneDebounceRef.current) clearTimeout(tuneDebounceRef.current);
    tuneDebounceRef.current = setTimeout(() => {
      void tuneStationPlayback(activeStation);
    }, 180);

    return () => {
      if (tuneDebounceRef.current) clearTimeout(tuneDebounceRef.current);
    };
  }, [isRadioActive, powerOn, isInRoom, activeStation, tuneStationPlayback]);

  // Keep broadcast advancing when a radio track nears completion
  useEffect(() => {
    if (!isRadioActive || !powerOn || !activeStation || isInRoom) return;
    if (playback.duration > 0 && playback.currentTime >= playback.duration - 1.5 && playback.isPlaying) {
      const pool = getCachedStationPool(activeStation.id);
      if (!pool || pool.length === 0) return;
      const nextB = computeLiveBroadcast(activeStation.jingleSeed, Date.now() + 3000, pool);
      if (nextB && nextB.track.id !== playback.currentTrack?.id) {
        getRadioAudio().playStationIdentChime(activeStation.jingleSeed);
        void playback.playCustomTrackList([nextB.track], 0);
        setUpcomingSchedule({
          nextTrack: nextB.nextTrack,
          nextNextTrack: nextB.nextNextTrack,
        });
      }
    }
  }, [isRadioActive, powerOn, activeStation, isInRoom, playback]);

  const setRadioActive = useCallback(
    (active: boolean) => {
      setIsRadioActive(active);
      if (!active) {
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

  const setRjSpeechState = useCallback((speaking: boolean, caption: string | null) => {
    setIsRjSpeaking(speaking);
    setRjCaption(caption);
    getRadioAudio().setRjDucking(speaking, radioSettings.rjDuckDb);
  }, [radioSettings.rjDuckDb]);

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

