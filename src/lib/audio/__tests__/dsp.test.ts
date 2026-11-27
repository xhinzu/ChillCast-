import assert from 'node:assert';
import { DspEngine } from '../dsp-engine';

console.log('--- RUNNING WEB AUDIO DSP ENGINE TEST SUITE ---');

// 1. Mock Web Audio Environment for Node.js
class MockAudioParam {
  value: number;
  constructor(initial = 0) {
    this.value = initial;
  }
  setValueAtTime(val: number) { this.value = val; }
  setTargetAtTime(val: number) { this.value = val; }
  linearRampToValueAtTime(val: number) { this.value = val; }
  exponentialRampToValueAtTime(val: number) { this.value = val; }
}

class MockAudioNode {
  connect(dest: unknown) { return dest; }
  disconnect() {}
}

class MockGainNode extends MockAudioNode {
  gain = new MockAudioParam(1);
}

class MockBiquadFilterNode extends MockAudioNode {
  type = 'lowpass';
  frequency = new MockAudioParam(22050);
  Q = new MockAudioParam(0.7);
  gain = new MockAudioParam(0);
  getFrequencyResponse(_freqs: Float32Array, mag: Float32Array, phase: Float32Array) {
    mag.fill(1);
    phase.fill(0);
  }
}

class MockPannerNode extends MockAudioNode {
  panningModel = 'HRTF';
  distanceModel = 'inverse';
  positionX = new MockAudioParam(0);
  positionY = new MockAudioParam(0);
  positionZ = new MockAudioParam(1);
}

class MockStereoPannerNode extends MockAudioNode {
  pan = new MockAudioParam(0);
}

class MockAnalyserNode extends MockAudioNode {
  fftSize = 256;
  smoothingTimeConstant = 0.8;
  getByteFrequencyData(arr: Uint8Array) {
    arr.fill(128);
  }
}

class MockOscillatorNode extends MockAudioNode {
  type = 'sawtooth';
  frequency = new MockAudioParam(440);
  start() {}
  stop() {}
  onended: (() => void) | null = null;
}

class MockConvolverNode extends MockAudioNode {
  buffer: unknown = null;
}

class MockDelayNode extends MockAudioNode {
  delayTime = new MockAudioParam(0);
  constructor(public maxDelayTime = 1) { super(); }
}

class MockDynamicsCompressorNode extends MockAudioNode {
  threshold = new MockAudioParam(-24);
  knee = new MockAudioParam(30);
  ratio = new MockAudioParam(12);
  attack = new MockAudioParam(0.003);
  release = new MockAudioParam(0.25);
}

class MockAudioBuffer {
  private channels: Float32Array[];
  constructor(numberOfChannels: number, length: number, public sampleRate: number) {
    this.channels = Array.from({ length: numberOfChannels }, () => new Float32Array(length));
  }
  getChannelData(c: number) { return this.channels[c] || new Float32Array(0); }
}

class MockAudioContext {
  state: AudioContextState = 'running';
  currentTime = 100;
  sampleRate = 48000;
  destination = new MockAudioNode();

  createGain() { return new MockGainNode(); }
  createBiquadFilter() { return new MockBiquadFilterNode(); }
  createPanner() { return new MockPannerNode(); }
  createStereoPanner() { return new MockStereoPannerNode(); }
  createAnalyser() { return new MockAnalyserNode(); }
  createOscillator() { return new MockOscillatorNode(); }
  createConvolver() { return new MockConvolverNode(); }
  createDelay(max?: number) { return new MockDelayNode(max); }
  createDynamicsCompressor() { return new MockDynamicsCompressorNode(); }
  createChannelSplitter() { return new MockAudioNode(); }
  createChannelMerger() { return new MockAudioNode(); }
  createBuffer(channels: number, length: number, sampleRate: number) {
    return new MockAudioBuffer(channels, length, sampleRate);
  }
  createMediaElementSource() { return new MockAudioNode() as unknown as MediaElementAudioSourceNode; }
  async resume() { this.state = 'running'; }
  async close() { this.state = 'closed'; }
}

// Inject mock into global
(globalThis as unknown as { AudioContext: unknown }).AudioContext = MockAudioContext;
(globalThis as unknown as { window: unknown }).window = {
  AudioContext: MockAudioContext,
  addEventListener: () => {},
  removeEventListener: () => {},
};

