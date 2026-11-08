'use client';

import React, { useState, useEffect } from 'react';
import { usePlayback } from '@/context/PlaybackContext';
import { LyricsSettings } from '@/lib/lyrics/settings';
import { WORD_EFFECTS, EFFECT_BY_ID } from '@/lib/lyrics/visuals/effects/catalog';
import { EffectTriggerParams } from '@/lib/lyrics/visuals/effects/types';
import { isTauri, getDiscordDebugInfo, type DiscordDebugInfo } from '@/lib/desktop';

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
  const { currentTrack } = usePlayback();
  const [selectedEffectId, setSelectedEffectId] = useState<string>('bomb');
  const [discordDebug, setDiscordDebug] = useState<DiscordDebugInfo | null>(null);
  const [showFullDiscordPayload, setShowFullDiscordPayload] = useState<boolean>(false);
  const seedCounterRef = React.useRef<number>(100);

  // Poll Discord IPC debug info when open
  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    const fetchDebug = async () => {
      try {
        const info = await getDiscordDebugInfo();
        if (mounted) setDiscordDebug(info);
      } catch {
        // ignore
      }
    };
    fetchDebug();
    const interval = setInterval(fetchDebug, 2500);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [isOpen]);

  // Compute Discord Rich Presence large image source
  const ytId = (() => {
    if (!currentTrack) return null;
    if (/^[A-Za-z0-9_-]{11}$/.test(currentTrack.id)) return currentTrack.id;
    if (currentTrack.artworkUrl) {
      const m = currentTrack.artworkUrl.match(/\/vi\/([A-Za-z0-9_-]{11})/);
      if (m) return m[1];
    }
    if (currentTrack.sourceUrl) {
      const m = currentTrack.sourceUrl.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
      if (m) return m[1];
    }
    return null;
  })();

  const coverUrl = ytId
    ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`
    : currentTrack?.artworkUrl?.startsWith('https://')
    ? currentTrack.artworkUrl
    : null;

  const isCoverUrl = Boolean(coverUrl);
  const largeImageSource = coverUrl || 'logo fallback ("logo")';

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
        <div className="p-4 overflow-y-auto space-y-4 text-xs text-zinc-300">
          {/* Discord Rich Presence Spotify-Style Diagnostics */}
          <div className="bg-[#181818] p-3.5 rounded-xl border border-[#262626] space-y-2 text-[11px] font-mono">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-zinc-300 uppercase tracking-wider text-[11px]">
                  Discord Rich Presence (Spotify-Style)
                </span>
                {isTauri() ? (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Desktop Native IPC
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-zinc-700/40 text-zinc-400 border border-zinc-600/40">
                    Web (PreMiD/DOM Bridge)
                  </span>
                )}
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  isCoverUrl
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}
              >
                {isCoverUrl ? 'Cover URL' : 'Logo Fallback'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
              <div>
                <span className="text-zinc-500">Activity Type: </span>
                <span className="text-purple-300 font-semibold">2 (Listening)</span>
              </div>
              <div>
                <span className="text-zinc-500">Member List Display: </span>
                <span className="text-purple-300 font-semibold">status_display_type: 1</span>
              </div>
              <div className="col-span-2 truncate">
                <span className="text-zinc-500">Large Image: </span>
                <span className={isCoverUrl ? 'text-emerald-300 select-all' : 'text-amber-300'}>
                  {largeImageSource}
                </span>
              </div>
              {discordDebug && (
                <>
                  <div>
                    <span className="text-zinc-500">Updates Sent: </span>
                    <span className="text-cyan-300 font-semibold">{discordDebug.updateCount}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500">Status: </span>
                    {discordDebug.lastError ? (
                      <span className="text-red-400 font-semibold">Error: {discordDebug.lastError}</span>
                    ) : discordDebug.lastResponse ? (
                      <span className="text-emerald-400 font-semibold">Connected (RPC OK)</span>
                    ) : (
                      <span className="text-zinc-400">Idle / Initializing</span>
                    )}
                  </div>
                </>
              )}
            </div>

            {discordDebug?.lastPayloadSent && (
              <div className="pt-2 border-t border-[#252525]">
                <button
                  type="button"
                  onClick={() => setShowFullDiscordPayload(!showFullDiscordPayload)}
                  className="text-[10px] text-amber-400 hover:text-amber-300 underline font-sans cursor-pointer"
                >
                  {showFullDiscordPayload ? 'Hide Wire JSON Payload ▲' : 'Show Wire JSON Payload ▼'}
                </button>
                {showFullDiscordPayload && (
                  <pre className="mt-2 p-2.5 bg-[#0e0e0e] rounded-lg text-[10px] text-zinc-300 overflow-x-auto max-h-40 border border-[#202020]">
                    {JSON.stringify(
                      {
                        sent_to_pipe: discordDebug.lastPayloadSent,
                        discord_echo: discordDebug.lastResponse,
                      },
                      null,
                      2
                    )}
                  </pre>
                )}
              </div>
            )}
          </div>

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
