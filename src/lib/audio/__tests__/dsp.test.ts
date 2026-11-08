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

dsp.setMuffled(true, 3500); // Above 2000Hz
s = dsp.getState();
assert.strictEqual(s.muffledCutoff, 2000, 'Cutoff should clamp to maximum 2000Hz');

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

console.log('\n========================================================');
console.log('🎉 ALL WEB AUDIO DSP ENGINE TESTS PASSED SUCCESSFULLY!');
console.log('========================================================');
