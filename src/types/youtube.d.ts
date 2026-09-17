export {};

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
    YT?: {
      Player: new (
        elementId: string | HTMLElement,
        options: YTPlayerOptions
      ) => YTPlayer;
      PlayerState: {
        UNSTARTED: -1;
        ENDED: 0;
        PLAYING: 1;
        PAUSED: 2;
        BUFFERING: 3;
        CUED: 5;
      };
    };
  }
}

export interface YTPlayerOptions {
  height?: string | number;
  width?: string | number;
  videoId?: string;
  playerVars?: {
    autoplay?: 0 | 1;
    controls?: 0 | 1;
    disablekb?: 0 | 1;
    fs?: 0 | 1;
    list?: string;
    listType?: 'playlist' | 'search' | 'user_uploads';
    loop?: 0 | 1;
    modestbranding?: 0 | 1;
    rel?: 0 | 1;
    origin?: string;
    playsinline?: 0 | 1;
    enablejsapi?: 0 | 1;
  };
  events?: {
    onReady?: (event: YTPlayerEvent) => void;
    onStateChange?: (event: YTOnStateChangeEvent) => void;
    onError?: (event: YTOnErrorEvent) => void;
  };
}

export interface YTPlayerEvent {
  target: YTPlayer;
}

export interface YTOnStateChangeEvent {
  target: YTPlayer;
  data: number;
}

export interface YTOnErrorEvent {
  target: YTPlayer;
  data: number;
}

export interface YTVideoData {
  video_id: string;
  author: string;
  title: string;
}

export interface YTPlayer {
  loadPlaylist(options: {
    list: string;
    listType?: 'playlist' | 'search' | 'user_uploads';
    index?: number;
    startSeconds?: number;
  }): void;
  cuePlaylist(options: {
    list: string;
    listType?: 'playlist' | 'search' | 'user_uploads';
    index?: number;
    startSeconds?: number;
  }): void;
  loadVideoById(options: {
    videoId: string;
    startSeconds?: number;
  }): void;
  cueVideoById(options: {
    videoId: string;
    startSeconds?: number;
  }): void;
  playVideo(): void;
  pauseVideo(): void;
  stopVideo(): void;
  seekTo(seconds: number, allowSeekAhead?: boolean): void;
  setVolume(volume: number): void; // 0 - 100
  getVolume(): number;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  getPlayerState(): number;
  getCurrentTime(): number;
  getDuration(): number;
  getVideoData(): YTVideoData;
  getPlaylist(): string[] | null;
  getPlaylistIndex(): number;
  nextVideo(): void;
  previousVideo(): void;
  destroy(): void;
}
