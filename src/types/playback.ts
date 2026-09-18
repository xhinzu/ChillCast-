export type AdapterType = 'local' | 'youtube' | 'spotify';

export type PlaybackState =
  | 'idle'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'buffering'
  | 'ended'
  | 'error';

export interface TrackInfo {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number; // in seconds
  artworkUrl?: string;
  source: AdapterType;
  sourceUrl?: string;
}

export type PositionCallback = (positionSeconds: number) => void;
export type TrackCallback = (track: TrackInfo | null) => void;
export type StateCallback = (state: PlaybackState) => void;
export type ErrorCallback = (error: string) => void;

export interface PlaybackAdapter {
  readonly name: AdapterType;
  readonly displayName: string;

  /**
   * Initializes the player instance (e.g. mounts iframe or connects SDK).
   */
  initialize(containerElement?: HTMLElement | null): Promise<void>;

  /**
   * Loads a playlist or audio stream by URL or identifier.
   */
  loadPlaylist(idOrUrl: string): Promise<TrackInfo[]>;

  /**
   * Loads a specific track into playback.
   */
  loadTrack(track: TrackInfo): Promise<void>;

  play(): Promise<void>;
  pause(): void;
  seek(seconds: number): void;
  setVolume(volume: number): void; // 0 to 1
  getVolume(): number;
  getPosition(): number;
  getDuration(): number;
  getState(): PlaybackState;
  getCurrentTrack(): TrackInfo | null;

  /**
   * Subscriptions returning an unsubscribe function.
   */
  onPositionChange(callback: PositionCallback): () => void;
  onTrackChange(callback: TrackCallback): () => void;
  onStateChange(callback: StateCallback): () => void;
  onError(callback: ErrorCallback): () => void;

  /**
   * Optional spatial and filter DSP effects
   */
  setSpatial8D?(enabled: boolean): void;
  setMuffled?(enabled: boolean): void;

  cleanup(): void;
}
