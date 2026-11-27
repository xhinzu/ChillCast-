import { TrackInfo } from '@/types/playback';
import { getSavedPlaylists } from '@/lib/playlist-storage';
import { getListeningHistory } from '@/lib/playback/listening-history';
import { filterCandidates } from '@/lib/playback/autoplay';
import type { SmartPickCandidate } from '@/lib/smartPicks';

export function buildLocalSmartCandidates(): SmartPickCandidate[] {
  const playlists = getSavedPlaylists();
  const history = getListeningHistory();

  const likedIds = new Set<string>();
  const playlistIds = new Set<string>();
  const map = new Map<string, SmartPickCandidate>();

  for (const pl of playlists) {
    const isLikedPl = pl.id === 'liked-songs';
    for (const t of pl.tracks || []) {
      if (!t?.id) continue;
      if (isLikedPl) likedIds.add(t.id);
      else playlistIds.add(t.id);

      if (!map.has(t.id)) {
        map.set(t.id, {
          track: {
            id: t.id,
            title: t.title,
            artist: t.artist || 'Unknown Artist',
            artworkUrl: t.thumbnail,
            duration: typeof t.duration === 'number' ? t.duration : 0,
            source: 'youtube',
          },
          isLiked: isLikedPl,
          inPlaylist: !isLikedPl,
          isNewSuggestion: false,
        });
      } else {
        const entry = map.get(t.id)!;
        if (isLikedPl) entry.isLiked = true;
        else entry.inPlaylist = true;
      }
    }
  }

  for (const rec of Object.values(history.tracks)) {
    if (!rec?.id) continue;
    if (!map.has(rec.id)) {
      map.set(rec.id, {
        track: {
          id: rec.id,
          title: rec.title,
          artist: rec.artist || 'Unknown Artist',
          artworkUrl: rec.artworkUrl,
          duration: rec.duration || 0,
          source: rec.source || 'youtube',
          sourceUrl: rec.sourceUrl,
        },
        isLiked: likedIds.has(rec.id),
        inPlaylist: playlistIds.has(rec.id),
        isNewSuggestion: false,
      });
    }
  }

  return Array.from(map.values());
}

export async function fetchNewSuggestionCandidates(
  seedTrack: TrackInfo,
  recentTrackIds: Set<string>,
  recentArtists: string[]
): Promise<SmartPickCandidate[]> {
  if (typeof fetch === 'undefined' || !seedTrack?.title) return [];
  try {
    const q = seedTrack.artist
      ? `${seedTrack.artist} similar songs`
      : `${seedTrack.title} audio`;
    const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(q)}`);
    if (!res.ok) return [];
    const data = await res.json();
    const items = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
    const mapped = items.map((item: {
      videoId?: string;
      id?: string;
      title?: string;
      artist?: string;
      author?: string;
      thumbnail?: string;
      artworkUrl?: string;
      durationSec?: number;
      duration?: number;
    }) => ({
      id: item.videoId || item.id || '',
      title: item.title || '',
      artist: item.artist || item.author || 'Unknown Artist',
      artworkUrl: item.thumbnail || item.artworkUrl,
      duration: item.durationSec || item.duration || 210,
    })).filter((x: { id: string }) => Boolean(x.id));

    const filtered = filterCandidates(mapped, recentTrackIds, recentArtists);
    return filtered.slice(0, 6).map((c) => ({
      track: {
        id: c.id,
        title: c.title,
        artist: c.artist,
        artworkUrl: c.artworkUrl,
        duration: c.duration || 210,
        source: 'youtube',
      },
      isLiked: false,
      inPlaylist: false,
      isNewSuggestion: true,
    }));
  } catch {
    return [];
  }
}

