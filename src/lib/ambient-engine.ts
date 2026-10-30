import { AmbientSoundId } from '@/types/audio';

export class AmbientSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private channelGains: Map<AmbientSoundId, GainNode> = new Map();
  private activeSources: Map<AmbientSoundId, { stop: () => void }> = new Map();
  private audioBuffers: Map<string, AudioBuffer> = new Map();
  private loadingBuffers: Map<string, Promise<AudioBuffer | null>> = new Map();

  private initContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private getChannelGain(id: AmbientSoundId): GainNode {
    const ctx = this.initContext();
    let gain = this.channelGains.get(id);
    if (!gain) {
      gain = ctx.createGain();
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      if (this.masterGain) {
        gain.connect(this.masterGain);
      }
      this.channelGains.set(id, gain);
    }
    return gain;
  }

  public setMasterVolume(volume: number) {
    if (!this.masterGain || !this.ctx) return;
    const clamped = Math.max(0, Math.min(1, volume));
    this.masterGain.gain.setTargetAtTime(clamped, this.ctx.currentTime, 0.05);
  }

  public setChannelVolume(id: AmbientSoundId, volume: number) {
    const gain = this.getChannelGain(id);
    if (!this.ctx) return;
    const clamped = Math.max(0, Math.min(1, volume));
    gain.gain.setTargetAtTime(clamped, this.ctx.currentTime, 0.05);
  }

  public startSound(id: AmbientSoundId) {
    if (this.activeSources.has(id)) return;
    const ctx = this.initContext();
    const dest = this.getChannelGain(id);

    switch (id) {
      case 'rain':
        this.startAudioFile('rain', ctx, dest, '/audio/rain.mp3');
        break;
      case 'wind':
        this.startAudioFile('wind', ctx, dest, '/audio/wind.mp3');
        break;
      case 'birds':
        this.startAudioFile('birds', ctx, dest, '/audio/birds.mp3');
        break;
      case 'crickets':
        this.startAudioFile('crickets', ctx, dest, '/audio/crickets.mp3');
        break;
      case 'thunder':
        this.startAudioFile('thunder', ctx, dest, '/audio/thunder.mp3');
        break;
      case 'drums':
        this.startAudioFile('drums', ctx, dest, '/audio/drums.mp3');
        break;
      case 'bass':
        this.startAudioFile('bass', ctx, dest, '/audio/bass.mp3');
        break;
      case 'chatter':
        this.startAudioFile('chatter', ctx, dest, '/audio/chatter.mp3');
        break;
      case 'fireplace':
        this.startAudioFile('fireplace', ctx, dest, '/audio/fireplace.mp3');
        break;
      case 'waves':
        this.startAudioFile('waves', ctx, dest, '/audio/waves.mp3');
        break;
    }
  }

  public stopSound(id: AmbientSoundId) {
    const active = this.activeSources.get(id);
    if (active) {
      active.stop();
      this.activeSources.delete(id);
    }
  }

  public isPlaying(id: AmbientSoundId): boolean {
    return this.activeSources.has(id);
  }

  private async loadAudioBuffer(ctx: AudioContext, url: string): Promise<AudioBuffer | null> {
    const cached = this.audioBuffers.get(url);
    if (cached) return cached;

    const pending = this.loadingBuffers.get(url);
    if (pending) return pending;

    const loadPromise = (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const arrayBuffer = await res.arrayBuffer();
        const decoded = await ctx.decodeAudioData(arrayBuffer);
        this.audioBuffers.set(url, decoded);
        return decoded;
      } catch (err) {
        console.warn(`Could not load audio from ${url}:`, err);
        return null;
      } finally {
        this.loadingBuffers.delete(url);
      }
    })();

    this.loadingBuffers.set(url, loadPromise);
    return loadPromise;
  }

  private async startAudioFile(
    id: AmbientSoundId,
    ctx: AudioContext,
    dest: GainNode,
    url: string
  ) {
    let isCancelled = false;

    this.activeSources.set(id, {
      stop: () => {
        isCancelled = true;
        this.activeSources.delete(id);
      },
    });

    const buffer = await this.loadAudioBuffer(ctx, url);
    if (isCancelled) return;

    if (!buffer) {
      this.activeSources.delete(id);
      return;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    source.connect(dest);
    source.start();

    this.activeSources.set(id, {
      stop: () => {
        isCancelled = true;
        try {
          source.stop();
          source.disconnect();
        } catch {
          // ignore
        }
        this.activeSources.delete(id);
      },
    });
  }

  public stopAll() {
    this.activeSources.forEach((source) => source.stop());
    this.activeSources.clear();
  }

  public destroy() {
    this.stopAll();
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close();
    }
    this.ctx = null;
    this.masterGain = null;
    this.channelGains.clear();
    this.audioBuffers.clear();
    this.loadingBuffers.clear();
  }
}
