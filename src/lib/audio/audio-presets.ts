/**
 * Audio Equalizer Bands, Presets, Sound Profiles, and Headroom Utilities
 */

export const EQ_FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000] as const;
export const EQ_LABELS = ['32', '64', '125', '250', '500', '1k', '2k', '4k', '8k', '16k'] as const;

/**
 * Peaking filter Q = 1.25 (~1.15 octave bandwidth) provides smooth musical overlap
 * between octave-spaced bands (64 Hz - 8 kHz) without harsh comb-filter ringing.
 */
export const EQ_PEAKING_Q = 1.25;
export const EQ_MIN_DB = -12;
export const EQ_MAX_DB = 12;

export interface EqPreset {
  id: string;
  name: string;
  preampDb: number;
  bands: number[]; // length 10, dB in [-12, 12]
}

export const BUILTIN_EQ_PRESETS: EqPreset[] = [
  { id: 'flat', name: 'Flat', preampDb: 0, bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { id: 'pop', name: 'Pop', preampDb: 0, bands: [-1.5, -1, 0, 2, 4, 4, 2, 0, -1, -1.5] },
  { id: 'rock', name: 'Rock', preampDb: 0, bands: [4.5, 3.5, 2, 0.5, -1, -0.5, 1.5, 3, 4, 4.5] },
  { id: 'bass_boost', name: 'Bass Boost', preampDb: 0, bands: [6.5, 5.5, 4, 2, 0.5, 0, 0, 0, 0, 0] },
  { id: 'bass_reducer', name: 'Bass Reducer', preampDb: 0, bands: [-6.5, -5.5, -4, -2, -0.5, 0, 0, 0, 0, 0] },
  { id: 'treble_boost', name: 'Treble Boost', preampDb: 0, bands: [0, 0, 0, 0, 0, 1, 2.5, 4.5, 6, 6.5] },
  { id: 'treble_reducer', name: 'Treble Reducer', preampDb: 0, bands: [0, 0, 0, 0, 0, -1, -2.5, -4.5, -6, -6.5] },
  { id: 'vocal_boost', name: 'Vocal Boost', preampDb: 0, bands: [-2, -1.5, -1, 1, 3.5, 4.5, 3.5, 1.5, 0, -1] },
  { id: 'electronic', name: 'Electronic', preampDb: 0, bands: [4.5, 4, 1.5, 0, -1.5, 1.5, 1, 2.5, 4, 4.5] },
  { id: 'hip_hop', name: 'Hip-Hop', preampDb: 0, bands: [5, 4.5, 2, 1.5, -1, -1, 1.5, 0.5, 2, 3] },
  { id: 'jazz', name: 'Jazz', preampDb: 0, bands: [3, 2, 1, 2, -1.5, -1.5, 0, 1.5, 3, 3.5] },
  { id: 'classical', name: 'Classical', preampDb: 0, bands: [4, 3, 2, 1.5, -1, -1, 0, 2, 3, 3.5] },
  { id: 'acoustic', name: 'Acoustic', preampDb: 0, bands: [3.5, 3, 1.5, 0.5, 1.5, 1.5, 2.5, 3, 2.5, 1.5] },
  { id: 'lofi', name: 'Lo-fi', preampDb: 0, bands: [2, 3, 2.5, 1, -0.5, -1.5, -3, -4.5, -6, -7.5] },
  { id: 'late_night', name: 'Late Night', preampDb: -2, bands: [2, 1.5, 0, -1, -1, 0.5, 1.5, 1, -1.5, -2.5] },
  { id: 'loudness', name: 'Loudness', preampDb: 0, bands: [5.5, 4, 1.5, 0, -1.5, 0, -0.5, 1.5, 4.5, 5] },
];

export type ReverbRoomType = 'room' | 'hall' | 'plate' | 'cathedral';
export type Spatial8DDirection = 'clockwise' | 'anticlockwise' | 'alternating';

export interface EqSettingsState {
  enabled: boolean;
  preampDb: number;
  bands: number[]; // 10 bands
  presetId: string; // preset id or 'custom'
  customPresets: EqPreset[];
}

export interface Spatial8DParams {
  enabled: boolean;
  speedSec: number; // 4-20
  width: number; // 0.2-1.0
  direction: Spatial8DDirection;
  rolloff: number; // 0-1
}

export interface MuffledParams {
  enabled: boolean;
  cutoffHz: number; // 300-4000
  q: number; // 0.5-6.0
  mix: number; // 0-1
  highShelfCutDb: number; // -18 to 0
}

export interface ReverbParams {
  enabled: boolean;
  roomType: ReverbRoomType;
  decaySec: number; // 0.3-6.0
  preDelayMs: number; // 0-100
  dampingHz: number; // 1000-16000
  mix: number; // 0-1
}

export interface ChorusParams {
  enabled: boolean;
  rateHz: number; // 0.1-5.0
  depthMs: number; // 0.5-10
  baseDelayMs: number; // 5-35
  spread: number; // 0-1
  mix: number; // 0-1
}

export interface NoiseGateParams {
  enabled: boolean;
  thresholdDb: number; // -80 to -20
  attackMs: number; // 1-50
  releaseMs: number; // 20-500
  rangeDb: number; // -60 to 0
}

export interface EffectsSettingsState {
  spatial8D: Spatial8DParams;
  muffled: MuffledParams;
  reverb: ReverbParams;
  chorus: ChorusParams;
  noiseGate: NoiseGateParams;
}

export interface MasterCompressorParams {
  enabled: boolean;
  thresholdDb: number; // -50 to 0
  ratio: number; // 1 to 20
  attackMs: number; // 1 to 100
  releaseMs: number; // 20 to 500
  makeupDb: number; // 0 to 12
}

export interface MasterSettingsState {
  outputGainDb: number; // -12 to +12
  balance: number; // -1 (L) to +1 (R)
  stereoWidthPct: number; // 0 to 200
  compressor: MasterCompressorParams;
  limiterEnabled: boolean;
  bassDb: number; // -12 to +12
  trebleDb: number; // -12 to +12
}

export interface SoundProfileSnapshot {
  eq: Omit<EqSettingsState, 'customPresets'>;
  effects: EffectsSettingsState;
  master: MasterSettingsState;
}

export interface SoundProfile {
  id: string;
  name: string;
  builtin?: boolean;
  snapshot: SoundProfileSnapshot;
}

export const DEFAULT_EQ_SETTINGS: EqSettingsState = {
  enabled: false,
  preampDb: 0,
  bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  presetId: 'flat',
  customPresets: [],
};

export const DEFAULT_EFFECTS_SETTINGS: EffectsSettingsState = {
  spatial8D: { enabled: false, speedSec: 8, width: 0.85, direction: 'clockwise', rolloff: 0.25 },
  muffled: { enabled: false, cutoffHz: 700, q: 1.6, mix: 1.0, highShelfCutDb: -6 },
  reverb: { enabled: false, roomType: 'hall', decaySec: 2.2, preDelayMs: 18, dampingHz: 6500, mix: 0.35 },
  chorus: { enabled: false, rateHz: 1.2, depthMs: 3.0, baseDelayMs: 18, spread: 0.85, mix: 0.42 },
  noiseGate: { enabled: false, thresholdDb: -48, attackMs: 8, releaseMs: 160, rangeDb: -36 },
};

export const DEFAULT_MASTER_SETTINGS: MasterSettingsState = {
  outputGainDb: 0,
  balance: 0,
  stereoWidthPct: 100,
  compressor: { enabled: false, thresholdDb: -18, ratio: 3.5, attackMs: 10, releaseMs: 140, makeupDb: 0 },
  limiterEnabled: true,
  bassDb: 0,
  trebleDb: 0,
};

export const BUILTIN_SOUND_PROFILES: SoundProfile[] = [
  {
    id: 'flat',
    name: 'Flat / Default',
    builtin: true,
    snapshot: {
      eq: { enabled: false, preampDb: 0, bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], presetId: 'flat' },
      effects: DEFAULT_EFFECTS_SETTINGS,
      master: DEFAULT_MASTER_SETTINGS,
    },
  },
  {
    id: 'night',
    name: 'Night',
    builtin: true,
    snapshot: {
      eq: { enabled: true, preampDb: -2, bands: [2, 1.5, 0, -1, -1, 0.5, 1.5, 1, -1.5, -2.5], presetId: 'late_night' },
      effects: DEFAULT_EFFECTS_SETTINGS,
      master: {
        ...DEFAULT_MASTER_SETTINGS,
        compressor: { enabled: true, thresholdDb: -24, ratio: 4.5, attackMs: 8, releaseMs: 180, makeupDb: 2 },
        limiterEnabled: true,
      },
    },
  },
  {
    id: 'bass_heavy',
    name: 'Bass Heavy',
    builtin: true,
    snapshot: {
      eq: { enabled: true, preampDb: 0, bands: [6.5, 5.5, 4, 2, 0.5, 0, 0, 0, 0, 0], presetId: 'bass_boost' },
      effects: DEFAULT_EFFECTS_SETTINGS,
      master: { ...DEFAULT_MASTER_SETTINGS, bassDb: 2.5, limiterEnabled: true },
    },
  },
  {
    id: 'vocal_clarity',
    name: 'Vocal Clarity',
    builtin: true,
    snapshot: {
      eq: { enabled: true, preampDb: 0, bands: [-2, -1.5, -1, 1, 3.5, 4.5, 3.5, 1.5, 0, -1], presetId: 'vocal_boost' },
      effects: {
        ...DEFAULT_EFFECTS_SETTINGS,
        noiseGate: { ...DEFAULT_EFFECTS_SETTINGS.noiseGate, enabled: true, thresholdDb: -54 },
      },
      master: { ...DEFAULT_MASTER_SETTINGS, stereoWidthPct: 110, limiterEnabled: true },
    },
  },
  {
    id: 'lofi_room',
    name: 'Lo-fi Room',
    builtin: true,
    snapshot: {
      eq: { enabled: true, preampDb: 0, bands: [2, 3, 2.5, 1, -0.5, -1.5, -3, -4.5, -6, -7.5], presetId: 'lofi' },
      effects: {
        ...DEFAULT_EFFECTS_SETTINGS,
        muffled: { enabled: true, cutoffHz: 1400, q: 1.1, mix: 0.75, highShelfCutDb: -8 },
        reverb: { enabled: true, roomType: 'room', decaySec: 1.4, preDelayMs: 12, dampingHz: 4200, mix: 0.25 },
      },
      master: { ...DEFAULT_MASTER_SETTINGS, stereoWidthPct: 90, limiterEnabled: true },
    },
  },
  {
    id: 'concert_hall',
    name: 'Concert Hall',
    builtin: true,
    snapshot: {
      eq: { enabled: true, preampDb: 0, bands: [3, 2, 1, 0, 0, 0.5, 1.5, 2.5, 3, 3], presetId: 'classical' },
      effects: {
        ...DEFAULT_EFFECTS_SETTINGS,
        reverb: { enabled: true, roomType: 'cathedral', decaySec: 3.6, preDelayMs: 32, dampingHz: 5800, mix: 0.42 },
        chorus: { ...DEFAULT_EFFECTS_SETTINGS.chorus, enabled: true, mix: 0.25 },
      },
      master: { ...DEFAULT_MASTER_SETTINGS, stereoWidthPct: 125, limiterEnabled: true },
    },
  },
];

