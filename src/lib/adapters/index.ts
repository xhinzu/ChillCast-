import { AdapterType, PlaybackAdapter } from '@/types/playback';
import { LocalAudioAdapter } from './local-adapter';
import { YouTubeAdapter } from './youtube-adapter';
import { SpotifyAdapter } from './spotify-adapter';

export function createAdapter(type: AdapterType): PlaybackAdapter {
  switch (type) {
    case 'local':
      return new LocalAudioAdapter();
    case 'youtube':
      return new YouTubeAdapter();
    case 'spotify':
      return new SpotifyAdapter();
    default:
      return new LocalAudioAdapter();
  }
}

export { BasePlaybackAdapter } from './base-adapter';
export { LocalAudioAdapter } from './local-adapter';
export { YouTubeAdapter } from './youtube-adapter';
export { SpotifyAdapter } from './spotify-adapter';
