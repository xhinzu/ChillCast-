'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { WORD_EFFECTS, EFFECT_BY_ID } from '@/lib/lyrics/visuals/effects/catalog';
import { EffectManager } from '@/lib/lyrics/visuals/effects/EffectManager';
import { EffectStrength } from '@/lib/lyrics/visuals/effects/types';

export default function EffectGalleryPage() {
  const [selectedEffectId, setSelectedEffectId] = useState<string>('bomb');
  const [strength, setStrength] = useState<EffectStrength>('normal');
  const [naturalColors, setNaturalColors] = useState<boolean>(true);
  const [screenShake, setScreenShake] = useState<boolean>(true);
  const [intenseEnabled, setIntenseEnabled] = useState<boolean>(true);
  const [flashCount, setFlashCount] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const wordElRef = useRef<HTMLDivElement | null>(null);
  const managerRef = useRef<EffectManager | null>(null);

  useEffect(() => {
    const mgr = new EffectManager({
      wordEffectsEnabled: true,
      effectFrequency: 'high',
      effectStrength: strength,
      screenShakeEnabled: screenShake,
      intenseEffectsEnabled: intenseEnabled,
      naturalColors,
      onShake: (offset) => {
        if (!stageRef.current) return;
        if (offset && screenShake) {
          stageRef.current.style.transform = `translate3d(${offset.x.toFixed(1)}px, ${offset.y.toFixed(1)}px, 0)`;
        } else {
          stageRef.current.style.transform = '';
        }
      },
    });
    managerRef.current = mgr;

    if (canvasRef.current) {
      mgr.setCanvas(canvasRef.current);
      const rect = canvasRef.current.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvasRef.current.width = rect.width * dpr;
      canvasRef.current.height = rect.height * dpr;
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);
    }

    return () => {
      mgr.destroy();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (managerRef.current) {
      managerRef.current.updateOptions({
        effectStrength: strength,
        screenShakeEnabled: screenShake,
        intenseEffectsEnabled: intenseEnabled,
        naturalColors,
      });
    }
  }, [strength, screenShake, intenseEnabled, naturalColors]);

  const seedCounterRef = useRef<number>(200);

  const triggerEffect = (id: string, customWord?: string) => {
    setSelectedEffectId(id);
    const def = EFFECT_BY_ID.get(id);
    if (!def || !managerRef.current || !canvasRef.current || !wordElRef.current) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const wordRect = wordElRef.current.getBoundingClientRect();
    const relRect = {
      x: wordRect.left - canvasRect.left,
      y: wordRect.top - canvasRect.top,
      width: wordRect.width,
      height: wordRect.height,
    };

    seedCounterRef.current += 1;
    const wordToUse = customWord || def.words[0];
    managerRef.current.triggerEffect(id, {
      wordRect: relRect,
      targetElement: wordElRef.current,
      palette: {
        primary: '#38bdf8',
        secondary: '#94a3b8',
        glow: '#f43f5e',
        isChroma: false,
      },
      naturalColors,
      intensity: def.intensity === 'intense' ? 'intense' : 'normal',
      strength,
      seed: seedCounterRef.current,
      wordText: wordToUse,
    });

    setFlashCount(managerRef.current.getFlashBudget().getRecentFlashCount());
  };

  const categories = [
    { id: 'impact', label: 'Impact & Energy' },
    { id: 'fire', label: 'Fire, Heat & Light' },
    { id: 'water', label: 'Water, Weather & Sky' },
    { id: 'emotion', label: 'Emotion & Relationships' },
    { id: 'motion', label: 'Motion & Objects' },
    { id: 'intense', label: 'Intense Effects (Gated)' },
  ];

  const selectedDef = EFFECT_BY_ID.get(selectedEffectId);

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white flex flex-col font-sans select-none">
      {/* Header */}
      <header className="border-b border-zinc-800/80 px-6 py-4 flex items-center justify-between bg-[#111114]">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-xs px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold"
          >
            ← Back
          </Link>
          <h1 className="text-base font-extrabold tracking-wide uppercase text-amber-400">
            Word Effects Gallery ({WORD_EFFECTS.length} Effects)
          </h1>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-4 text-xs">
          {/* Strength */}
          <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
            {(['subtle', 'normal', 'strong'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStrength(s)}
                className={`px-2 py-0.5 rounded text-[11px] capitalize cursor-pointer font-medium ${
                  strength === s ? 'bg-amber-400 text-black font-bold' : 'text-zinc-400'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Screen Shake */}
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={screenShake}
              onChange={(e) => setScreenShake(e.target.checked)}
              className="accent-amber-400 cursor-pointer"
            />
            <span className="text-zinc-300">Shake</span>
          </label>

          {/* Natural Colors */}
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={naturalColors}
              onChange={(e) => setNaturalColors(e.target.checked)}
              className="accent-amber-400 cursor-pointer"
            />
            <span className="text-zinc-300">Natural Colors</span>
          </label>

          {/* Intense Effects */}
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={intenseEnabled}
              onChange={(e) => setIntenseEnabled(e.target.checked)}
              className="accent-red-500 cursor-pointer"
            />
            <span className="text-red-400 font-semibold">Intense</span>
          </label>
        </div>
      </header>

      {/* Main Grid: Left Catalog, Right Preview Stage */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Catalog Sidebar */}
        <div className="w-80 md:w-96 border-r border-zinc-800/80 bg-[#0e0e11] flex flex-col overflow-hidden">
          <div className="p-3 border-b border-zinc-800">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search effects or words..."
              className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700/60 text-xs text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {categories.map((cat) => {
              const effects = WORD_EFFECTS.filter(
                (e) =>
                  e.category === cat.id &&
                  (!searchQuery ||
                    e.id.includes(searchQuery.toLowerCase()) ||
                    e.words.some((w) => w.includes(searchQuery.toLowerCase())))
              );
              if (effects.length === 0) return null;

              return (
                <div key={cat.id} className="space-y-1.5">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                    {cat.label} ({effects.length})
                  </h3>
                  <div className="grid grid-cols-2 gap-1.5">
                    {effects.map((eff) => {
                      const isSelected = selectedEffectId === eff.id;
                      return (
                        <button
                          key={eff.id}
                          type="button"
                          onClick={() => triggerEffect(eff.id)}
                          className={`px-2.5 py-2 rounded-xl text-left border transition-all cursor-pointer flex flex-col gap-0.5 ${
                            isSelected
                              ? 'bg-amber-400/15 border-amber-400/60 text-amber-200'
                              : eff.intensity === 'intense'
                              ? 'bg-red-950/20 hover:bg-red-900/30 border-red-900/40 text-red-200'
                              : 'bg-zinc-900/60 hover:bg-zinc-800/80 border-zinc-800 text-zinc-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs capitalize">{eff.id}</span>
                            {eff.intensity === 'intense' && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-red-900/50 text-red-300 font-bold">
                                INTENSE
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-zinc-500 truncate">
                            {eff.words.slice(0, 3).join(', ')}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Live Preview Stage */}
        <div className="flex-1 flex flex-col bg-[#070709] relative overflow-hidden">
          {/* Top Bar for Selected Effect */}
          {selectedDef && (
            <div className="p-4 border-b border-zinc-800/60 flex items-center justify-between bg-[#0b0b0e]">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white capitalize">{selectedDef.name}</h2>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono">
                    id: &ldquo;{selectedDef.id}&rdquo;
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
                    {selectedDef.durationMs}ms
                  </span>
                </div>
                <div className="text-xs text-zinc-400 mt-1 flex flex-wrap gap-1 items-center">
                  <span className="text-zinc-500 font-semibold">Trigger words:</span>
                  {selectedDef.words.map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => triggerEffect(selectedDef.id, w)}
                      className="px-2 py-0.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-amber-300 cursor-pointer font-mono text-[11px]"
                      title="Click to trigger on this specific word"
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => triggerEffect(selectedDef.id)}
                className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-sm shadow-lg shadow-amber-400/20 cursor-pointer transition-transform active:scale-95"
              >
                Trigger Again ⚡
              </button>
            </div>
          )}

          {/* Interactive Stage Canvas Container */}
          <div
            ref={stageRef}
            className="flex-1 relative flex items-center justify-center p-8 transition-transform duration-75"
          >
            {/* Word Target Box */}
            <div
              ref={wordElRef}
              onClick={() => triggerEffect(selectedEffectId)}
              className="px-8 py-4 rounded-2xl border-2 border-dashed border-zinc-700 bg-zinc-900/60 text-4xl sm:text-6xl font-black text-white tracking-wide cursor-pointer hover:border-amber-400 transition-colors shadow-2xl relative select-none"
            >
              <span className="active-glyph-glow uppercase">
                {selectedDef ? selectedDef.words[0] : 'EXPLODE'}
              </span>
              <span className="block text-[10px] text-zinc-500 text-center font-normal tracking-normal mt-1">
                (Click word to trigger effect)
              </span>
            </div>

            {/* Effect Layer Canvas */}
            <canvas
              ref={canvasRef}
              aria-hidden="true"
              className="absolute inset-0 w-full h-full pointer-events-none"
            />
          </div>

          {/* Bottom Diagnostics Bar */}
          <div className="p-3 bg-[#0d0d10] border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-400">
            <div className="flex items-center gap-4">
              <span>
                Flash Budget (1s window):{' '}
                <span className="font-mono text-emerald-400 font-bold">{flashCount} / 3</span>
              </span>
              <span>
                Concurrent Limit: <span className="font-mono text-zinc-300 font-bold">Max 2</span>
              </span>
              <span>
                FPS Mode:{' '}
                <span className="font-mono text-zinc-300 font-bold">Auto 60fps</span>
              </span>
            </div>
            <div className="text-zinc-500">
              Photosensitive safe &bull; aria-hidden &bull; pointer-events: none
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
