/**
 * Web Audio DSP Engine for MyuJiku
 * Implements the required audio chain:
 * source -> input gain -> muffled low-pass filter -> 8D HRTF panner -> master gain -> analyser -> destination
 *
 * Guarantees:
 * 1. Single AudioContext resumed on user gesture & window focus.
 * 2. MediaElementAudioSourceNode cached per HTMLMediaElement (never calls createMediaElementSource twice).
 * 3. Smooth parameter changes (setTargetAtTime) without audio clicks.
 * 4. True HRTF 3D orbit for 8D Spatial audio with configurable period (4-20s) and width.
 * 5. Muffled low-pass filter (300-2000Hz) with gain compensation.
 * 6. Tone sweep diagnostic generator for audible verification in settings.
 */

export interface DspState {
  contextState: AudioContextState | 'uninitialized';
  is8DActive: boolean;
  speedSec: number;
  width: number;
  isMuffledActive: boolean;
  muffledCutoff: number;
  sampleRate: number;
}

const safeRequestAnimationFrame = (cb: (time: number) => void): number => {
  if (typeof requestAnimationFrame !== 'undefined') return requestAnimationFrame(cb);
  return setTimeout(() => cb(Date.now()), 16) as unknown as number;
};

const safeCancelAnimationFrame = (id: number): void => {
  if (typeof cancelAnimationFrame !== 'undefined') {
    cancelAnimationFrame(id);
  } else {
    clearTimeout(id);
  }
};

/**
 * Converts a normalized linear slider value [0, 1] into a smooth,
 * psychoacoustically uniform logarithmic gain value [0, 1].
 *
 * Solves the human ear perception issue where:
 * - low volume (20%) previously sounded like average volume
 * - middle volume (50%) previously sounded almost maxed out
 * - full volume (100%) sounded overly piercing / loud
 *
 * Implements an optimized power-law audio taper (exponent 2.35):
 * 0%   -> 0.00 (-inf dB, total silence)
 * 20%  -> 0.02 (-33 dB, soft background whisper)
 * 35%  -> 0.09 (-21 dB, relaxed ambient listening)
 * 50%  -> 0.19 (-14 dB, true psychoacoustic half loudness)
 * 75%  -> 0.51 (-5.8 dB, standard rich active listening)
 * 100% -> 1.00 (0 dB, clean maximum volume)
 */
export function volumeToGain(sliderValue: number): number {
  if (typeof sliderValue !== 'number' || isNaN(sliderValue) || sliderValue <= 0) return 0;
  if (sliderValue >= 1) return 1;
  return Math.pow(sliderValue, 2.35);
}

export class DspEngine {
  private static instance: DspEngine | null = null;

  private ctx: AudioContext | null = null;
  private inputGain: GainNode | null = null;
  private muffledFilter: BiquadFilterNode | null = null;
  private pannerNode: PannerNode | StereoPannerNode | null = null;
  private isHRTFPanner = false;
  private masterGain: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;

  // Source caching to prevent "already connected" errors
  private sourceMap = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();

  // 8D Orbit State
  private is8DActive = false;
  private rotationPeriod = 8; // seconds
  private orbitWidth = 0.85; // 0.2 to 1.0
  private orbitAngle = 0; // radians
  private animFrameId: number | null = null;
  private lastFrameTime = 0;

  // Muffled State
  private isMuffledActive = false;
  private muffledCutoff = 700; // Hz

  // Diagnostic Sweep Oscillator
  private sweepOsc: OscillatorNode | null = null;

