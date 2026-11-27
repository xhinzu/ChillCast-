export type RjFrequencySetting = 'off' | 'rare' | 'normal' | 'often';

export interface RjPlanDecision {
  shouldSpeak: boolean;
  useCustomClip: boolean;
  reason: string;
}

/**
 * Pure planner for RJ speech & ducking triggers.
 * Checks frequency setting, outro/intro window, minimum track gap, and custom clip chance.
 */
export function planRjTrigger(params: {
  frequency: RjFrequencySetting;
  elapsedSec: number;
  durationSec: number;
  lastSpokeAtMs: number;
  nowMs: number;
  customClipsEnabled: boolean;
  hasCustomClips: boolean;
  roll: number; // 0..1
  clipRoll: number; // 0..1
}): RjPlanDecision {
  if (params.frequency === 'off') {
    return { shouldSpeak: false, useCustomClip: false, reason: 'RJ frequency is off' };
  }
  if (params.durationSec > 0 && params.durationSec < 30) {
    return { shouldSpeak: false, useCustomClip: false, reason: 'Track too short' };
  }

  // Respect cooldown between RJ breaks
  const minCooldownMs =
    params.frequency === 'often' ? 25_000 : params.frequency === 'normal' ? 65_000 : 140_000;
  if (params.nowMs - params.lastSpokeAtMs < minCooldownMs) {
    return { shouldSpeak: false, useCustomClip: false, reason: 'Cooldown active' };
  }

  const inIntroWindow = params.elapsedSec >= 1 && params.elapsedSec <= 8;
  const inOutroWindow =
    params.durationSec >= 40 &&
    params.durationSec - params.elapsedSec >= 3 &&
    params.durationSec - params.elapsedSec <= 10;

  if (!inIntroWindow && !inOutroWindow) {
    return { shouldSpeak: false, useCustomClip: false, reason: 'Outside intro/outro window' };
  }

  const prob =
    params.frequency === 'often' ? 0.85 : params.frequency === 'normal' ? 0.5 : 0.25;
  if (params.roll > prob) {
    return { shouldSpeak: false, useCustomClip: false, reason: 'Skipped by probability' };
  }

  const useCustomClip = params.customClipsEnabled && params.hasCustomClips && params.clipRoll < 0.28;
  return {
    shouldSpeak: true,
    useCustomClip,
    reason: inOutroWindow ? 'Outro window' : 'Intro window',
  };
}

