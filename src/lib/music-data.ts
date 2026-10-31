import { TrackInfo } from '@/types/playback';
import { SavedPlaylistItem } from '@/components/spotify/AddSourceModal';

export interface TrendingSong {
  id: string;
  title: string;
  artist: string;
  duration: string;
  thumbnail: string;
  genre: string;
  badge?: string;
  sourceUrl?: string;
}

// -------------------------------------------------------------
// ALL-GENRE TRENDING SONGS (LATEST VIRAL HITS FROM YT & IG)
// -------------------------------------------------------------
export const ALL_GENRE_TRENDING_SONGS: TrendingSong[] = [
  {
    id: 'ekr2nIex040',
    title: 'APT.',
    artist: 'ROSÉ & Bruno Mars',
    duration: '2:53',
    thumbnail: 'https://img.youtube.com/vi/ekr2nIex040/hqdefault.jpg',
    genre: 'Viral Pop / Punk',
    badge: '#1 Global YT & IG',
  },
  {
    id: 'kPa7bsKwL-c',
    title: 'Die With A Smile',
    artist: 'Lady Gaga & Bruno Mars',
    duration: '4:11',
    thumbnail: 'https://img.youtube.com/vi/kPa7bsKwL-c/hqdefault.jpg',
    genre: 'Pop / Soul',
    badge: 'IG Viral',
  },
  {
    id: 'hOHKltAiKXQ',
    title: 'Big Dawgs',
    artist: 'Hanumankind, Kalmi',
    duration: '3:54',
    thumbnail: 'https://img.youtube.com/vi/hOHKltAiKXQ/hqdefault.jpg',
    genre: 'Hip-Hop / Rap',
    badge: 'Global Sensation',
  },
  {
    id: 'eVli-tstM5E',
    title: 'Espresso',
    artist: 'Sabrina Carpenter',
    duration: '2:55',
    thumbnail: 'https://img.youtube.com/vi/eVli-tstM5E/hqdefault.jpg',
    genre: 'Nu-Disco / Pop',
    badge: 'Billboard Hot 100',
  },
  {
    id: 'V9PVRfjEBTI',
    title: 'Birds of a Feather',
    artist: 'Billie Eilish',
    duration: '3:17',
    thumbnail: 'https://img.youtube.com/vi/V9PVRfjEBTI/hqdefault.jpg',
    genre: 'Alt Pop / Indie',
    badge: 'Billboard Hot 100',
  },
  {
    id: 'mX19AV35PhI',
    title: 'Timeless',
    artist: 'The Weeknd, Playboi Carti',
    duration: '4:16',
    thumbnail: 'https://img.youtube.com/vi/mX19AV35PhI/hqdefault.jpg',
    genre: 'Trap / R&B',
    badge: 'YT Trending',
  },
  {
    id: 'T6eK-2OQtew',
    title: 'Not Like Us',
    artist: 'Kendrick Lamar',
    duration: '4:34',
    thumbnail: 'https://img.youtube.com/vi/T6eK-2OQtew/hqdefault.jpg',
    genre: 'West Coast Hip-Hop',
    badge: 'Chart Topper',
  },
  {
    id: 'GCdwKhTtNNw',
    title: 'Sweater Weather',
    artist: 'The Neighbourhood',
    duration: '4:00',
    thumbnail: 'https://img.youtube.com/vi/GCdwKhTtNNw/hqdefault.jpg',
    genre: 'Indie Rock / Alt',
    badge: 'Autumn Chill Hit',
  },
  {
    id: '34Na4j8AVgA',
    title: 'Starboy (feat. Daft Punk)',
    artist: 'The Weeknd',
    duration: '3:50',
    thumbnail: 'https://img.youtube.com/vi/34Na4j8AVgA/hqdefault.jpg',
    genre: 'Synthpop / R&B',
    badge: '2B+ Streams',
  },
  {
    id: 'tOM-nWPcR4U',
    title: 'Illuminati (Aavesham)',
    artist: 'Sushin Shyam, Dabzee',
    duration: '3:12',
    thumbnail: 'https://img.youtube.com/vi/tOM-nWPcR4U/hqdefault.jpg',
    genre: 'Malayalam Hip-Hop / EDM',
    badge: 'Reels Anthem',
  },
  {
    id: 'BBrQWOuE_pg',
    title: 'Tauba Tauba (Bad Newz)',
    artist: 'Karan Aujla',
    duration: '3:27',
    thumbnail: 'https://img.youtube.com/vi/BBrQWOuE_pg/hqdefault.jpg',
    genre: 'Punjabi Pop / Dance',
    badge: 'Top Trend',
  },
  {
    id: 'B9synWjqBn8',
    title: 'FE!N',
    artist: 'Travis Scott ft. Playboi Carti',
    duration: '3:11',
    thumbnail: 'https://img.youtube.com/vi/B9synWjqBn8/hqdefault.jpg',
    genre: 'Rage / Trap',
    badge: 'Global Hit',
  },
  {
    id: 'TVEuKyr0M58',
    title: 'Gata Only',
    artist: 'FloyyMenor, Cris Mj',
    duration: '3:42',
    thumbnail: 'https://img.youtube.com/vi/TVEuKyr0M58/hqdefault.jpg',
    genre: 'Reggaeton / Latin',
    badge: 'Global Top 10',
  },
  {
    id: 'PEM0Vs8jf1w',
    title: 'Golden Hour',
    artist: 'JVKE',
    duration: '3:29',
    thumbnail: 'https://img.youtube.com/vi/PEM0Vs8jf1w/hqdefault.jpg',
    genre: 'Chamber Pop / Lo-Fi',
    badge: 'Aesthetic Viral',
  },
  {
    id: 'MlThQTo6D8A',
    title: 'Until I Found You',
    artist: 'Stephen Sanchez',
    duration: '2:57',
    thumbnail: 'https://img.youtube.com/vi/MlThQTo6D8A/hqdefault.jpg',
    genre: 'Doo-Wop / Retro Pop',
    badge: 'Vintage Classic',
  },
  {
    id: 'a3Ue-LN5B9U',
    title: 'Aasa Kooda',
    artist: 'Sai Abhyankkar',
    duration: '3:40',
    thumbnail: 'https://img.youtube.com/vi/a3Ue-LN5B9U/hqdefault.jpg',
    genre: 'Tamil Indie Pop',
    badge: 'Reels Viral',
  },
  {
    id: 'VNs_cCtdbPc',
    title: 'Millionaire (GLORY)',
    artist: 'Yo Yo Honey Singh',
    duration: '3:19',
    thumbnail: 'https://img.youtube.com/vi/VNs_cCtdbPc/hqdefault.jpg',
    genre: 'Desi Hip-Hop',
    badge: 'Chart Buster',
  },
  {
    id: 'JukNAg7bz6I',
    title: 'Cherathukal (Kumbalangi Nights)',
    artist: 'Sushin Shyam, Sithara',
    duration: '3:41',
    thumbnail: 'https://img.youtube.com/vi/JukNAg7bz6I/hqdefault.jpg',
    genre: 'Acoustic Soul / Lo-Fi',
    badge: 'Pure Night Chills',
  },
  {
    id: 'syFZfO_wfMQ',
    title: 'Night Changes',
    artist: 'One Direction',
    duration: '3:46',
    thumbnail: 'https://img.youtube.com/vi/syFZfO_wfMQ/hqdefault.jpg',
    genre: 'Pop Ballad / Nostalgia',
    badge: 'Timeless Viral',
  },
  {
    id: '4NRXx6U8ABQ',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    duration: '3:20',
    thumbnail: 'https://img.youtube.com/vi/4NRXx6U8ABQ/hqdefault.jpg',
    genre: 'Synthwave / Retro',
    badge: 'All-Time Top 1',
  },
];

// Compatibility alias for components
export const TRENDING_SONGS = ALL_GENRE_TRENDING_SONGS;

export function parseDurationToSeconds(durStr: string): number {
  if (!durStr) return 0;
  const parts = durStr.split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

export function trendingSongToTrackInfo(song: TrendingSong): TrackInfo {
  return {
    id: song.id,
    title: song.title,
    artist: song.artist,
    duration: parseDurationToSeconds(song.duration),
    artworkUrl: song.thumbnail,
    source: 'youtube',
    sourceUrl: `https://www.youtube.com/watch?v=${song.id}`,
  };
}

export const DEFAULT_STARTER_PLAYLISTS: SavedPlaylistItem[] = [];
