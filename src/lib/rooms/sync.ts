import type { RoomPlaybackState } from '@/types/room';

export const DRIFT_SEEK_THRESHOLD_MS = 600;
export const SEEK_COOLDOWN_MS = 3000;

export interface ClockSample {
  t0: number; // Client time before request
  serverTime: number; // Server timestamp returned
  t1: number; // Client time upon response
}

/**
 * Calculates client-server clock offset using Cristian's algorithm from multiple samples.
 * Keeps the offset from the sample with the lowest round-trip time (RTT).
 * estimatedServerTime = clientTime + offset
 */
export function calculateClockOffset(samples: ClockSample[]): number {
  if (!samples || samples.length === 0) return 0;

  let bestSample: ClockSample | null = null;
  let minRtt = Infinity;

  for (const sample of samples) {
    const rtt = Math.max(0, sample.t1 - sample.t0);
    if (rtt < minRtt) {
      minRtt = rtt;
      bestSample = sample;
    }
  }

  if (!bestSample) return 0;

  const rtt = Math.max(0, bestSample.t1 - bestSample.t0);
  // Server time corresponds approximately to (t0 + RTT / 2)
  const offset = bestSample.serverTime - (bestSample.t0 + rtt / 2);
  return Math.round(offset);
}

/**
 * Measures clock offset by sampling /api/time (default 5 samples)
 * and calculating Cristian's algorithm offset with min RTT.
 */
export async function measureClockOffset(sampleCount: number = 5): Promise<number> {
  const samples: ClockSample[] = [];
  for (let i = 0; i < sampleCount; i++) {
    const t0 = Date.now();
    try {
      const res = await fetch('/api/time', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const t1 = Date.now();
        if (typeof data.serverTimeMs === 'number') {
          samples.push({ t0, serverTime: data.serverTimeMs, t1 });
        }
      }
    } catch {
      // Ignore network hiccup on sample
    }
    if (i < sampleCount - 1) {
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
  }
  return calculateClockOffset(samples);
}

/**
 * Calculates current target playback position in milliseconds.
 * If status is 'playing': target = positionMs + (estimatedServerNow - serverTimeMs)
 * If status is 'paused': target = positionMs
 */
export function calculateTargetPosition(
  state: RoomPlaybackState,
  estimatedServerNow: number,
  trackDurationSec: number = 0
): number {
  if (state.status === 'paused') {
    return Math.max(0, state.positionMs);
  }

  const elapsed = Math.max(0, estimatedServerNow - state.serverTimeMs);
  const target = state.positionMs + elapsed;

  if (trackDurationSec > 0) {
    return Math.min(target, trackDurationSec * 1000);
  }

  return target;
}

/**
 * Determines whether audio playback should perform a seek to realign with room target.
 * Seek occurs ONLY if |current - target| > 600ms AND at least 3000ms has elapsed since the last seek.
 */
export function shouldSeek(
  currentPositionMs: number,
  targetPositionMs: number,
  lastSeekTimestampMs: number,
  currentTimestampMs: number
): { shouldSeek: boolean; diffMs: number } {
  const diffMs = targetPositionMs - currentPositionMs;
  const absDiff = Math.abs(diffMs);

  // Still within cooldown
  if (currentTimestampMs - lastSeekTimestampMs < SEEK_COOLDOWN_MS) {
    return { shouldSeek: false, diffMs };
  }

  // Drift exceeded threshold
  if (absDiff > DRIFT_SEEK_THRESHOLD_MS) {
    return { shouldSeek: true, diffMs };
  }

  return { shouldSeek: false, diffMs };
}
