export {};

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady?: () => void;
    Spotify?: {
      Player: new (options: SpotifyPlayerInit) => SpotifyWebPlayer;
    };
  }
}

export interface SpotifyPlayerInit {
  name: string;
  getOAuthToken: (cb: (token: string) => void) => void;
  volume?: number;
}

export interface SpotifyWebPlaybackTrack {
  id: string;
  uri: string;
  type: string;
  media_type: string;
  name: string;
  is_playable: boolean;
  album: {
    uri: string;
    name: string;
    images: Array<{ url: string }>;
  };
  artists: Array<{
    uri: string;
    name: string;
  }>;
}

export interface SpotifyPlaybackState {
  context: {
    uri: string | null;
    metadata: Record<string, unknown> | null;
  };
  duration: number; // ms
  paused: boolean;
  position: number; // ms
  repeat_mode: number;
  shuffle: boolean;
  track_window: {
    current_track: SpotifyWebPlaybackTrack;
    previous_tracks: SpotifyWebPlaybackTrack[];
    next_tracks: SpotifyWebPlaybackTrack[];
  };
}

export interface SpotifyWebPlayer {
  connect(): Promise<boolean>;
  disconnect(): void;
  addListener(event: 'ready', cb: (data: { device_id: string }) => void): boolean;
  addListener(event: 'not_ready', cb: (data: { device_id: string }) => void): boolean;
  addListener(event: 'player_state_changed', cb: (state: SpotifyPlaybackState | null) => void): boolean;
  addListener(event: 'initialization_error', cb: (err: { message: string }) => void): boolean;
  addListener(event: 'authentication_error', cb: (err: { message: string }) => void): boolean;
  addListener(event: 'account_error', cb: (err: { message: string }) => void): boolean;
  addListener(event: 'playback_error', cb: (err: { message: string }) => void): boolean;
  removeListener(event: string): boolean;
  getCurrentState(): Promise<SpotifyPlaybackState | null>;
  setName(name: string): Promise<void>;
  getVolume(): Promise<number>;
  setVolume(volume: number): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  togglePlay(): Promise<void>;
  seek(positionMs: number): Promise<void>;
  previousTrack(): Promise<void>;
  nextTrack(): Promise<void>;
}
