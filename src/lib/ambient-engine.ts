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
      case 'chenda':
        this.startChenda(ctx, dest);
        break;
      case 'dj':
        this.startDj(ctx, dest);
        break;
      case 'keyboard':
        this.startKeyboard(ctx, dest);
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

  private cricketsBuffer: AudioBuffer | null = null;
  private isLoadingCrickets = false;

  private async loadCricketsBuffer(ctx: AudioContext): Promise<AudioBuffer | null> {
    if (this.cricketsBuffer) return this.cricketsBuffer;
    if (this.isLoadingCrickets) return null;

    this.isLoadingCrickets = true;
    try {
      const res = await fetch('/audio/crickets.ogg');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const arrayBuffer = await res.arrayBuffer();
      const decoded = await ctx.decodeAudioData(arrayBuffer);
      this.cricketsBuffer = decoded;
      return decoded;
    } catch (e) {
      console.warn('Could not load recorded crickets audio, using procedural fallback:', e);
      return null;
    } finally {
      this.isLoadingCrickets = false;
    }
  }

  /* --- 4. Crickets / Evening Cicadas (Real Summer Night Field Recording) --- */
  private async startCrickets(ctx: AudioContext, dest: GainNode) {
    let isCancelled = false;

    // Load and play the real field recording of summer crickets
    const buffer = await this.loadCricketsBuffer(ctx);

    if (isCancelled) return;

    if (buffer) {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      // Bandpass filter to isolate sweet night chirps and soften any harsh highs
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(4800, ctx.currentTime);
      filter.Q.setValueAtTime(0.8, ctx.currentTime);

      source.connect(filter);
      filter.connect(dest);
      source.start();

      this.activeSources.set('crickets', {
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

    // Gentle organic procedural fallback (pulsed pink noise chirps instead of raw sine buzzer)
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
        isCancelled = true;
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

  /* --- 6. Lo-Fi Drums Synthesizer --- */
  private startDrums(ctx: AudioContext, dest: GainNode) {
    let isRunning = true;
    let step = 0;
    let intervalId: number | null = null;
    const stepDuration = 0.22; // ~68 BPM lo-fi tempo

    const triggerKick = (time: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(140, time);
      osc.frequency.exponentialRampToValueAtTime(45, time + 0.12);
      gain.gain.setValueAtTime(0.7, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(time);
      osc.stop(time + 0.26);
    };

    const triggerSnare = (time: number) => {
      const noise = ctx.createBufferSource();
      noise.buffer = this.getNoiseBuffer(ctx);
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1800, time);
      filter.Q.setValueAtTime(1.2, time);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.45, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      noise.start(time);
      noise.stop(time + 0.19);
    };

    const triggerHat = (time: number) => {
      const noise = ctx.createBufferSource();
      noise.buffer = this.getNoiseBuffer(ctx);
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(7000, time);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.18, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      noise.start(time);
      noise.stop(time + 0.06);
    };

    const tick = () => {
      if (!isRunning || !ctx || ctx.state === 'closed') return;
      const now = ctx.currentTime;

      triggerHat(now);
      if (step === 0 || step === 4) {
        triggerKick(now);
      } else if (step === 2 || step === 6) {
        triggerSnare(now);
      }

      step = (step + 1) % 8;
    };

    tick();
    intervalId = window.setInterval(tick, stepDuration * 1000);

    this.activeSources.set('drums', {
      stop: () => {
        isRunning = false;
        if (intervalId) clearInterval(intervalId);
      },
    });
  }

  /* --- 7. Lo-Fi Sub Bass Synthesizer --- */
  private startBass(ctx: AudioContext, dest: GainNode) {
    let isRunning = true;
    let stepIndex = 0;
    let intervalId: number | null = null;
    const notes = [55, 55, 49, 43.65, 43.65, 49, 55, 65.4]; // A1, G1, F1, C2

    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(notes[0], ctx.currentTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(140, ctx.currentTime);
    filter.Q.setValueAtTime(1.5, ctx.currentTime);

    gain.gain.setValueAtTime(0.55, ctx.currentTime);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    osc.start();

    const changeNote = () => {
      if (!isRunning || !ctx || ctx.state === 'closed') return;
      const now = ctx.currentTime;
      stepIndex = (stepIndex + 1) % notes.length;
      osc.frequency.setTargetAtTime(notes[stepIndex], now, 0.08);
    };

    intervalId = window.setInterval(changeNote, 1800);

    this.activeSources.set('bass', {
      stop: () => {
        isRunning = false;
        if (intervalId) clearInterval(intervalId);
        try {
          osc.stop();
          osc.disconnect();
          filter.disconnect();
          gain.disconnect();
        } catch {
          // ignore
        }
      },
    });
  }

  /* --- 8. People Chattering (Coffee Shop / Cafe Ambience) --- */
  private startChatter(ctx: AudioContext, dest: GainNode) {
    const noise = ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer(ctx);
    noise.loop = true;

    // Multi-band speech formant filtering
    const filter1 = ctx.createBiquadFilter();
    filter1.type = 'bandpass';
    filter1.frequency.setValueAtTime(550, ctx.currentTime);
    filter1.Q.setValueAtTime(2.0, ctx.currentTime);

    const filter2 = ctx.createBiquadFilter();
    filter2.type = 'bandpass';
    filter2.frequency.setValueAtTime(1300, ctx.currentTime);
    filter2.Q.setValueAtTime(2.2, ctx.currentTime);

    const chatterGain = ctx.createGain();
    chatterGain.gain.setValueAtTime(0.6, ctx.currentTime);

    noise.connect(filter1);
    noise.connect(filter2);
    filter1.connect(chatterGain);
    filter2.connect(chatterGain);
    chatterGain.connect(dest);

    noise.start();

    // Occasional gentle ceramic mug clatter
    let isRunning = true;
    let timeoutId: number | null = null;

    const playClatter = () => {
      if (!isRunning || !ctx || ctx.state === 'closed') return;
      const osc = ctx.createOscillator();
      const clinkGain = ctx.createGain();
      const now = ctx.currentTime;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2400 + Math.random() * 800, now);
      clinkGain.gain.setValueAtTime(0.04, now);
      clinkGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

      osc.connect(clinkGain);
      clinkGain.connect(dest);
      osc.start(now);
      osc.stop(now + 0.09);

      timeoutId = window.setTimeout(playClatter, 3000 + Math.random() * 5000);
    };

    timeoutId = window.setTimeout(playClatter, 2500);

    this.activeSources.set('chatter', {
      stop: () => {
        isRunning = false;
        if (timeoutId) clearTimeout(timeoutId);
        try {
          noise.stop();
          noise.disconnect();
          filter1.disconnect();
          filter2.disconnect();
          chatterGain.disconnect();
        } catch {
          // ignore
        }
      },
    });
  }

  /* --- 9. Fireplace (Warm Hearth & Crackling Embers) --- */
  private startFireplace(ctx: AudioContext, dest: GainNode) {
    const noise = ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer(ctx);
    noise.loop = true;

    // Warm deep hearth draft
    const lowFilter = ctx.createBiquadFilter();
    lowFilter.type = 'lowpass';
    lowFilter.frequency.setValueAtTime(160, ctx.currentTime);

    const draftGain = ctx.createGain();
    draftGain.gain.setValueAtTime(0.35, ctx.currentTime);

    noise.connect(lowFilter);
    lowFilter.connect(draftGain);
    draftGain.connect(dest);
    noise.start();

    // Random crackle and popping embers
    let isRunning = true;
    let timeoutId: number | null = null;

    const playCrackle = () => {
      if (!isRunning || !ctx || ctx.state === 'closed') return;
      const clickSource = ctx.createBufferSource();
      clickSource.buffer = this.getNoiseBuffer(ctx);

      const highFilter = ctx.createBiquadFilter();
      highFilter.type = 'highpass';
      highFilter.frequency.setValueAtTime(2200 + Math.random() * 2000, ctx.currentTime);

      const crackleGain = ctx.createGain();
      const now = ctx.currentTime;
      const duration = 0.008 + Math.random() * 0.02;

      crackleGain.gain.setValueAtTime(0.3 + Math.random() * 0.4, now);
      crackleGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      clickSource.connect(highFilter);
      highFilter.connect(crackleGain);
      crackleGain.connect(dest);

      clickSource.start(now);
      clickSource.stop(now + duration + 0.01);

      timeoutId = window.setTimeout(playCrackle, 50 + Math.random() * 250);
    };

    playCrackle();

    this.activeSources.set('fireplace', {
      stop: () => {
        isRunning = false;
        if (timeoutId) clearTimeout(timeoutId);
        try {
          noise.stop();
          noise.disconnect();
          lowFilter.disconnect();
          draftGain.disconnect();
        } catch {
          // ignore
        }
      },
    });
  }

  /* --- 10. Kerala Chenda Melam (Authentic Temple Percussion) --- */
  private startChenda(ctx: AudioContext, dest: GainNode) {
    let isRunning = true;
    let step = 0;
    let intervalId: number | null = null;
    const stepDuration = 0.14; // Vibrant Panchari Melam cadence

    // Sharp wooden stick Urutti Chenda strike
    const triggerUrutti = (time: number, accent = false) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startFreq = accent ? 880 : 760;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(startFreq, time);
      osc.frequency.exponentialRampToValueAtTime(420, time + 0.06);

      gain.gain.setValueAtTime(accent ? 0.65 : 0.4, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.07);

      osc.connect(gain);
      gain.connect(dest);
      osc.start(time);
      osc.stop(time + 0.08);
    };

    // Deep resonant Veekku Chenda bass drum stroke (Dheem)
    const triggerVeekku = (time: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(95, time);
      osc.frequency.exponentialRampToValueAtTime(50, time + 0.2);

      gain.gain.setValueAtTime(0.6, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

      osc.connect(gain);
      gain.connect(dest);
      osc.start(time);
      osc.stop(time + 0.23);
    };

    // Ilathalam (brass clash cymbal) on accents
    const triggerIlathalam = (time: number) => {
      const noise = ctx.createBufferSource();
      noise.buffer = this.getNoiseBuffer(ctx);
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(5200, time);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.2, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      noise.start(time);
      noise.stop(time + 0.09);
    };

    const tick = () => {
      if (!isRunning || !ctx || ctx.state === 'closed') return;
      const now = ctx.currentTime;

      // Authentic 8-step Melam pattern: Thaka - Dheem - Kitta - Thakita
      if (step === 0) {
        triggerUrutti(now, true);
        triggerVeekku(now);
        triggerIlathalam(now);
      } else if (step === 1 || step === 3 || step === 5 || step === 7) {
        triggerUrutti(now, false);
      } else if (step === 4) {
        triggerVeekku(now);
        triggerUrutti(now, true);
        triggerIlathalam(now);
      } else {
        triggerUrutti(now, false);
      }

      step = (step + 1) % 8;
    };

    tick();
    intervalId = window.setInterval(tick, stepDuration * 1000);

    this.activeSources.set('chenda', {
      stop: () => {
        isRunning = false;
        if (intervalId) clearInterval(intervalId);
      },
    });
  }

  /* --- 11. DJ (Vinyl Scratch & Turntable Tape Friction) --- */
  private startDj(ctx: AudioContext, dest: GainNode) {
    const noise = ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer(ctx);
    noise.loop = true;

    // Continuous subtle vinyl surface hiss & dust
    const vinylFilter = ctx.createBiquadFilter();
    vinylFilter.type = 'bandpass';
    vinylFilter.frequency.setValueAtTime(3200, ctx.currentTime);
    vinylFilter.Q.setValueAtTime(1.0, ctx.currentTime);

    const vinylGain = ctx.createGain();
    vinylGain.gain.setValueAtTime(0.25, ctx.currentTime);

    noise.connect(vinylFilter);
    vinylFilter.connect(vinylGain);
    vinylGain.connect(dest);
    noise.start();

    // Periodic turntable vinyl scratch rhythm ("wiki-wiki")
    let isRunning = true;
    let timeoutId: number | null = null;

    const playScratch = () => {
      if (!isRunning || !ctx || ctx.state === 'closed') return;
      const osc = ctx.createOscillator();
      const scratchGain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.linearRampToValueAtTime(1200, now + 0.08);
      osc.frequency.linearRampToValueAtTime(300, now + 0.16);

      scratchGain.gain.setValueAtTime(0.2, now);
      scratchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(scratchGain);
      scratchGain.connect(dest);
      osc.start(now);
      osc.stop(now + 0.21);

      timeoutId = window.setTimeout(playScratch, 4500 + Math.random() * 4000);
    };

    timeoutId = window.setTimeout(playScratch, 2000);

    this.activeSources.set('dj', {
      stop: () => {
        isRunning = false;
        if (timeoutId) clearTimeout(timeoutId);
        try {
          noise.stop();
          noise.disconnect();
          vinylFilter.disconnect();
          vinylGain.disconnect();
        } catch {
          // ignore
        }
      },
    });
  }

  /* --- 12. Mechanical Keyboard (Tactile Typing ASMR) --- */
  private startKeyboard(ctx: AudioContext, dest: GainNode) {
    let isRunning = true;
    let timeoutId: number | null = null;

    const playKeystroke = () => {
      if (!isRunning || !ctx || ctx.state === 'closed') return;
      const clickSource = ctx.createBufferSource();
      clickSource.buffer = this.getNoiseBuffer(ctx);

      const clickFilter = ctx.createBiquadFilter();
      clickFilter.type = 'bandpass';
      clickFilter.frequency.setValueAtTime(3200 + Math.random() * 800, ctx.currentTime);
      clickFilter.Q.setValueAtTime(3.0, ctx.currentTime);

      const clickGain = ctx.createGain();
      const now = ctx.currentTime;

      clickGain.gain.setValueAtTime(0.28, now);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

      clickSource.connect(clickFilter);
      clickFilter.connect(clickGain);
      clickGain.connect(dest);

      clickSource.start(now);
      clickSource.stop(now + 0.03);

      // Bursts of typing rhythm with occasional pauses
      const delay = Math.random() < 0.2 ? 350 + Math.random() * 500 : 90 + Math.random() * 120;
      timeoutId = window.setTimeout(playKeystroke, delay);
    };

    playKeystroke();

    this.activeSources.set('keyboard', {
      stop: () => {
        isRunning = false;
        if (timeoutId) clearTimeout(timeoutId);
      },
    });
  }

  /* --- 13. Ocean Waves (Rolling Coastal Tidal Surf) --- */
  private startWaves(ctx: AudioContext, dest: GainNode) {
    const noise = ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer(ctx);
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(350, ctx.currentTime);

    // LFO for slow 8-second wave swells
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.12, ctx.currentTime); // ~8 sec per wave
    lfoGain.gain.setValueAtTime(450, ctx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    const waveGain = ctx.createGain();
    waveGain.gain.setValueAtTime(0.5, ctx.currentTime);

    noise.connect(filter);
    filter.connect(waveGain);
    waveGain.connect(dest);

    noise.start();
    lfo.start();

    this.activeSources.set('waves', {
      stop: () => {
        try {
          noise.stop();
          lfo.stop();
          noise.disconnect();
          lfo.disconnect();
          lfoGain.disconnect();
          filter.disconnect();
          waveGain.disconnect();
        } catch {
          // ignore
        }
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
