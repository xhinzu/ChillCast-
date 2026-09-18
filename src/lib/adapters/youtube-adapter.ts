import { BasePlaybackAdapter } from './base-adapter';
import { AdapterType, TrackInfo } from '@/types/playback';
import { parseYouTubeInput } from '@/lib/youtube-utils';
import { YTPlayer, YTPlayerOptions } from '@/types/youtube';

// Default curated chill playlist (Lofi Girl chill beats)
export const DEFAULT_CHILL_PLAYLIST_ID = 'PL6NdkXsTSxKMU_F2LTuicHw6N67Fm1sWp';

export class YouTubeAdapter extends BasePlaybackAdapter {
  readonly name: AdapterType = 'youtube';
  readonly displayName = 'YouTube Playlist';

  private player: YTPlayer | null = null;
  private containerId = 'chillcast-yt-player';
  private positionInterval: number | null = null;
  private currentVideoId: string | null = null;
  private isApiReady = false;
  private pendingTarget: { type: 'playlist' | 'video'; id: string } | null = null;

  public async initialize(containerElement?: HTMLElement | null): Promise<void> {
    if (typeof window === 'undefined') return;

    if (containerElement && containerElement.id) {
      this.containerId = containerElement.id;
    }

    this.emitState('loading');

    await this.ensureYouTubeApiLoaded();
    await this.createPlayer();

    // Only load if an explicit target was queued by the user
    if (this.pendingTarget) {
      await this.applyTarget(this.pendingTarget);
      this.pendingTarget = null;
    } else {
      this.emitState('paused');
    }
  }