export function clampDb(db: number, min = EQ_MIN_DB, max = EQ_MAX_DB): number {
  if (typeof db !== 'number' || isNaN(db)) return 0;
  return Math.max(min, Math.min(max, db));
}

export function dbToLinear(db: number): number {
  return Math.pow(10, db / 20);
}

/**
 * Automatic headroom compensation:
 * Reduces internal preamp gain by the largest positive boost across EQ + Bass/Treble
 * so boosted bands cannot clip upstream of the brick-wall limiter.
 */
export function computeAutoHeadroomDb(
  eqEnabled: boolean,
  bands: number[],
  bassDb = 0,
  trebleDb = 0
): number {
  let maxPositive = 0;
  if (eqEnabled && Array.isArray(bands)) {
    for (const b of bands) {
      if (b > maxPositive) maxPositive = b;
    }
  }
  if (bassDb > 0) maxPositive = Math.max(maxPositive, bassDb);
  if (trebleDb > 0) maxPositive = Math.max(maxPositive, trebleDb);
  return maxPositive > 0 ? -maxPositive : 0;
}

export function getEqFilterType(index: number): BiquadFilterType {
  if (index === 0) return 'lowshelf';
  if (index === EQ_FREQUENCIES.length - 1) return 'highshelf';
  return 'peaking';
}

