import { CuratedTrack, ENGLISH_TRACKS, MALAYALAM_TRACKS, HINDI_TRACKS } from './curated-tracks';
import { TrackInfo } from '@/types/playback';
import { SavedPlaylistItem } from '@/components/spotify/AddSourceModal';

export interface CatalogSong {
  id: string;
  title: string;
  artist: string;
  duration: string;
  thumbnail: string;
  category: 'english' | 'malayalam' | 'hindi' | 'recommended';
  album?: string;
}

// Convert CuratedTrack to CatalogSong
export const TRENDING_ENGLISH_SONGS: CatalogSong[] = ENGLISH_TRACKS.map((t) => ({
  ...t,
  category: 'english',
}));

export const TRENDING_MALAYALAM_SONGS: CatalogSong[] = MALAYALAM_TRACKS.map((t) => ({
  ...t,
  category: 'malayalam',
}));

export const RECOMMENDED_SONGS: CatalogSong[] = [
  ...HINDI_TRACKS.map((t) => ({ ...t, category: 'recommended' as const })),
  {
    id: 'kffacxfA7G4',
    title: 'Baby (Justin Bieber)',
    artist: 'Justin Bieber, Ludacris',
    duration: '3:45',
    thumbnail: 'https://img.youtube.com/vi/kffacxfA7G4/hqdefault.jpg',
    category: 'recommended',
  },
  {
    id: 'fJ9rUzIMcZQ',
    title: 'Bohemian Rhapsody',
    artist: 'Queen',
    duration: '5:59',
    thumbnail: 'https://img.youtube.com/vi/fJ9rUzIMcZQ/hqdefault.jpg',
    category: 'recommended',
  },
  {
    id: 'CevxZvSJLk8',
    title: 'Roar',
    artist: 'Katy Perry',
    duration: '3:42',
    thumbnail: 'https://img.youtube.com/vi/CevxZvSJLk8/hqdefault.jpg',
    category: 'recommended',
  },
  {
    id: 'JGwWNGJdvx8',
    title: 'Shape of You',
    artist: 'Ed Sheeran',
    duration: '3:53',
    thumbnail: 'https://img.youtube.com/vi/JGwWNGJdvx8/hqdefault.jpg',
    category: 'recommended',
  },
];

export function parseDurationToSeconds(durStr: string): number {
  if (!durStr) return 0;
  const parts = durStr.split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

export function catalogSongToTrackInfo(song: CatalogSong): TrackInfo {
  return {
    id: song.id,
    title: song.title,
    artist: song.artist,
    duration: parseDurationToSeconds(song.duration),
    artworkUrl: song.thumbnail,
    source: 'youtube',
    sourceUrl: song.id,
  };
}

export const DEFAULT_STARTER_PLAYLISTS: SavedPlaylistItem[] = [
  {
    id: 'liked-songs',
    title: 'Liked Songs',
    subtitle: '10 songs • Liked Songs',
    type: 'custom',
    targetUrl: '',
    icon: '💙',
    tracks: ENGLISH_TRACKS.slice(0, 10).map((t, idx) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      duration: t.duration,
      thumbnail: t.thumbnail,
      addedAt: Date.now() - idx * 3600000,
    })),
    description: 'Your favorite liked tracks on Chillify',
    createdAt: Date.now() - 86400000,
  },
  {
    id: 'chaya-ego',
    title: 'Chaya ⚡ EGO',
    subtitle: '12 songs • Custom Playlist',
    type: 'custom',
    targetUrl: '',
    icon: '☕',
    tracks: MALAYALAM_TRACKS.slice(0, 6).map((t, idx) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      duration: t.duration,
      thumbnail: t.thumbnail,
      addedAt: Date.now() - idx * 1800000,
    })),
    description: 'Aesthetic Malayalam lofi cafe vibes',
    createdAt: Date.now() - 72000000,
  },
  {
    id: 'goolar-kunju',
    title: 'goolar kunju',
    subtitle: '8 songs • Custom Playlist',
    type: 'custom',
    targetUrl: '',
    icon: '🐥',
    tracks: ENGLISH_TRACKS.slice(3, 9).map((t, idx) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      duration: t.duration,
      thumbnail: t.thumbnail,
      addedAt: Date.now() - idx * 2400000,
    })),
    description: 'Cozy late night headphone chillout',
    createdAt: Date.now() - 54000000,
  },
  {
    id: 't-val',
    title: 'T ⚡ VAL',
    subtitle: '10 songs • Custom Playlist',
    type: 'custom',
    targetUrl: '',
    icon: '⚡',
    tracks: [
      ...MALAYALAM_TRACKS.slice(0, 5).map((t) => ({ ...t, addedAt: Date.now() })),
      ...ENGLISH_TRACKS.slice(0, 5).map((t) => ({ ...t, addedAt: Date.now() })),
    ],
    description: 'High energy beats & fast tempo chill',
    createdAt: Date.now() - 36000000,
  },
  {
    id: 'xhinzu-spdy',
    title: 'xhinzu 🎧 SPDY',
    subtitle: '14 songs • Custom Playlist',
    type: 'custom',
    targetUrl: '',
    icon: '🎧',
    tracks: HINDI_TRACKS.slice(0, 8).map((t, idx) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      duration: t.duration,
      thumbnail: t.thumbnail,
      addedAt: Date.now() - idx * 3000000,
    })),
    description: 'Curated by xhinzu on Chillify',
    createdAt: Date.now() - 18000000,
  },
];
