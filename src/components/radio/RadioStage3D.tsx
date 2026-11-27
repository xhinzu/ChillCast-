'use client';

import React from 'react';
import { useRadio } from '@/context/RadioContext';

export default function RadioStage3D() {
  const { band, frequency, activeStation, powerOn, togglePower, scanNext } = useRadio();

  return (
    <div className="w-full h-[360px] sm:h-[420px] rounded-2xl bg-black border border-white/10 flex flex-col items-center justify-center gap-4 p-6">
      <div className="text-center space-y-1">
        <div className="font-mono text-3xl font-bold text-white tracking-wider">
          {band === 'FM' ? `${frequency.toFixed(1)} MHz` : `${frequency} kHz`}
        </div>
        <div className="text-xs text-zinc-400">
          {activeStation ? `${activeStation.name} · ${activeStation.tag}` : 'Static'}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => scanNext(-1)}
          className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs font-semibold cursor-pointer"
        >
          Scan Prev
        </button>
        <button
          type="button"
          onClick={togglePower}
          className="px-3 py-1.5 rounded-lg bg-[var(--accent)] text-black text-xs font-bold cursor-pointer"
        >
          {powerOn ? 'Power ON' : 'Power OFF'}
        </button>
        <button
          type="button"
          onClick={() => scanNext(1)}
          className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs font-semibold cursor-pointer"
        >
          Scan Next
        </button>
      </div>
    </div>
  );
}

