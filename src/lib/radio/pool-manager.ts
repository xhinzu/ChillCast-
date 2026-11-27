import { TrackInfo } from '@/types/playback';
import { filterCandidates, type AutoplayCandidate } from '@/lib/playback/autoplay';
import { buildLocalSmartCandidates, fetchNewSuggestionCandidates } from '@/lib/playback/smart-pool';
import { getListeningHistory } from '@/lib/playback/listening-history';
import { selectSmartPicks } from '@/lib/smartPicks';
import type { RadioStation } from './stations';

export const RADIO_POOLS_STORAGE_KEY = 'myujiku_radio_pools_v1';
export const POOL_TTL_MS = 24 * 60 * 60 * 1000;

export interface CachedStationPool {
  stationId: string;
  tracks: TrackInfo[];
  fetchedAt: number;
}

interface PoolCacheBlob {
  version: 1;
  pools: Record<string, CachedStationPool>;
}

const inFlight = new Map<string, Promise<TrackInfo[]>>();
let activeRequests = 0;
const MAX_CONCURRENT = 2;

function readPoolCache(): PoolCacheBlob {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return { version: 1, pools: {} };
  }
  try {
    const raw = localStorage.getItem(RADIO_POOLS_STORAGE_KEY);
    if (!raw) return { version: 1, pools: {} };
    const parsed = JSON.parse(raw) as PoolCacheBlob;
    return parsed?.pools ? parsed : { version: 1, pools: {} };
  } catch {
    return { version: 1, pools: {} };
  }
}

function writePoolCache(blob: PoolCacheBlob): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(RADIO_POOLS_STORAGE_KEY, JSON.stringify(blob));
  } catch {}
}

export function getCachedStationPool(stationId: string, now = Date.now()): TrackInfo[] | null {
  const blob = readPoolCache();
  const entry = blob.pools[stationId];
  if (!entry || !Array.isArray(entry.tracks) || entry.tracks.length === 0) return null;
  if (now - entry.fetchedAt > POOL_TTL_MS) return null;
  return entry.tracks;
}

export function clearRadioPoolCache(): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(RADIO_POOLS_STORAGE_KEY);
  } catch {}
}

async function resolveTemplateQueries(station: RadioStation): Promise<TrackInfo[]> {
  const collected: AutoplayCandidate[] = [];
  const seen = new Set<string>();

  for (const q of station.queries.slice(0, 4)) {
    try {
      const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) continue;
      const data = await res.json();
      const items = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
      for (const r of items) {
        const id = r.id || r.videoId;
        if (!id || seen.has(id)) continue;
        let durSec = 200;
        if (typeof r.duration === 'number') durSec = r.duration;
        else if (typeof r.durationSec === 'number') durSec = r.durationSec;
        else if (typeof r.duration === 'string') {
          const parts = r.duration.split(':').map(Number);
          if (parts.length === 2 && !parts.some(isNaN)) durSec = parts[0] * 60 + parts[1];
          if (parts.length === 3 && !parts.some(isNaN)) durSec = parts[0] * 3600 + parts[1] * 60 + parts[2];
        }
        // Radio filter: 1.5 - 8 minutes
        if (durSec < 90 || durSec > 480) continue;
        seen.add(id);
        collected.push({
          id,
          title: r.title || 'Untitled',
          artist: r.channel || r.artist || 'Unknown Artist',
          duration: durSec,
          thumbnail: r.thumbnail || r.artworkUrl,
          artworkUrl: r.artworkUrl || r.thumbnail,
        });
      }
    } catch {
      // Continue to next query
    }
  }

  const filtered = filterCandidates(collected, new Set(), []);
  return filtered.slice(0, 30).map((c) => ({
    id: c.id,
    title: c.title,
    artist: c.artist,
    duration: c.duration || 200,
    source: 'youtube',
    sourceUrl: `https://www.youtube.com/watch?v=${c.id}`,
    artworkUrl: c.artworkUrl || c.thumbnail || `https://i.ytimg.com/vi/${c.id}/hqdefault.jpg`,
  }));
}

export async function ensureStationPool(
  station: RadioStation,
  forceRefresh = false
): Promise<{ tracks: TrackInfo[]; weakSignal: boolean }> {
  if (!forceRefresh) {
    const cached = getCachedStationPool(station.id);
    if (cached && cached.length > 0) {
      return { tracks: cached, weakSignal: false };
    }
  }

  const existingPromise = inFlight.get(station.id);
  if (existingPromise) {
    const tracks = await existingPromise;
    return { tracks, weakSignal: tracks.length === 0 };
  }

  const run = async (): Promise<TrackInfo[]> => {
    while (activeRequests >= MAX_CONCURRENT) {
      await new Promise((r) => setTimeout(r, 180));
    }
    activeRequests++;
    try {
      let tracks: TrackInfo[] = [];

      if (station.isPersonal === 'library') {
        const localCands = buildLocalSmartCandidates();
        if (localCands.length > 0) {
          const hist = getListeningHistory();
          const picks = selectSmartPicks({
            currentTrack: localCands[0].track,
            candidates: localCands,
            historyTracks: hist.tracks,
            transitions: hist.transitions,
            recentTrackIds: new Set(),
            queueTrackIds: new Set(),
            sessionRemovedIds: new Set(),
            recentArtists: [],
            includeNewPct: 0,
            count: Math.min(30, localCands.length),
            seed: station.jingleSeed,
          });
          tracks = picks.map((p) => p.track);
          if (tracks.length < localCands.length) {
            const have = new Set(tracks.map((t) => t.id));
            for (const c of localCands) {
              if (!have.has(c.track.id)) tracks.push(c.track);
            }
          }
        }
        if (tracks.length === 0) {
          tracks = await resolveTemplateQueries({ ...station, queries: ['chill indie hits audio', 'lofi beats'] });
        }
      } else if (station.isPersonal === 'discover') {
        const localCands = buildLocalSmartCandidates();
        const seedTrack: TrackInfo = localCands[0]?.track || {
          id: 'seed',
          title: 'Midnight City',
          artist: 'Electronic Indie',
          duration: 210,
          source: 'youtube',
        };
        const extra = await fetchNewSuggestionCandidates(seedTrack, new Set(), []);
        tracks = extra.map((c) => c.track);
        if (tracks.length < 6) {
          const more = await resolveTemplateQueries({ ...station, queries: ['indie pop discovery audio', 'new electronic chill tracks'] });
          tracks = [...tracks, ...more];
        }
      } else {
        tracks = await resolveTemplateQueries(station);
      }

      if (tracks.length > 0) {
        const blob = readPoolCache();
        blob.pools[station.id] = {
          stationId: station.id,
          tracks,
          fetchedAt: Date.now(),
        };
        writePoolCache(blob);
      }
      return tracks;
    } finally {
      activeRequests = Math.max(0, activeRequests - 1);
      inFlight.delete(station.id);
    }
  };

  const p = run();
  inFlight.set(station.id, p);
  const tracks = await p;
  return { tracks, weakSignal: tracks.length === 0 };
}

export function prefetchNeighborStations(station: RadioStation, allStations: RadioStation[]): void {
  const sameBand = allStations.filter((s) => s.band === station.band).sort((a, b) => a.frequency - b.frequency);
  const idx = sameBand.findIndex((s) => s.id === station.id);
  if (idx === -1) return;
  const neighbors = [sameBand[idx - 1], sameBand[idx + 1]].filter(Boolean) as RadioStation[];
  for (const nb of neighbors) {
    if (!getCachedStationPool(nb.id)) {
      void ensureStationPool(nb).catch(() => {});
    }
  }
}

