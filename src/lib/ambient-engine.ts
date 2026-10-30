import { AmbientSoundId } from '@/types/audio';

export class AmbientSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private channelGains: Map<AmbientSoundId, GainNode> = new Map();
  private activeSources: Map<AmbientSoundId, { stop: () => void }> = new Map();
  private noiseBuffer: AudioBuffer | null = null;
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

  // Create a 5-second seamless pink noise buffer for procedural synthesizers (crickets, speech)
  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer) return this.noiseBuffer;

    const bufferSize = ctx.sampleRate * 5;
    const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      let b0 = 0,
        b1 = 0,
        b2 = 0,
        b3 = 0,
        b4 = 0,
        b5 = 0,
        b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.969 * b2 + white * 0.153852;
        b3 = 0.8665 * b3 + white * 0.3104856;
        b4 = 0.55 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.016898;
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
      case 'drums':
        this.startDrums(ctx, dest);
        break;
      case 'bass':
        this.startBass(ctx, dest);
        break;
      case 'chatter':
        this.startChatter(ctx, dest);
        break;
      case 'fireplace':
        this.startFireplace(ctx, dest);
        break;
      case 'waves':
        this.startWaves(ctx, dest);
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

  /* --- 1. Rain (Recorded Monsoon Rain ASMR) --- */
  private startRain(ctx: AudioContext, dest: GainNode) {
    this.startAudioFile('rain', ctx, dest, '/audio/rain.mp3');
  }

  /* --- 2. Wind (Recorded Chill Mountain Wind) --- */
  private startWind(ctx: AudioContext, dest: GainNode) {
    this.startAudioFile('wind', ctx, dest, '/audio/wind.mp3');
  }

  /* --- 3. Forest Birds (Recorded Native Woodland Birds) --- */
  private startBirds(ctx: AudioContext, dest: GainNode) {
    this.startAudioFile('birds', ctx, dest, '/audio/birds.mp3');
  }

  /* --- 4. Night Crickets (AI Generated / Procedural Synthesizer) --- */
  private startCrickets(ctx: AudioContext, dest: GainNode) {
    const noise = ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer(ctx);
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(4500, ctx.currentTime);
    filter.Q.setValueAtTime(4.0, ctx.currentTime);

    const tremolo = ctx.createOscillator();
    tremolo.type = 'sine';
    tremolo.frequency.setValueAtTime(6, ctx.currentTime);

    const tremoloGain = ctx.createGain();
    tremoloGain.gain.setValueAtTime(0.4, ctx.currentTime);

    const pulseGain = ctx.createGain();
    pulseGain.gain.setValueAtTime(0.2, ctx.currentTime);

    tremolo.connect(tremoloGain);
    tremoloGain.connect(pulseGain.gain);

    noise.connect(filter);
    filter.connect(pulseGain);
    pulseGain.connect(dest);

    noise.start();
    tremolo.start();

    this.activeSources.set('crickets', {
      stop: () => {
        try {
          noise.stop();
          tremolo.stop();
          noise.disconnect();
          tremolo.disconnect();
          tremoloGain.disconnect();
          pulseGain.disconnect();
          filter.disconnect();
        } catch {
          // ignore
        }
        this.activeSources.delete('crickets');
      },
    });
  }

  /* --- 5. Distant Thunder (Recorded Rolling Thunderclaps) --- */
  private startThunder(ctx: AudioContext, dest: GainNode) {
    this.startAudioFile('thunder', ctx, dest, '/audio/thunder.mp3');
  }

  /* --- 6. Lo-Fi Drums (Recorded 100 BPM Drum Beat) --- */
  private startDrums(ctx: AudioContext, dest: GainNode) {
    this.startAudioFile('drums', ctx, dest, '/audio/drums.mp3');
  }

  /* --- 7. Lo-Fi Sub Bass (AI Generated / Procedural Synthesizer) --- */
  private startBass(ctx: AudioContext, dest: GainNode) {
    let isRunning = true;
    let stepIndex = 0;
    let intervalId: number | null = null;
    const notes = [55, 55, 49, 43.65, 43.65, 49, 55, 65.4]; // A1, G1, F1, C2

    const playBassNote = () => {
      if (!isRunning || !ctx || ctx.state === 'closed') return;
      const now = ctx.currentTime;
      const freq = notes[stepIndex % notes.length];
      stepIndex++;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(140, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.55, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);

      osc.start(now);
      osc.stop(now + 0.9);
    };

    playBassNote();
    intervalId = window.setInterval(playBassNote, 900);

    this.activeSources.set('bass', {
      stop: () => {
        isRunning = false;
        if (intervalId) clearInterval(intervalId);
        this.activeSources.delete('bass');
      },
    });
  }

  /* --- 8. People Speaking / Cafe Chatter (AI Generated / Procedural Synthesizer) --- */
  private startChatter(ctx: AudioContext, dest: GainNode) {
    let isRunning = true;
    let timeoutId: number | null = null;

    const noise = ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer(ctx);
    noise.loop = true;

    // Formant 1: Vowel body / chest resonance (350 - 650Hz)
    const f1 = ctx.createBiquadFilter();
    f1.type = 'bandpass';
    f1.frequency.setValueAtTime(520, ctx.currentTime);
    f1.Q.setValueAtTime(3.5, ctx.currentTime);

    // Formant 2: Oral cavity / vowel definition (1200 - 1800Hz)
    const f2 = ctx.createBiquadFilter();
    f2.type = 'bandpass';
    f2.frequency.setValueAtTime(1450, ctx.currentTime);
    f2.Q.setValueAtTime(3.8, ctx.currentTime);

    // Formant 3: Speech presence & consonants (2400 - 3200Hz)
    const f3 = ctx.createBiquadFilter();
    f3.type = 'bandpass';
    f3.frequency.setValueAtTime(2600, ctx.currentTime);
    f3.Q.setValueAtTime(4.0, ctx.currentTime);

    // Syllabic envelope modulation (mimics 3.6 syllables per second human speech)
    const syllabicLfo = ctx.createOscillator();
    syllabicLfo.type = 'sine';
    syllabicLfo.frequency.setValueAtTime(3.6, ctx.currentTime);

    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(0.35, ctx.currentTime);
    syllabicLfo.connect(lfoGain);

    const speechGain = ctx.createGain();
    speechGain.gain.setValueAtTime(0.7, ctx.currentTime);
    lfoGain.connect(speechGain.gain);

    // Warm cafe room lowpass
    const warmRoomFilter = ctx.createBiquadFilter();
    warmRoomFilter.type = 'lowpass';
    warmRoomFilter.frequency.setValueAtTime(3600, ctx.currentTime);

    noise.connect(f1);
    noise.connect(f2);
    noise.connect(f3);

    f1.connect(speechGain);
    f2.connect(speechGain);
    f3.connect(speechGain);

    speechGain.connect(warmRoomFilter);
    warmRoomFilter.connect(dest);

    noise.start();
    syllabicLfo.start();

    // Occasional gentle cafe cup / saucer clink
    const playClatter = () => {
      if (!isRunning || !ctx || ctx.state === 'closed') return;
      const osc = ctx.createOscillator();
      const clinkGain = ctx.createGain();
      const now = ctx.currentTime;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2600 + Math.random() * 800, now);
      clinkGain.gain.setValueAtTime(0.045, now);
      clinkGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

      osc.connect(clinkGain);
      clinkGain.connect(dest);
      osc.start(now);
      osc.stop(now + 0.09);

      timeoutId = window.setTimeout(playClatter, 2800 + Math.random() * 4500);
    };

    timeoutId = window.setTimeout(playClatter, 2000);

    this.activeSources.set('chatter', {
      stop: () => {
        isRunning = false;
        if (timeoutId) clearTimeout(timeoutId);
        try {
          noise.stop();
          syllabicLfo.stop();
          noise.disconnect();
          syllabicLfo.disconnect();
          lfoGain.disconnect();
          speechGain.disconnect();
          f1.disconnect();
          f2.disconnect();
          f3.disconnect();
          warmRoomFilter.disconnect();
        } catch {
          // ignore
        }
        this.activeSources.delete('chatter');
      },
    });
  }

  /* --- 9. Fireplace (Recorded Fireplace Crackling Embers) --- */
  private startFireplace(ctx: AudioContext, dest: GainNode) {
    this.startAudioFile('fireplace', ctx, dest, '/audio/fireplace.mp3');
  }

  /* --- 10. Ocean Waves (Recorded Coastal Waves) --- */
  private startWaves(ctx: AudioContext, dest: GainNode) {
    this.startAudioFile('waves', ctx, dest, '/audio/waves.mp3');
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
