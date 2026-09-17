import { AmbientSoundId } from '@/types/audio';

export class AmbientSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private channelGains: Map<AmbientSoundId, GainNode> = new Map();
  private activeSources: Map<AmbientSoundId, { stop: () => void }> = new Map();
  private noiseBuffer: AudioBuffer | null = null;
  private initialized = false;

  private initContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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

  // Create a 5-second seamless pink noise buffer for realistic rain/wind
  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer) return this.noiseBuffer;

    const bufferSize = ctx.sampleRate * 5;
    const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.1;
        b6 = white * 0.115926;
      }
    }

    this.noiseBuffer = buffer;
    return buffer;
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
        this.startRain(ctx, dest);
        break;
      case 'wind':
        this.startWind(ctx, dest);
        break;
      case 'birds':
        this.startBirds(ctx, dest);
        break;
      case 'crickets':
        this.startCrickets(ctx, dest);
        break;
      case 'thunder':
        this.startThunder(ctx, dest);
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

  /* --- 1. Rain Synthesizer --- */
  private startRain(ctx: AudioContext, dest: GainNode) {
    const noise = ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer(ctx);
    noise.loop = true;

    // Filter for rainy patter
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, ctx.currentTime);
    filter.Q.setValueAtTime(0.7, ctx.currentTime);

    // High frequency sizzle
    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.setValueAtTime(900, ctx.currentTime);

    noise.connect(filter);
    filter.connect(highpass);
    highpass.connect(dest);

    noise.start();
    this.activeSources.set('rain', {
      stop: () => {
        try {
          noise.stop();
          noise.disconnect();
          filter.disconnect();
          highpass.disconnect();
        } catch {
          // ignore
        }
      },
    });
  }

  /* --- 2. Wind Synthesizer (with howling LFO) --- */
  private startWind(ctx: AudioContext, dest: GainNode) {
    const noise = ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer(ctx);
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(450, ctx.currentTime);
    filter.Q.setValueAtTime(3.5, ctx.currentTime);

    // LFO to modulate wind gusts
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.12, ctx.currentTime);

    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(300, ctx.currentTime); // sweep range

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    noise.connect(filter);
    filter.connect(dest);

    noise.start();
    lfo.start();

    this.activeSources.set('wind', {
      stop: () => {
        try {
          noise.stop();
          lfo.stop();
          noise.disconnect();
          lfo.disconnect();
          lfoGain.disconnect();
          filter.disconnect();
        } catch {
          // ignore
        }
      },
    });
  }

  private birdsBuffer: AudioBuffer | null = null;
  private isLoadingBirds = false;

  private async loadBirdsBuffer(ctx: AudioContext): Promise<AudioBuffer | null> {
    if (this.birdsBuffer) return this.birdsBuffer;
    if (this.isLoadingBirds) return null;

    this.isLoadingBirds = true;
    try {
      const res = await fetch('/audio/birds.mp3');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const arrayBuffer = await res.arrayBuffer();
      const decoded = await ctx.decodeAudioData(arrayBuffer);
      this.birdsBuffer = decoded;
      return decoded;
    } catch (e) {
      console.warn('Could not load recorded birds audio, using procedural fallback:', e);
      return null;
    } finally {
      this.isLoadingBirds = false;
    }
  }

  /* --- 3. Forest Birds (Real Woodland Field Recording + Procedural Fallback) --- */
  private async startBirds(ctx: AudioContext, dest: GainNode) {
    let isCancelled = false;

    // Try loading and playing the high-fidelity woodland bird recording
    const buffer = await this.loadBirdsBuffer(ctx);

    if (isCancelled) return;

    if (buffer) {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      // Soft highpass filter to remove any low-end rumble and keep birds crisp
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(800, ctx.currentTime);

      source.connect(filter);
      filter.connect(dest);
      source.start();

      this.activeSources.set('birds', {
        stop: () => {
          isCancelled = true;
          try {
            source.stop();
            source.disconnect();
            filter.disconnect();
          } catch {
            // ignore
          }
        },
      });
      return;
    }

    // Procedural Fallback if fetch fails
    let isRunning = true;
    let timeoutId: number | null = null;

    const playChirp = () => {
      if (!isRunning || !ctx || ctx.state === 'closed') return;

      const osc = ctx.createOscillator();
      const chirpGain = ctx.createGain();

      const baseFreq = 2200 + Math.random() * 1200;
      const now = ctx.currentTime;
      const chirpDuration = 0.08 + Math.random() * 0.06;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(
        baseFreq * (1.3 + Math.random() * 0.4),
        now + chirpDuration * 0.4
      );
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.85, now + chirpDuration);

      chirpGain.gain.setValueAtTime(0.001, now);
      chirpGain.gain.linearRampToValueAtTime(0.35, now + chirpDuration * 0.2);
      chirpGain.gain.exponentialRampToValueAtTime(0.001, now + chirpDuration);

      osc.connect(chirpGain);
      chirpGain.connect(dest);

      osc.start(now);
      osc.stop(now + chirpDuration);

      const nextDelay = 1500 + Math.random() * 3500;
      timeoutId = window.setTimeout(playChirp, nextDelay);
    };

    playChirp();

    this.activeSources.set('birds', {
      stop: () => {
        isCancelled = true;
        isRunning = false;
        if (timeoutId) clearTimeout(timeoutId);
      },
    });
  }

  /* --- 4. Crickets / Evening Cicadas --- */
  private startCrickets(ctx: AudioContext, dest: GainNode) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(4600, ctx.currentTime);

    // Tremolo pulse generator
    const tremolo = ctx.createOscillator();
    tremolo.type = 'triangle';
    tremolo.frequency.setValueAtTime(18, ctx.currentTime);

    const tremoloGain = ctx.createGain();
    tremoloGain.gain.setValueAtTime(0.5, ctx.currentTime);

    const pulseGain = ctx.createGain();
    pulseGain.gain.setValueAtTime(0.18, ctx.currentTime);

    tremolo.connect(tremoloGain);
    tremoloGain.connect(pulseGain.gain);

    osc.connect(pulseGain);
    pulseGain.connect(dest);

    osc.start();
    tremolo.start();

    this.activeSources.set('crickets', {
      stop: () => {
        try {
          osc.stop();
          tremolo.stop();
          osc.disconnect();
          tremolo.disconnect();
          tremoloGain.disconnect();
          pulseGain.disconnect();
        } catch {
          // ignore
        }
      },
    });
  }

  /* --- 5. Distant Rolling Thunder --- */
  private startThunder(ctx: AudioContext, dest: GainNode) {
    let isRunning = true;
    let timeoutId: number | null = null;

    const playThunderClap = () => {
      if (!isRunning || !ctx || ctx.state === 'closed') return;

      const noise = ctx.createBufferSource();
      noise.buffer = this.getNoiseBuffer(ctx);
      noise.loop = false;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(110, ctx.currentTime);
      filter.Q.setValueAtTime(2.0, ctx.currentTime);

      const rumbleGain = ctx.createGain();
      const now = ctx.currentTime;
      const duration = 4.5 + Math.random() * 2.5;

      rumbleGain.gain.setValueAtTime(0.001, now);
      rumbleGain.gain.linearRampToValueAtTime(0.8, now + 0.35);
      rumbleGain.gain.exponentialRampToValueAtTime(0.15, now + 1.8);
      rumbleGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      noise.connect(filter);
      filter.connect(rumbleGain);
      rumbleGain.connect(dest);

      noise.start(now);
      noise.stop(now + duration);

      // Random delay between distant thunder rolls (10 - 20 seconds)
      const nextDelay = 10000 + Math.random() * 12000;
      timeoutId = window.setTimeout(playThunderClap, nextDelay);
    };

    // Initial rumble after 1.5s
    timeoutId = window.setTimeout(playThunderClap, 1500);

    this.activeSources.set('thunder', {
      stop: () => {
        isRunning = false;
        if (timeoutId) clearTimeout(timeoutId);
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
  }
}
