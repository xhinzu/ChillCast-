'use client';

import React, { useState } from 'react';
import { LyricsSettings } from '@/lib/lyrics/settings';
import { WORD_EFFECTS, EFFECT_BY_ID } from '@/lib/lyrics/visuals/effects/catalog';
import { EffectTriggerParams } from '@/lib/lyrics/visuals/effects/types';

interface InspectModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: LyricsSettings;
  onTriggerEffect?: (effectId: string, params: EffectTriggerParams) => void;
}

export default function InspectModal({
  isOpen,
  onClose,
  settings,
  onTriggerEffect,
}: InspectModalProps) {
  const [selectedEffectId, setSelectedEffectId] = useState<string>('bomb');
  const seedCounterRef = React.useRef<number>(100);

  if (!isOpen) return null;

  const handleTestTrigger = (id: string, word: string) => {
    setSelectedEffectId(id);
    seedCounterRef.current += 1;
    if (onTriggerEffect) {
      const centerX = typeof window !== 'undefined' ? window.innerWidth / 2 - 40 : 200;
      const centerY = typeof window !== 'undefined' ? window.innerHeight / 2 - 20 : 200;
      onTriggerEffect(id, {
        wordRect: { x: centerX, y: centerY, width: 100, height: 35 },
        palette: {
          primary: settings.lyricColor || '#ffffff',
          secondary: settings.secondaryColor || '#888888',
          glow: settings.highlightColor || '#ef4444',
          isChroma: settings.chromaEnabled,
        },
        naturalColors: settings.naturalColors,
        intensity: EFFECT_BY_ID.get(id)?.intensity === 'intense' ? 'intense' : 'normal',
        strength: settings.effectStrength,
        seed: seedCounterRef.current,
        wordText: word,
      });
    }
  };

  const categories = [
    { id: 'impact', label: 'Impact & Energy' },
    { id: 'fire', label: 'Fire, Heat & Light' },
    { id: 'water', label: 'Water, Weather & Sky' },
    { id: 'emotion', label: 'Emotion & Relationships' },
    { id: 'motion', label: 'Motion & Objects' },
    { id: 'intense', label: 'Intense Effects' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#121212] border border-[#2a2a2a] rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#242424] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔍</span>
            <h2 className="text-sm font-bold text-white tracking-wide uppercase">
              Lyrics & Word Effects Inspector
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#1c1c1c] hover:bg-[#282828] text-zinc-400 hover:text-white flex items-center justify-center text-sm transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-5 text-xs text-zinc-300">
          {/* Active Word Effect Manual Trigger Section */}
          <div className="bg-[#181818] p-3.5 rounded-xl border border-[#262626] space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-400 uppercase tracking-wider text-[11px]">
                Word Effect Live Trigger (All 49 Effects)
              </span>
              <span className="text-[10px] text-zinc-500">
                Click any effect to fire it on screen
              </span>
            </div>

            <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
              {categories.map((cat) => {
                const effects = WORD_EFFECTS.filter((e) => e.category === cat.id);
                return (
                  <div key={cat.id} className="space-y-1">
                    <span className="text-[10px] uppercase font-semibold text-zinc-500 block">
                      {cat.label} ({effects.length})
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {effects.map((eff) => {
                        const isSelected = selectedEffectId === eff.id;
                        return (
                          <button
                            key={eff.id}
                            type="button"
                            onClick={() => handleTestTrigger(eff.id, eff.words[0])}
                            className={`px-2 py-1 rounded text-[11px] font-medium transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-amber-400 text-black font-bold scale-105 shadow-md'
                                : eff.intensity === 'intense'
                                ? 'bg-[#251515] hover:bg-[#351818] text-red-300 border border-red-900/40'
                                : 'bg-[#202020] hover:bg-[#2a2a2a] text-zinc-300 border border-zinc-700/50'
                            }`}
                            title={`Words: ${eff.words.join(', ')}`}
                          >
                            {eff.id}
                            {eff.intensity === 'intense' && (
                              <span className="ml-1 text-[9px] text-red-400 font-bold">!</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Settings Dump Section */}
          <div className="bg-[#181818] p-3.5 rounded-xl border border-[#262626] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-zinc-400 uppercase tracking-wider text-[11px]">
                Settings Dump
              </span>
              <span className="text-[10px] font-mono text-zinc-500">
                wordEffectsEnabled: {String(settings.wordEffectsEnabled)}
              </span>
            </div>
            <pre className="p-3 bg-[#0d0d0d] rounded-lg text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-48 border border-[#202020]">
              {JSON.stringify(
                {
                  wordEffects: {
                    wordEffectsEnabled: settings.wordEffectsEnabled,
                    effectFrequency: settings.effectFrequency,
                    effectStrength: settings.effectStrength,
                    screenShakeEnabled: settings.screenShakeEnabled,
                    intenseEffectsEnabled: settings.intenseEffectsEnabled,
                    naturalColors: settings.naturalColors,
                  },
                  visuals: {
                    wordImagesEnabled: settings.wordImagesEnabled,
                    visualStyle: settings.visualStyle,
                    imageFrequency: settings.imageFrequency,
                  },
                  stage: {
                    style: settings.style,
                    font: settings.font,
                    textSize: settings.textSize,
                    chromaEnabled: settings.chromaEnabled,
                    cameraMovementEnabled: settings.cameraMovementEnabled,
                  },
                },
                null,
                2
              )}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#161616] border-t border-[#242424] flex items-center justify-between text-zinc-400 text-[11px]">
          <span>Full gallery available at <a href="/dev/effects" target="_blank" className="text-amber-400 underline">/dev/effects</a></span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white font-medium cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
