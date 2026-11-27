import { TrackInfo } from '@/types/playback';
import { getTrackKey, type TrackHistoryRecord, type TransitionRecord } from '@/lib/playback/listening-history';

/**
 * Tunable scoring weights for Smart Shuffle & Familiar Picks.
 * Kept in one config object for transparency and easy calibration.
 */
export const SMART_PICK_WEIGHTS = {
  playCountWeight: 2.4,
  playCountCap: 12,
  completionRatioWeight: 4.0,
  likedBonus: 5.5,
  inPlaylistBonus: 3.0,
  sameArtistBonus: 3.8,
  coPlayTransitionWeight: 3.5,
  coPlayTransitionCap: 6,
  recencyHalfLifeDays: 14,
  recencyMaxBonus: 2.5,
  recentCooldownMs: 2 * 60 * 60 * 1000, // 2 hours
  recentCooldownPenalty: -6.0,
  skipRatioPenalty: -5.0,
  consecutiveSkipPenalty: -3.5,
  newSuggestionJitterMax: 1.5,
  tieBreakerJitter: 0.75,
} as const;

export interface SmartPickCandidate {
  track: TrackInfo;
  isLiked?: boolean;
  inPlaylist?: boolean;
  isNewSuggestion?: boolean;
}

export interface SmartPickResult {
  track: TrackInfo;
  score: number;
  reason: string;
  isNewSuggestion: boolean;
}

export interface SelectSmartPicksInput {
  currentTrack: TrackInfo;
  candidates: SmartPickCandidate[];
  historyTracks: Record<string, TrackHistoryRecord>;
  transitions: TransitionRecord[];
  recentTrackIds: Set<string>;
  queueTrackIds: Set<string>;
  sessionRemovedIds: Set<string>;
  recentArtists: string[];
  includeNewPct?: number; // 0..50
  count?: number;
  seed?: number;
  now?: number;
}

