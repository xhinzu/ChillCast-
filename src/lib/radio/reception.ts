import { AM_MAX, AM_MIN, FM_MAX, FM_MIN, type RadioBand, type RadioStation } from './stations';

export interface ReceptionState {
  bestStation: RadioStation | null;
  bleedStation: RadioStation | null;
  signal: number; // 0..1
  bleedSignal: number; // 0..1
  musicGain: number; // 0..1
  bleedGain: number; // 0..0.35
  staticGain: number; // 0..1
  bandwidthHz: number; // 900..16000
  whistleGain: number; // 0..0.15
  whistleFreqHz: number; // 600..3200
  locked: boolean;
}

export function computeStationSignal(
  freq: number,
  stationFreq: number,
  band: RadioBand,
  antennaFactor = 1
): number {
  const sigma = band === 'FM' ? 0.12 : 20;
  const dist = Math.abs(freq - stationFreq);
  const raw = Math.exp(-(dist * dist) / (2 * sigma * sigma));
  return Math.max(0, Math.min(1, raw * Math.max(0.45, Math.min(1.05, antennaFactor))));
}

export function computeAntennaFactor(
  realisticReception: boolean,
  antennaLength = 1, // 0..1
  antennaAngleDeg = 0 // -45..45
): number {
  if (!realisticReception) return 1;
  const lenFactor = 0.65 + 0.35 * Math.max(0, Math.min(1, antennaLength));
  const angleNorm = Math.cos((Math.max(-60, Math.min(60, antennaAngleDeg)) * Math.PI) / 180);
  return Math.max(0.5, Math.min(1.0, lenFactor * (0.8 + 0.2 * angleNorm)));
}

export function evaluateReception(
  freq: number,
  stations: RadioStation[],
  band: RadioBand,
  realisticReception = false,
  antennaLength = 1,
  antennaAngleDeg = 0
): ReceptionState {
  const bandStations = stations.filter((s) => s.band === band);
  if (bandStations.length === 0) {
    return {
      bestStation: null,
      bleedStation: null,
      signal: 0,
      bleedSignal: 0,
      musicGain: 0,
      bleedGain: 0,
      staticGain: band === 'AM' ? 0.9 : 0.75,
      bandwidthHz: 1100,
      whistleGain: 0,
      whistleFreqHz: 1200,
      locked: false,
    };
  }

  const antFactor = computeAntennaFactor(realisticReception, antennaLength, antennaAngleDeg);

  let best: RadioStation | null = null;
  let bestSig = -1;
  let second: RadioStation | null = null;
  let secondSig = -1;

  for (const st of bandStations) {
    const sig = computeStationSignal(freq, st.frequency, band, antFactor);
    if (sig > bestSig) {
      second = best;
      secondSig = bestSig;
      best = st;
      bestSig = sig;
    } else if (sig > secondSig) {
      second = st;
      secondSig = sig;
    }
  }

  const signal = Math.max(0, Math.min(1, bestSig));
  const bleedSignal = Math.max(0, Math.min(1, secondSig));

  // Smooth S-curve for music & inverse for static
  const musicGain = Math.pow(signal, 1.35);
  const baseStaticFloor = band === 'AM' ? 0.16 : 0.03;
  const staticGain = Math.max(
    baseStaticFloor * (1 - signal * 0.7),
    Math.min(1, (band === 'AM' ? 0.92 : 0.78) * (1 - Math.pow(signal, 0.85)))
  );
  const bandwidthHz = Math.round(1000 + signal * (band === 'AM' ? 4200 : 14000));

  // Subtle heterodyne tuning whistle on skirts of a carrier
  const whistleEnvelope = signal > 0.12 && signal < 0.82 ? Math.sin(((signal - 0.12) / 0.7) * Math.PI) : 0;
  const distToBest = best ? Math.abs(freq - best.frequency) : 0.2;
  const whistleFreqHz = Math.round(700 + Math.min(1, distToBest / (band === 'FM' ? 0.35 : 50)) * 2200);
  const whistleGain = whistleEnvelope * (band === 'AM' ? 0.08 : 0.045);

  const lockThreshold = band === 'FM' ? 0.08 : 12;
  const locked = Boolean(best && Math.abs(freq - best.frequency) <= lockThreshold);

  return {
    bestStation: best,
    bleedStation: secondSig > 0.05 ? second : null,
    signal,
    bleedSignal,
    musicGain,
    bleedGain: Math.min(0.3, bleedSignal * 0.45),
    staticGain,
    bandwidthHz,
    whistleGain,
    whistleFreqHz,
    locked,
  };
}

export function clampFrequency(freq: number, band: RadioBand): number {
  if (band === 'FM') {
    const clamped = Math.max(FM_MIN, Math.min(FM_MAX, freq));
    return Math.round(clamped * 10) / 10;
  }
  const clamped = Math.max(AM_MIN, Math.min(AM_MAX, freq));
  return Math.round(clamped / 10) * 10;
}

export function findMagneticSnapStation(
  freq: number,
  stations: RadioStation[],
  band: RadioBand
): RadioStation | null {
  const threshold = band === 'FM' ? 0.051 : 5.1;
  let closest: RadioStation | null = null;
  let minDiff = Infinity;
  for (const st of stations) {
    if (st.band !== band) continue;
    const diff = Math.abs(freq - st.frequency);
    if (diff <= threshold && diff < minDiff) {
      minDiff = diff;
      closest = st;
    }
  }
  return closest;
}

export function scanStation(
  currentFreq: number,
  stations: RadioStation[],
  direction: 1 | -1,
  band: RadioBand
): RadioStation | null {
  const list = stations.filter((s) => s.band === band).sort((a, b) => a.frequency - b.frequency);
  if (list.length === 0) return null;
  if (direction === 1) {
    return list.find((s) => s.frequency > currentFreq + 0.01) || list[0];
  }
  const rev = [...list].reverse();
  return rev.find((s) => s.frequency < currentFreq - 0.01) || rev[0];
}

// Dial angle mapping: 270 degree sweep (-135 deg to +135 deg)
export function frequencyToDialAngle(freq: number, band: RadioBand): number {
  const min = band === 'FM' ? FM_MIN : AM_MIN;
  const max = band === 'FM' ? FM_MAX : AM_MAX;
  const t = Math.max(0, Math.min(1, (freq - min) / (max - min)));
  return (-135 + t * 270) * (Math.PI / 180);
}

export function dialAngleToFrequency(angleRad: number, band: RadioBand): number {
  const min = band === 'FM' ? FM_MIN : AM_MIN;
  const max = band === 'FM' ? FM_MAX : AM_MAX;
  const minRad = (-135 * Math.PI) / 180;
  const maxRad = (135 * Math.PI) / 180;
  const t = Math.max(0, Math.min(1, (angleRad - minRad) / (maxRad - minRad)));
  return clampFrequency(min + t * (max - min), band);
}

