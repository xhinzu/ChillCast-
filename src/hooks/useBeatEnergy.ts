import { useEffect, useRef, useState } from 'react';
import { usePlayback } from '@/context/PlaybackContext';

export function useBeatEnergy(enabled = true, isMusicSync = true) {
  const { getAudioAnalyser, isPlaying } = usePlayback();
  const [beatEnergy, setBeatEnergy] = useState<number>(0.3);

  const smoothedEnergyRef = useRef<number>(0.3);
  const breathPhaseRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    let animId: number;
    const freqData = new Uint8Array(128);

    const update = () => {
      let currentSample = 0.3;
      const analyser = getAudioAnalyser();

      if (analyser && isPlaying && isMusicSync) {
        analyser.getByteFrequencyData(freqData);

        // Bass bins (sub-bass and low punch: ~30Hz to ~160Hz)
        let bassSum = 0;
        const bassBinCount = 7;
        for (let i = 1; i <= bassBinCount; i++) {
          bassSum += freqData[i];
        }
        const rawBass = bassSum / (bassBinCount * 255);

        // If actual audio signal is coming through the analyser
        if (rawBass > 0.04) {
          const prev = smoothedEnergyRef.current;
          // Fast attack, slower decay release
          if (rawBass > prev) {
            currentSample = prev * 0.25 + rawBass * 0.75;
          } else {
            currentSample = prev * 0.85 + rawBass * 0.15;
          }
        } else {
          // Stream Audio might be quiet or buffering — musical breathing fallback
          breathPhaseRef.current += 0.04;
          currentSample = 0.3 + 0.35 * Math.sin(breathPhaseRef.current);
        }
      } else if (isPlaying) {
        // Fallback or static mode: smooth breathing pulse
        breathPhaseRef.current += 0.035;
        currentSample = 0.35 + 0.35 * Math.sin(breathPhaseRef.current);
      } else {
        // Paused: gentle resting glow
        currentSample = 0.25;
      }

      smoothedEnergyRef.current = currentSample;

      // Throttle React state updates slightly to 30fps for compositor breathing
      setBeatEnergy(currentSample);

      animId = requestAnimationFrame(update);
    };

    animId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animId);
  }, [enabled, isMusicSync, isPlaying, getAudioAnalyser]);

  return beatEnergy;
}