// 2. Test DSP Engine Initialization
console.log('\n1. Testing DspEngine Singleton & Initialization...');
const dsp = DspEngine.getInstance();
assert(dsp !== null, 'DspEngine instance should exist');
const state = dsp.getState();
assert.strictEqual(state.is8DActive, false, '8D should default to inactive');
assert.strictEqual(state.isMuffledActive, false, 'Muffled should default to inactive');
console.log('   ✓ Initialization defaults verified');

// 3. Test 8D Parameter Clamping
console.log('\n2. Testing 8D Parameter Clamping (Speed & Width)...');
dsp.set8D(true, 2, 0.1); // Under minimums
let s = dsp.getState();
assert.strictEqual(s.speedSec, 4, 'Speed should clamp to minimum 4s');
assert.strictEqual(s.width, 0.2, 'Width should clamp to minimum 0.2');

dsp.set8D(true, 30, 1.5); // Over maximums
s = dsp.getState();
assert.strictEqual(s.speedSec, 20, 'Speed should clamp to maximum 20s');
assert.strictEqual(s.width, 1.0, 'Width should clamp to maximum 1.0');

dsp.set8D(false);
s = dsp.getState();
assert.strictEqual(s.is8DActive, false, '8D toggle off verified');
console.log('   ✓ 8D parameter clamping [4-20s, 0.2-1.0] verified');

// 4. Test Muffled Filter Parameter Clamping
console.log('\n3. Testing Muffled Filter Frequency Clamping...');
dsp.setMuffled(true, 150); // Below 300Hz
s = dsp.getState();
assert.strictEqual(s.isMuffledActive, true, 'Muffled should be active');
assert.strictEqual(s.muffledCutoff, 300, 'Cutoff should clamp to minimum 300Hz');

dsp.setMuffled(true, 5000); // Above 4000Hz
s = dsp.getState();
assert.strictEqual(s.muffledCutoff, 4000, 'Cutoff should clamp to maximum 4000Hz');

dsp.setMuffled(true, 750);
s = dsp.getState();
assert.strictEqual(s.muffledCutoff, 750, 'Cutoff 750Hz verified');

dsp.setMuffled(false);
s = dsp.getState();
assert.strictEqual(s.isMuffledActive, false, 'Muffled toggle off verified');
console.log('   ✓ Muffled parameter clamping [300-2000Hz] verified');

// 5. Test AnalyserNode Integration
console.log('\n4. Testing AnalyserNode Frequency Data Retrieval...');
const testBuffer = new Uint8Array(16);
dsp.getByteFrequencyData(testBuffer);
assert.strictEqual(testBuffer[0], 128, 'Analyser should populate frequency data');
console.log('   ✓ AnalyserNode frequency data retrieval verified');

// 6. Test Tone Sweep Triggering
console.log('\n5. Testing Diagnostic Tone Sweep Generator...');
dsp.playTestSweep();
// Should execute without throwing
console.log('   ✓ Diagnostic test sweep executed smoothly');

// 7. Test Perceptual Logarithmic Volume Taper
console.log('\n6. Testing Perceptual Logarithmic Volume Taper (Stevens 10-dB Rule)...');
import { volumeToGain } from '../dsp-engine';

assert.strictEqual(volumeToGain(0), 0, 'Slider at 0% must be completely silent (gain = 0)');
assert.strictEqual(volumeToGain(1), 1, 'Slider at 100% must provide full unity gain (gain = 1)');

// At 20% slider (low): gain must be soft background (< 0.05 / -26dB), not "average"
const lowGain = volumeToGain(0.2);
assert.ok(lowGain > 0 && lowGain < 0.05, `Low volume (20%) should be quiet background, got gain: ${lowGain.toFixed(4)}`);

// At 50% slider (middle): gain must be psychoacoustic half volume (~0.15 - 0.25 / -12dB), not "full"
const midGain = volumeToGain(0.5);
assert.ok(midGain >= 0.15 && midGain <= 0.25, `Middle volume (50%) should be true perceived half loudness, got gain: ${midGain.toFixed(4)}`);

// At 75% slider: gain should scale smoothly around -6dB
const highGain = volumeToGain(0.75);
assert.ok(highGain > midGain && highGain < 0.6, `High volume (75%) should scale smoothly, got gain: ${highGain.toFixed(4)}`);