function normalizeArtist(artist: string | undefined): string {
  return (artist || '')
    .toLowerCase()
    .replace(/\s*-\s*topic$/i, '')
    .replace(/\s*(vevo|official)$/i, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function createSeededRng(seed: number): () => number {
  let state = (seed >>> 0) || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

export function scoreSmartCandidate(
  candidate: SmartPickCandidate,
  ctx: {
    currentTrack: TrackInfo;
    currentKey: string;
    currentArtistNorm: string;
    historyTracks: Record<string, TrackHistoryRecord>;
    transitionMap: Map<string, number>;
    now: number;
    rng: () => number;
  }
): { score: number; reason: string } {
  const w = SMART_PICK_WEIGHTS;
  const key = getTrackKey(candidate.track);
  const stats = ctx.historyTracks[key];

  let score = 0;
  let topSignal = 'From your library';
  let topContribution = 0;

  const trackSignal = (label: string, value: number) => {
    score += value;
    if (value > topContribution) {
      topContribution = value;
      topSignal = label;
    }
  };

  if (stats) {
    const cappedPlays = Math.min(stats.playCount, w.playCountCap);
    trackSignal('Frequently replayed', (cappedPlays / w.playCountCap) * w.playCountWeight);

    if (stats.playCount > 0) {
      const completionRatio = Math.min(1, stats.completeCount / stats.playCount);
      trackSignal('You usually finish this', completionRatio * w.completionRatioWeight);

      const skipRatio = Math.min(1, stats.skipCount / stats.playCount);
      score += skipRatio * w.skipRatioPenalty;
    }

    if (stats.consecutiveSkips > 0) {
      score += Math.min(3, stats.consecutiveSkips) * w.consecutiveSkipPenalty;
    }

    const ageMs = Math.max(0, ctx.now - stats.lastPlayedAt);
    if (ageMs < w.recentCooldownMs) {
      score += w.recentCooldownPenalty;
    } else {
      const ageDays = ageMs / (24 * 60 * 60 * 1000);
      const decay = Math.exp(-ageDays / w.recencyHalfLifeDays);
      trackSignal('Recently enjoyed', decay * w.recencyMaxBonus);
    }
  }

  if (candidate.isLiked) {
    trackSignal('From your Liked Songs', w.likedBonus);
  }

  if (candidate.inPlaylist) {
    trackSignal('From your playlists', w.inPlaylistBonus);
  }

  const candArtistNorm = normalizeArtist(candidate.track.artist);
  if (ctx.currentArtistNorm && candArtistNorm && candArtistNorm === ctx.currentArtistNorm) {
    trackSignal('Same artist you are listening to', w.sameArtistBonus);
  }

  const coPlayCount = ctx.transitionMap.get(key) || 0;
  if (coPlayCount > 0) {
    const cappedTrans = Math.min(coPlayCount, w.coPlayTransitionCap);
    trackSignal('Often played after this', (cappedTrans / w.coPlayTransitionCap) * w.coPlayTransitionWeight);
  }

  if (candidate.isNewSuggestion) {
    score += ctx.rng() * w.newSuggestionJitterMax;
    if (topContribution <= 0) {
      topSignal = 'New suggestion for your vibe';
    }
  } else {
    score += ctx.rng() * w.tieBreakerJitter;
  }

  return { score, reason: topSignal };
}

export function selectSmartPicks(input: SelectSmartPicksInput): SmartPickResult[] {
  const {
    currentTrack,
    candidates,
    historyTracks,
    transitions,
    recentTrackIds,
    queueTrackIds,
    sessionRemovedIds,
    recentArtists,
    includeNewPct = 20,
    count = 1,
    seed = 42,
    now = Date.now(),
  } = input;

  const rng = createSeededRng(seed);
  const currentKey = getTrackKey(currentTrack);
  const currentArtistNorm = normalizeArtist(currentTrack.artist);

  // Build transition lookup from currentKey -> toKey
  const transitionMap = new Map<string, number>();
  for (const t of transitions) {
    if (t.fromKey === currentKey) {
      transitionMap.set(t.toKey, (transitionMap.get(t.toKey) || 0) + t.count);
    }
  }

  // Deduplicate candidates by track id & exclude current, recent, queued, and session-removed
  const seenIds = new Set<string>();
  const filtered: SmartPickCandidate[] = [];
  for (const cand of candidates) {
    const id = cand.track?.id;
    if (!id || seenIds.has(id)) continue;
    if (id === currentTrack.id) continue;
    if (recentTrackIds.has(id)) continue;
    if (queueTrackIds.has(id)) continue;
    if (sessionRemovedIds.has(id)) continue;
    seenIds.add(id);
    filtered.push(cand);
  }

  if (filtered.length === 0) return [];

  const scored: SmartPickResult[] = filtered.map((cand) => {
    const { score, reason } = scoreSmartCandidate(cand, {
      currentTrack,
      currentKey,
      currentArtistNorm,
      historyTracks,
      transitionMap,
      now,
      rng,
    });
    return {
      track: cand.track,
      score,
      reason,
      isNewSuggestion: Boolean(cand.isNewSuggestion),
    };
  });

  scored.sort((a, b) => b.score - a.score);

  const clampedNewPct = Math.max(0, Math.min(50, includeNewPct));
  const preferNew = clampedNewPct > 0 && rng() * 100 < clampedNewPct;

  const results: SmartPickResult[] = [];
  const rollingArtists = [...recentArtists].map(normalizeArtist).filter(Boolean);
  const pickedIds = new Set<string>();

  const canPickArtist = (artist: string): boolean => {
    const norm = normalizeArtist(artist);
    if (!norm || rollingArtists.length < 2) return true;
    const len = rollingArtists.length;
    return !(rollingArtists[len - 1] === norm && rollingArtists[len - 2] === norm);
  };

  for (let i = 0; i < count; i++) {
    const wantNew = i === 0 && preferNew;
    let chosen = scored.find(
      (s) => !pickedIds.has(s.track.id) && canPickArtist(s.track.artist) && (wantNew ? s.isNewSuggestion : !s.isNewSuggestion)
    );
    if (!chosen) {
      chosen = scored.find((s) => !pickedIds.has(s.track.id) && canPickArtist(s.track.artist));
    }
    if (!chosen) {
      chosen = scored.find((s) => !pickedIds.has(s.track.id));
    }
    if (!chosen) break;

    pickedIds.add(chosen.track.id);
    const norm = normalizeArtist(chosen.track.artist);
    if (norm) rollingArtists.push(norm);
    results.push(chosen);
  }

  return results;
}

