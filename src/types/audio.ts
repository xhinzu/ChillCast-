export type AmbientSoundId =
  | 'spooky'
  | 'rain'
  | 'thunder'
  | 'wind'
  | 'drums'
  | 'fireplace'
  | 'birds'
  | 'crickets'
  | 'bass'
  | 'chatter';

export interface AmbientSoundConfig {
  id: AmbientSoundId;
  name: string;
  icon: string;
  description: string;
  defaultVolume: number;
  youtubeId?: string;
}

export interface AmbientSoundState {
  volume: number; // 0 to 1
  isMuted: boolean;
  isPlaying: boolean;
}

export interface LocalTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // in seconds
  src: string;
  coverUrl: string;
}
