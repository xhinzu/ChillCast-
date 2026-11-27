'use client';

import React, { useEffect, useState } from 'react';
import { useSettings } from '@/lib/settings/useSettings';
import { RJ_PERSONAS } from '@/lib/radio/stations';
import { clearRadioPoolCache } from '@/lib/radio/pool-manager';
import {
  addCustomRjClip,
  clearAllCustomRjClips,
  deleteCustomRjClip,
  listCustomRjClips,
  type CustomRjClipMeta,
} from '@/lib/radio/custom-clips';
import { listAvailableBrowserVoices, speakRjLine } from '@/lib/radio/rj-voice';

export default function RadioSection() {
  const { settings, updateSettings, resetSection } = useSettings();
  const r = settings.radio;

  const [clips, setClips] = useState<CustomRjClipMeta[]>([]);
  const [clipMsg, setClipMsg] = useState<string | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    listCustomRjClips().then(setClips).catch(() => {});
    setVoices(listAvailableBrowserVoices());
  }, []);

  const handleUploadClips = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const errors: string[] = [];
    for (const f of Array.from(files)) {
      const res = await addCustomRjClip(f);
      if (!res.ok && res.error) errors.push(res.error);
    }
    const updated = await listCustomRjClips();
    setClips(updated);
    setClipMsg(errors.length > 0 ? errors[0] : `Added ${files.length} clip(s).`);
  };

  return (
    <div className="space-y-6 text-xs text-zinc-300">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
            Radio Settings
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            3D receiver appearance, reception physics, vintage voicing, RJ personas, and custom clips
          </p>
        </div>
        <button
          type="button"
          onClick={() => resetSection('radio')}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
        >
          Reset Radio
        </button>
      </div>

      {/* Receiver & Audio */}
      <div className="bg-[#17171a] border border-[#282830] rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h4 className="text-xs font-semibold text-white">Default Band</h4>
            <p className="text-[11px] text-zinc-400">FM (88.0-108.0 MHz) or classic AM (530-1700 kHz)</p>
          </div>
          <div className="inline-flex rounded-lg bg-[#111115] border border-[#282830] p-0.5">
            {(['FM', 'AM'] as const).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => updateSettings('radio', { defaultBand: b })}
                className={`px-3 py-1 rounded-md text-[11px] font-semibold cursor-pointer ${
                  r.defaultBand === b ? 'bg-[var(--accent)] text-black' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 pt-3 border-t border-[#22222a]">
          <div>
            <h4 className="text-xs font-semibold text-white">Vintage Radio Sound</h4>
            <p className="text-[11px] text-zinc-400">High-pass 150 Hz, low-pass 5.6 kHz radio voicing filter</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={r.vintageSoundEnabled}
            onClick={() => updateSettings('radio', { vintageSoundEnabled: !r.vintageSoundEnabled })}
            style={{ backgroundColor: r.vintageSoundEnabled ? 'var(--accent)' : '#2e2e36' }}
            className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors"
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                r.vintageSoundEnabled ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <label className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span>Vintage Amount</span>
              <span className="font-mono">{Math.round(r.vintageAmount * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={r.vintageAmount}
              onChange={(e) => updateSettings('radio', { vintageAmount: parseFloat(e.target.value) })}
              className="w-full accent-[var(--accent)] cursor-pointer"
            />
          </label>
          <label className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span>Static Amount</span>
              <span className="font-mono">{Math.round(r.staticAmount * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={r.staticAmount}
              onChange={(e) => updateSettings('radio', { staticAmount: parseFloat(e.target.value) })}
              className="w-full accent-[var(--accent)] cursor-pointer"
            />
          </label>
          <label className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span>SFX Volume</span>
              <span className="font-mono">{Math.round(r.sfxVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={r.sfxVolume}
              onChange={(e) => updateSettings('radio', { sfxVolume: parseFloat(e.target.value) })}
              className="w-full accent-[var(--accent)] cursor-pointer"
            />
          </label>
        </div>

        <div className="flex items-center justify-between gap-4 pt-3 border-t border-[#22222a]">
          <div>
            <h4 className="text-xs font-semibold text-white">Realistic Reception</h4>
            <p className="text-[11px] text-zinc-400">Antenna length & angle affect static and signal strength</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={r.realisticReception}
            onClick={() => updateSettings('radio', { realisticReception: !r.realisticReception })}
            style={{ backgroundColor: r.realisticReception ? 'var(--accent)' : '#2e2e36' }}
            className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors"
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                r.realisticReception ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between gap-4 pt-3 border-t border-[#22222a]">
          <div>
            <h4 className="text-xs font-semibold text-white">Allow Skipping Songs</h4>
            <p className="text-[11px] text-zinc-400">Off by default (Next/Prev scans stations like real radio)</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={r.allowSkipping}
            onClick={() => updateSettings('radio', { allowSkipping: !r.allowSkipping })}
            style={{ backgroundColor: r.allowSkipping ? 'var(--accent)' : '#2e2e36' }}
            className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors"
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                r.allowSkipping ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Appearance & 3D */}
      <div className="bg-[#17171a] border border-[#282830] rounded-xl p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-semibold text-white">Radio Color Skin</h4>
            <p className="text-[11px] text-zinc-400">Chassis finish on 3D & 2D receivers</p>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['white', 'black', 'wood', 'teal', 'custom'] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => updateSettings('radio', { radioColor: c })}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold capitalize cursor-pointer border ${
                  r.radioColor === c
                    ? 'bg-[var(--accent)] text-black border-[var(--accent)]'
                    : 'bg-[#111115] text-zinc-300 border-[#282830]'
                }`}
              >
                {c}
              </button>
            ))}
            {r.radioColor === 'custom' && (
              <input
                type="color"
                value={r.customRadioColor}
                onChange={(e) => updateSettings('radio', { customRadioColor: e.target.value })}
                aria-label="Custom radio color"
                className="w-7 h-7 rounded cursor-pointer bg-transparent"
              />
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 pt-3 border-t border-[#22222a]">
          <div>
            <h4 className="text-xs font-semibold text-white">3D Quality</h4>
            <p className="text-[11px] text-zinc-400">Low or 2D forces the lightweight SVG receiver</p>
          </div>
          <div className="inline-flex rounded-lg bg-[#111115] border border-[#282830] p-0.5">
            {(['auto', 'high', 'low', '2d'] as const).map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => updateSettings('radio', { quality3d: q })}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase cursor-pointer ${
                  r.quality3d === q ? 'bg-[var(--accent)] text-black' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Radio Jockey (RJ) */}
      <div className="bg-[#17171a] border border-[#282830] rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h4 className="text-xs font-semibold text-white">RJ Frequency</h4>
            <p className="text-[11px] text-zinc-400">
              Desktop uses Windows SpeechSynthesizer (Web Audio filtered); web uses browser speechSynthesis (unfiltered).
            </p>
          </div>
          <div className="inline-flex rounded-lg bg-[#111115] border border-[#282830] p-0.5">
            {(['off', 'rare', 'normal', 'often'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => updateSettings('radio', { rjFrequency: f })}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold capitalize cursor-pointer ${
                  r.rjFrequency === f ? 'bg-[var(--accent)] text-black' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span>RJ Volume</span>
              <span className="font-mono">{Math.round(r.rjVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={r.rjVolume}
              onChange={(e) => updateSettings('radio', { rjVolume: parseFloat(e.target.value) })}
              className="w-full accent-[var(--accent)] cursor-pointer"
            />
          </label>
          <label className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span>Music Duck Amount</span>
              <span className="font-mono">{r.rjDuckDb} dB</span>
            </div>
            <input
              type="range"
              min={-24}
              max={0}
              step={1}
              value={r.rjDuckDb}
              onChange={(e) => updateSettings('radio', { rjDuckDb: parseInt(e.target.value, 10) })}
              className="w-full accent-[var(--accent)] cursor-pointer"
            />
          </label>
        </div>

        <div className="flex items-center justify-between gap-4 pt-2 border-t border-[#22222a]">
          <span className="text-xs font-semibold text-white">RJ Captions</span>
          <button
            type="button"
            role="switch"
            aria-checked={r.rjCaptions}
            onClick={() => updateSettings('radio', { rjCaptions: !r.rjCaptions })}
            style={{ backgroundColor: r.rjCaptions ? 'var(--accent)' : '#2e2e36' }}
            className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors"
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                r.rjCaptions ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Persona voices */}
        <div className="space-y-2 pt-2 border-t border-[#22222a]">
          <div className="text-[11px] font-semibold text-zinc-200">RJ Personas & Voice Test</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {RJ_PERSONAS.map((p) => (
              <div key={p.id} className="p-2 rounded-lg bg-[#111115] border border-[#24242d] flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-white truncate">{p.name}</div>
                  <div className="text-[10px] text-zinc-500 truncate">{p.tone}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {voices.length > 0 && (
                    <select
                      value={r.rjPersonaVoices[p.id] || ''}
                      onChange={(e) =>
                        updateSettings('radio', {
                          rjPersonaVoices: { ...r.rjPersonaVoices, [p.id]: e.target.value },
                        })
                      }
                      aria-label={`Voice for ${p.name}`}
                      className="max-w-[90px] px-1 py-0.5 rounded bg-black border border-white/10 text-[10px] text-zinc-300"
                    >
                      <option value="">Auto</option>
                      {voices.slice(0, 12).map((v) => (
                        <option key={v.name} value={v.name}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      void speakRjLine({
                        text: `Hello, this is ${p.name} testing the broadcast mic.`,
                        personaId: p.id,
                        volume: r.rjVolume,
                        voiceOverride: r.rjPersonaVoices[p.id],
                      })
                    }
                    className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-[10px] font-semibold text-white cursor-pointer"
                  >
                    Test
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Custom RJ Clips */}
        <div className="space-y-2 pt-2 border-t border-[#22222a]">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-semibold text-white">Custom RJ Clips ({clips.length}/50)</h4>
              <p className="text-[10px] text-zinc-500">MP3/WAV/OGG, max 30s and 8 MB each, stored locally in IndexedDB</p>
            </div>
            <label className="px-2.5 py-1 rounded-lg bg-[var(--accent)] text-black text-[11px] font-bold cursor-pointer">
              Add Clips
              <input
                type="file"
                accept=".mp3,.wav,.ogg,audio/mpeg,audio/wav,audio/ogg"
                multiple
                className="hidden"
                onChange={(e) => void handleUploadClips(e.target.files)}
              />
            </label>
          </div>
          {clipMsg && <p className="text-[11px] text-amber-300">{clipMsg}</p>}
          {clips.length > 0 && (
            <div className="max-h-28 overflow-y-auto space-y-1">
              {clips.map((c) => (
                <div key={c.id} className="flex items-center justify-between px-2 py-1 rounded bg-black/40 text-[11px]">
                  <span className="truncate">{c.name} ({c.durationSec}s)</span>
                  <button
                    type="button"
                    onClick={() => void deleteCustomRjClip(c.id).then(() => listCustomRjClips().then(setClips))}
                    className="text-red-400 hover:text-red-300 text-[10px] cursor-pointer ml-2"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stations & Data */}
      <div className="bg-[#17171a] border border-[#282830] rounded-xl p-4 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => {
            clearRadioPoolCache();
            updateSettings('radio', { stationSeed: Math.floor(Math.random() * 899999) + 100000 });
          }}
          className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold text-white cursor-pointer"
        >
          Re-scan Stations
        </button>
        <button
          type="button"
          onClick={() => {
            clearRadioPoolCache();
            void clearAllCustomRjClips().then(() => setClips([]));
            updateSettings('radio', { presets: [], stationSeed: 4242 });
          }}
          className="px-3 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-xs font-semibold text-red-300 cursor-pointer"
        >
          Clear Radio Data
        </button>
      </div>
    </div>
  );
}

