import { BasePlaybackAdapter } from './base-adapter';
import { AdapterType, TrackInfo } from '@/types/playback';

export class YouTubeAdapter extends BasePlaybackAdapter {
  readonly name: AdapterType = 'youtube';
  readonly displayName = 'YouTube';

  public async initialize(): Promise<void> {
    this.emitState('idle');
  }

  public async loadPlaylist(idOrUrl: string): Promise<TrackInfo[]> {
    this.emitState('loading');
    // Placeholder ready for Stage 4 IFrame API integration
    const mockTrack: TrackInfo = {
      id: 'yt-placeholder',
      title: 'YouTube Playlist Stream',
      artist: 'YouTube Player API',
      album: idOrUrl,
      duration: 180,
      source: 'youtube',
      sourceUrl: idOrUrl,
    };
    this.emitTrack(mockTrack);
    this.emitState('paused');
    return [mockTrack];
  }

  public async loadTrack(track: TrackInfo): Promise<void> {
    this.emitTrack(track);
  }

  public async play(): Promise<void> {
    this.emitState('playing');
  }

  public pause(): void {
    this.emitState('paused');
  }

  public seek(seconds: number): void {
    this.emitPosition(seconds);
  }

  public setVolume(volume: number): void {
    this.volume = volume;
  }
}
