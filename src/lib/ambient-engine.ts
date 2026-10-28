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
      case 'spooky':
        this.startSpooky(ctx, dest);
        break;
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

  /* --- 0. Spooky Haunted Ambience (Halloween Drone & Eerie Pad) --- */
  private startSpooky(ctx: AudioContext, dest: GainNode) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const spookyGain = ctx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(110, ctx.currentTime); // A2 drone

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(116.54, ctx.currentTime); // Minor second dissonant hum

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, ctx.currentTime);
    filter.Q.setValueAtTime(3.5, ctx.currentTime);

    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.08, ctx.currentTime); // Slow 12s ghostly swell
    lfoGain.gain.setValueAtTime(220, ctx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    spookyGain.gain.setValueAtTime(0.45, ctx.currentTime);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(spookyGain);
    spookyGain.connect(dest);

    osc1.start();
    osc2.start();
    lfo.start();

    this.activeSources.set('spooky', {
      stop: () => {
        try {
          osc1.stop();
          osc2.stop();
          lfo.stop();
          osc1.disconnect();
          osc2.disconnect();
          lfo.disconnect();
          lfoGain.disconnect();
          filter.disconnect();
          spookyGain.disconnect();
        } catch {
          // ignore
        }
      },
    });
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

  /* --- 5. Heavy Thunder Strikes & Rolling Thunderclaps --- */
  private startThunder(ctx: AudioContext, dest: GainNode) {
    let isRunning = true;
    let timeoutId: number | null = null;

    const playHeavyThunder = () => {
      if (!isRunning || !ctx || ctx.state === 'closed') return;

      const now = ctx.currentTime;
      const isMassiveStrike = Math.random() < 0.6;
      const strikeGain = isMassiveStrike ? 1.0 : 0.7;

      // 1. Sharp Violent Lightning Crack (instant high-energy snap)
      const crackNoise = ctx.createBufferSource();
      crackNoise.buffer = this.getNoiseBuffer(ctx);
      const crackFilter = ctx.createBiquadFilter();
      crackFilter.type = 'bandpass';
      crackFilter.frequency.setValueAtTime(2600 + Math.random() * 800, now);
      crackFilter.Q.setValueAtTime(2.5, now);

      const crackGain = ctx.createGain();
      crackGain.gain.setValueAtTime(0.85 * strikeGain, now);
      crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      crackNoise.connect(crackFilter);
      crackFilter.connect(crackGain);
      crackGain.connect(dest);
      crackNoise.start(now);
      crackNoise.stop(now + 0.09);

      // 2. Heavy Sub-Bass Explosive Blast (Booming 85Hz -> 28Hz shockwave)
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(95, now);
      subOsc.frequency.exponentialRampToValueAtTime(32, now + 0.7);

      subGain.gain.setValueAtTime(0.9 * strikeGain, now);
      subGain.gain.exponentialRampToValueAtTime(0.12, now + 1.2);
      subGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);

      subOsc.connect(subGain);
      subGain.connect(dest);
      subOsc.start(now);
      subOsc.stop(now + 2.9);

      // 3. Deep Rolling Thunder Aftershocks (5 - 8 seconds of cavernous rumble)
      const rumbleNoise = ctx.createBufferSource();
      rumbleNoise.buffer = this.getNoiseBuffer(ctx);
      const rumbleFilter = ctx.createBiquadFilter();
      rumbleFilter.type = 'lowpass';
      rumbleFilter.frequency.setValueAtTime(140, now);
      rumbleFilter.frequency.exponentialRampToValueAtTime(65, now + 3.0);
      rumbleFilter.Q.setValueAtTime(3.0, now);

      const rumbleGain = ctx.createGain();
      const rollDuration = 5.5 + Math.random() * 2.5;
      rumbleGain.gain.setValueAtTime(0.001, now);
      rumbleGain.gain.linearRampToValueAtTime(0.75 * strikeGain, now + 0.15);
      rumbleGain.gain.exponentialRampToValueAtTime(0.3, now + 1.8);
      rumbleGain.gain.exponentialRampToValueAtTime(0.0001, now + rollDuration);

      rumbleNoise.connect(rumbleFilter);
      rumbleFilter.connect(rumbleGain);
      rumbleGain.connect(dest);

      rumbleNoise.start(now);
      rumbleNoise.stop(now + rollDuration);

      // Random delay between thunder strikes (4 to 9 seconds so it feels active and dramatic)
      const nextDelay = 4500 + Math.random() * 5500;
      timeoutId = window.setTimeout(playHeavyThunder, nextDelay);
    };

    // Immediate initial heavy strike within 250ms
    timeoutId = window.setTimeout(playHeavyThunder, 250);

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

  private chatterBuffer: AudioBuffer | null = null;
  private isLoadingChatter = false;

  private async loadChatterBuffer(ctx: AudioContext): Promise<AudioBuffer | null> {
    if (this.chatterBuffer) return this.chatterBuffer;
    if (this.isLoadingChatter) return null;

    this.isLoadingChatter = true;
    try {
      const res = await fetch('/audio/chatter.webm');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const arrayBuffer = await res.arrayBuffer();
      const decoded = await ctx.decodeAudioData(arrayBuffer);
      this.chatterBuffer = decoded;
      return decoded;
    } catch (e) {
      console.warn('Could not load recorded cafe chatter audio, using fallback:', e);
      return null;
    } finally {
      this.isLoadingChatter = false;
    }
  }

  /* --- 8. Cafe Chatter (Real People Talking & Coffee Shop Ambience) --- */
  private async startChatter(ctx: AudioContext, dest: GainNode) {
    let isCancelled = false;

    // 1. First try playing the actual real people talking recording from YouTube
    const buffer = await this.loadChatterBuffer(ctx);
    if (isCancelled) return;

    if (buffer) {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      // Gentle warm room filter to sit sweetly in ambient background
      const warmFilter = ctx.createBiquadFilter();
      warmFilter.type = 'lowpass';
      warmFilter.frequency.setValueAtTime(4500, ctx.currentTime);

      source.connect(warmFilter);
      warmFilter.connect(dest);
      source.start();

      this.activeSources.set('chatter', {
        stop: () => {
          isCancelled = true;
          try {
            source.stop();
            source.disconnect();
            warmFilter.disconnect();
          } catch {
            // ignore
          }
        },
      });
      return;
    }

    // 2. Procedural Fallback if audio buffer fetch fails
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

    // Syllabic envelope modulation (mimics 4 syllables per second human speech)
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
    let isRunning = true;
    let timeoutId: number | null = null;

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
        isCancelled = true;
        isRunning = false;
        if (timeoutId) clearTimeout(timeoutId);
        try {
          noise.stop();
          syllabicLfo.stop();
          noise.disconnect();
          syllabicLfo.disconnect();
          f1.disconnect();
          f2.disconnect();
          f3.disconnect();
          speechGain.disconnect();
          warmRoomFilter.disconnect();
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