  private ensureYouTubeApiLoaded(): Promise<void> {
    return new Promise((resolve) => {
      if (window.YT && window.YT.Player) {
        this.isApiReady = true;
        resolve();
        return;
      }

      const existingScript = document.getElementById('youtube-iframe-api');
      if (!existingScript) {
        const tag = document.createElement('script');
        tag.id = 'youtube-iframe-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
      }

      const previousOnReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (previousOnReady) previousOnReady();
        this.isApiReady = true;
        resolve();
      };
    });
  }

  private createPlayer(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!window.YT) {
        reject(new Error('YouTube API not loaded'));
        return;
      }

      // Check if container exists in DOM, or create an offscreen container
      let container = document.getElementById(this.containerId);
      if (!container) {
        container = document.createElement('div');
        container.id = this.containerId;
        container.style.position = 'absolute';
        container.style.width = '1px';
        container.style.height = '1px';
        container.style.opacity = '0.01';
        container.style.pointerEvents = 'none';
        document.body.appendChild(container);
      }

      const options: YTPlayerOptions = {
        height: '100%',
        width: '100%',
        playerVars: {
          autoplay: 0,
          controls: 0,
          playsinline: 1,
          rel: 0,
          modestbranding: 1,
          enablejsapi: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            this.emitState('paused');
            if (this.player) {
              this.player.setVolume(Math.round(this.volume * 100));
            }
            resolve();
          },
          onStateChange: (e) => {
            this.handleStateChange(e.data);
          },
          onError: (e) => {
            let msg = 'YouTube playback error';
            if (e.data === 2) msg = 'Invalid YouTube video or playlist parameters';
            if (e.data === 5) msg = 'HTML5 player error on YouTube';
            if (e.data === 100) msg = 'Requested YouTube track was not found or removed';
            if (e.data === 101 || e.data === 150)
              msg = 'Embedded playback forbidden by the video owner';
            this.emitError(msg);
          },
        },
      };

      this.player = new window.YT.Player(this.containerId, options);
    });
  }

  private handleStateChange(stateCode: number) {
    // 1: PLAYING, 2: PAUSED, 3: BUFFERING, 0: ENDED, -1: UNSTARTED, 5: CUED
    switch (stateCode) {
      case 1: // PLAYING
        this.emitState('playing');
        this.startPositionTimer();
        this.updateCurrentTrackData();
        break;
      case 2: // PAUSED
        this.emitState('paused');
        this.stopPositionTimer();
        break;
      case 3: // BUFFERING
        this.emitState('buffering');
        this.updateCurrentTrackData();
        break;
      case 0: // ENDED
        this.emitState('ended');
        this.stopPositionTimer();
        break;
      case 5: // CUED
        this.emitState('paused');
        this.updateCurrentTrackData();
        break;
      default:
        break;
    }
  }

  private updateCurrentTrackData() {
    if (!this.player) return;

    try {
      const data = this.player.getVideoData();
      const dur = this.player.getDuration() || 0;

      const videoId = data?.video_id || this.currentVideoId;
      if (!videoId) return;

      const trackChanged = videoId !== this.currentVideoId;
      const durationChanged = dur > 0 && Math.abs(dur - this.duration) > 0.5;

      if (trackChanged || durationChanged || !this.currentTrack) {
        this.currentVideoId = videoId;
        if (dur > 0) {
          this.duration = dur;
        }

        const track: TrackInfo = {
          id: videoId,
          title: data?.title && data.title !== '' ? data.title : (this.currentTrack?.title || 'YouTube Track'),
          artist: data?.author && data.author !== '' ? data.author : (this.currentTrack?.artist || 'YouTube Artist'),
          album: 'YouTube',
          duration: this.duration,
          artworkUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          source: 'youtube',
          sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
        };
        this.currentTrack = track;
        this.emitTrack(track);
      }
    } catch {
      // Ignored if player not ready
    }
  }

  private startPositionTimer() {
    this.stopPositionTimer();
    this.positionInterval = window.setInterval(() => {
      if (this.player && this.state === 'playing') {
        try {
          const current = this.player.getCurrentTime();
          this.emitPosition(current);

          const dur = this.player.getDuration();
          if (dur > 0 && Math.abs(dur - this.duration) > 0.5) {
            this.duration = dur;
            this.updateCurrentTrackData();
          }
        } catch {
          // ignore
        }
      }
    }, 250);
  }

  private stopPositionTimer() {
    if (this.positionInterval !== null) {
      clearInterval(this.positionInterval);
      this.positionInterval = null;
    }
  }

  private applyTarget(target: { type: 'playlist' | 'video'; id: string }): Promise<void> {
    if (!this.player) return Promise.resolve();

    if (target.type === 'playlist') {
      this.player.loadPlaylist({
        list: target.id,
        listType: 'playlist',
        index: 0,
        startSeconds: 0,
      });
    } else {
      this.player.loadVideoById({
        videoId: target.id,
        startSeconds: 0,
      });
    }

    try {
      this.player.unMute();
      this.player.setVolume(Math.round(this.volume * 100));
      this.player.playVideo();
    } catch {
      // ignore
    }

    return Promise.resolve();
  }

  public async loadPlaylist(idOrUrl: string): Promise<TrackInfo[]> {
    const parsed = parseYouTubeInput(idOrUrl);
    if (!parsed) {
      this.emitError('Could not parse YouTube link or playlist ID');
      return [];
    }

    this.duration = 0;
    this.currentVideoId = null;

    if (!this.player) {
      this.pendingTarget = parsed;
      await this.initialize();
      return [];
    }

    this.emitState('loading');
    await this.applyTarget(parsed);

    const initialPlaceholder: TrackInfo = {
      id: parsed.id,
      title: parsed.type === 'playlist' ? 'YouTube Playlist' : 'YouTube Video',
      artist: 'YouTube Stream',
      album: parsed.type === 'playlist' ? `Playlist ${parsed.id}` : 'YouTube',
      duration: 0,
      source: 'youtube',
      sourceUrl: idOrUrl,
    };
    this.currentTrack = initialPlaceholder;
    this.emitTrack(initialPlaceholder);
    return [initialPlaceholder];
  }

  public async loadTrack(track: TrackInfo): Promise<void> {
    if (track.sourceUrl) {
      await this.loadPlaylist(track.sourceUrl);
    } else if (track.id) {
      await this.loadPlaylist(track.id);
    }
  }

  public async play(): Promise<void> {
    if (this.player) {
      try {
        this.player.playVideo();
      } catch (err) {
        this.emitError((err as Error).message);
      }
    }
  }

  public pause(): void {
    if (this.player) {
      try {
        this.player.pauseVideo();
      } catch (err) {
        this.emitError((err as Error).message);
      }
    }
  }

  public seek(seconds: number): void {
    if (this.player) {
      try {
        this.player.seekTo(seconds, true);
        this.emitPosition(seconds);
      } catch (err) {
        this.emitError((err as Error).message);
      }
    }
  }

  public nextTrack(): void {
    if (this.player) {
      try {
        this.player.nextVideo();
      } catch {
        // ignore
      }
    }
  }

  public previousTrack(): void {
    if (this.player) {
      try {
        this.player.previousVideo();
      } catch {
        // ignore
      }
    }
  }

  public setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.player) {
      try {
        this.player.setVolume(Math.round(this.volume * 100));
      } catch {
        // ignore
      }
    }
  }

  public override cleanup(): void {
    this.stopPositionTimer();
    if (this.player) {
      try {
        this.player.destroy();
      } catch {
        // ignore
      }
      this.player = null;
    }

    if (typeof document !== 'undefined') {
      const wrapper = document.getElementById('chillcast-yt-wrapper') || document.body;
      if (!document.getElementById(this.containerId)) {
        const placeholder = document.createElement('div');
        placeholder.id = this.containerId;
        placeholder.className = 'w-full h-full';
        wrapper.appendChild(placeholder);
      }
    }

    super.cleanup();
  }
}
