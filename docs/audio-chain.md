# MyuJiku Web Audio DSP Chain

This document describes the music-bus Web Audio signal chain implemented in `src/lib/audio/dsp-engine.ts`.

> **Isolation:** The DSP chain processes the **MUSIC bus only** (`YouTubeAdapter` direct stream and `LocalAudioAdapter`). Ambient soundscapes (`AmbientContext`) and `DualVinylMixer` maintain independent Web Audio routing and are not equalized or gated by this chain.

## Signal Chain Order

```
HTMLMediaElement (MediaElementAudioSourceNode)
  -> Preamp Gain (preampDb + automatic headroom compensation)
  -> 10-Band Equalizer (true bypass when Off)
       [32 Hz low-shelf, 64..8k Hz peaking (Q = 1.25), 16 kHz high-shelf]
  -> Noise Gate (smooth analyser-RMS envelope gain automation, click-free)
  -> Muffled Filter (dry/wet mix, low-pass 300-4000 Hz + Q + high-shelf cut)
  -> Stereo Chorus (dual-channel L/R modulated delay with stereo spread & mix)
  -> Reverb (parallel dry + pre-delay -> procedural IR Convolver -> damping LP -> wet gain)
  -> 8D Spatial Panner (HRTF PannerNode or StereoPannerNode fallback; CW / CCW / alternating)
  -> Master Section:
       Bass Shelf (110 Hz) -> Treble Shelf (6.5 kHz)
       -> Mid/Side Stereo Width Matrix (0-200%)
       -> L/R Balance (StereoPannerNode)
       -> Master Compressor (DynamicsCompressorNode)
       -> Brick-Wall Limiter (-1.0 dB threshold, ratio 20, fast attack)
       -> Output Trim Gain * Perceptual Volume Taper (Stevens power law ^2.35)
  -> Shared AnalyserNode (fftSize 256, powers Edge Glow, Lyric Beat Pulse, EQ spectrum & clip meter)
  -> AudioContext.destination
```

## Notes
- **True Bypass:** When the Equalizer is toggled Off, the preamp connects directly to the Noise Gate, skipping all 10 `BiquadFilterNode` stages.
- **Headroom & Clipping Protection:** `computeAutoHeadroomDb` attenuates the preamp by the largest positive boost across EQ + Master Bass/Treble shelves, and the `-1 dB` brick-wall limiter is enabled by default whenever EQ or any positive boost is active.
- **Click-Free Transitions:** All gain, filter frequency, Q, and panner updates use `AudioParam.setTargetAtTime` with short smoothing constants (15–80 ms).
- **AudioContext Lifecycle:** Automatically resumes on `window` focus, `click`, `touchstart`, `touchend`, `pointerdown`, and `keydown`, and survives track changes, seeking, and pause/resume.

