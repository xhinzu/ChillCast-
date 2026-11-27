import { TrackInfo } from '@/types/playback';
import { getSettings } from '@/lib/settings/settings-store';

export const LISTENING_HISTORY_STORAGE_KEY = 'myujiku_listening_history_v1';
export const MAX_HISTORY_TRACKS = 2000;
export const MAX_TRANSITIONS = 5000;

export interface TrackHistoryRecord {
  trackKey: string;
  id: string;
  source: TrackInfo['source'];
  title: string;
  artist: string;
  artworkUrl?: string;
  duration: number;
  sourceUrl?: string;
  playCount: number;
  completeCount: number;
  skipCount: number;
  consecutiveSkips: number;
  firstPlayedAt: number;
  lastPlayedAt: number;
}

export interface TransitionRecord {
  fromKey: string;
  toKey: string;
  count: number;
  lastAt: number;
}

export interface ListeningHistoryStore {
  version: 1;
  tracks: Record<string, TrackHistoryRecord>;
  transitions: TransitionRecord[];
}

export function getTrackKey(track: Pick<TrackInfo, 'id' | 'source'>): string {
  return `${track.source || 'youtube'}:${track.id}`;
}

function emptyStore(): ListeningHistoryStore {
  return { version: 1, tracks: {}, transitions: [] };
}

export function getListeningHistory(): ListeningHistoryStore {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return emptyStore();
  }
  try {
    const raw = localStorage.getItem(LISTENING_HISTORY_STORAGE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as Partial<ListeningHistoryStore>;
    return {
      version: 1,
      tracks: parsed.tracks && typeof parsed.tracks === 'object' ? parsed.tracks : {},
      transitions: Array.isArray(parsed.transitions) ? parsed.transitions : [],
    };
  } catch {
    return emptyStore();
  }
}

function saveListeningHistory(store: ListeningHistoryStore): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    // Cap tracks at MAX_HISTORY_TRACKS by oldest lastPlayedAt
    const keys = Object.keys(store.tracks);
    if (keys.length > MAX_HISTORY_TRACKS) {
      keys
        .sort((a, b) => (store.tracks[a]?.lastPlayedAt || 0) - (store.tracks[b]?.lastPlayedAt || 0))
        .slice(0, keys.length - MAX_HISTORY_TRACKS)
        .forEach((k) => {
          delete store.tracks[k];
        });
    }
    // Cap transitions at MAX_TRANSITIONS by oldest lastAt
    if (store.transitions.length > MAX_TRANSITIONS) {
      store.transitions.sort((a, b) => b.lastAt - a.lastAt);
      store.transitions = store.transitions.slice(0, MAX_TRANSITIONS);
    }
    localStorage.setItem(LISTENING_HISTORY_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage quota errors
  }
}

function isLearningEnabled(): boolean {
  try {
    return getSettings().playback.learnListeningHistory !== false;
  } catch {
    return true;
  }
}

export function recordPlayStart(track: TrackInfo, now = Date.now()): void {
  if (!track?.id || !isLearningEnabled()) return;
  const store = getListeningHistory();
  const key = getTrackKey(track);
  const existing = store.tracks[key];
  store.tracks[key] = {
    trackKey: key,
    id: track.id,
    source: track.source,
    title: track.title,
    artist: track.artist || 'Unknown Artist',
    artworkUrl: track.artworkUrl,
    duration: track.duration || existing?.duration || 0,
    sourceUrl: track.sourceUrl || existing?.sourceUrl,
    playCount: (existing?.playCount || 0) + 1,
    completeCount: existing?.completeCount || 0,
    skipCount: existing?.skipCount || 0,
    consecutiveSkips: existing?.consecutiveSkips || 0,
    firstPlayedAt: existing?.firstPlayedAt || now,
    lastPlayedAt: now,
  };
  saveListeningHistory(store);
}

export function recordPlayComplete(track: TrackInfo, now = Date.now()): void {
  if (!track?.id || !isLearningEnabled()) return;
  const store = getListeningHistory();
  const key = getTrackKey(track);
  const existing = store.tracks[key];
  if (existing) {
    existing.completeCount += 1;
    existing.consecutiveSkips = 0;
    existing.lastPlayedAt = now;
  } else {
    store.tracks[key] = {
      trackKey: key,
      id: track.id,
      source: track.source,
      title: track.title,
      artist: track.artist || 'Unknown Artist',
      artworkUrl: track.artworkUrl,
      duration: track.duration || 0,
      sourceUrl: track.sourceUrl,
      playCount: 1,
      completeCount: 1,
      skipCount: 0,
      consecutiveSkips: 0,
      firstPlayedAt: now,
      lastPlayedAt: now,
    };
  }
  saveListeningHistory(store);
}

export function recordPlaySkip(track: TrackInfo, now = Date.now()): void {
  if (!track?.id || !isLearningEnabled()) return;
  const store = getListeningHistory();
  const key = getTrackKey(track);
  const existing = store.tracks[key];
  if (existing) {
    existing.skipCount += 1;
    existing.consecutiveSkips += 1;
    existing.lastPlayedAt = now;
    saveListeningHistory(store);
  }
}

export function recordTransition(fromTrack: TrackInfo, toTrack: TrackInfo, now = Date.now()): void {
  if (!fromTrack?.id || !toTrack?.id || !isLearningEnabled()) return;
  const fromKey = getTrackKey(fromTrack);
  const toKey = getTrackKey(toTrack);
  if (fromKey === toKey) return;

  const store = getListeningHistory();
  const existing = store.transitions.find((t) => t.fromKey === fromKey && t.toKey === toKey);
  if (existing) {
    existing.count += 1;
    existing.lastAt = now;
  } else {
    store.transitions.push({ fromKey, toKey, count: 1, lastAt: now });
  }
  saveListeningHistory(store);
}

export function clearListeningHistory(): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(LISTENING_HISTORY_STORAGE_KEY);
  } catch {}
}

