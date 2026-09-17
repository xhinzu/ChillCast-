export type SceneId = 'rain' | 'thunderstorm' | 'snow' | 'fireplace' | 'night-sky' | 'fireflies';

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
    id: 'rain',
    name: 'Gentle Rain Downpour',
    icon: '🌧️',
    type: 'video',
    videoUrl: '/videos/rain.mp4',
    description: 'High-definition rhythmic rainfall and water ripples',
    accentColor: '#6366f1', // Indigo
  },
  {
    id: 'thunderstorm',
    name: 'Distant Thunderstorm',
    icon: '⚡',
    type: 'video',
    videoUrl: '/videos/thunderstorm.mp4',
    description: 'Moody atmospheric dark clouds and lightning storm',
    accentColor: '#38bdf8', // Sky blue
  },
  {
    id: 'snow',
    name: 'Quiet Winter Snow',
    icon: '❄️',
    type: 'video',
    videoUrl: '/videos/snow.mp4',
    description: 'Slow drifting snow falling softly through twilight',
    accentColor: '#e0e7ff', // Soft frost
  },
  {
    id: 'fireplace',
    name: 'Warm Hearth Fireplace',
    icon: '🔥',
    type: 'video',
    videoUrl: '/videos/fireplace.webm',
    description: 'Cozy golden glowing hearth fire and warm crackling embers',
    accentColor: '#f59e0b', // Amber
  },
  {
    id: 'night-sky',
    name: 'Starry Celestial Sky',
    icon: '🌌',
    type: 'video',
    videoUrl: '/videos/night-sky.webm',
    description: 'Deep time-lapse of shining stars and cosmic galaxy dust',
    accentColor: '#c084fc', // Purple
  },
  {
    id: 'fireflies',
    name: 'Floating Twilight Embers',
    icon: '✨',
    type: 'canvas',
    description: 'Real-time procedural 60fps drifting bokeh particles',
    accentColor: '#10b981', // Emerald
  },
];
