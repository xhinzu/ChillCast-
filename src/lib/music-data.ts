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
    badge: '🔥 #1 Global YT & IG',
  },
  {
    id: 'kPa7bsKwL-c',
    title: 'Die With A Smile',
    artist: 'Lady Gaga & Bruno Mars',
    duration: '4:11',
    thumbnail: 'https://img.youtube.com/vi/kPa7bsKwL-c/hqdefault.jpg',
    genre: 'Pop / Soul',
    badge: '📱 IG Viral',
  },
  {
    id: 'hOHKltAiKXQ',
    title: 'Big Dawgs',
    artist: 'Hanumankind, Kalmi',
    duration: '3:54',
    thumbnail: 'https://img.youtube.com/vi/hOHKltAiKXQ/hqdefault.jpg',
    genre: 'Hip-Hop / Rap',
    badge: '⚡ Global Sensation',
  },
  {
    id: 'eVli-tstM5E',
    title: 'Espresso',
    artist: 'Sabrina Carpenter',
    duration: '2:55',
    thumbnail: 'https://img.youtube.com/vi/eVli-tstM5E/hqdefault.jpg',
    genre: 'Nu-Disco / Pop',
    badge: '✨ Billboard Hot 100',
  },
  {
    id: 'V9PVRfjEBTI',
    title: 'Birds of a Feather',
    artist: 'Billie Eilish',
    duration: '3:17',
    thumbnail: 'https://img.youtube.com/vi/V9PVRfjEBTI/hqdefault.jpg',
    genre: 'Alt Pop / Indie',
    badge: '🎃 Spooky Melancholy',
  },
  {
    id: '5S-XQ_9c3vg',
    title: 'Timeless',
    artist: 'The Weeknd, Playboi Carti',
    duration: '4:16',
    thumbnail: 'https://img.youtube.com/vi/5S-XQ_9c3vg/hqdefault.jpg',
    genre: 'Trap / R&B',
    badge: '🔥 YT Trending',
  },
  {
    id: 'T6eK-2OQtew',
    title: 'Not Like Us',
    artist: 'Kendrick Lamar',
    duration: '4:34',
    thumbnail: 'https://img.youtube.com/vi/T6eK-2OQtew/hqdefault.jpg',
    genre: 'West Coast Hip-Hop',
    badge: '💀 Record Breaker',
  },
  {
    id: 'GCdwKhTtNNw',
    title: 'Sweater Weather',
    artist: 'The Neighbourhood',
    duration: '4:00',
    thumbnail: 'https://img.youtube.com/vi/GCdwKhTtNNw/hqdefault.jpg',
    genre: 'Indie Rock / Alt',
    badge: '🍂 Autumn Lo-Fi Hit',
  },
  {
    id: '34Na4j8AVgA',
    title: 'Starboy (feat. Daft Punk)',
    artist: 'The Weeknd',
    duration: '3:50',
    thumbnail: 'https://img.youtube.com/vi/34Na4j8AVgA/hqdefault.jpg',
    genre: 'Synthpop / R&B',
    badge: '⚡ 2B+ Streams',
  },
  {
    id: 'tOM-nWPcR4U',
    title: 'Illuminati (Aavesham)',
    artist: 'Sushin Shyam, Dabzee',
    duration: '3:12',
    thumbnail: 'https://img.youtube.com/vi/tOM-nWPcR4U/hqdefault.jpg',
    genre: 'Malayalam Hip-Hop / EDM',
    badge: '📱 Reels Anthem',
  },
  {
    id: 'lkPI4Xl6i8M',
    title: 'Tauba Tauba (Bad Newz)',
    artist: 'Karan Aujla',
    duration: '3:27',
    thumbnail: 'https://img.youtube.com/vi/lkPI4Xl6i8M/hqdefault.jpg',
    genre: 'Punjabi Pop / Dance',
    badge: '🔥 IG Trend King',
  },
  {
    id: 'B9synWjqBn8',
    title: 'FE!N',
    artist: 'Travis Scott ft. Playboi Carti',
    duration: '3:11',
    thumbnail: 'https://img.youtube.com/vi/B9synWjqBn8/hqdefault.jpg',
    genre: 'Rage / Trap',
    badge: '💀 Mosh Anthem',
  },
  {
    id: '8nL8e2C92jA',
    title: 'Gata Only',
    artist: 'FloyyMenor, Cris Mj',
    duration: '3:42',
    thumbnail: 'https://img.youtube.com/vi/8nL8e2C92jA/hqdefault.jpg',
    genre: 'Reggaeton / Latin',
    badge: '⚡ Global Top 10',
  },
  {
    id: 'PEM0Vs8jf1w',
    title: 'Golden Hour',
    artist: 'JVKE',
    duration: '3:29',
    thumbnail: 'https://img.youtube.com/vi/PEM0Vs8jf1w/hqdefault.jpg',
    genre: 'Chamber Pop / Lo-Fi',
    badge: '✨ Aesthetic Viral',
  },
  {
    id: 'GxldQ9GyXfY',
    title: 'Until I Found You',
    artist: 'Stephen Sanchez',
    duration: '2:57',
    thumbnail: 'https://img.youtube.com/vi/GxldQ9GyXfY/hqdefault.jpg',
    genre: 'Doo-Wop / Retro Pop',
    badge: '🍂 Vintage Classic',
  },
  {
    id: 'a3Ue-LN5B9U',
    title: 'Aasa Kooda',
    artist: 'Sai Abhyankkar',
    duration: '3:40',
    thumbnail: 'https://img.youtube.com/vi/a3Ue-LN5B9U/hqdefault.jpg',
    genre: 'Tamil Indie Pop',
    badge: '📱 Reels Viral',
  },
  {
    id: 'VNs_cCtdbPc',
    title: 'Millionaire (GLORY)',
    artist: 'Yo Yo Honey Singh',
    duration: '3:19',
    thumbnail: 'https://img.youtube.com/vi/VNs_cCtdbPc/hqdefault.jpg',
    genre: 'Desi Hip-Hop',
    badge: '🔥 Chart Buster',
  },
  {
    id: 'EPyl1LgNfQ8',
    title: 'Cherathukal (Kumbalangi Nights)',
    artist: 'Sushin Shyam, Sithara',
    duration: '3:41',
    thumbnail: 'https://img.youtube.com/vi/EPyl1LgNfQ8/hqdefault.jpg',
    genre: 'Acoustic Soul / Lo-Fi',
    badge: '🌙 Pure Night Chills',
  },
  {
    id: 'syFZfO_wfMQ',
    title: 'Night Changes',
    artist: 'One Direction',
    duration: '3:46',
    thumbnail: 'https://img.youtube.com/vi/syFZfO_wfMQ/hqdefault.jpg',
    genre: 'Pop Ballad / Nostalgia',
    badge: '✨ Timeless Viral',
  },
  {
    id: '4NRXx6U8ABQ',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    duration: '3:20',
    thumbnail: 'https://img.youtube.com/vi/4NRXx6U8ABQ/hqdefault.jpg',
    genre: 'Synthwave / Retro',
    badge: '⚡ All-Time Top 1',
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

export const DEFAULT_STARTER_PLAYLISTS: SavedPlaylistItem[] = [
  {
    id: 'liked-songs',
    title: 'Liked Songs',
    subtitle: '10 songs • Liked Songs',
    type: 'custom',
    targetUrl: '',
    icon: '🎃',
    tracks: ALL_GENRE_TRENDING_SONGS.slice(0, 10).map((t, idx) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      duration: t.duration,
      thumbnail: t.thumbnail,
      addedAt: Date.now() - idx * 3600000,
    })),
    description: 'Your favorite liked tracks on Chillify 🎃',
    createdAt: Date.now() - 86400000,
  },
  {
    id: 'spooky-vibes',
    title: 'Halloween Chills 🦇',
    subtitle: 'Viral Beats & Spooky Night Lo-Fi',
    type: 'custom',
    targetUrl: '',
    icon: '💀',
    tracks: [
      ALL_GENRE_TRENDING_SONGS[0], // APT.
      ALL_GENRE_TRENDING_SONGS[1], // Die With A Smile
      ALL_GENRE_TRENDING_SONGS[4], // Birds of a Feather
      ALL_GENRE_TRENDING_SONGS[7], // Sweater Weather
      ALL_GENRE_TRENDING_SONGS[8], // Starboy
    ].map((t, idx) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      duration: t.duration,
      thumbnail: t.thumbnail,
      addedAt: Date.now() - idx * 1800000,
    })),
    description: 'Curated Halloween nighttime vibes and eerie basslines',
    createdAt: Date.now() - 72000000,
  },
  {
    id: 'ig-viral-mix',
    title: 'Reels & TikTok Hits 🔥',
    subtitle: 'Top Trending Audio of 2026',
    type: 'custom',
    targetUrl: '',
    icon: '📱',
    tracks: [
      ALL_GENRE_TRENDING_SONGS[2], // Big Dawgs
      ALL_GENRE_TRENDING_SONGS[3], // Espresso
      ALL_GENRE_TRENDING_SONGS[9], // Illuminati
      ALL_GENRE_TRENDING_SONGS[10], // Tauba Tauba
      ALL_GENRE_TRENDING_SONGS[11], // FE!N
    ].map((t, idx) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      duration: t.duration,
      thumbnail: t.thumbnail,
      addedAt: Date.now() - idx * 2400000,
    })),
    description: 'All viral hits currently dominating Instagram and YouTube',
    createdAt: Date.now() - 50000000,
  },
  {
    id: 'lofi-midnight',
    title: 'Haunted Midnight Lo-Fi 🌙',
    subtitle: 'Chill late-night beats to relax/study to',
    type: 'custom',
    targetUrl: '',
    icon: '🕸️',
    tracks: [
      ALL_GENRE_TRENDING_SONGS[13], // Golden Hour
      ALL_GENRE_TRENDING_SONGS[14], // Until I Found You
      ALL_GENRE_TRENDING_SONGS[17], // Cherathukal
      ALL_GENRE_TRENDING_SONGS[18], // Night Changes
    ].map((t, idx) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      duration: t.duration,
      thumbnail: t.thumbnail,
      addedAt: Date.now() - idx * 3000000,
    })),
    description: 'Warm, acoustic, lo-fi sanctuary for spooky night owls',
    createdAt: Date.now() - 36000000,
  },
];
