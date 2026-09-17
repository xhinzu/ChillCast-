import { BasePlaybackAdapter } from './base-adapter';
import { AdapterType, TrackInfo } from '@/types/playback';

export class SpotifyAdapter extends BasePlaybackAdapter {
  readonly name: AdapterType = 'spotify';
  readonly displayName = 'Spotify';

  public async initialize(): Promise<void> {
    this.emitState('idle');
  }

  public async loadPlaylist(idOrUrl: string): Promise<TrackInfo[]> {
    this.emitState('loading');
    const mockTrack: TrackInfo = {
      id: 'spotify-placeholder',
      title: 'Spotify Stream',
      artist: 'Spotify Web SDK',
      album: idOrUrl,
      duration: 210,
      source: 'spotify',
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
