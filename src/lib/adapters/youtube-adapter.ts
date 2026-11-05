import { BasePlaybackAdapter } from './base-adapter';
import { AdapterType, TrackInfo } from '@/types/playback';
import { parseYouTubeInput } from '@/lib/youtube-utils';
import { YTPlayer, YTPlayerOptions } from '@/types/youtube';
import { formatCleanDisplayTrack } from '@/lib/lyrics/normalize';

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
  private isPlayerReady = false;
  private pendingTarget: { type: 'playlist' | 'video'; id: string } | null = null;

  public isPlayerFunctional(): boolean {
    return Boolean(
      this.player &&
      this.isPlayerReady &&
      typeof this.player.playVideo === 'function' &&
      typeof this.player.unMute === 'function' &&
      typeof this.player.loadVideoById === 'function'
    );
  }

  // Seeking guard to prevent YouTube iframe async position lag from overwriting seek time
  private isSeeking = false;
  private seekDebounceTimer: number | null = null;

  // Stream proxy audio element for Web Audio DSP & embed fallback
  private streamAudio: HTMLAudioElement | null = null;
  private streamAudioVideoId: string | null = null;
  private isStreamingActive = false;
  private isDirectStreamFallback = false;

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
  private analyserNode: AnalyserNode | null = null;
  private shouldPlayOnReady = false;

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

    // Only mute YouTube iframe if streamAudio is actively delivering sound
    if (this.isStreamingActive) {
      if (this.player) {
        try {
          this.player.mute();
        } catch {}
      }
    } else {
      // Stream audio not yet active; keep YouTube player unmuted so music never stops!
      if (this.player) {
        try {
          if (typeof this.player.unMute === 'function') this.player.unMute();
          if (typeof this.player.setVolume === 'function') this.player.setVolume(Math.round(this.volume * 100));
        } catch {}
      }
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

    // Only mute YouTube iframe if streamAudio is actively delivering sound
    if (this.isStreamingActive) {
      if (this.player) {
        try {
          this.player.mute();
        } catch {}
      }
    } else {
      // Stream audio not yet active; keep YouTube player unmuted so music never stops!
      if (this.player) {
        try {
          if (typeof this.player.unMute === 'function') this.player.unMute();
          if (typeof this.player.setVolume === 'function') this.player.setVolume(Math.round(this.volume * 100));
        } catch {}
      }
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

  public primeAudioStream(videoId: string): void {
    if (!videoId || typeof window === 'undefined') return;
    this.ensureStreamAudioInitialized();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    this.loadStreamForVideo(videoId);
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
      if (this.player && !this.isDirectStreamFallback && !this.isSeeking) {
        try {
          // Synchronize stream currentTime to YouTube player only if valid
          const ytTime = this.player.getCurrentTime();
          if (typeof ytTime === 'number' && ytTime > 0 && Math.abs((this.streamAudio?.currentTime || 0) - ytTime) > 0.6) {
            if (this.streamAudio) this.streamAudio.currentTime = ytTime;
          }
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

    this.streamAudio.addEventListener('pause', () => {
      if (this.state === 'playing') {
        this.isStreamingActive = false;
        if (this.player) {
          try {
            if (typeof this.player.unMute === 'function') this.player.unMute();
            if (typeof this.player.setVolume === 'function') this.player.setVolume(Math.round(this.volume * 100));
          } catch {}
        }
      }
    });

    this.streamAudio.addEventListener('error', (e) => {
      console.warn('[YouTubeAdapter] streamAudio error fired:', this.streamAudio?.error, e);
      this.isStreamingActive = false;
      if (this.player) {
        try {
          if (typeof this.player.unMute === 'function') this.player.unMute();
          if (typeof this.player.setVolume === 'function') this.player.setVolume(Math.round(this.volume * 100));
        } catch {
          // ignore
        }
      }
    });

    this.streamAudio.addEventListener('ended', () => {
      if (this.isDirectStreamFallback) {
        this.emitState('ended');
        this.stopPositionTimer();
        this.nextTrack();
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

    // Do NOT mute player here! Keep YouTube player unmuted while stream buffers
    if (this.player && !this.isStreamingActive) {
      try {
        if (typeof this.player.unMute === 'function') this.player.unMute();
        if (typeof this.player.setVolume === 'function') this.player.setVolume(Math.round(this.volume * 100));
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
        container.style.position = 'fixed';
        container.style.bottom = '0';
        container.style.right = '0';
        container.style.width = '256px';
        container.style.height = '144px';
        container.style.opacity = '0.002';
        container.style.pointerEvents = 'none';
        container.style.zIndex = '-50';
        document.body.appendChild(container);
      }

      const options: YTPlayerOptions = {
        height: '100%',
        width: '100%',
        playerVars: {
          autoplay: 1,
          controls: 0,
          playsinline: 1,
          rel: 0,
          modestbranding: 1,
          enablejsapi: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            this.isPlayerReady = true;
            this.emitState('paused');
            if (this.player) {
              if (!this.isStreamingActive) {
                if (typeof this.player.unMute === 'function') this.player.unMute();
                if (typeof this.player.setVolume === 'function') {
                  this.player.setVolume(Math.round(this.volume * 100));
                }
              } else {
                if (typeof this.player.mute === 'function') this.player.mute();
              }
              if (this.pendingTarget) {
                const target = this.pendingTarget;
                this.pendingTarget = null;
                this.applyTarget(target);
              }
              if (this.shouldPlayOnReady) {
                this.shouldPlayOnReady = false;
                if (typeof this.player.playVideo === 'function') {
                  this.player.playVideo();
                }
              }
            }
            resolve();
          },
          onStateChange: (e) => {
            this.handleStateChange(e.data);
          },
          onError: async (e) => {
            // Error 101 / 150 = Embedded playback forbidden by video owner
            // Error 100 = Video removed or not found
            // Error 5 = HTML5 player error
            // Error 2 = Invalid parameter
            if (e.data === 101 || e.data === 150 || e.data === 100 || e.data === 5 || e.data === 2) {
              const targetVideoId =
                this.currentVideoId ||
                this.pendingTarget?.id ||
                (this.currentTrack?.id ? this.currentTrack.id : null);

              if (targetVideoId) {
                console.warn(
                  `[YouTubeAdapter] YouTube embed error ${e.data} for ${targetVideoId}. Recovering with direct audio stream...`
                );
                const recovered = await this.recoverWithDirectStream(targetVideoId);
                if (recovered) {
                  return; // Successfully bypassed YouTube iframe restriction!
                }
              }
            }

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
        if (this.shouldPlayOnReady) {
          this.shouldPlayOnReady = false;
          if (typeof this.player?.playVideo === 'function') {
            this.player.playVideo();
          }
        }
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

      const currentHasRealTitle =
        this.currentTrack?.title &&
        !['YouTube Video', 'YouTube Track', 'YouTube Playlist', 'YouTube Stream'].includes(this.currentTrack.title);
      const currentHasRealArtist =
        this.currentTrack?.artist &&
        !['YouTube Artist', 'YouTube Stream', 'YouTube'].includes(this.currentTrack.artist);

      if (trackChanged || durationChanged || !this.currentTrack) {
        this.currentVideoId = videoId;
        if (dur > 0) {
          this.duration = dur;
        }

        let resolvedTitle = this.currentTrack?.title || 'YouTube Track';
        let resolvedArtist = this.currentTrack?.artist || 'YouTube Artist';

        // Only derive from YouTube iframe videoData if it's a new video or if current title was a placeholder
        if (trackChanged || !currentHasRealTitle) {
          if (data?.title && data.title !== '') {
            const clean = formatCleanDisplayTrack(data.title, data.author);
            resolvedTitle = clean.cleanTitle || data.title;
            resolvedArtist = clean.cleanArtist || data.author || resolvedArtist;
          }
        } else if (!currentHasRealArtist && data?.author) {
          const clean = formatCleanDisplayTrack(resolvedTitle, data.author);
          resolvedArtist = clean.cleanArtist || data.author;
        }

        const track: TrackInfo = {
          id: videoId,
          title: resolvedTitle,
          artist: resolvedArtist,
          album: this.currentTrack?.album || 'YouTube',
          duration: this.duration,
          artworkUrl: this.currentTrack?.artworkUrl || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
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
      if (this.state === 'playing') {
        // If actively seeking, do not poll or overwrite position
        if (this.isSeeking) {
          return;
        }

        // When streaming audio is active, it is the true audio source!
        if (this.isStreamingActive && this.streamAudio && !this.streamAudio.paused) {
          const current = this.streamAudio.currentTime || 0;
          this.position = current;
          this.emitPosition(current);
          const dur = this.streamAudio.duration;
          if (dur && !isNaN(dur) && dur > 0 && Math.abs(dur - this.duration) > 0.5) {
            this.duration = dur;
            if (this.currentTrack && Math.abs(this.currentTrack.duration - dur) > 0.5) {
              this.currentTrack = { ...this.currentTrack, duration: dur };
              this.emitTrack(this.currentTrack);
            }
          }
          return;
        }

        if (this.isDirectStreamFallback && this.streamAudio) {
          const current = this.streamAudio.currentTime || 0;
          this.position = current;
          this.emitPosition(current);
          const dur = this.streamAudio.duration;
          if (dur && !isNaN(dur) && dur > 0 && Math.abs(dur - this.duration) > 0.5) {
            this.duration = dur;
          }
          return;
        }

        if (this.player) {
          try {
            const current = this.player.getCurrentTime();
            if (typeof current === 'number' && !isNaN(current)) {
              this.position = current;
              this.emitPosition(current);
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
      }
    }, 250);
  }

  private stopPositionTimer() {
    if (this.positionInterval !== null) {
      clearInterval(this.positionInterval);
      this.positionInterval = null;
    }
  }

  private async recoverWithDirectStream(videoId: string): Promise<boolean> {
    try {
      this.isDirectStreamFallback = true;
      this.isStreamingActive = true;
      this.currentVideoId = videoId;
      this.ensureStreamAudioInitialized();

      if (this.player) {
        try {
          this.player.mute();
        } catch {}
      }

      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }

      if (!this.streamAudio) return false;

      this.streamAudioVideoId = videoId;
      const targetSrc = `/api/youtube/stream?v=${videoId}`;
      if (!this.streamAudio.src.includes(targetSrc)) {
        this.streamAudio.src = targetSrc;
        this.streamAudio.load();
      }

      this.emitState('buffering');

      await new Promise<void>((resolve, reject) => {
        if (!this.streamAudio) return reject(new Error('No streamAudio'));
        if (this.streamAudio.readyState >= 2) {
          return resolve();
        }

        let resolved = false;
        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            cleanup();
            resolve();
          }
        }, 4000);

        const onReady = () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            cleanup();
            resolve();
          }
        };

        const onError = () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            cleanup();
            reject(new Error('Audio stream fetch failed'));
          }
        };

        const cleanup = () => {
          this.streamAudio?.removeEventListener('canplay', onReady);
          this.streamAudio?.removeEventListener('loadeddata', onReady);
          this.streamAudio?.removeEventListener('playing', onReady);
          this.streamAudio?.removeEventListener('error', onError);
        };

        this.streamAudio.addEventListener('canplay', onReady, { once: true });
        this.streamAudio.addEventListener('loadeddata', onReady, { once: true });
        this.streamAudio.addEventListener('playing', onReady, { once: true });
        this.streamAudio.addEventListener('error', onError, { once: true });
      });

      if (this.position > 0) {
        try { this.streamAudio.currentTime = this.position; } catch {}
      }

      await this.streamAudio.play();
      this.emitState('playing');
      this.startPositionTimer();
      return true;
    } catch (err) {
      console.warn('[YouTubeAdapter] Direct stream fallback failed:', err);
      this.isDirectStreamFallback = false;
      this.isStreamingActive = false;
      return false;
    }
  }

  private applyTarget(target: { type: 'playlist' | 'video'; id: string }): Promise<void> {
    this.isDirectStreamFallback = false;
    if (!this.isPlayerFunctional()) {
      this.pendingTarget = target;
      return Promise.resolve();
    }

    if (target.type === 'playlist') {
      if (typeof this.player?.loadPlaylist === 'function') {
        this.player.loadPlaylist({
          list: target.id,
          listType: 'playlist',
          index: 0,
          startSeconds: 0,
        });
      }
    } else {
      if (typeof this.player?.loadVideoById === 'function') {
        this.player.loadVideoById({
          videoId: target.id,
          startSeconds: 0,
        });
      }
      this.loadStreamForVideo(target.id);
    }

    try {
      if (!this.isStreamingActive) {
        if (typeof this.player?.unMute === 'function') this.player.unMute();
        if (typeof this.player?.setVolume === 'function') {
          this.player.setVolume(Math.round(this.volume * 100));
        }
      }
      if (typeof this.player?.playVideo === 'function') {
        this.player.playVideo();
      }
    } catch {
      // ignore
    }

    return Promise.resolve();
  }

  public async loadPlaylist(idOrUrl: string, trackHint?: Partial<TrackInfo>): Promise<TrackInfo[]> {
    const parsed = parseYouTubeInput(idOrUrl);
    if (!parsed) {
      this.emitError('Could not parse YouTube link or playlist ID');
      return [];
    }

    this.duration = trackHint?.duration || 0;
    this.currentVideoId = null;

    // Format clean title and artist if trackHint is provided
    let title = parsed.type === 'playlist' ? 'YouTube Playlist' : 'YouTube Video';
    let artist = parsed.type === 'playlist' ? 'YouTube' : 'YouTube Stream';

    if (trackHint?.title) {
      const clean = formatCleanDisplayTrack(trackHint.title, trackHint.artist);
      title = clean.cleanTitle || trackHint.title;
      artist = clean.cleanArtist || trackHint.artist || artist;
    }

    const initialPlaceholder: TrackInfo = {
      id: parsed.id,
      title,
      artist,
      album: trackHint?.album || (parsed.type === 'playlist' ? `Playlist ${parsed.id}` : 'YouTube'),
      duration: trackHint?.duration || 0,
      source: 'youtube',
      sourceUrl: idOrUrl,
      artworkUrl: trackHint?.artworkUrl || `https://img.youtube.com/vi/${parsed.id}/hqdefault.jpg`,
    };
    this.currentTrack = initialPlaceholder;
    this.emitTrack(initialPlaceholder);

    if (!this.isPlayerFunctional()) {
      this.pendingTarget = parsed;
      if (parsed.type === 'video' && parsed.id) {
        this.loadStreamForVideo(parsed.id);
      }
      await this.initialize();
      return [initialPlaceholder];
    }

    if (parsed.type === 'video' && parsed.id) {
      this.loadStreamForVideo(parsed.id);
    }

    this.emitState('loading');
    await this.applyTarget(parsed);

    return [initialPlaceholder];
  }

  public async loadTrack(track: TrackInfo): Promise<void> {
    await this.loadPlaylist(track.sourceUrl || track.id, track);
  }

  public async play(): Promise<void> {
    this.ensureStreamAudioInitialized();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }

    if (this.isDirectStreamFallback && this.streamAudio) {
      try {
        await this.streamAudio.play();
        this.emitState('playing');
        this.startPositionTimer();
        return;
      } catch (err) {
        this.emitError((err as Error).message);
        return;
      }
    }

    if (this.isPlayerFunctional()) {
      try {
        if (this.isStreamingActive) {
          if (typeof this.player?.mute === 'function') this.player.mute();
        } else {
          if (typeof this.player?.unMute === 'function') this.player.unMute();
          if (typeof this.player?.setVolume === 'function') {
            this.player.setVolume(Math.round(this.volume * 100));
          }
        }
        if (typeof this.player?.playVideo === 'function') {
          this.player.playVideo();
        }
      } catch (err) {
        console.warn('[YouTubeAdapter] playVideo error:', err);
      }
    } else {
      this.shouldPlayOnReady = true;
    }
    if (this.streamAudio) {
      this.streamAudio.play().catch((err) => {
        console.warn('[YouTubeAdapter] streamAudio.play() deferred:', err);
      });
    }
  }

  public pause(): void {
    this.shouldPlayOnReady = false;
    if (this.isDirectStreamFallback && this.streamAudio) {
      this.streamAudio.pause();
      this.emitState('paused');
      this.stopPositionTimer();
      return;
    }

    if (this.player && typeof this.player.pauseVideo === 'function') {
      try {
        this.player.pauseVideo();
      } catch (err) {
        console.warn('[YouTubeAdapter] pauseVideo error:', err);
      }
    }
    if (this.streamAudio) {
      this.streamAudio.pause();
    }
  }

  public seek(seconds: number): void {
    this.isSeeking = true;
    this.position = seconds;
    this.emitPosition(seconds);

    if (this.seekDebounceTimer !== null) {
      window.clearTimeout(this.seekDebounceTimer);
    }

    if (this.streamAudio) {
      try {
        this.streamAudio.currentTime = seconds;
      } catch (err) {
        console.warn('[YouTubeAdapter] streamAudio seek error:', err);
      }
    }

    if (this.player && !this.isDirectStreamFallback) {
      try {
        if (typeof this.player.seekTo === 'function') {
          this.player.seekTo(seconds, true);
        }
      } catch (err) {
        console.warn('[YouTubeAdapter] player seekTo error:', err);
      }
    }

    this.seekDebounceTimer = window.setTimeout(() => {
      this.isSeeking = false;
      this.seekDebounceTimer = null;
    }, 800);
  }

  public nextTrack(): void {
    if (this.player && typeof this.player.nextVideo === 'function') {
      try {
        this.player.nextVideo();
      } catch {
        // ignore
      }
    }
  }

  public previousTrack(): void {
    if (this.player && typeof this.player.previousVideo === 'function') {
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
    if (this.player && typeof this.player.setVolume === 'function') {
      try {
        if (!this.isStreamingActive) {
          this.player.setVolume(Math.round(this.volume * 100));
        }
      } catch {
        // ignore
      }
    }
  }

  public getAnalyser(): AnalyserNode | null {
    if (!this.analyserNode && this.audioCtx && this.gainNode) {
      try {
        this.analyserNode = this.audioCtx.createAnalyser();
        this.analyserNode.fftSize = 256;
        this.analyserNode.smoothingTimeConstant = 0.8;
        this.gainNode.connect(this.analyserNode);
      } catch (err) {
        console.warn('Failed to attach AnalyserNode to YouTube gainNode:', err);
      }
    }
    return this.analyserNode;
  }

  public override getPosition(): number {
    if (this.isDirectStreamFallback && this.streamAudio) {
      return this.streamAudio.currentTime || 0;
    }
    if (this.player && typeof this.player.getCurrentTime === 'function') {
      try {
        const t = this.player.getCurrentTime();
        if (typeof t === 'number' && !isNaN(t)) {
          this.position = t;
          return t;
        }
      } catch {}
    }
    return this.position;
  }

  public override getPlaybackRate(): number {
    if (this.player && typeof this.player.getPlaybackRate === 'function') {
      try {
        const rate = this.player.getPlaybackRate();
        if (typeof rate === 'number' && rate > 0) return rate;
      } catch {}
    }
    if (this.streamAudio && typeof this.streamAudio.playbackRate === 'number') {
      return this.streamAudio.playbackRate;
    }
    return 1.0;
  }

  public getAudioElement(): HTMLAudioElement | null {
    if (this.isDirectStreamFallback && this.streamAudio) {
      return this.streamAudio;
    }
    if (this.isStreamingActive && this.streamAudio && !this.streamAudio.paused) {
      return this.streamAudio;
    }
    return null;
  }

  public override cleanup(): void {
    if (this.seekDebounceTimer !== null) {
      window.clearTimeout(this.seekDebounceTimer);
      this.seekDebounceTimer = null;
    }
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
      this.analyserNode = null;
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
    this.isPlayerReady = false;
    this.shouldPlayOnReady = false;

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
