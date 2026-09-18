import { BasePlaybackAdapter } from './base-adapter';
import { AdapterType, TrackInfo } from '@/types/playback';

export const DEFAULT_LOCAL_TRACK: TrackInfo = {
  id: 'local-chill-1',
  title: 'Midnight Rain Chords',
  artist: 'ChillCast Lo-Fi Sessions',
  album: 'Ambient Studies Vol. 1',
  duration: 24,
  source: 'local',
  sourceUrl: '/audio/sample-chill.wav',
  artworkUrl: '',
};

export class LocalAudioAdapter extends BasePlaybackAdapter {
  readonly name: AdapterType = 'local';
  readonly displayName = 'Local Audio';

  private audio: HTMLAudioElement | null = null;
  private isLooping = true;
  private playlist: TrackInfo[] = [DEFAULT_LOCAL_TRACK];

  // Web Audio DSP Chain for 8D Spatial and Muffled
  private audioCtx: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private muffledFilter: BiquadFilterNode | null = null;
  private pannerNode: StereoPannerNode | null = null;
  private spatialIntervalId: number | null = null;
  private spatialAngle = 0;
  private isSpatial8DActive = false;
  private isMuffledActive = false;

  private initDsp() {
    if (this.audioCtx || !this.audio || typeof window === 'undefined') return;

    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass();

      this.sourceNode = this.audioCtx.createMediaElementSource(this.audio);

      // Lowpass filter for Muffled effect (sound through wall/blanket)
      this.muffledFilter = this.audioCtx.createBiquadFilter();
      this.muffledFilter.type = 'lowpass';
      this.muffledFilter.frequency.setValueAtTime(
        this.isMuffledActive ? 450 : 22000,
        this.audioCtx.currentTime
      );
      this.muffledFilter.Q.setValueAtTime(this.isMuffledActive ? 1.8 : 0.7, this.audioCtx.currentTime);

      // Stereo panner for 8D Binaural rotation
      if (this.audioCtx.createStereoPanner) {
        this.pannerNode = this.audioCtx.createStereoPanner();
        this.pannerNode.pan.setValueAtTime(0, this.audioCtx.currentTime);
      }

      // Graph wiring: source -> muffledFilter -> pannerNode (if supported) -> destination
      if (this.pannerNode) {
        this.sourceNode.connect(this.muffledFilter);
        this.muffledFilter.connect(this.pannerNode);
        this.pannerNode.connect(this.audioCtx.destination);
      } else {
        this.sourceNode.connect(this.muffledFilter);
        this.muffledFilter.connect(this.audioCtx.destination);
      }
    } catch {
      // If already connected or browser policy prevents, fallback to direct audio
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
    if (this.muffledFilter && this.audioCtx) {
      const targetFreq = enabled ? 450 : 22000;
      const targetQ = enabled ? 1.8 : 0.7;
      this.muffledFilter.frequency.setTargetAtTime(targetFreq, this.audioCtx.currentTime, 0.08);
      this.muffledFilter.Q.setTargetAtTime(targetQ, this.audioCtx.currentTime, 0.08);
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

    if (!enabled) {
      if (this.pannerNode && this.audioCtx) {
        this.pannerNode.pan.setTargetAtTime(0, this.audioCtx.currentTime, 0.05);
      }
      return;
    }

    // Orbit smoothly between left and right channels (~9 seconds full circle)
    this.spatialIntervalId = window.setInterval(() => {
      if (!this.pannerNode || !this.audioCtx || this.state !== 'playing') return;
      this.spatialAngle += 0.04;
      const pan = Math.sin(this.spatialAngle) * 0.95;
      this.pannerNode.pan.setTargetAtTime(pan, this.audioCtx.currentTime, 0.04);
    }, 50);
  }

  public async initialize(): Promise<void> {
    if (typeof window === 'undefined') return;

    if (!this.audio) {
      this.audio = new Audio();
      this.audio.crossOrigin = 'anonymous';
      this.audio.preload = 'metadata';
      this.audio.volume = this.volume;
      this.audio.loop = this.isLooping;

      this.audio.addEventListener('timeupdate', () => {
        if (this.audio) {
          this.emitPosition(this.audio.currentTime);
        }
      });

      this.audio.addEventListener('loadedmetadata', () => {
        if (this.audio && !isNaN(this.audio.duration)) {
          this.duration = this.audio.duration;
          if (this.currentTrack) {
            this.emitTrack({
              ...this.currentTrack,
              duration: this.audio.duration,
            });
          }
        }
      });

      this.audio.addEventListener('play', () => {
        this.initDsp();
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
          this.audioCtx.resume();
        }
        this.emitState('playing');
      });

      this.audio.addEventListener('pause', () => {
        if (this.state !== 'ended') {
          this.emitState('paused');
        }
      });

      this.audio.addEventListener('ended', () => {
        if (!this.isLooping) {
          this.emitState('ended');
        }
      });

      this.audio.addEventListener('error', (e) => {
        const err = e.currentTarget as HTMLAudioElement;
        this.emitError(err.error?.message || 'Local audio playback error');
      });
    }

    // Load default initial track
    await this.loadTrack(this.playlist[0]);
  }

  public async loadPlaylist(idOrUrl?: string): Promise<TrackInfo[]> {
    void idOrUrl;
    return this.playlist;
  }

  public async loadTrack(track: TrackInfo): Promise<void> {
    if (!this.audio) {
      await this.initialize();
    }
    if (!this.audio) return;

    this.emitState('loading');
    this.currentTrack = track;
    this.emitTrack(track);

    if (track.sourceUrl) {
      this.audio.src = track.sourceUrl;
      this.audio.load();
    }
    this.emitState('paused');
  }

  public async loadCustomFile(file: File): Promise<TrackInfo> {
    const objectUrl = URL.createObjectURL(file);
    const newTrack: TrackInfo = {
      id: `custom-${Date.now()}`,
      title: file.name.replace(/\.[^/.]+$/, ''),
      artist: 'Local File',
      album: 'Custom Upload',
      duration: 0,
      source: 'local',
      sourceUrl: objectUrl,
      artworkUrl: '',
    };

    this.playlist = [newTrack, ...this.playlist];
    await this.loadTrack(newTrack);
    await this.play();
    return newTrack;
  }

  public async play(): Promise<void> {
    if (!this.audio) return;
    try {
      await this.audio.play();
      this.emitState('playing');
    } catch (err) {
      this.emitError((err as Error).message);
    }
  }

  public pause(): void {
    if (this.audio) {
      this.audio.pause();
      this.emitState('paused');
    }
  }

  public seek(seconds: number): void {
    if (this.audio) {
      this.audio.currentTime = seconds;
      this.emitPosition(seconds);
    }
  }

  public setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.audio) {
      this.audio.volume = this.volume;
    }
  }

  public setLooping(loop: boolean): void {
    this.isLooping = loop;
    if (this.audio) {
      this.audio.loop = loop;
    }
  }

  public getLooping(): boolean {
    return this.isLooping;
  }

  public override cleanup(): void {
    if (this.spatialIntervalId !== null) {
      clearInterval(this.spatialIntervalId);
      this.spatialIntervalId = null;
    }
    if (this.audioCtx) {
      try {
        this.audioCtx.close();
      } catch {
        // ignore
      }
      this.audioCtx = null;
      this.sourceNode = null;
      this.muffledFilter = null;
      this.pannerNode = null;
    }
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
      this.audio = null;
    }
    super.cleanup();
  }
}
