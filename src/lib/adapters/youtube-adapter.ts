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

  // Stream proxy audio element for Web Audio DSP
  private streamAudio: HTMLAudioElement | null = null;
  private streamAudioVideoId: string | null = null;
  private isStreamingActive = false;

  // Web Audio DSP Chain for 8D Spatial & Muffled effects
  private audioCtx: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private muffledFilter: BiquadFilterNode | null = null;
  private pannerNode: StereoPannerNode | null = null;
  private gainNode: GainNode | null = null;
  private spatialIntervalId: number | null = null;
  private spatialAngle = 0;
  private isSpatial8DActive = false;
  private isMuffledActive = false;

  private initDsp() {
    if (this.audioCtx || !this.streamAudio || typeof window === 'undefined') return;

    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass();

      this.sourceNode = this.audioCtx.createMediaElementSource(this.streamAudio);

      // Muffled filter: Lowpass filter (350Hz when muffled, 22000Hz when normal)
      this.muffledFilter = this.audioCtx.createBiquadFilter();
      this.muffledFilter.type = 'lowpass';
      this.muffledFilter.frequency.setValueAtTime(
        this.isMuffledActive ? 350 : 22000,
        this.audioCtx.currentTime
      );
      this.muffledFilter.Q.setValueAtTime(this.isMuffledActive ? 2.5 : 0.7, this.audioCtx.currentTime);

      // Volume gain node for Web Audio element source
      this.gainNode = this.audioCtx.createGain();
      this.gainNode.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);

      // 8D Spatial: Stereo panner oscillating left to right
      if (this.audioCtx.createStereoPanner) {
        this.pannerNode = this.audioCtx.createStereoPanner();
        this.pannerNode.pan.setValueAtTime(0, this.audioCtx.currentTime);
        this.sourceNode.connect(this.muffledFilter);
        this.muffledFilter.connect(this.pannerNode);
        this.pannerNode.connect(this.gainNode);
        this.gainNode.connect(this.audioCtx.destination);
      } else {
        this.sourceNode.connect(this.muffledFilter);
        this.muffledFilter.connect(this.gainNode);
        this.gainNode.connect(this.audioCtx.destination);
      }
    } catch (err) {
      console.warn('Web Audio DSP initialization error on YouTube stream:', err);
    }
  }

  public setMuffled(enabled: boolean): void {
    this.isMuffledActive = enabled;
    if (!this.audioCtx) {
      this.initDsp();
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    if (this.player) {
      try {
        this.player.mute();
      } catch {}
    }
    if (this.streamAudio && this.streamAudio.paused && this.state === 'playing') {
      this.streamAudio.play().catch(() => {});
    }
    if (this.muffledFilter && this.audioCtx) {
      const targetFreq = enabled ? 350 : 22000;
      const targetQ = enabled ? 2.5 : 0.7;
      this.muffledFilter.frequency.setTargetAtTime(targetFreq, this.audioCtx.currentTime, 0.05);
      this.muffledFilter.Q.setTargetAtTime(targetQ, this.audioCtx.currentTime, 0.05);
    }
  }

  public setSpatial8D(enabled: boolean): void {
    this.isSpatial8DActive = enabled;

    if (this.spatialIntervalId !== null) {
      clearInterval(this.spatialIntervalId);
      this.spatialIntervalId = null;
    }

    if (!this.audioCtx) {
      this.initDsp();
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    if (this.player) {
      try {
        this.player.mute();
      } catch {}
    }
    if (this.streamAudio && this.streamAudio.paused && this.state === 'playing') {
      this.streamAudio.play().catch(() => {});
    }

    if (!enabled) {
      if (this.pannerNode && this.audioCtx) {
        this.pannerNode.pan.setTargetAtTime(0, this.audioCtx.currentTime, 0.04);
      }
      return;
    }

    // Dynamic 8D headphone orbit across left and right ears (~4.5s cycle)
    this.spatialIntervalId = window.setInterval(() => {
      if (!this.pannerNode || !this.audioCtx) return;
      this.spatialAngle += 0.065;
      const pan = Math.sin(this.spatialAngle) * 0.98;
      this.pannerNode.pan.setTargetAtTime(pan, this.audioCtx.currentTime, 0.035);
    }, 35);
  }

  private ensureStreamAudioInitialized(): void {
    if (this.streamAudio || typeof window === 'undefined') return;

    this.streamAudio = new Audio();
    this.streamAudio.crossOrigin = 'anonymous';
    this.streamAudio.preload = 'auto';
    this.streamAudio.volume = this.volume;

    this.streamAudio.addEventListener('playing', () => {
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      this.isStreamingActive = true;
      if (this.player) {
        try {
          this.player.mute();
        } catch {
          // ignore
        }
      }
    });

    this.streamAudio.addEventListener('canplay', () => {
      if (this.state === 'playing' && this.streamAudio && this.streamAudio.paused) {
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
          this.audioCtx.resume().catch(() => {});
        }
        this.streamAudio.play().catch(() => {});
      }
    });

    this.streamAudio.addEventListener('error', (e) => {
      console.warn('[YouTubeAdapter] streamAudio error fired:', this.streamAudio?.error, e);
      this.isStreamingActive = false;
      if (this.player) {
        try {
          this.player.unMute();
          this.player.setVolume(Math.round(this.volume * 100));
        } catch {
          // ignore
        }
      }
    });

    this.initDsp();
  }

  private loadStreamForVideo(videoId: string) {
    if (!videoId || typeof window === 'undefined') return;
    if (this.streamAudioVideoId === videoId && this.streamAudio && this.streamAudio.src) return;

    console.log('[YouTubeAdapter] loadStreamForVideo starting for videoId:', videoId);
    this.streamAudioVideoId = videoId;
    this.ensureStreamAudioInitialized();

    if (!this.streamAudio) return;

    this.streamAudio.src = `/api/youtube/stream?v=${videoId}`;
    this.streamAudio.currentTime = this.player?.getCurrentTime() || 0;
    this.streamAudio.load();

    // Mute YouTube iframe so audio is routed via Web Audio DSP
    if (this.player) {
      try {
        this.player.mute();
      } catch {}
    }

    if (this.state === 'playing') {
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      this.streamAudio.play().catch((err) => {
        console.warn('[YouTubeAdapter] streamAudio.play() deferred:', err);
      });
    }
  }

  public async initialize(containerElement?: HTMLElement | null): Promise<void> {
    if (typeof window === 'undefined') return;
    (window as unknown as { __ytAdapter?: YouTubeAdapter }).__ytAdapter = this;

    if (containerElement && containerElement.id) {
      this.containerId = containerElement.id;
    }

    this.ensureStreamAudioInitialized();
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
              if (!this.isStreamingActive) {
                this.player.setVolume(Math.round(this.volume * 100));
              } else {
                this.player.mute();
              }
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
        if (this.streamAudio && this.streamAudio.paused) {
          if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume().catch(() => {});
          }
          this.streamAudio.play().catch(() => {});
        }
        break;
      case 2: // PAUSED
        this.emitState('paused');
        this.stopPositionTimer();
        if (this.streamAudio && !this.streamAudio.paused) {
          this.streamAudio.pause();
        }
        break;
      case 3: // BUFFERING
        this.emitState('buffering');
        this.updateCurrentTrackData();
        break;
      case 0: // ENDED
        this.emitState('ended');
        this.stopPositionTimer();
        if (this.streamAudio) {
          this.streamAudio.pause();
        }
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

      if (videoId && videoId !== this.streamAudioVideoId) {
        this.loadStreamForVideo(videoId);
      }

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

          // Drift synchronization between YouTube iframe and Web Audio stream
          if (this.isStreamingActive && this.streamAudio && !this.streamAudio.paused) {
            const diff = Math.abs(this.streamAudio.currentTime - current);
            if (diff > 0.8) {
              this.streamAudio.currentTime = current;
            }
          }

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
      this.loadStreamForVideo(target.id);
    }

    try {
      if (!this.isStreamingActive) {
        this.player.unMute();
        this.player.setVolume(Math.round(this.volume * 100));
      }
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
    this.ensureStreamAudioInitialized();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }

    if (this.player) {
      try {
        this.player.mute();
        this.player.playVideo();
      } catch (err) {
        this.emitError((err as Error).message);
      }
    }
    if (this.streamAudio) {
      this.streamAudio.play().catch((err) => {
        console.warn('[YouTubeAdapter] streamAudio.play() deferred:', err);
      });
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
    if (this.streamAudio) {
      this.streamAudio.pause();
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
    if (this.streamAudio) {
      this.streamAudio.currentTime = seconds;
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
    if (this.gainNode && this.audioCtx) {
      this.gainNode.gain.setTargetAtTime(this.volume, this.audioCtx.currentTime, 0.02);
    }
    if (this.streamAudio) {
      this.streamAudio.volume = this.volume;
    }
    if (this.player) {
      try {
        if (!this.isStreamingActive) {
          this.player.setVolume(Math.round(this.volume * 100));
        }
      } catch {
        // ignore
      }
    }
  }

  public override cleanup(): void {
    this.stopPositionTimer();
    if (this.spatialIntervalId !== null) {
      clearInterval(this.spatialIntervalId);
      this.spatialIntervalId = null;
    }
    if (this.audioCtx) {
      try {
        this.audioCtx.close();
      } catch {}
      this.audioCtx = null;
      this.sourceNode = null;
      this.muffledFilter = null;
      this.pannerNode = null;
      this.gainNode = null;
    }
    if (this.streamAudio) {
      this.streamAudio.pause();
      this.streamAudio.src = '';
      this.streamAudio = null;
    }
    this.streamAudioVideoId = null;
    this.isStreamingActive = false;

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
