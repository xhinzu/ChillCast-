import {
  AdapterType,
  ErrorCallback,
  PlaybackAdapter,
  PlaybackState,
  PositionCallback,
  StateCallback,
  TrackCallback,
  TrackInfo,
} from '@/types/playback';

export abstract class BasePlaybackAdapter implements PlaybackAdapter {
  abstract readonly name: AdapterType;
  abstract readonly displayName: string;

  protected state: PlaybackState = 'idle';
  protected currentTrack: TrackInfo | null = null;
  protected volume: number = 0.8;
  protected position: number = 0;
  protected duration: number = 0;

  private positionListeners = new Set<PositionCallback>();
  private trackListeners = new Set<TrackCallback>();
  private stateListeners = new Set<StateCallback>();
  private errorListeners = new Set<ErrorCallback>();

  abstract initialize(containerElement?: HTMLElement | null): Promise<void>;
  abstract loadPlaylist(idOrUrl: string): Promise<TrackInfo[]>;
  abstract loadTrack(track: TrackInfo): Promise<void>;
  abstract play(): Promise<void>;
  abstract pause(): void;
  abstract seek(seconds: number): void;
  abstract setVolume(volume: number): void;

  public getVolume(): number {
    return this.volume;
  }

  public getPosition(): number {
    return this.position;
  }

  public getDuration(): number {
    return this.duration;
  }

  public getState(): PlaybackState {
    return this.state;
  }

  public getCurrentTrack(): TrackInfo | null {
    return this.currentTrack;
  }

  public onPositionChange(callback: PositionCallback): () => void {
    this.positionListeners.add(callback);
    callback(this.position);
    return () => this.positionListeners.delete(callback);
  }

  public onTrackChange(callback: TrackCallback): () => void {
    this.trackListeners.add(callback);
    callback(this.currentTrack);
    return () => this.trackListeners.delete(callback);
  }

  public onStateChange(callback: StateCallback): () => void {
    this.stateListeners.add(callback);
    callback(this.state);
    return () => this.stateListeners.delete(callback);
  }

  public onError(callback: ErrorCallback): () => void {
    this.errorListeners.add(callback);
    return () => this.errorListeners.delete(callback);
  }

  protected emitPosition(position: number) {
    this.position = position;
    this.positionListeners.forEach((cb) => cb(position));
  }

  protected emitTrack(track: TrackInfo | null) {
    this.currentTrack = track;
    this.trackListeners.forEach((cb) => cb(track));
  }

  protected emitState(state: PlaybackState) {
    this.state = state;
    this.stateListeners.forEach((cb) => cb(state));
  }

  protected emitError(error: string) {
    this.state = 'error';
    this.errorListeners.forEach((cb) => cb(error));
  }

  public cleanup(): void {
    this.positionListeners.clear();
    this.trackListeners.clear();
    this.stateListeners.clear();
    this.errorListeners.clear();
  }
}
