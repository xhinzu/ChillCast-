'use client';

import React, { useState } from 'react';
import { AMBIENT_SCENES, SceneId } from '@/types/scenes';

interface SceneSelectorProps {
  activeSceneId: SceneId;
  onSelectScene: (id: SceneId) => void;
  dimmerOpacity: number;
  onDimmerChange: (opacity: number) => void;
  isPaused: boolean;
  onTogglePause: () => void;
}

export default function SceneSelector({
  activeSceneId,
  onSelectScene,
  dimmerOpacity,
  onDimmerChange,
  isPaused,
  onTogglePause,
}: SceneSelectorProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const currentScene =
    AMBIENT_SCENES.find((s) => s.id === activeSceneId) || AMBIENT_SCENES[0];

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-1.5 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-xs font-medium text-slate-200 transition-all flex items-center gap-2 cursor-pointer shadow-sm shadow-black/20"
      >
        <span>{currentScene.icon}</span>
        <span className="hidden sm:inline">{currentScene.name}</span>
        <span className="text-[10px] text-slate-400">▼</span>
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <>
          {/* Backdrop dismiss */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute right-0 top-11 z-50 w-72 backdrop-blur-md bg-[#0e121e]/95 border border-white/[0.12] rounded-3xl p-4 shadow-2xl shadow-black/70 flex flex-col gap-3.5 text-xs text-slate-200 animate-in fade-in zoom-in-95 duration-150 transform-gpu contain-paint">
            <div className="flex items-center justify-between border-b border-white/[0.07] pb-2 font-semibold">
              <span className="flex items-center gap-1.5">
                <span>🎨</span> Atmospheric Scenes
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Scene List */}
            <div className="flex flex-col gap-1.5">
              {AMBIENT_SCENES.map((scene) => {
                const isSelected = scene.id === activeSceneId;
                return (
                  <button
                    key={scene.id}
                    type="button"
                    onClick={() => {
                      onSelectScene(scene.id);
                      setIsOpen(false);
                    }}
                    className={`p-2.5 rounded-2xl flex items-center justify-between transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-indigo-500/20 border-indigo-500/40 text-white font-medium shadow-sm'
                        : 'bg-white/[0.02] border-transparent hover:bg-white/[0.06] text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{scene.icon}</span>
                      <div className="text-left">
                        <div className="leading-tight">{scene.name}</div>
                        <div className="text-[10px] text-slate-400 line-clamp-1">
                          {scene.description}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Controls: Dimmer & Pause */}
            <div className="pt-2 border-t border-white/[0.07] flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Background Dimmer</span>
                <span className="font-mono text-[10px] text-slate-300">
                  {Math.round(dimmerOpacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.2"
                max="0.85"
                step="0.05"
                value={dimmerOpacity}
                onChange={(e) => onDimmerChange(parseFloat(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-400"
              />

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-400">Motion Animation</span>
                <button
                  type="button"
                  onClick={onTogglePause}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-medium border cursor-pointer transition-colors ${
                    isPaused
                      ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                      : 'bg-white/[0.05] border-white/[0.1] text-slate-300 hover:text-white'
                  }`}
                >
                  {isPaused ? '▶ Resume Motion' : '⏸ Pause Motion'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
