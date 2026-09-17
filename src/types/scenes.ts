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
    name: 'Gentle Rain Drops',
    icon: '🌧️',
    type: 'video',
    videoUrl: '/videos/rain.webm',
    description: 'Calming rain falling on road with soft reflective ripples',
    accentColor: '#6366f1', // Indigo
  },
  {
    id: 'cozy-study',
    name: 'Warm Hearth Fireplace',
    icon: '🔥',
    type: 'video',
    videoUrl: '/videos/fireplace.webm',
    description: 'Warm glowing fireplace embers and cozy tranquil hearth',
    accentColor: '#f59e0b', // Amber
  },
  {
    id: 'deep-cosmos',
    name: 'Starry Night Sky',
    icon: '🌌',
    type: 'video',
    videoUrl: '/videos/night-sky.webm',
    description: 'Time-lapse of shimmering stars across the deep night sky',
    accentColor: '#a855f7', // Purple
  },
  {
    id: 'fireflies',
    name: 'Floating Fireflies',
    icon: '✨',
    type: 'canvas',
    description: 'Procedural drifting twilight bokeh particles',
    accentColor: '#10b981', // Emerald
  },
];
