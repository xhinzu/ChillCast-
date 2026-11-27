/**
 * Web Audio DSP Engine for MyuJiku (Music Bus Only)
 *
 * Chain Order:
 * source -> preamp (+ auto headroom) -> [10-band EQ OR true bypass]
 *   -> noise gate (envelope gain) -> muffled (LP + high-shelf + mix)
 *   -> stereo chorus -> reverb (parallel send/return) -> 8D panner
 *   -> master (bass/treble shelves -> M/S stereo width -> balance -> compressor -> limiter -> output trim * volume)
 *   -> shared analyser -> destination
 */

import {
  EQ_FREQUENCIES,
  EQ_PEAKING_Q,
  DEFAULT_EQ_SETTINGS,
  DEFAULT_EFFECTS_SETTINGS,
  DEFAULT_MASTER_SETTINGS,
  computeAutoHeadroomDb,
  dbToLinear,
  getEqFilterType,
  type EqSettingsState,
  type EffectsSettingsState,
  type MasterSettingsState,
  type ReverbRoomType,
  type Spatial8DDirection,
} from './audio-presets';

export interface DspState {
  contextState: AudioContextState | 'uninitialized';
  is8DActive: boolean;
  speedSec: number;
  width: number;
  isMuffledActive: boolean;
  muffledCutoff: number;
  isReverbActive: boolean;
  isChorusActive: boolean;
  isNoiseGateActive: boolean;
  eqEnabled: boolean;
  headroomDb: number;
  sampleRate: number;
}

export interface DspDiagnostics {
  contextState: AudioContextState | 'uninitialized';
  sampleRate: number;
  headroomDb: number;
  eqEnabled: boolean;
  limiterActive: boolean;
  connectedNodes: string[];
  activeEffects: string[];
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
 * psychoacoustically uniform logarithmic gain value [0, 1] (Stevens 10-dB rule).
 */
export function volumeToGain(sliderValue: number): number {
  if (typeof sliderValue !== 'number' || isNaN(sliderValue) || sliderValue <= 0) return 0;
  if (sliderValue >= 1) return 1;
  return Math.pow(sliderValue, 2.35);
}

export class DspEngine {
  private static instance: DspEngine | null = null;

  private ctx: AudioContext | null = null;

  // 1. Preamp & Headroom
  private inputGain: GainNode | null = null;
  private eqBypassTarget: AudioNode | null = null;

  // 2. 10-Band EQ
  private eqFilters: BiquadFilterNode[] = [];
  private eqState: EqSettingsState = {
    ...DEFAULT_EQ_SETTINGS,
    bands: [...DEFAULT_EQ_SETTINGS.bands],
    customPresets: [],
  };
  private eqConnectedInChain = false;

  // 3. Noise Gate (analyser-RMS envelope gain automation)
  private noiseGateAnalyser: AnalyserNode | null = null;
  private noiseGateGain: GainNode | null = null;
  private noiseGateTimer: ReturnType<typeof setInterval> | null = null;
  private noiseGateCurrentGain = 1.0;

  // 4. Muffled (parallel dry/wet with LP + Q + high-shelf cut)
  private muffledDryGain: GainNode | null = null;
  private muffledWetGain: GainNode | null = null;
  private muffledFilter: BiquadFilterNode | null = null;
  private muffledHighShelf: BiquadFilterNode | null = null;
  private muffledSum: GainNode | null = null;

  // 5. Stereo Chorus (L/R modulated delays)
  private chorusDryGain: GainNode | null = null;
  private chorusWetGain: GainNode | null = null;
  private chorusDelayL: DelayNode | null = null;
  private chorusDelayR: DelayNode | null = null;
  private chorusLfoL: OscillatorNode | null = null;
  private chorusLfoR: OscillatorNode | null = null;
  private chorusLfoGainL: GainNode | null = null;
  private chorusLfoGainR: GainNode | null = null;
  private chorusSum: GainNode | null = null;

  // 6. Reverb (parallel send/return with pre-delay + procedural IR + damping)
  private reverbDryGain: GainNode | null = null;
  private reverbPreDelay: DelayNode | null = null;
  private reverbConvolver: ConvolverNode | null = null;
  private reverbDamping: BiquadFilterNode | null = null;
  private reverbWetGain: GainNode | null = null;
  private reverbSum: GainNode | null = null;
  private lastReverbRoom: ReverbRoomType = 'hall';
  private lastReverbDecay = 2.2;

  // 7. 8D Spatial Panner
  private pannerNode: PannerNode | StereoPannerNode | null = null;
  private isHRTFPanner = false;
  private orbitAngle = 0;
  private animFrameId: number | null = null;
  private lastFrameTime = 0;
  private alternatingDir = 1;

  // 8. Master Section (preceded by optional Radio Voicing & Ducking stage)
  private radioHighPass: BiquadFilterNode | null = null;
  private radioLowPass: BiquadFilterNode | null = null;
  private radioDuckGain: GainNode | null = null;
  private masterBassShelf: BiquadFilterNode | null = null;
  private masterTrebleShelf: BiquadFilterNode | null = null;
  private widthSumNode: GainNode | null = null;
  private widthMidGain: GainNode | null = null;
  private widthSideGainL: GainNode | null = null;
  private widthSideGainR: GainNode | null = null;
  private balanceNode: StereoPannerNode | null = null;
  private masterCompressor: DynamicsCompressorNode | null = null;
  private compressorMakeupGain: GainNode | null = null;
  private brickWallLimiter: DynamicsCompressorNode | null = null;
  private masterGain: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private currentVolume = 0.8;

