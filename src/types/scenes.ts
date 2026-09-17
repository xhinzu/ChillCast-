export type SceneId = 'rainy-city' | 'cozy-study' | 'deep-cosmos' | 'fireflies';

export interface AmbientScene {
  id: SceneId;
  name: string;
  icon: string;
  type: 'video' | 'canvas';
  videoUrl?: string;
  description: string;
  accentColor: string;
}

export const AMBIENT_SCENES: AmbientScene[] = [
  {
    id: 'rainy-city',
    name: 'Rainy Tokyo Night',
    icon: '🌧️',
    type: 'video',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-rain-falling-on-the-water-of-a-lake-seen-up-18312-large.mp4',
    description: 'Gentle raindrops on glass with shimmering city lights',
    accentColor: '#6366f1', // Indigo
  },
  {
    id: 'cozy-study',
    name: 'Cozy Room Ambiance',
    icon: '☕',
    type: 'video',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-coffee-cup-with-steam-rising-in-a-warm-room-42999-large.mp4',
    description: 'Warm coffee steam and peaceful twilight shadows',
    accentColor: '#f59e0b', // Amber
  },
  {
    id: 'deep-cosmos',
    name: 'Starlit Nebula',
    icon: '🌌',
    type: 'video',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-stars-in-space-background-1610-large.mp4',
    description: 'Slow drifting starfield and deep celestial indigo clouds',
    accentColor: '#a855f7', // Purple
  },
  {
    id: 'fireflies',
    name: 'Glowing Fireflies',
    icon: '✨',
    type: 'canvas',
    description: 'Procedural drifting twilight particles and soft bokeh',
    accentColor: '#10b981', // Emerald
  },
];