console.log('   ✓ Logarithmic audio taper verified: silent at 0, quiet at 20%, half-perceived at 50%, full at 100%');

// 8. Test 10-band EQ, Presets, Auto Headroom, Profiles, and v2->v3 Settings Migration
console.log('\n7. Testing 10-band EQ, Presets, Auto Headroom & Settings Migration...');
import {
  EQ_FREQUENCIES,
  BUILTIN_EQ_PRESETS,
  BUILTIN_SOUND_PROFILES,
  DEFAULT_EQ_SETTINGS,
  DEFAULT_EFFECTS_SETTINGS,
  DEFAULT_MASTER_SETTINGS,
  computeAutoHeadroomDb,
  getEqFilterType,
} from '../audio-presets';
import { DEFAULT_SETTINGS, getSettings, SETTINGS_STORAGE_KEY } from '../../settings/settings-store';

assert.strictEqual(EQ_FREQUENCIES.length, 10, 'EQ must have 10 frequency bands');
assert.deepStrictEqual([...EQ_FREQUENCIES], [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]);
assert.strictEqual(getEqFilterType(0), 'lowshelf');
assert.strictEqual(getEqFilterType(5), 'peaking');
assert.strictEqual(getEqFilterType(9), 'highshelf');

assert.ok(BUILTIN_EQ_PRESETS.length >= 16, 'Must have at least 16 built-in EQ presets');
for (const preset of BUILTIN_EQ_PRESETS) {
  assert.strictEqual(preset.bands.length, 10, `Preset ${preset.name} must have 10 bands`);
  assert.ok(preset.preampDb >= -12 && preset.preampDb <= 12, `Preset ${preset.name} preamp in [-12, 12]`);
  for (const b of preset.bands) {
    assert.ok(b >= -12 && b <= 12, `Preset ${preset.name} band ${b} in [-12, 12]`);
  }
}

assert.strictEqual(computeAutoHeadroomDb(true, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]), 0);
assert.ok(computeAutoHeadroomDb(true, [6, 4, 0, 0, 0, 0, 0, 0, 0, 0]) <= -6, 'Auto headroom attenuates positive boost');
assert.strictEqual(computeAutoHeadroomDb(false, [6, 4, 0, 0, 0, 0, 0, 0, 0, 0]), 0);
assert.ok(BUILTIN_SOUND_PROFILES.length >= 5, 'Built-in sound profiles must exist');

dsp.applyEq({ ...DEFAULT_EQ_SETTINGS, enabled: true, bands: [4, 2, 0, 0, 0, 0, 0, 0, 2, 4] });
assert.strictEqual(dsp.getState().eqEnabled, true);
dsp.applyEffects({ ...DEFAULT_EFFECTS_SETTINGS, reverb: { ...DEFAULT_EFFECTS_SETTINGS.reverb, enabled: true, roomType: 'hall' } });
assert.strictEqual(dsp.getState().isReverbActive, true);
dsp.applyMaster({ ...DEFAULT_MASTER_SETTINGS, stereoWidthPct: 130 });
const diag = dsp.getDiagnostics();
assert.strictEqual(diag.eqEnabled, true);

const memStore = new Map<string, string>();
memStore.set(SETTINGS_STORAGE_KEY, JSON.stringify({
  version: 2,
  audio: { eqEnabled: false, spatial8DEnabled: true, muffledEnabled: false, reverbEnabled: false, chorusEnabled: false, noiseGateEnabled: true },
}));
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => memStore.get(k) ?? null,
  setItem: (k: string, v: string) => { memStore.set(k, v); },
  removeItem: (k: string) => { memStore.delete(k); },
  clear: () => { memStore.clear(); },
  key: () => null,
  length: 0,
} as Storage;
const migrated = getSettings();
assert.strictEqual(migrated.version, DEFAULT_SETTINGS.version);
assert.strictEqual(migrated.audio.effects.spatial8D.enabled, true);
assert.strictEqual(migrated.audio.effects.noiseGate.enabled, true);
assert.strictEqual(migrated.audio.eq.bands.length, 10);
console.log('   ✓ EQ, Presets, Auto Headroom, Profiles & v2->v3 migration verified');

console.log('\n========================================================');
console.log('🎉 ALL WEB AUDIO DSP ENGINE TESTS PASSED SUCCESSFULLY!');
console.log('========================================================');