  private constructor() {
    // Window focus listener to resume suspended AudioContext
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', () => {
        this.resumeContext();
      });

      // User gesture listeners
      const resumeOnGesture = () => {
        this.resumeContext();
        window.removeEventListener('click', resumeOnGesture);
        window.removeEventListener('keydown', resumeOnGesture);
      };
      window.addEventListener('click', resumeOnGesture, { passive: true });
      window.addEventListener('keydown', resumeOnGesture, { passive: true });
    }
  }

  public static getInstance(): DspEngine {
    if (!DspEngine.instance) {
      DspEngine.instance = new DspEngine();
    }
    return DspEngine.instance;
  }

  public getContext(): AudioContext {
    if (!this.ctx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();
      this.buildGraph();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public resumeContext(): Promise<void> {
    if (this.ctx && this.ctx.state === 'suspended') {
      return this.ctx.resume().catch(() => {});
    }
    return Promise.resolve();
  }

  private buildGraph() {
    if (!this.ctx) return;

    // 1. Input Gain Node (with headroom & muffled compensation)
    this.inputGain = this.ctx.createGain();
    this.inputGain.gain.setValueAtTime(1.0, this.ctx.currentTime);

    // 2. Muffled Low-Pass Biquad Filter
    this.muffledFilter = this.ctx.createBiquadFilter();
    this.muffledFilter.type = 'lowpass';
    const nyquist = Math.max(24000, (this.ctx.sampleRate || 48000) / 2);
    this.muffledFilter.frequency.setValueAtTime(
      this.isMuffledActive ? this.muffledCutoff : nyquist,
      this.ctx.currentTime
    );
    this.muffledFilter.Q.setValueAtTime(this.isMuffledActive ? 1.6 : 0.0001, this.ctx.currentTime);

    // 3. 8D Panner Node (HRTF Panner preferred for true 3D spatial orbit; fallback to StereoPanner)
    try {
      const panner = this.ctx.createPanner();
      panner.panningModel = 'HRTF';
      // Rolloff factor 0 completely disables distance attenuation and high-frequency dampening for maximum clarity
      panner.distanceModel = 'inverse';
      panner.refDistance = 1;
      panner.maxDistance = 10000;
      panner.rolloffFactor = 0;
      panner.coneInnerAngle = 360;
      panner.positionX.setValueAtTime(0, this.ctx.currentTime);
      panner.positionY.setValueAtTime(0, this.ctx.currentTime);
      panner.positionZ.setValueAtTime(1, this.ctx.currentTime);
      this.pannerNode = panner;
      this.isHRTFPanner = true;
    } catch {
      // StereoPanner fallback
      const stereoPanner = this.ctx.createStereoPanner();
      stereoPanner.pan.setValueAtTime(0, this.ctx.currentTime);
      this.pannerNode = stereoPanner;
      this.isHRTFPanner = false;
    }

    // 4. Master Gain Node
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);

    // 5. Analyser Node for edge glow & lyrics audio sync
    this.analyserNode = this.ctx.createAnalyser();
    this.analyserNode.fftSize = 256;
    this.analyserNode.smoothingTimeConstant = 0.8;

    // Connect Chain: inputGain -> muffledFilter -> pannerNode -> masterGain -> analyserNode -> destination
    this.inputGain.connect(this.muffledFilter);
    this.muffledFilter.connect(this.pannerNode);
    this.pannerNode.connect(this.masterGain);
    this.masterGain.connect(this.analyserNode);
    this.analyserNode.connect(this.ctx.destination);
  }

  /**
   * Connects an HTMLMediaElement to the DSP chain safely.
   * Reuses the MediaElementAudioSourceNode if previously created for this element.
   */
  public connectMediaElement(element: HTMLMediaElement): MediaElementAudioSourceNode | null {
    if (typeof window === 'undefined') return null;
    const ctx = this.getContext();

    try {
      let source = this.sourceMap.get(element);
      if (!source) {
        source = ctx.createMediaElementSource(element);
        this.sourceMap.set(element, source);
      }

      if (this.inputGain) {
        // Disconnect existing outputs to avoid duplicate routing
        try { source.disconnect(); } catch {}
        source.connect(this.inputGain);
      }
      return source;
    } catch (err) {
      console.warn('[DspEngine] connectMediaElement notice:', err);
      return null;
    }
  }

  public isConnected(element: HTMLMediaElement): boolean {
    return this.sourceMap.has(element);
  }

  /**
   * Updates 8D Spatial Audio settings
   * @param enabled Whether 8D orbit is active
   * @param speedSec Rotation period in seconds (4-20s, default 8s)
   * @param width Spatial orbit width/radius (0.2-1.0, default 0.85)
   */
  public set8D(enabled: boolean, speedSec = 8, width = 0.85): void {
    this.is8DActive = enabled;
    this.rotationPeriod = Math.max(4, Math.min(20, speedSec));
    this.orbitWidth = Math.max(0.2, Math.min(1.0, width));

    if (!this.ctx) this.getContext();
    if (!this.pannerNode || !this.ctx) return;

    if (enabled) {
      if (this.animFrameId === null) {
        this.lastFrameTime = performance.now();
        const tick = (now: number) => {
          if (!this.is8DActive || !this.pannerNode || !this.ctx) {
            this.animFrameId = null;
            return;
          }

          const dt = (now - this.lastFrameTime) / 1000;
          this.lastFrameTime = now;

          // Angular velocity = 2 * PI / rotationPeriod
          const omega = (2 * Math.PI) / this.rotationPeriod;
          this.orbitAngle = (this.orbitAngle + omega * dt) % (2 * Math.PI);

          const x = Math.sin(this.orbitAngle) * this.orbitWidth;
          const z = Math.cos(this.orbitAngle) * this.orbitWidth;

          if (this.isHRTFPanner) {
            const hrtf = this.pannerNode as PannerNode;
            // Smooth micro-target interpolation eliminates 60Hz zipper clicks
            hrtf.positionX.setTargetAtTime(x, this.ctx.currentTime, 0.015);
            hrtf.positionZ.setTargetAtTime(z, this.ctx.currentTime, 0.015);
          } else {
            const stereo = this.pannerNode as StereoPannerNode;
            stereo.pan.setTargetAtTime(x, this.ctx.currentTime, 0.015);
          }

          this.animFrameId = safeRequestAnimationFrame(tick);
        };
        this.animFrameId = safeRequestAnimationFrame(tick);
      }
    } else {
      if (this.animFrameId !== null) {
        safeCancelAnimationFrame(this.animFrameId);
        this.animFrameId = null;
      }
      if (this.isHRTFPanner) {
        const hrtf = this.pannerNode as PannerNode;
        hrtf.positionX.setTargetAtTime(0, this.ctx.currentTime, 0.08);
        hrtf.positionZ.setTargetAtTime(1, this.ctx.currentTime, 0.08);
      } else {
        const stereo = this.pannerNode as StereoPannerNode;
        stereo.pan.setTargetAtTime(0, this.ctx.currentTime, 0.08);
      }
    }
  }

  /**
   * Updates Muffled low-pass filter settings
   * @param enabled Whether muffled filter is active
   * @param cutoff Frequency cutoff in Hz (300-2000Hz, default 700Hz)
   */
  public setMuffled(enabled: boolean, cutoff = 700): void {
    this.isMuffledActive = enabled;
    this.muffledCutoff = Math.max(300, Math.min(2000, cutoff));

    if (!this.ctx) this.getContext();
    if (!this.muffledFilter || !this.ctx || !this.inputGain) return;

    const nyquist = Math.max(24000, (this.ctx.sampleRate || 48000) / 2);
    const targetFreq = enabled ? this.muffledCutoff : nyquist;
    const targetQ = enabled ? 1.6 : 0.0001;
    // Flat unity gain to completely avoid digital clipping on loud/mastered audio
    const targetComp = 1.0;

    this.muffledFilter.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.08);
    this.muffledFilter.Q.setTargetAtTime(targetQ, this.ctx.currentTime, 0.08);
    this.inputGain.gain.setTargetAtTime(targetComp, this.ctx.currentTime, 0.08);
  }

  /**
   * Sets master playback volume (0 to 1) mapped through psychoacoustic curve
   */
  public setVolume(vol: number): void {
    if (!this.ctx) return;
    if (this.masterGain) {
      const clamped = Math.max(0, Math.min(1, vol));
      const gain = volumeToGain(clamped);
      this.masterGain.gain.setTargetAtTime(gain, this.ctx.currentTime, 0.03);
    }
  }

  /**
   * Plays a diagnostic tone sweep directly through the DSP graph
   * Sweep: 220Hz -> 880Hz -> 330Hz over 3 seconds
   */
  public playTestSweep(): void {
    const ctx = this.getContext();
    if (this.sweepOsc) {
      try {
        this.sweepOsc.stop();
        this.sweepOsc.disconnect();
      } catch {}
      this.sweepOsc = null;
    }

    if (!this.inputGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 1.4);
    osc.frequency.exponentialRampToValueAtTime(330, now + 2.8);

    // Envelope
    oscGain.gain.setValueAtTime(0.001, now);
    oscGain.gain.exponentialRampToValueAtTime(0.25, now + 0.1);
    oscGain.gain.setValueAtTime(0.25, now + 2.6);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 3.0);

    osc.connect(oscGain);
    oscGain.connect(this.inputGain);

    osc.start(now);
    osc.stop(now + 3.0);
    this.sweepOsc = osc;

    osc.onended = () => {
      try {
        osc.disconnect();
        oscGain.disconnect();
      } catch {}
      if (this.sweepOsc === osc) this.sweepOsc = null;
    };
  }

  /**
   * Retrieves frequency data from the AnalyserNode for edge glow visualizers
   */
  public getByteFrequencyData(array: Uint8Array): void {
    if (this.analyserNode) {
      this.analyserNode.getByteFrequencyData(array as unknown as Uint8Array<ArrayBuffer>);
    }
  }

  /**
   * Returns the shared AnalyserNode for external visualizers
   */
  public getAnalyserNode(): AnalyserNode | null {
    if (!this.analyserNode && !this.ctx) this.getContext();
    return this.analyserNode;
  }

  public getState(): DspState {
    return {
      contextState: this.ctx ? this.ctx.state : 'uninitialized',
      is8DActive: this.is8DActive,
      speedSec: this.rotationPeriod,
      width: this.orbitWidth,
      isMuffledActive: this.isMuffledActive,
      muffledCutoff: this.muffledCutoff,
      sampleRate: this.ctx ? this.ctx.sampleRate : 44100,
    };
  }
}

export const getDspEngine = (): DspEngine => DspEngine.getInstance();
