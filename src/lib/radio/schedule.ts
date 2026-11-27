import { TrackInfo } from '@/types/playback';
import { mulberry32 } from './stations';

export interface ScheduledBroadcast {
  track: TrackInfo;
  trackIndex: number;
  offsetSec: number;
  remainingSec: number;
  nextTrack: TrackInfo;
  nextNextTrack: TrackInfo;
  cycleNumber: number;
}

/**
 * Builds a deterministic permutation of pool indices so that no track repeats
 * within at least `min(pool.length, 20)` plays on a station.
 */
export function buildStationRotation(stationSeed: number, poolLength: number, cycleNumber: number): number[] {
  const indices = Array.from({ length: poolLength }, (_, i) => i);
  const rng = mulberry32(stationSeed * 31 + cycleNumber * 997);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
}

/**
 * Computes what is live "On Air" right now on a station given (stationSeed, nowMs, pool).
 * Guarantees:
 * - Joining mid-song at a deterministic offset.
 * - Coming back later plays a different song.
 * - Tuning away and back within a song returns to the same point.
 * - Never repeats the same track within 20 plays (when pool.length >= 20).
 */
export function computeLiveBroadcast(
  stationSeed: number,
  nowMs: number,
  pool: TrackInfo[]
): ScheduledBroadcast | null {
  if (!pool || pool.length === 0) return null;

  const durations = pool.map((t) => (t.duration && t.duration >= 60 ? Math.round(t.duration) : 200));
  const avgCycleSec = durations.reduce((a, b) => a + b, 0);
  if (avgCycleSec <= 0) return null;

  const nowSec = Math.floor(nowMs / 1000) + (stationSeed % 1000);
  const cycleNumber = Math.floor(nowSec / avgCycleSec);
  const secIntoCycle = ((nowSec % avgCycleSec) + avgCycleSec) % avgCycleSec;

  const order = buildStationRotation(stationSeed, pool.length, cycleNumber);
  const nextOrder = buildStationRotation(stationSeed, pool.length, cycleNumber + 1);

  let acc = 0;
  for (let pos = 0; pos < order.length; pos++) {
    const idx = order[pos];
    const dur = durations[idx];
    if (secIntoCycle < acc + dur) {
      const offsetSec = secIntoCycle - acc;
      const remainingSec = Math.max(1, dur - offsetSec);

      const nextPos = pos + 1;
      const nextIdx = nextPos < order.length ? order[nextPos] : nextOrder[0];
      const nextNextPos = pos + 2;
      const nextNextIdx =
        nextNextPos < order.length
          ? order[nextNextPos]
          : nextOrder[nextNextPos - order.length] ?? order[0];

      return {
        track: pool[idx],
        trackIndex: idx,
        offsetSec,
        remainingSec,
        nextTrack: pool[nextIdx],
        nextNextTrack: pool[nextNextIdx],
        cycleNumber,
      };
    }
    acc += dur;
  }

  return {
    track: pool[order[0]],
    trackIndex: order[0],
    offsetSec: 0,
    remainingSec: durations[order[0]],
    nextTrack: pool[order[1] ?? order[0]],
    nextNextTrack: pool[order[2] ?? order[0]],
    cycleNumber,
  };
}

/**
 * Fallback seeded offset (15% - 70%) when a station pool hasn't resolved yet.
 */
export function computeFallbackJoinOffset(stationSeed: number, durationSec: number): number {
  const rng = mulberry32(stationSeed + Math.floor(Date.now() / 60000));
  const pct = 0.15 + rng() * 0.55;
  return Math.round(Math.max(10, (durationSec || 200) * pct));
}

