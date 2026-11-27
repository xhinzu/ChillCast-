import { getDspEngine } from '@/lib/audio/dsp-engine';
import { mulberry32, type RadioBand } from './stations';

class RadioAudioController {
  private static instance: RadioAudioController | null = null;

  private ctx: AudioContext | null = null;
  private noiseSource: AudioBufferSourceNode | null = null;
  private noiseFilter: BiquadFilterNode | null = null;
  private noiseGain: GainNode | null = null;
  private whistleOsc: OscillatorNode | null = null;
  private whistleGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private isStarted = false;
  private sfxVolume = 0.6;
  private staticAmount = 0.55;

  private constructor() {}

  public static getInstance(): RadioAudioController {
    if (!RadioAudioController.instance) {
      RadioAudioController.instance = new RadioAudioController();
    }
    return RadioAudioController.instance;
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const dsp = getDspEngine();
    const ctx = dsp.getAudioContext();
    if (!ctx) return null;
    if (this.ctx !== ctx) {
      this.ctx = ctx;
      this.isStarted = false;
    }
    if (!this.isStarted) {
      this.setupNodes(ctx);
    }
    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => {});
    }
    return ctx;
  }

  private setupNodes(ctx: AudioContext): void {
    const now = ctx.currentTime;
    // Generate 3-second looping pink/crackle noise buffer
    const len = ctx.sampleRate * 3;
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + white * 0.099046;
      b1 = 0.96300 * b1 + white * 0.2965164;
      b2 = 0.57000 * b2 + white * 1.0526913;
      const pink = (b0 + b1 + b2 + white * 0.1848) * 0.12;
      const crackle = Math.random() < 0.0025 ? (Math.random() * 2 - 1) * 0.65 : 0;
      data[i] = Math.max(-1, Math.min(1, pink + crackle));
    }

    this.noiseSource = ctx.createBufferSource();
    this.noiseSource.buffer = buffer;
    this.noiseSource.loop = true;

    this.noiseFilter = ctx.createBiquadFilter();
    this.noiseFilter.type = 'bandpass';
    this.noiseFilter.frequency.setValueAtTime(1800, now);
    this.noiseFilter.Q.setValueAtTime(0.7, now);

    this.noiseGain = ctx.createGain();
    this.noiseGain.gain.setValueAtTime(0, now);

    this.noiseSource.connect(this.noiseFilter);
    this.noiseFilter.connect(this.noiseGain);
    this.noiseGain.connect(ctx.destination);
    this.noiseSource.start();

    this.whistleOsc = ctx.createOscillator();
    this.whistleOsc.type = 'sine';
    this.whistleOsc.frequency.setValueAtTime(1400, now);
    this.whistleGain = ctx.createGain();
    this.whistleGain.gain.setValueAtTime(0, now);
    this.whistleOsc.connect(this.whistleGain);
    this.whistleGain.connect(ctx.destination);
    this.whistleOsc.start();

    this.sfxGain = ctx.createGain();
    this.sfxGain.gain.setValueAtTime(this.sfxVolume, now);
    this.sfxGain.connect(ctx.destination);

    this.isStarted = true;
  }

  public setSfxVolume(vol: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
    if (this.ctx && this.sfxGain) {
      this.sfxGain.gain.setTargetAtTime(this.sfxVolume, this.ctx.currentTime, 0.02);
    }
  }

  public setStaticAmount(amount: number): void {
    this.staticAmount = Math.max(0, Math.min(1, amount));
  }

  public updateReceptionAudio(params: {
    powerOn: boolean;
    muted: boolean;
    staticGain: number;
    whistleGain: number;
    whistleFreqHz: number;
    bandwidthHz: number;
    band: RadioBand;
    masterVolume: number;
    vintageEnabled: boolean;
    vintageAmount: number;
  }): void {
    const ctx = this.ensureContext();
    const dsp = getDspEngine();

    dsp.setRadioVoicing(params.powerOn && params.vintageEnabled, params.vintageAmount, params.bandwidthHz, params.band === 'AM');

    if (!ctx || !this.noiseGain || !this.noiseFilter || !this.whistleGain || !this.whistleOsc) return;
    const now = ctx.currentTime;

    if (!params.powerOn || params.muted) {
      this.noiseGain.gain.setTargetAtTime(0, now, 0.04);
      this.whistleGain.gain.setTargetAtTime(0, now, 0.03);
      return;
    }

    const targetNoise = params.staticGain * this.staticAmount * Math.max(0.15, params.masterVolume) * 0.28;
    const targetWhistle = params.whistleGain * this.staticAmount * Math.max(0.15, params.masterVolume) * 0.14;
    this.noiseFilter.frequency.setTargetAtTime(params.band === 'AM' ? 1250 : 2100, now, 0.05);
    this.noiseGain.gain.setTargetAtTime(targetNoise, now, 0.04);
    this.whistleOsc.frequency.setTargetAtTime(params.whistleFreqHz, now, 0.03);
    this.whistleGain.gain.setTargetAtTime(targetWhistle, now, 0.03);
  }

  public setRjDucking(ducked: boolean, duckDb = -12): void {
    getDspEngine().setRadioDucking(ducked, duckDb);
  }

  public playDialTick(passedStation = false): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.sfxVolume <= 0) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = passedStation ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(passedStation ? 920 : 540, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.025);
    g.gain.setValueAtTime(passedStation ? 0.14 : 0.05, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.035);
  }

  public playBandEndThunk(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.sfxVolume <= 0) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.07);
    g.gain.setValueAtTime(0.24, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playButtonClick(pitchHz = 720): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.sfxVolume <= 0) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(pitchHz, now);
    osc.frequency.exponentialRampToValueAtTime(pitchHz * 0.45, now + 0.022);
    g.gain.setValueAtTime(0.09, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.03);
  }

  public playPowerToggle(turningOn: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.sfxVolume <= 0) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    if (turningOn) {
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.28);
      g.gain.setValueAtTime(0.02, now);
      g.gain.linearRampToValueAtTime(0.14, now + 0.12);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
    } else {
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(65, now + 0.25);
      g.gain.setValueAtTime(0.14, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);
    }
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.34);
  }

  public playStaticBurst(durationSec = 0.22): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseGain || this.sfxVolume <= 0) return;
    const now = ctx.currentTime;
    this.noiseGain.gain.cancelScheduledValues(now);
    this.noiseGain.gain.setValueAtTime(0.24 * this.sfxVolume, now);
    this.noiseGain.gain.exponentialRampToValueAtTime(0.02, now + durationSec);
  }

  public playStationIdentChime(jingleSeed: number): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.sfxVolume <= 0) return;
    const rng = mulberry32(jingleSeed);
    const scale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33];
    const now = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const freq = scale[Math.floor(rng() * scale.length)];
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      const t0 = now + i * 0.12;
      osc.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.11, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(t0);
      osc.stop(t0 + 0.3);
    }
  }

  public playTimePip(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.sfxVolume <= 0) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1000, now);
    g.gain.setValueAtTime(0.09, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }
}

export function getRadioAudio(): RadioAudioController {
  return RadioAudioController.getInstance();
}

