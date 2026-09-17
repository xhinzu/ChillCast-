import fs from 'fs';
import path from 'path';

function generateLofiTrack() {
  const sampleRate = 44100;
  const duration = 24; // 24 seconds loop
  const totalSamples = sampleRate * duration;
  const numChannels = 2;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = totalSamples * blockAlign;

  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34); // BitsPerSample (16)

  // data subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Chords (Frequencies in Hz: Cmaj9, Am9, Dm9, G13)
  const chordProgression = [
    [261.63, 329.63, 392.00, 493.88, 587.33], // Cmaj9
    [220.00, 261.63, 329.63, 392.00, 493.88], // Am9
    [146.83, 220.00, 261.63, 349.23, 440.00], // Dm9
    [196.00, 246.94, 329.63, 392.00, 523.25], // G13
  ];

  const chordDuration = duration / chordProgression.length; // 6s per chord

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const chordIndex = Math.floor((t % duration) / chordDuration);
    const chordTime = (t % chordDuration);
    const chord = chordProgression[chordIndex];

    // Piano / Rhodes chord tone synthesis
    let sampleVal = 0;
    const env = Math.exp(-chordTime * 0.75) * (1 - Math.exp(-chordTime * 20)); // Soft attack, exponential decay

    for (let f = 0; f < chord.length; f++) {
      const freq = chord[f];
      // Fundamental + gentle warm harmonics
      const osc = Math.sin(2 * Math.PI * freq * t) * 0.4
                + Math.sin(4 * Math.PI * freq * t) * 0.15
                + Math.sin(6 * Math.PI * freq * t) * 0.05;
      sampleVal += osc * env;
    }

    // Gentle sub-bass pulse on beats
    const beatTime = t % 1.5;
    const bassEnv = Math.exp(-beatTime * 3);
    const bassFreq = chord[0] / 2;
    const bass = Math.sin(2 * Math.PI * bassFreq * t) * bassEnv * 0.35;
    sampleVal += bass;

    // Subtle vinyl dust crackle
    const crackle = (Math.random() > 0.997 ? (Math.random() * 2 - 1) * 0.15 : 0);
    sampleVal += crackle;

    // Master scaling & soft clip
    sampleVal = Math.tanh(sampleVal * 0.28);

    const intSample = Math.max(-32768, Math.min(32767, Math.floor(sampleVal * 32767)));
    const offset = 44 + i * 4;

    // Slight stereo width
    buffer.writeInt16LE(intSample, offset);     // Left
    buffer.writeInt16LE(intSample, offset + 2); // Right
  }

  const outDir = path.join(process.cwd(), 'public', 'audio');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outFile = path.join(outDir, 'sample-chill.wav');
  fs.writeFileSync(outFile, buffer);
  console.log(`Successfully generated sample track at ${outFile} (${(buffer.length / 1024).toFixed(1)} KB)`);
}

generateLofiTrack();
