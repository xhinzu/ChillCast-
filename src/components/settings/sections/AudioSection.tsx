'use client';

import React, { useState, useEffect } from 'react';
import { useSettings } from '@/lib/settings/useSettings';
import { usePlayback } from '@/context/PlaybackContext';
import { getDspEngine } from '@/lib/audio/dsp-engine';

export default function AudioSection() {
  const { settings, updateSettings, resetSection } = useSettings();
  const { activeAdapter, isSpatial8D, isMuffled, toggleSpatial8D, toggleMuffled } = usePlayback();
  const audio = settings.audio;

  const [contextState, setContextState] = useState<string>('uninitialized');
  const [isPlayingTestTone, setIsPlayingTestTone] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dsp = getDspEngine();
      setContextState(dsp.getState().contextState);
    }
  }, []);

  // Play short tone sweep through the live Web Audio chain to verify effect audibility
  const handlePlayTestSweep = async () => {
    if (typeof window === 'undefined') return;
    setIsPlayingTestTone(true);
    try {
      const dsp = getDspEngine();
      dsp.set8D(audio.spatial8DEnabled || isSpatial8D, audio.spatial8DSpeed, audio.spatial8DWidth);
      dsp.setMuffled(audio.muffledEnabled || isMuffled, audio.muffledCutoff);
      dsp.playTestSweep();
      setContextState(dsp.getState().contextState);

      setTimeout(() => {
        setIsPlayingTestTone(false);
        setContextState(dsp.getState().contextState);
      }, 3100);
    } catch (err) {
      console.warn('Test sweep error:', err);
      setIsPlayingTestTone(false);
    }
  };

  return (
    <div className="space-y-6 text-xs text-zinc-300">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
            Audio Engine &amp; DSP Effects
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Binaural 8D spatial audio orbit, muffled filter, and Web Audio diagnostics
          </p>
        </div>
        <button
          type="button"
          onClick={() => resetSection('audio')}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
          title="Reset audio settings to defaults"
        >
          Reset Audio
        </button>
      </div>

      {/* ─────────────────── 8D SPATIAL AUDIO ─────────────────── */}
      <div className="bg-[#17171a] border border-[#282830] rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h4 className="text-xs font-semibold text-white">8D Spatial Audio (Binaural Orbit)</h4>
            <p className="text-[11px] text-zinc-400">
              Rotates the stereo soundscape around the listener using continuous smooth HRTF panning.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={audio.spatial8DEnabled || isSpatial8D}
            onClick={() => {
              const next = !audio.spatial8DEnabled;
              updateSettings('audio', { spatial8DEnabled: next });
              if (toggleSpatial8D) toggleSpatial8D();
            }}
            style={{
              backgroundColor: audio.spatial8DEnabled || isSpatial8D ? 'var(--accent)' : '#2e2e36',
            }}
            className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow-lg ring-0 transition duration-200 ease-in-out ${
                audio.spatial8DEnabled || isSpatial8D ? 'translate-x-4 bg-white' : 'translate-x-0 bg-zinc-400'
              }`}
            />
          </button>
        </div>

        {(audio.spatial8DEnabled || isSpatial8D) && (
          <div className="pt-3 border-t border-[#22222a] space-y-3 animate-in fade-in duration-150">
            <div>
              <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                <span>Orbit Rotation Period (Speed)</span>
                <span className="font-mono text-zinc-300">{audio.spatial8DSpeed} seconds per cycle</span>
              </div>
              <input
                type="range"
                min="4"
                max="20"
                step="1"
                value={audio.spatial8DSpeed}
                onChange={(e) => updateSettings('audio', { spatial8DSpeed: parseInt(e.target.value, 10) })}
                style={{ accentColor: 'var(--accent)' }}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] text-zinc-500 mt-0.5">
                <span>Fast (4s)</span>
                <span>Default (8s)</span>
                <span>Relaxed (20s)</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                <span>Stereo Width / Depth</span>
                <span className="font-mono text-zinc-300">{Math.round(audio.spatial8DWidth * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.3"
                max="1.0"
                step="0.05"
                value={audio.spatial8DWidth}
                onChange={(e) => updateSettings('audio', { spatial8DWidth: parseFloat(e.target.value) })}
                style={{ accentColor: 'var(--accent)' }}
                className="w-full"
              />
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────── MUFFLED FILTER ─────────────────── */}
      <div className="bg-[#17171a] border border-[#282830] rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h4 className="text-xs font-semibold text-white">Muffled Sound (Next Room Effect)</h4>
            <p className="text-[11px] text-zinc-400">
              Low-pass biquad filter simulating hearing music through a bedroom door or outside a club.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={audio.muffledEnabled || isMuffled}
            onClick={() => {
              const next = !audio.muffledEnabled;
              updateSettings('audio', { muffledEnabled: next });
              if (toggleMuffled) toggleMuffled();
            }}
            style={{
              backgroundColor: audio.muffledEnabled || isMuffled ? 'var(--accent)' : '#2e2e36',
            }}
            className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow-lg ring-0 transition duration-200 ease-in-out ${
                audio.muffledEnabled || isMuffled ? 'translate-x-4 bg-white' : 'translate-x-0 bg-zinc-400'
              }`}
            />
          </button>
        </div>

        {(audio.muffledEnabled || isMuffled) && (
          <div className="pt-3 border-t border-[#22222a] space-y-3 animate-in fade-in duration-150">
            <div>
              <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                <span>Cutoff Frequency</span>
                <span className="font-mono text-zinc-300">{audio.muffledCutoff} Hz</span>
              </div>
              <input
                type="range"
                min="300"
                max="2000"
                step="50"
                value={audio.muffledCutoff}
                onChange={(e) => updateSettings('audio', { muffledCutoff: parseInt(e.target.value, 10) })}
                style={{ accentColor: 'var(--accent)' }}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] text-zinc-500 mt-0.5">
                <span>Deep / Submerged (300Hz)</span>
                <span>Default (700Hz)</span>
                <span>Light Muffle (2000Hz)</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────── AUDIO DIAGNOSTICS & TEST SWEEP ─────────────────── */}
      <div className="bg-[#17171a] border border-[#282830] rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-white">Audio Pipeline Diagnostics</h4>
          <span
            style={{
              backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)',
              color: 'var(--accent)',
              borderColor: 'color-mix(in srgb, var(--accent) 30%, transparent)',
            }}
            className="px-2 py-0.5 rounded text-[10px] font-mono border"
          >
            State: {contextState}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-mono bg-[#111114] p-3 rounded-lg border border-[#222228]">
          <div>
            <span className="text-zinc-500 block text-[9px] uppercase">Active Adapter</span>
            <span className="text-zinc-200">{activeAdapter ? 'Online' : 'Initializing'}</span>
          </div>
          <div>
            <span className="text-zinc-500 block text-[9px] uppercase">8D Panner</span>
            <span
              style={{
                color: audio.spatial8DEnabled || isSpatial8D ? 'var(--accent)' : undefined,
              }}
              className={audio.spatial8DEnabled || isSpatial8D ? 'font-semibold' : 'text-zinc-500'}
            >
              {audio.spatial8DEnabled || isSpatial8D ? 'Active' : 'Bypassed'}
            </span>
          </div>
          <div>
            <span className="text-zinc-500 block text-[9px] uppercase">Muffled Low-pass</span>
            <span
              style={{
                color: audio.muffledEnabled || isMuffled ? 'var(--accent)' : undefined,
              }}
              className={audio.muffledEnabled || isMuffled ? 'font-semibold' : 'text-zinc-500'}
            >
              {audio.muffledEnabled || isMuffled ? `${audio.muffledCutoff}Hz` : 'Bypassed (20kHz)'}
            </span>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between">
          <p className="text-[11px] text-zinc-400">
            Play a 2.5-second tone sweep through the DSP chain to verify effects audibly:
          </p>
          <button
            type="button"
            onClick={handlePlayTestSweep}
            disabled={isPlayingTestTone}
            style={{
              backgroundColor: 'var(--accent)',
              color: 'var(--accent-contrast)',
            }}
            className="px-3.5 py-1.5 rounded-lg font-semibold text-xs transition-opacity hover:opacity-90 cursor-pointer disabled:opacity-50 shrink-0 shadow"
          >
            {isPlayingTestTone ? 'Playing Tone Sweep...' : 'Play Test Sweep'}
          </button>
        </div>
      </div>
    </div>
  );
}