  private effectsState: EffectsSettingsState = {
    spatial8D: { ...DEFAULT_EFFECTS_SETTINGS.spatial8D },
    muffled: { ...DEFAULT_EFFECTS_SETTINGS.muffled },
    reverb: { ...DEFAULT_EFFECTS_SETTINGS.reverb },
    chorus: { ...DEFAULT_EFFECTS_SETTINGS.chorus },
    noiseGate: { ...DEFAULT_EFFECTS_SETTINGS.noiseGate },
  };
  private masterState: MasterSettingsState = {
    ...DEFAULT_MASTER_SETTINGS,
    compressor: { ...DEFAULT_MASTER_SETTINGS.compressor },
  };

  // Source caching to prevent "already connected" errors
  private sourceMap = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();
  private sweepOsc: OscillatorNode | null = null;

  private constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', () => {
        this.resumeContext();
      });

      const resumeOnGesture = () => {
        this.resumeContext();
        window.removeEventListener('click', resumeOnGesture);
        window.removeEventListener('touchstart', resumeOnGesture);
        window.removeEventListener('touchend', resumeOnGesture);
        window.removeEventListener('pointerdown', resumeOnGesture);
        window.removeEventListener('keydown', resumeOnGesture);
      };
      window.addEventListener('click', resumeOnGesture, { passive: true });
      window.addEventListener('touchstart', resumeOnGesture, { passive: true });
      window.addEventListener('touchend', resumeOnGesture, { passive: true });
      window.addEventListener('pointerdown', resumeOnGesture, { passive: true });
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

  private generateImpulseResponse(roomType: ReverbRoomType, decaySec: number): AudioBuffer {
    if (!this.ctx) throw new Error('AudioContext not ready');
    const rate = this.ctx.sampleRate || 44100;
    const duration = Math.max(0.3, Math.min(6.0, decaySec));
    const length = Math.max(1, Math.floor(rate * duration));
    const impulse = this.ctx.createBuffer(2, length, rate);

    const decayExp =
      roomType === 'plate' ? 2.6 : roomType === 'room' ? 3.2 : roomType === 'cathedral' ? 1.5 : 2.1;
    const earlyDensity = roomType === 'room' ? 0.04 : roomType === 'plate' ? 0.015 : 0.06;

    for (let c = 0; c < 2; c++) {
      const data = impulse.getChannelData(c);
      for (let i = 0; i < length; i++) {
        const t = i / length;
        const env = Math.pow(1 - t, decayExp);
        // Add subtle early reflections in first 60ms
        const sec = i / rate;
        const earlyBoost = sec < earlyDensity && i % 97 === 0 ? 1.35 : 1.0;
        data[i] = (Math.random() * 2 - 1) * env * earlyBoost * 0.65;
      }
    }
    return impulse;
  }

  private buildGraph() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // 1. Preamp Gain (includes auto-headroom)
    this.inputGain = this.ctx.createGain();
    this.inputGain.gain.setValueAtTime(1.0, now);

    // 2. 10-Band EQ Filter Bank
    this.eqFilters = EQ_FREQUENCIES.map((freq, idx) => {
      const f = this.ctx!.createBiquadFilter();
      f.type = getEqFilterType(idx);
      f.frequency.setValueAtTime(freq, now);
      if (f.type === 'peaking') {
        f.Q.setValueAtTime(EQ_PEAKING_Q, now);
      }
      f.gain.setValueAtTime(this.eqState.bands[idx] || 0, now);
      return f;
    });
    for (let i = 0; i < this.eqFilters.length - 1; i++) {
      this.eqFilters[i].connect(this.eqFilters[i + 1]);
    }

    // 3. Noise Gate (analyser-RMS envelope gain node)
    this.noiseGateAnalyser = this.ctx.createAnalyser();
    this.noiseGateAnalyser.fftSize = 256;
    this.noiseGateGain = this.ctx.createGain();
    this.noiseGateGain.gain.setValueAtTime(1.0, now);
    this.noiseGateAnalyser.connect(this.noiseGateGain);
    this.eqBypassTarget = this.noiseGateAnalyser;

    // Wire Preamp -> (EQ or True Bypass) -> Noise Gate
    this.rewireEqBypass(true);

    // 4. Muffled Section (dry/wet parallel mix + lowpass + high-shelf cut)
    this.muffledSum = this.ctx.createGain();
    this.muffledDryGain = this.ctx.createGain();
    this.muffledWetGain = this.ctx.createGain();
    this.muffledFilter = this.ctx.createBiquadFilter();
    this.muffledFilter.type = 'lowpass';
    this.muffledHighShelf = this.ctx.createBiquadFilter();
    this.muffledHighShelf.type = 'highshelf';
    this.muffledHighShelf.frequency.setValueAtTime(2400, now);

    this.noiseGateGain.connect(this.muffledDryGain);
    this.muffledDryGain.connect(this.muffledSum);

    this.noiseGateGain.connect(this.muffledFilter);
    this.muffledFilter.connect(this.muffledHighShelf);
    this.muffledHighShelf.connect(this.muffledWetGain);
    this.muffledWetGain.connect(this.muffledSum);

    // 5. Stereo Chorus Section
    this.chorusSum = this.ctx.createGain();
    this.chorusDryGain = this.ctx.createGain();
    this.chorusWetGain = this.ctx.createGain();
    this.muffledSum.connect(this.chorusDryGain);
    this.chorusDryGain.connect(this.chorusSum);

    if (
      typeof this.ctx.createDelay === 'function' &&
      typeof this.ctx.createChannelSplitter === 'function' &&
      typeof this.ctx.createChannelMerger === 'function'
    ) {
      try {
        const splitter = this.ctx.createChannelSplitter(2);
        const merger = this.ctx.createChannelMerger(2);
        this.chorusDelayL = this.ctx.createDelay(0.1);
        this.chorusDelayR = this.ctx.createDelay(0.1);
        this.chorusLfoGainL = this.ctx.createGain();
        this.chorusLfoGainR = this.ctx.createGain();
        this.chorusLfoL = this.ctx.createOscillator();
        this.chorusLfoR = this.ctx.createOscillator();
        this.chorusLfoL.type = 'sine';
        this.chorusLfoR.type = 'triangle';

        this.chorusLfoL.connect(this.chorusLfoGainL);
        this.chorusLfoGainL.connect(this.chorusDelayL.delayTime);
        this.chorusLfoR.connect(this.chorusLfoGainR);
        this.chorusLfoGainR.connect(this.chorusDelayR.delayTime);

        this.muffledSum.connect(splitter);
        splitter.connect(this.chorusDelayL, 0);
        splitter.connect(this.chorusDelayR, 1);
        this.chorusDelayL.connect(merger, 0, 0);
        this.chorusDelayR.connect(merger, 0, 1);
        merger.connect(this.chorusWetGain);
        this.chorusWetGain.connect(this.chorusSum);

        this.chorusLfoL.start();
        this.chorusLfoR.start();
      } catch (e) {
        console.warn('[DspEngine] Stereo Chorus init:', e);
      }
    }

    // 6. Reverb Section (parallel send/return with pre-delay + IR convolver + damping LP)
    this.reverbSum = this.ctx.createGain();
    this.reverbDryGain = this.ctx.createGain();
    this.reverbDryGain.gain.setValueAtTime(1.0, now);
    this.chorusSum.connect(this.reverbDryGain);
    this.reverbDryGain.connect(this.reverbSum);

    if (typeof this.ctx.createConvolver === 'function' && typeof this.ctx.createBuffer === 'function') {
      try {
        this.reverbPreDelay = this.ctx.createDelay(0.2);
        this.reverbConvolver = this.ctx.createConvolver();
        this.reverbConvolver.buffer = this.generateImpulseResponse(
          this.effectsState.reverb.roomType,
          this.effectsState.reverb.decaySec
        );
        this.reverbDamping = this.ctx.createBiquadFilter();
        this.reverbDamping.type = 'lowpass';
        this.reverbWetGain = this.ctx.createGain();

        this.chorusSum.connect(this.reverbPreDelay);
        this.reverbPreDelay.connect(this.reverbConvolver);
        this.reverbConvolver.connect(this.reverbDamping);
        this.reverbDamping.connect(this.reverbWetGain);
        this.reverbWetGain.connect(this.reverbSum);
      } catch (e) {
        console.warn('[DspEngine] Reverb init:', e);
      }
    }

    // 7. 8D Spatial Panner
    try {
      const panner = this.ctx.createPanner();
      panner.panningModel = 'HRTF';
      panner.distanceModel = 'inverse';
      panner.refDistance = 1;
      panner.maxDistance = 10000;
      panner.rolloffFactor = 0.25;
      panner.coneInnerAngle = 360;
      panner.positionX.setValueAtTime(0, now);
      panner.positionY.setValueAtTime(0, now);
      panner.positionZ.setValueAtTime(1, now);
      this.pannerNode = panner;
      this.isHRTFPanner = true;
    } catch {
      const stereoPanner = this.ctx.createStereoPanner();
      stereoPanner.pan.setValueAtTime(0, now);
      this.pannerNode = stereoPanner;
      this.isHRTFPanner = false;
    }
    this.reverbSum.connect(this.pannerNode);

    // 7.5 Radio Voicing & RJ Ducking Stage (transparent when Radio is off)
    this.radioHighPass = this.ctx.createBiquadFilter();
    this.radioHighPass.type = 'highpass';
    this.radioHighPass.frequency.setValueAtTime(10, now);

    this.radioLowPass = this.ctx.createBiquadFilter();
    this.radioLowPass.type = 'lowpass';
    this.radioLowPass.frequency.setValueAtTime(22000, now);

    this.radioDuckGain = this.ctx.createGain();
    this.radioDuckGain.gain.setValueAtTime(1.0, now);

    // 8. Master Section: Bass/Treble shelves -> M/S Stereo Width -> Balance -> Compressor -> Limiter -> Output Gain
    this.masterBassShelf = this.ctx.createBiquadFilter();
    this.masterBassShelf.type = 'lowshelf';
    this.masterBassShelf.frequency.setValueAtTime(110, now);

    this.masterTrebleShelf = this.ctx.createBiquadFilter();
    this.masterTrebleShelf.type = 'highshelf';
    this.masterTrebleShelf.frequency.setValueAtTime(6500, now);

    this.pannerNode.connect(this.radioHighPass);
    this.radioHighPass.connect(this.radioLowPass);
    this.radioLowPass.connect(this.radioDuckGain);
    this.radioDuckGain.connect(this.masterBassShelf);
    this.masterBassShelf.connect(this.masterTrebleShelf);

    // M/S Stereo Width Matrix
    this.widthSumNode = this.ctx.createGain();
    if (
      typeof this.ctx.createChannelSplitter === 'function' &&
      typeof this.ctx.createChannelMerger === 'function'
    ) {
      const wSplit = this.ctx.createChannelSplitter(2);
      const wMerge = this.ctx.createChannelMerger(2);
      const midSum = this.ctx.createGain();
      midSum.gain.setValueAtTime(0.5, now);
      const sideDiff = this.ctx.createGain();
      const invR = this.ctx.createGain();
      invR.gain.setValueAtTime(-1, now);

      this.widthMidGain = this.ctx.createGain();
      this.widthSideGainL = this.ctx.createGain();
      this.widthSideGainR = this.ctx.createGain();

      this.masterTrebleShelf.connect(wSplit);
      // Mid = 0.5*(L+R)
      wSplit.connect(midSum, 0);
      wSplit.connect(midSum, 1);
      midSum.connect(this.widthMidGain);
      this.widthMidGain.connect(wMerge, 0, 0);
      this.widthMidGain.connect(wMerge, 0, 1);

      // Side = 0.5*(L-R)
      const sideHalf = this.ctx.createGain();
      sideHalf.gain.setValueAtTime(0.5, now);
      wSplit.connect(sideDiff, 0);
      wSplit.connect(invR, 1);
      invR.connect(sideDiff);
      sideDiff.connect(sideHalf);

      sideHalf.connect(this.widthSideGainL);
      sideHalf.connect(this.widthSideGainR);
      this.widthSideGainL.connect(wMerge, 0, 0);
      this.widthSideGainR.connect(wMerge, 0, 1);
      wMerge.connect(this.widthSumNode);
    } else {
      this.masterTrebleShelf.connect(this.widthSumNode);
    }

    // Balance
    if (typeof this.ctx.createStereoPanner === 'function') {
      this.balanceNode = this.ctx.createStereoPanner();
      this.widthSumNode.connect(this.balanceNode);
    }

    // Master Compressor + Makeup
    const postBalance: AudioNode = this.balanceNode || this.widthSumNode;
    if (typeof this.ctx.createDynamicsCompressor === 'function') {
      this.masterCompressor = this.ctx.createDynamicsCompressor();
      this.compressorMakeupGain = this.ctx.createGain();
      this.brickWallLimiter = this.ctx.createDynamicsCompressor();

      postBalance.connect(this.masterCompressor);
      this.masterCompressor.connect(this.compressorMakeupGain);
      this.compressorMakeupGain.connect(this.brickWallLimiter);
    }

    this.masterGain = this.ctx.createGain();
    this.analyserNode = this.ctx.createAnalyser();
    this.analyserNode.fftSize = 256;
    this.analyserNode.smoothingTimeConstant = 0.8;

    const preMaster: AudioNode = this.brickWallLimiter || postBalance;
    preMaster.connect(this.masterGain);
    this.masterGain.connect(this.analyserNode);
    this.analyserNode.connect(this.ctx.destination);

    // Apply all current parameters smoothly
    this.syncAllNodes();
  }

  private rewireEqBypass(force = false) {
    if (!this.inputGain || !this.eqBypassTarget || this.eqFilters.length !== 10) return;
    const shouldEnable = this.eqState.enabled;
    if (!force && shouldEnable === this.eqConnectedInChain) return;

    try {
      this.inputGain.disconnect();
    } catch {}
    try {
      this.eqFilters[9].disconnect();
    } catch {}

    if (shouldEnable) {
      this.inputGain.connect(this.eqFilters[0]);
      this.eqFilters[9].connect(this.eqBypassTarget);
      this.eqConnectedInChain = true;
    } else {
      this.inputGain.connect(this.eqBypassTarget);
      this.eqConnectedInChain = false;
    }
  }

  private syncAllNodes() {
    this.syncPreampAndEq();
    this.syncNoiseGate();
    this.syncMuffled();
    this.syncChorus();
    this.syncReverb();
    this.sync8DLoop();
    this.syncMaster();
  }

  private syncPreampAndEq() {
    if (!this.ctx || !this.inputGain) return;
    const now = this.ctx.currentTime;
    this.rewireEqBypass();

    const headroomDb = computeAutoHeadroomDb(
      this.eqState.enabled,
      this.eqState.bands,
      this.masterState.bassDb,
      this.masterState.trebleDb
    );
    const totalPreampDb = (this.eqState.enabled ? this.eqState.preampDb : 0) + headroomDb;
    this.inputGain.gain.setTargetAtTime(dbToLinear(totalPreampDb), now, 0.025);

    for (let i = 0; i < this.eqFilters.length; i++) {
      this.eqFilters[i].gain.setTargetAtTime(this.eqState.bands[i] || 0, now, 0.025);
    }
  }

  private syncNoiseGate() {
    if (!this.ctx || !this.noiseGateGain) return;
    const ng = this.effectsState.noiseGate;
    if (!ng.enabled) {
      if (this.noiseGateTimer) {
        clearInterval(this.noiseGateTimer);
        this.noiseGateTimer = null;
      }
      this.noiseGateCurrentGain = 1.0;
      this.noiseGateGain.gain.setTargetAtTime(1.0, this.ctx.currentTime, 0.03);
      return;
    }

    if (!this.noiseGateTimer && this.noiseGateAnalyser) {
      const buf = new Float32Array(this.noiseGateAnalyser.fftSize);
      this.noiseGateTimer = setInterval(() => {
        if (!this.ctx || !this.noiseGateAnalyser || !this.noiseGateGain || !this.effectsState.noiseGate.enabled) {
          return;
        }
        if (this.ctx.state !== 'running') return;
        this.noiseGateAnalyser.getFloatTimeDomainData(buf);
        let sumSq = 0;
        for (let i = 0; i < buf.length; i++) sumSq += buf[i] * buf[i];
        const rms = Math.sqrt(sumSq / buf.length);
        const db = rms > 1e-6 ? 20 * Math.log10(rms) : -120;

        const curNg = this.effectsState.noiseGate;
        const isOpen = db >= curNg.thresholdDb;
        const targetGain = isOpen ? 1.0 : dbToLinear(curNg.rangeDb);
        const tauSec = isOpen ? Math.max(0.002, curNg.attackMs / 1000) : Math.max(0.015, curNg.releaseMs / 1000);

        if (Math.abs(targetGain - this.noiseGateCurrentGain) > 0.002) {
          this.noiseGateCurrentGain = targetGain;
          this.noiseGateGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, tauSec * 0.4);
        }
      }, 15);
    }
  }

  private syncMuffled() {
    if (!this.ctx || !this.muffledFilter || !this.muffledDryGain || !this.muffledWetGain || !this.muffledHighShelf) {
      return;
    }
    const now = this.ctx.currentTime;
    const m = this.effectsState.muffled;
    const nyquist = Math.max(20000, (this.ctx.sampleRate || 48000) / 2);

    if (m.enabled) {
      this.muffledFilter.frequency.setTargetAtTime(Math.max(300, Math.min(4000, m.cutoffHz)), now, 0.05);
      this.muffledFilter.Q.setTargetAtTime(Math.max(0.5, Math.min(6, m.q)), now, 0.05);
      this.muffledHighShelf.gain.setTargetAtTime(Math.max(-18, Math.min(0, m.highShelfCutDb)), now, 0.05);
      const wet = Math.max(0, Math.min(1, m.mix));
      this.muffledWetGain.gain.setTargetAtTime(wet, now, 0.04);
      this.muffledDryGain.gain.setTargetAtTime(1 - wet, now, 0.04);
    } else {
      this.muffledFilter.frequency.setTargetAtTime(nyquist, now, 0.05);
      this.muffledFilter.Q.setTargetAtTime(0.0001, now, 0.05);
      this.muffledHighShelf.gain.setTargetAtTime(0, now, 0.05);
      this.muffledWetGain.gain.setTargetAtTime(0, now, 0.04);
      this.muffledDryGain.gain.setTargetAtTime(1, now, 0.04);
    }
  }

  private syncChorus() {
    if (!this.ctx || !this.chorusDryGain || !this.chorusWetGain) return;
    const now = this.ctx.currentTime;
    const c = this.effectsState.chorus;

    if (this.chorusDelayL && this.chorusDelayR && this.chorusLfoL && this.chorusLfoR && this.chorusLfoGainL && this.chorusLfoGainR) {
      const baseSec = Math.max(0.005, Math.min(0.035, c.baseDelayMs / 1000));
      const spreadOffset = c.spread * 0.004;
      this.chorusDelayL.delayTime.setTargetAtTime(baseSec, now, 0.04);
      this.chorusDelayR.delayTime.setTargetAtTime(baseSec + spreadOffset, now, 0.04);

      const rate = Math.max(0.1, Math.min(5.0, c.rateHz));
      this.chorusLfoL.frequency.setTargetAtTime(rate, now, 0.04);
      this.chorusLfoR.frequency.setTargetAtTime(rate * (1 + c.spread * 0.12), now, 0.04);

      const depthSec = Math.max(0.0005, Math.min(0.01, c.depthMs / 1000));
      this.chorusLfoGainL.gain.setTargetAtTime(depthSec, now, 0.04);
      this.chorusLfoGainR.gain.setTargetAtTime(depthSec * (0.6 + c.spread * 0.4), now, 0.04);
    }

    const wet = c.enabled ? Math.max(0, Math.min(1, c.mix)) : 0;
    this.chorusWetGain.gain.setTargetAtTime(wet, now, 0.04);
    this.chorusDryGain.gain.setTargetAtTime(1 - wet * 0.35, now, 0.04);
  }

  private syncReverb() {
    if (!this.ctx || !this.reverbDryGain || !this.reverbWetGain) return;
    const now = this.ctx.currentTime;
    const r = this.effectsState.reverb;

    if (this.reverbConvolver && (r.roomType !== this.lastReverbRoom || Math.abs(r.decaySec - this.lastReverbDecay) > 0.15)) {
      this.lastReverbRoom = r.roomType;
      this.lastReverbDecay = r.decaySec;
      this.reverbConvolver.buffer = this.generateImpulseResponse(r.roomType, r.decaySec);
    }
    if (this.reverbPreDelay) {
      this.reverbPreDelay.delayTime.setTargetAtTime(Math.max(0, Math.min(0.1, r.preDelayMs / 1000)), now, 0.03);
    }
    if (this.reverbDamping) {
      this.reverbDamping.frequency.setTargetAtTime(Math.max(1000, Math.min(16000, r.dampingHz)), now, 0.04);
    }

    const wet = r.enabled ? Math.max(0, Math.min(1, r.mix)) : 0;
    this.reverbWetGain.gain.setTargetAtTime(wet, now, 0.05);
    this.reverbDryGain.gain.setTargetAtTime(1 - wet * 0.25, now, 0.05);
  }

  private sync8DLoop() {
    if (!this.pannerNode || !this.ctx) return;
    const s = this.effectsState.spatial8D;
    if (this.isHRTFPanner) {
      (this.pannerNode as PannerNode).rolloffFactor = Math.max(0, Math.min(2, s.rolloff * 1.5));
    }

    if (s.enabled) {
      if (this.animFrameId === null) {
        this.lastFrameTime = performance.now();
        const tick = (now: number) => {
          const cur = this.effectsState.spatial8D;
          if (!cur.enabled || !this.pannerNode || !this.ctx) {
            this.animFrameId = null;
            return;
          }
          const dt = Math.min(0.05, (now - this.lastFrameTime) / 1000);
          this.lastFrameTime = now;

          const period = Math.max(4, Math.min(20, cur.speedSec));
          const omega = (2 * Math.PI) / period;
          const dirSign =
            cur.direction === 'anticlockwise'
              ? -1
              : cur.direction === 'alternating'
              ? this.alternatingDir
              : 1;
          this.orbitAngle += omega * dt * dirSign;

          if (cur.direction === 'alternating' && Math.abs(this.orbitAngle) >= Math.PI) {
            this.alternatingDir *= -1;
            this.orbitAngle = Math.sign(this.orbitAngle) * Math.PI;
          } else {
            this.orbitAngle = ((this.orbitAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
          }

          const w = Math.max(0.2, Math.min(1.0, cur.width));
          const x = Math.sin(this.orbitAngle) * w;
          const z = Math.cos(this.orbitAngle) * w;

          if (this.isHRTFPanner) {
            const hrtf = this.pannerNode as PannerNode;
            hrtf.positionX.setTargetAtTime(x, this.ctx.currentTime, 0.015);
            hrtf.positionZ.setTargetAtTime(z, this.ctx.currentTime, 0.015);
          } else {
            (this.pannerNode as StereoPannerNode).pan.setTargetAtTime(x, this.ctx.currentTime, 0.015);
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
        (this.pannerNode as StereoPannerNode).pan.setTargetAtTime(0, this.ctx.currentTime, 0.08);
      }
    }
  }

  private isAnyGainBoostActive(): boolean {
    if (this.eqState.enabled && (this.eqState.preampDb > 0 || this.eqState.bands.some((b) => b > 0))) {
      return true;
    }
    return (
      this.masterState.bassDb > 0 ||
      this.masterState.trebleDb > 0 ||
      this.masterState.outputGainDb > 0 ||
      this.masterState.compressor.makeupDb > 0
    );
  }

  private syncMaster() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const m = this.masterState;

    if (this.masterBassShelf) {
      this.masterBassShelf.gain.setTargetAtTime(Math.max(-12, Math.min(12, m.bassDb)), now, 0.025);
    }
    if (this.masterTrebleShelf) {
      this.masterTrebleShelf.gain.setTargetAtTime(Math.max(-12, Math.min(12, m.trebleDb)), now, 0.025);
    }
    if (this.widthMidGain && this.widthSideGainL && this.widthSideGainR) {
      const widthFactor = Math.max(0, Math.min(2, m.stereoWidthPct / 100));
      this.widthMidGain.gain.setTargetAtTime(1.0, now, 0.025);
      this.widthSideGainL.gain.setTargetAtTime(widthFactor, now, 0.025);
      this.widthSideGainR.gain.setTargetAtTime(-widthFactor, now, 0.025);
    }
    if (this.balanceNode) {
      this.balanceNode.pan.setTargetAtTime(Math.max(-1, Math.min(1, m.balance)), now, 0.025);
    }
    if (this.masterCompressor && this.compressorMakeupGain) {
      const c = m.compressor;
      if (c.enabled) {
        this.masterCompressor.threshold.setTargetAtTime(c.thresholdDb, now, 0.03);
        this.masterCompressor.ratio.setTargetAtTime(Math.max(1, Math.min(20, c.ratio)), now, 0.03);
        this.masterCompressor.attack.setTargetAtTime(Math.max(0.001, c.attackMs / 1000), now, 0.03);
        this.masterCompressor.release.setTargetAtTime(Math.max(0.02, c.releaseMs / 1000), now, 0.03);
        this.compressorMakeupGain.gain.setTargetAtTime(dbToLinear(c.makeupDb), now, 0.03);
      } else {
        this.masterCompressor.threshold.setTargetAtTime(0, now, 0.03);
        this.masterCompressor.ratio.setTargetAtTime(1, now, 0.03);
        this.compressorMakeupGain.gain.setTargetAtTime(1.0, now, 0.03);
      }
    }
    if (this.brickWallLimiter) {
      const limiterOn = m.limiterEnabled || this.isAnyGainBoostActive();
      this.brickWallLimiter.threshold.setTargetAtTime(limiterOn ? -1.0 : 0, now, 0.02);
      this.brickWallLimiter.knee.setTargetAtTime(0, now, 0.02);
      this.brickWallLimiter.ratio.setTargetAtTime(limiterOn ? 20 : 1, now, 0.02);
      this.brickWallLimiter.attack.setTargetAtTime(0.001, now, 0.02);
      this.brickWallLimiter.release.setTargetAtTime(0.06, now, 0.02);
    }
    if (this.masterGain) {
      const volGain = volumeToGain(this.currentVolume);
      const trimGain = dbToLinear(Math.max(-12, Math.min(12, m.outputGainDb)));
      this.masterGain.gain.setTargetAtTime(volGain * trimGain, now, 0.03);
    }
  }

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
        try {
          source.disconnect();
        } catch {}
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

  public applyEq(eq: Partial<EqSettingsState>): void {
    this.eqState = {
      ...this.eqState,
      ...eq,
      bands: eq.bands ? [...eq.bands] : this.eqState.bands,
    };
    if (this.ctx) {
      this.syncPreampAndEq();
      this.syncMaster();
    }
  }

  public applyEffects(effects: Partial<EffectsSettingsState>): void {
    this.effectsState = {
      spatial8D: { ...this.effectsState.spatial8D, ...(effects.spatial8D || {}) },
      muffled: { ...this.effectsState.muffled, ...(effects.muffled || {}) },
      reverb: { ...this.effectsState.reverb, ...(effects.reverb || {}) },
      chorus: { ...this.effectsState.chorus, ...(effects.chorus || {}) },
      noiseGate: { ...this.effectsState.noiseGate, ...(effects.noiseGate || {}) },
    };
    if (this.ctx) {
      this.syncNoiseGate();
      this.syncMuffled();
      this.syncChorus();
      this.syncReverb();
      this.sync8DLoop();
    }
  }

  public applyMaster(master: Partial<MasterSettingsState>): void {
    this.masterState = {
      ...this.masterState,
      ...master,
      compressor: { ...this.masterState.compressor, ...(master.compressor || {}) },
    };
    if (this.ctx) {
      this.syncPreampAndEq();
      this.syncMaster();
    }
  }

  // Backward-compatible individual effect setters
  public set8D(
    enabled: boolean,
    speedSec = this.effectsState.spatial8D.speedSec,
    width = this.effectsState.spatial8D.width,
    direction: Spatial8DDirection = this.effectsState.spatial8D.direction,
    rolloff = this.effectsState.spatial8D.rolloff
  ): void {
    this.effectsState.spatial8D = {
      enabled,
      speedSec: Math.max(4, Math.min(20, speedSec)),
      width: Math.max(0.2, Math.min(1.0, width)),
      direction,
      rolloff: Math.max(0, Math.min(1, rolloff)),
    };
    if (!this.ctx) this.getContext();
    this.sync8DLoop();
  }

  public setMuffled(
    enabled: boolean,
    cutoff = this.effectsState.muffled.cutoffHz,
    q = this.effectsState.muffled.q,
    mix = this.effectsState.muffled.mix,
    highShelfCutDb = this.effectsState.muffled.highShelfCutDb
  ): void {
    this.effectsState.muffled = {
      enabled,
      cutoffHz: Math.max(300, Math.min(4000, cutoff)),
      q: Math.max(0.5, Math.min(6, q)),
      mix: Math.max(0, Math.min(1, mix)),
      highShelfCutDb: Math.max(-18, Math.min(0, highShelfCutDb)),
    };
    if (!this.ctx) this.getContext();
    this.syncMuffled();
  }

  public setReverb(enabled: boolean): void {
    this.effectsState.reverb.enabled = enabled;
    if (!this.ctx) this.getContext();
    this.syncReverb();
  }

  public setChorus(enabled: boolean): void {
    this.effectsState.chorus.enabled = enabled;
    if (!this.ctx) this.getContext();
    this.syncChorus();
  }

  public setNoiseGate(enabled: boolean): void {
    this.effectsState.noiseGate.enabled = enabled;
    if (!this.ctx) this.getContext();
    this.syncNoiseGate();
  }

  public setVolume(vol: number): void {
    this.currentVolume = Math.max(0, Math.min(1, vol));
    if (!this.ctx) return;
    this.syncMaster();
  }

  /**
   * Computes live combined frequency response (dB) across 10-band EQ + Master Bass/Treble shelves
   * using real BiquadFilterNode.getFrequencyResponse() when AudioContext is ready.
   */
  public getFrequencyResponseDb(freqs: Float32Array): Float32Array {
    const outDb = new Float32Array(freqs.length);
    const mag = new Float32Array(freqs.length);
    const phase = new Float32Array(freqs.length);

    if (this.eqState.enabled && this.eqFilters.length === 10) {
      for (const f of this.eqFilters) {
        if (typeof f.getFrequencyResponse === 'function') {
          f.getFrequencyResponse(
            freqs as unknown as Float32Array<ArrayBuffer>,
            mag as unknown as Float32Array<ArrayBuffer>,
            phase as unknown as Float32Array<ArrayBuffer>
          );
          for (let i = 0; i < freqs.length; i++) {
            outDb[i] += 20 * Math.log10(Math.max(1e-6, mag[i]));
          }
        }
      }
    }

    if (this.masterBassShelf && typeof this.masterBassShelf.getFrequencyResponse === 'function') {
      this.masterBassShelf.getFrequencyResponse(
        freqs as unknown as Float32Array<ArrayBuffer>,
        mag as unknown as Float32Array<ArrayBuffer>,
        phase as unknown as Float32Array<ArrayBuffer>
      );
      for (let i = 0; i < freqs.length; i++) {
        outDb[i] += 20 * Math.log10(Math.max(1e-6, mag[i]));
      }
    }
    if (this.masterTrebleShelf && typeof this.masterTrebleShelf.getFrequencyResponse === 'function') {
      this.masterTrebleShelf.getFrequencyResponse(
        freqs as unknown as Float32Array<ArrayBuffer>,
        mag as unknown as Float32Array<ArrayBuffer>,
        phase as unknown as Float32Array<ArrayBuffer>
      );
      for (let i = 0; i < freqs.length; i++) {
        outDb[i] += 20 * Math.log10(Math.max(1e-6, mag[i]));
      }
    }

    return outDb;
  }

  /**
   * Reads peak sample amplitude from the shared analyser to detect clipping (>= 0 dBFS).
   */
  public getOutputPeak(): number {
    if (!this.analyserNode || !this.ctx || this.ctx.state !== 'running') return 0;
    const buf = new Float32Array(this.analyserNode.fftSize);
    this.analyserNode.getFloatTimeDomainData(buf);
    let peak = 0;
    for (let i = 0; i < buf.length; i++) {
      const a = Math.abs(buf[i]);
      if (a > peak) peak = a;
    }
    return peak;
  }

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
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(4400, now + 1.8);
    osc.frequency.exponentialRampToValueAtTime(220, now + 3.0);

    oscGain.gain.setValueAtTime(0.001, now);
    oscGain.gain.exponentialRampToValueAtTime(0.22, now + 0.1);
    oscGain.gain.setValueAtTime(0.22, now + 2.6);
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

  public getByteFrequencyData(array: Uint8Array): void {
    if (this.analyserNode) {
      this.analyserNode.getByteFrequencyData(array as unknown as Uint8Array<ArrayBuffer>);
    }
  }

  public getAnalyserNode(): AnalyserNode | null {
    if (!this.analyserNode && !this.ctx) this.getContext();
    return this.analyserNode;
  }

  public getAudioContext(): AudioContext | null {
    return this.ctx;
  }

  public setRadioVoicing(enabled: boolean, amount = 0.65, bandwidthHz = 5600, isAm = false): void {
    if (!this.ctx || !this.radioHighPass || !this.radioLowPass) return;
    const now = this.ctx.currentTime;
    if (!enabled) {
      this.radioHighPass.frequency.setTargetAtTime(10, now, 0.04);
      this.radioLowPass.frequency.setTargetAtTime(22000, now, 0.04);
      return;
    }
    const amt = Math.max(0, Math.min(1, amount));
    const hpTarget = 10 + (isAm ? 220 : 150) * amt;
    const maxLp = isAm ? 3800 : 5600;
    const bw = Math.max(900, Math.min(maxLp, bandwidthHz));
    const lpTarget = 22000 - (22000 - bw) * amt;
    this.radioHighPass.frequency.setTargetAtTime(hpTarget, now, 0.04);
    this.radioLowPass.frequency.setTargetAtTime(lpTarget, now, 0.04);
  }

  public setRadioDucking(ducked: boolean, duckDb = -12): void {
    if (!this.ctx || !this.radioDuckGain) return;
    const now = this.ctx.currentTime;
    const gain = ducked ? dbToLinear(Math.max(-24, Math.min(0, duckDb))) : 1.0;
    this.radioDuckGain.gain.setTargetAtTime(gain, now, 0.12);
  }

  public getDiagnostics(): DspDiagnostics {
    const connectedNodes: string[] = [];
    if (this.inputGain) connectedNodes.push('Preamp');
    if (this.eqConnectedInChain) connectedNodes.push('10-Band EQ');
    else if (this.inputGain) connectedNodes.push('EQ (True Bypass)');
    if (this.noiseGateGain) connectedNodes.push('Noise Gate');
    if (this.muffledFilter) connectedNodes.push('Muffled');
    if (this.chorusWetGain) connectedNodes.push('Stereo Chorus');
    if (this.reverbConvolver) connectedNodes.push('Reverb');
    if (this.pannerNode) connectedNodes.push(this.isHRTFPanner ? '8D HRTF Panner' : '8D Stereo Panner');
    if (this.masterCompressor) connectedNodes.push('Master Comp');
    if (this.brickWallLimiter) connectedNodes.push('Brick-Wall Limiter');
    if (this.analyserNode) connectedNodes.push('Shared Analyser');

    const activeEffects: string[] = [];
    if (this.eqState.enabled) activeEffects.push('Equalizer');
    if (this.effectsState.noiseGate.enabled) activeEffects.push('Noise Gate');
    if (this.effectsState.muffled.enabled) activeEffects.push('Muffled');
    if (this.effectsState.chorus.enabled) activeEffects.push('Chorus');
    if (this.effectsState.reverb.enabled) activeEffects.push('Reverb');
    if (this.effectsState.spatial8D.enabled) activeEffects.push('8D Spatial');
    if (this.masterState.compressor.enabled) activeEffects.push('Compressor');

    return {
      contextState: this.ctx ? this.ctx.state : 'uninitialized',
      sampleRate: this.ctx ? this.ctx.sampleRate : 0,
      headroomDb: computeAutoHeadroomDb(
        this.eqState.enabled,
        this.eqState.bands,
        this.masterState.bassDb,
        this.masterState.trebleDb
      ),
      eqEnabled: this.eqState.enabled,
      limiterActive: this.masterState.limiterEnabled || this.isAnyGainBoostActive(),
      connectedNodes,
      activeEffects,
    };
  }

  public getState(): DspState {
    return {
      contextState: this.ctx ? this.ctx.state : 'uninitialized',
      is8DActive: this.effectsState.spatial8D.enabled,
      speedSec: this.effectsState.spatial8D.speedSec,
      width: this.effectsState.spatial8D.width,
      isMuffledActive: this.effectsState.muffled.enabled,
      muffledCutoff: this.effectsState.muffled.cutoffHz,
      isReverbActive: this.effectsState.reverb.enabled,
      isChorusActive: this.effectsState.chorus.enabled,
      isNoiseGateActive: this.effectsState.noiseGate.enabled,
      eqEnabled: this.eqState.enabled,
      headroomDb: computeAutoHeadroomDb(
        this.eqState.enabled,
        this.eqState.bands,
        this.masterState.bassDb,
        this.masterState.trebleDb
      ),
      sampleRate: this.ctx ? this.ctx.sampleRate : 0,
    };
  }
}

export function getDspEngine(): DspEngine {
  return DspEngine.getInstance();
}
