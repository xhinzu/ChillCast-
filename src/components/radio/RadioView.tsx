'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRadio } from '@/context/RadioContext';
import { useRoom } from '@/context/RoomContext';
import { usePlayback } from '@/context/PlaybackContext';
import { useSettings } from '@/lib/settings/useSettings';
import { AM_MAX, AM_MIN, AM_STEP, FM_MAX, FM_MIN, FM_STEP } from '@/lib/radio/stations';
import RadioStationsDrawer from './RadioStationsDrawer';

const RadioStage3D = dynamic(() => import('./RadioStage3D'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[380px] sm:h-[440px] rounded-2xl bg-black border border-white/10 flex items-center justify-center text-xs text-zinc-400">
      Loading 3D Radio...
    </div>
  ),
});

export default function RadioView() {
  const {
    powerOn,
    band,
    frequency,
    reception,
    activeStation,
    weakSignal,
    presets,
    rjCaption,
    isRjSpeaking,
    lastAnnouncement,
    setRadioActive,
    togglePower,
    setBand,
    tuneToFrequency,
    scanNext,
    savePreset,
    recallPreset,
  } = useRadio();

  const { settings, updateSettings } = useSettings();
  const playback = usePlayback();
  const roomContext = useRoom();
  const isInRoom = Boolean(roomContext?.room && roomContext?.roomStatus === 'connected');

  const [drawerOpen, setDrawerOpen] = useState(true);
  const simpleControls = settings.radio.simpleControls;

  useEffect(() => {
    setRadioActive(true);
    return () => setRadioActive(false);
  }, [setRadioActive]);

  // Keyboard support for radio tuning & power
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
        return;
      }
      const step = band === 'FM' ? (e.shiftKey ? 0.1 : 0.2) : (e.shiftKey ? 10 : 20);
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        tuneToFrequency(frequency + step, { snap: !e.shiftKey });
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        tuneToFrequency(frequency - step, { snap: !e.shiftKey });
      } else if (e.key === 'Home') {
        e.preventDefault();
        tuneToFrequency(band === 'FM' ? FM_MIN : AM_MIN);
      } else if (e.key === 'End') {
        e.preventDefault();
        tuneToFrequency(band === 'FM' ? FM_MAX : AM_MAX);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [band, frequency, tuneToFrequency]);

  if (isInRoom) {
    return (
      <section className="w-full min-h-[460px] bg-black rounded-2xl border border-white/10 flex flex-col items-center justify-center p-8 text-center gap-3">
        <span className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
          Listen Together Active
        </span>
        <h2 className="text-lg font-bold text-white">Radio is disabled inside Listen Together rooms</h2>
        <p className="text-xs text-zinc-400 max-w-md">
          Leave your current Listen Together room to tune into live FM/AM stations.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-label="Interactive Radio"
      className="w-full flex-1 bg-black rounded-2xl border border-[#1f1f27] p-4 sm:p-6 flex flex-col gap-4"
    >
      {/* Screen-reader live region */}
      <div className="sr-only" aria-live="polite">
        {lastAnnouncement}
      </div>

      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
              powerOn
                ? 'bg-red-500/15 text-red-300 border-red-500/40'
                : 'bg-zinc-800 text-zinc-400 border-zinc-700'
            }`}
          >
            {powerOn ? 'On Air' : 'Standby'}
          </span>
          <span className="font-mono text-sm font-bold text-white">
            {band === 'FM' ? `${frequency.toFixed(1)} MHz` : `${frequency} kHz`}
          </span>
          <span className="text-xs text-zinc-400 truncate max-w-[220px]">
            {activeStation ? activeStation.name : 'Between stations (static)'}
          </span>
          {weakSignal && (
            <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 text-[10px] font-semibold">
              Weak signal
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => updateSettings('radio', { simpleControls: !simpleControls })}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer ${
              simpleControls
                ? 'bg-[var(--accent)] text-black border-[var(--accent)]'
                : 'bg-white/5 text-zinc-300 border-white/10 hover:bg-white/10'
            }`}
          >
            Simple controls
          </button>
          <button
            type="button"
            onClick={() => setDrawerOpen((v) => !v)}
            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white/5 text-zinc-300 border border-white/10 hover:bg-white/10 cursor-pointer"
          >
            {drawerOpen ? 'Hide Stations' : 'Stations'}
          </button>
        </div>
      </div>

      {/* Main Stage + Stations Drawer */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch">
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          <RadioStage3D />

          {/* Slim On-Air Card & RJ Captions */}
          <div className="p-3.5 rounded-xl bg-[#0e0e12] border border-[#22222b] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">
                  {activeStation ? `${activeStation.name} (${activeStation.tag})` : 'Static'}
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">
                  Signal {Math.round(reception.signal * 100)}%
                </span>
                {isRjSpeaking && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold uppercase">
                    RJ Live
                  </span>
                )}
              </div>
              <p className="text-xs font-semibold text-white truncate mt-0.5">
                {playback.currentTrack ? `${playback.currentTrack.title} — ${playback.currentTrack.artist}` : 'Tune to a station to listen'}
              </p>
              {settings.radio.rjCaptions && rjCaption && (
                <p className="text-[11px] text-amber-200/90 mt-1 italic">{rjCaption}</p>
              )}
            </div>
          </div>

          {/* Simple Accessible Controls */}
          {simpleControls && (
            <div className="p-3.5 rounded-xl bg-[#111116] border border-[#24242e] space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={togglePower}
                  aria-label="Power toggle"
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer border ${
                    powerOn
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                  }`}
                >
                  {powerOn ? 'Power ON' : 'Power OFF'}
                </button>
                <button
                  type="button"
                  onClick={() => setBand(band === 'FM' ? 'AM' : 'FM')}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 text-white border border-white/10 cursor-pointer"
                >
                  Band: {band}
                </button>
                <button
                  type="button"
                  onClick={() => scanNext(-1)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 text-zinc-200 border border-white/10 cursor-pointer"
                >
                  Scan Back
                </button>
                <button
                  type="button"
                  onClick={() => scanNext(1)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 text-zinc-200 border border-white/10 cursor-pointer"
                >
                  Scan Forward
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="space-y-1 text-[11px] text-zinc-300">
                  <span>Tuning ({band === 'FM' ? `${frequency.toFixed(1)} MHz` : `${frequency} kHz`})</span>
                  <input
                    type="range"
                    min={band === 'FM' ? FM_MIN : AM_MIN}
                    max={band === 'FM' ? FM_MAX : AM_MAX}
                    step={band === 'FM' ? FM_STEP : AM_STEP}
                    value={frequency}
                    onChange={(e) => tuneToFrequency(parseFloat(e.target.value), { snap: true })}
                    aria-label="Tuning frequency"
                    className="w-full accent-[var(--accent)] cursor-pointer"
                  />
                </label>
                <label className="space-y-1 text-[11px] text-zinc-300">
                  <span>Volume ({Math.round(playback.volume * 100)}%)</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={playback.volume}
                    onChange={(e) => playback.setVolume(parseFloat(e.target.value))}
                    aria-label="Radio volume"
                    className="w-full accent-[var(--accent)] cursor-pointer"
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {[1, 2, 3, 4, 5, 6].map((slot) => {
                  const p = presets.find((x) => x.slot === slot);
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => (p ? recallPreset(slot) : savePreset(slot))}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        savePreset(slot);
                      }}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border cursor-pointer ${
                        p
                          ? 'bg-[var(--accent)]/15 text-white border-[var(--accent)]/40'
                          : 'bg-white/5 text-zinc-400 border-white/10'
                      }`}
                      title={p ? `${p.name} (Right-click to overwrite)` : `Save current station to Preset ${slot}`}
                    >
                      P{slot}{p ? `: ${p.frequency}` : ''}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <RadioStationsDrawer isOpen={drawerOpen} />
      </div>
    </section>
  );
}

