'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSettings } from '@/lib/settings/useSettings';
import { usePlayback } from '@/context/PlaybackContext';
import { getDspEngine, type DspDiagnostics } from '@/lib/audio/dsp-engine';
import {
  EQ_FREQUENCIES,
  EQ_LABELS,
  EQ_MIN_DB,
  EQ_MAX_DB,
  BUILTIN_EQ_PRESETS,
  BUILTIN_SOUND_PROFILES,
  DEFAULT_EQ_SETTINGS,
  DEFAULT_EFFECTS_SETTINGS,
  DEFAULT_MASTER_SETTINGS,
  type EqPreset,
  type SoundProfile,
  type ReverbRoomType,
  type Spatial8DDirection,
} from '@/lib/audio/audio-presets';

type FxTab = 'effects' | 'equalizer' | 'master' | 'profiles';

interface FxMixerPanelProps {
  isOpen: boolean;
  isLargeModal?: boolean;
  onOpenLargeModal?: () => void;
  onClose?: () => void;
}

function formatDbValuetext(label: string, db: number): string {
  const abs = Math.abs(db).toFixed(1);
  if (db > 0) return `${label} Hz, plus ${abs} dB`;
  if (db < 0) return `${label} Hz, minus ${abs} dB`;
  return `${label} Hz, 0.0 dB`;
}

export default function FxMixerPanel({
  isOpen,
  isLargeModal = false,
  onOpenLargeModal,
  onClose,
}: FxMixerPanelProps) {
  const { settings, updateSettings } = useSettings();
  const { isRawAudioAvailable } = usePlayback();
  const audio = settings.audio;
  const eq = audio.eq;
  const fx = audio.effects;
  const master = audio.master;
  const profiles = audio.profiles;

  const [activeTab, setActiveTab] = useState<FxTab>('effects');
  const [expandedFx, setExpandedFx] = useState<Record<string, boolean>>({});
  const [isAbFlat, setIsAbFlat] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newProfileName, setNewProfileName] = useState('');
  const [isClipping, setIsClipping] = useState(false);
  const [diagnostics, setDiagnostics] = useState<DspDiagnostics | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const curveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const importEqRef = useRef<HTMLInputElement | null>(null);
  const importProfileRef = useRef<HTMLInputElement | null>(null);

  const disabled = !isRawAudioAvailable;

  // Clipping monitor & live EQ curve/spectrum renderer
  useEffect(() => {
    if (!isOpen) return;
    let rafId = 0;
    const freqSamples = new Float32Array(64);
    for (let i = 0; i < freqSamples.length; i++) {
      freqSamples[i] = 24 * Math.pow(20000 / 24, i / (freqSamples.length - 1));
    }
    const specBuf = new Uint8Array(128);

    const draw = () => {
      const dsp = getDspEngine();
      const peak = dsp.getOutputPeak();
      setIsClipping(peak >= 0.985);

      if (activeTab === 'equalizer' && curveCanvasRef.current) {
        const canvas = curveCanvasRef.current;
        const ctx2d = canvas.getContext('2d');
        if (ctx2d) {
          const w = canvas.width;
          const h = canvas.height;
          ctx2d.clearRect(0, 0, w, h);

          // Optional faint live spectrum behind EQ curve
          dsp.getByteFrequencyData(specBuf);
          ctx2d.fillStyle = 'rgba(255, 255, 255, 0.08)';
          const barW = w / 48;
          for (let i = 0; i < 48; i++) {
            const v = specBuf[i] / 255;
            const barH = v * h * 0.85;
            ctx2d.fillRect(i * barW, h - barH, Math.max(1, barW - 1), barH);
          }

          // Zero dB reference line
          ctx2d.strokeStyle = 'rgba(255,255,255,0.18)';
          ctx2d.lineWidth = 1;
          ctx2d.beginPath();
          ctx2d.moveTo(0, h / 2);
          ctx2d.lineTo(w, h / 2);
          ctx2d.stroke();

          // Real BiquadFilterNode frequency response curve
          const respDb = dsp.getFrequencyResponseDb(freqSamples);
          ctx2d.strokeStyle = getComputedStyle(document.documentElement)
            .getPropertyValue('--accent')
            .trim() || '#10b981';
          ctx2d.lineWidth = 2;
          ctx2d.beginPath();
          for (let i = 0; i < respDb.length; i++) {
            const x = (i / (respDb.length - 1)) * w;
            const clampedDb = Math.max(-15, Math.min(15, respDb[i]));
            const y = h / 2 - (clampedDb / 15) * (h / 2 - 4);
            if (i === 0) ctx2d.moveTo(x, y);
            else ctx2d.lineTo(x, y);
          }
          ctx2d.stroke();
        }
      }

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [isOpen, activeTab]);

  // Helper updaters
  const patchEq = useCallback(
    (partial: Partial<typeof eq>) => {
      updateSettings('audio', { eq: { ...eq, ...partial } });
    },
    [eq, updateSettings]
  );

  const patchFx = useCallback(
    <K extends keyof typeof fx>(key: K, partial: Partial<(typeof fx)[K]>) => {
      const nextEffects = { ...fx, [key]: { ...fx[key], ...partial } };
      const compat: Partial<typeof audio> = { effects: nextEffects };
      if (key === 'spatial8D') {
        compat.spatial8DEnabled = nextEffects.spatial8D.enabled;
        compat.spatial8DSpeed = nextEffects.spatial8D.speedSec;
        compat.spatial8DWidth = nextEffects.spatial8D.width;
      }
      if (key === 'muffled') {
        compat.muffledEnabled = nextEffects.muffled.enabled;
        compat.muffledCutoff = nextEffects.muffled.cutoffHz;
      }
      updateSettings('audio', compat);
    },
    [fx, updateSettings]
  );

  const patchMaster = useCallback(
    (partial: Partial<typeof master>) => {
      updateSettings('audio', { master: { ...master, ...partial } });
    },
    [master, updateSettings]
  );

  // Smoothly animate EQ sliders when choosing a preset
  const handleSelectEqPreset = (preset: EqPreset) => {
    setIsAbFlat(false);
    patchEq({
      enabled: preset.id === 'flat' ? eq.enabled : true,
      preampDb: preset.preampDb,
      bands: [...preset.bands],
      presetId: preset.id,
    });
  };

  const handleBandChange = (idx: number, nextDb: number) => {
    setIsAbFlat(false);
    const clamped = Math.max(EQ_MIN_DB, Math.min(EQ_MAX_DB, Math.round(nextDb * 2) / 2));
    const nextBands = [...eq.bands];
    nextBands[idx] = clamped;
    patchEq({ bands: nextBands, presetId: 'custom' });
  };

  const handleToggleAb = () => {
    const nextAb = !isAbFlat;
    setIsAbFlat(nextAb);
    if (nextAb) {
      getDspEngine().applyEq({ ...eq, bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], preampDb: 0 });
    } else {
      getDspEngine().applyEq(eq);
    }
  };

  const allEqPresets: EqPreset[] = [...BUILTIN_EQ_PRESETS, ...(eq.customPresets || [])];
  const allProfiles: SoundProfile[] = [...BUILTIN_SOUND_PROFILES, ...(profiles.userProfiles || [])];

  const applyProfile = (profile: SoundProfile) => {
    const snap = profile.snapshot;
    updateSettings('audio', {
      spatial8DEnabled: snap.effects.spatial8D.enabled,
      spatial8DSpeed: snap.effects.spatial8D.speedSec,
      spatial8DWidth: snap.effects.spatial8D.width,
      muffledEnabled: snap.effects.muffled.enabled,
      muffledCutoff: snap.effects.muffled.cutoffHz,
      eq: { ...snap.eq, bands: [...snap.eq.bands], customPresets: eq.customPresets || [] },
      effects: {
        spatial8D: { ...snap.effects.spatial8D },
        muffled: { ...snap.effects.muffled },
        reverb: { ...snap.effects.reverb },
        chorus: { ...snap.effects.chorus },
        noiseGate: { ...snap.effects.noiseGate },
      },
      master: { ...snap.master, compressor: { ...snap.master.compressor } },
      profiles: { ...profiles, activeProfileId: profile.id },
    });
    setStatusNotice(`Loaded profile: ${profile.name}`);
  };

  const handleBandKeyDown = (idx: number, e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 2.0 : 0.5;
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      e.preventDefault();
      handleBandChange(idx, (eq.bands[idx] || 0) + step);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      e.preventDefault();
      handleBandChange(idx, (eq.bands[idx] || 0) - step);
    } else if (e.key === 'Home') {
      e.preventDefault();
      handleBandChange(idx, EQ_MIN_DB);
    } else if (e.key === 'End') {
      e.preventDefault();
      handleBandChange(idx, EQ_MAX_DB);
    }
  };

  const handleVerticalPointer = (idx: number, e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = 1 - Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const db = EQ_MIN_DB + ratio * (EQ_MAX_DB - EQ_MIN_DB);
    handleBandChange(idx, db);
  };

  return (
    <div
      className={`${
        isLargeModal ? 'w-full max-h-[82vh]' : 'w-[420px] max-w-[calc(100vw-24px)] max-h-[75vh]'
      } flex flex-col bg-[var(--bg-surface,#16161a)] text-[var(--text,#ffffff)] rounded-xl text-xs overflow-hidden`}
    >
      {/* Header: Title, Quick Profile Dropdown, Large Mixer Button */}
      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 border-b border-white/10 shrink-0">
        <div className="min-w-0">
          <p className="font-bold uppercase tracking-wider text-[11px] truncate">
            Audio DSP &amp; Equalizer
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <select
            aria-label="Quick sound profile"
            value={profiles.activeProfileId}
            disabled={disabled}
            onChange={(e) => {
              const found = allProfiles.find((p) => p.id === e.target.value);
              if (found) applyProfile(found);
            }}
            className="bg-[#1f1f26] border border-white/15 rounded-lg px-2 py-1 text-[11px] text-zinc-200 outline-none cursor-pointer max-w-[130px]"
          >
            {allProfiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {!isLargeModal && onOpenLargeModal && (
            <button
              type="button"
              onClick={onOpenLargeModal}
              className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-semibold text-white cursor-pointer transition-colors"
              title="Open large mixer"
            >
              Large
            </button>
          )}
          {isLargeModal && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-semibold text-white cursor-pointer"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Tabs: Effects | Equalizer | Master | Profiles */}
      <div className="grid grid-cols-4 gap-1 px-3 py-2 border-b border-white/10 bg-black/20 shrink-0">
        {(
          [
            { id: 'effects', label: 'Effects' },
            { id: 'equalizer', label: 'Equalizer' },
            { id: 'master', label: 'Master' },
            { id: 'profiles', label: 'Profiles' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
              activeTab === tab.id
                ? 'bg-[var(--accent,#10b981)] text-black shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Unavailable Raw Audio Notice */}
      {disabled && (
        <div className="mx-3 mt-2.5 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px]">
          Audio effects are unavailable for this track because raw audio stream access is restricted.
        </div>
      )}

      {statusNotice && (
        <div className="mx-3 mt-2 px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/15 text-[11px] text-zinc-200 flex items-center justify-between">
          <span>{statusNotice}</span>
          <button type="button" onClick={() => setStatusNotice(null)} className="text-zinc-400 hover:text-white cursor-pointer">
            x
          </button>
        </div>
      )}

      {/* Scrollable Body */}
      <div className={`flex-1 overflow-y-auto p-3 space-y-3 ${disabled ? 'opacity-45 pointer-events-none' : ''}`}>
        {/* ============================================================ */}
        {/* TAB 1: EFFECTS                                               */}
        {/* ============================================================ */}
        {activeTab === 'effects' && (
          <div className="space-y-2">
            {/* 8D Spatial Audio */}
            <EffectRow
              title="8D Spatial Audio"
              subtitle="360-degree rotating soundstage"
              enabled={fx.spatial8D.enabled}
              expanded={!!expandedFx['8d']}
              onToggle={() => patchFx('spatial8D', { enabled: !fx.spatial8D.enabled })}
              onExpand={() => setExpandedFx((p) => ({ ...p, '8d': !p['8d'] }))}
              onReset={() => patchFx('spatial8D', { ...DEFAULT_EFFECTS_SETTINGS.spatial8D, enabled: fx.spatial8D.enabled })}
            >
              <SliderParam
                label="Rotation period"
                valueText={`${fx.spatial8D.speedSec.toFixed(1)} s`}
                min={4}
                max={20}
                step={0.5}
                value={fx.spatial8D.speedSec}
                onChange={(v) => patchFx('spatial8D', { speedSec: v })}
              />
              <SliderParam
                label="Orbit width"
                valueText={`${Math.round(fx.spatial8D.width * 100)}%`}
                min={0.2}
                max={1.0}
                step={0.05}
                value={fx.spatial8D.width}
                onChange={(v) => patchFx('spatial8D', { width: v })}
              />
              <SliderParam
                label="Distance roll-off"
                valueText={`${Math.round(fx.spatial8D.rolloff * 100)}%`}
                min={0}
                max={1}
                step={0.05}
                value={fx.spatial8D.rolloff}
                onChange={(v) => patchFx('spatial8D', { rolloff: v })}
              />
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-zinc-400">Direction</span>
                <div className="flex gap-1">
                  {(['clockwise', 'anticlockwise', 'alternating'] as Spatial8DDirection[]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => patchFx('spatial8D', { direction: d })}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold capitalize cursor-pointer ${
                        fx.spatial8D.direction === d ? 'bg-white text-black' : 'bg-white/10 text-zinc-300'
                      }`}
                    >
                      {d === 'anticlockwise' ? 'CCW' : d === 'clockwise' ? 'CW' : 'Alt'}
                    </button>
                  ))}
                </div>
              </div>
            </EffectRow>

            {/* Muffled */}
            <EffectRow
              title="Muffled Effect"
              subtitle="Lo-fi sound from another room"
              enabled={fx.muffled.enabled}
              expanded={!!expandedFx['muffled']}
              onToggle={() => patchFx('muffled', { enabled: !fx.muffled.enabled })}
              onExpand={() => setExpandedFx((p) => ({ ...p, muffled: !p.muffled }))}
              onReset={() => patchFx('muffled', { ...DEFAULT_EFFECTS_SETTINGS.muffled, enabled: fx.muffled.enabled })}
            >
              <SliderParam
                label="Cutoff"
                valueText={`${Math.round(fx.muffled.cutoffHz)} Hz`}
                min={300}
                max={4000}
                step={50}
                value={fx.muffled.cutoffHz}
                onChange={(v) => patchFx('muffled', { cutoffHz: v })}
              />
              <SliderParam
                label="Resonance (Q)"
                valueText={fx.muffled.q.toFixed(1)}
                min={0.5}
                max={6.0}
                step={0.1}
                value={fx.muffled.q}
                onChange={(v) => patchFx('muffled', { q: v })}
              />
              <SliderParam
                label="High-shelf cut"
                valueText={`${fx.muffled.highShelfCutDb.toFixed(0)} dB`}
                min={-18}
                max={0}
                step={1}
                value={fx.muffled.highShelfCutDb}
                onChange={(v) => patchFx('muffled', { highShelfCutDb: v })}
              />
              <SliderParam
                label="Mix"
                valueText={`${Math.round(fx.muffled.mix * 100)}%`}
                min={0}
                max={1}
                step={0.05}
                value={fx.muffled.mix}
                onChange={(v) => patchFx('muffled', { mix: v })}
              />
            </EffectRow>

            {/* Reverb */}
            <EffectRow
              title="Reverb"
              subtitle={`${fx.reverb.roomType} procedural acoustics`}
              enabled={fx.reverb.enabled}
              expanded={!!expandedFx['reverb']}
              onToggle={() => patchFx('reverb', { enabled: !fx.reverb.enabled })}
              onExpand={() => setExpandedFx((p) => ({ ...p, reverb: !p.reverb }))}
              onReset={() => patchFx('reverb', { ...DEFAULT_EFFECTS_SETTINGS.reverb, enabled: fx.reverb.enabled })}
            >
              <div className="flex items-center justify-between pb-1">
                <span className="text-[11px] text-zinc-400">Room type</span>
                <div className="flex gap-1">
                  {(['room', 'hall', 'plate', 'cathedral'] as ReverbRoomType[]).map((rt) => (
                    <button
                      key={rt}
                      type="button"
                      onClick={() => patchFx('reverb', { roomType: rt })}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold capitalize cursor-pointer ${
                        fx.reverb.roomType === rt ? 'bg-white text-black' : 'bg-white/10 text-zinc-300'
                      }`}
                    >
                      {rt}
                    </button>
                  ))}
                </div>
              </div>
              <SliderParam
                label="Decay"
                valueText={`${fx.reverb.decaySec.toFixed(1)} s`}
                min={0.3}
                max={6.0}
                step={0.1}
                value={fx.reverb.decaySec}
                onChange={(v) => patchFx('reverb', { decaySec: v })}
              />
              <SliderParam
                label="Pre-delay"
                valueText={`${Math.round(fx.reverb.preDelayMs)} ms`}
                min={0}
                max={100}
                step={2}
                value={fx.reverb.preDelayMs}
                onChange={(v) => patchFx('reverb', { preDelayMs: v })}
              />
              <SliderParam
                label="Damping"
                valueText={`${Math.round(fx.reverb.dampingHz)} Hz`}
                min={1000}
                max={16000}
                step={250}
                value={fx.reverb.dampingHz}
                onChange={(v) => patchFx('reverb', { dampingHz: v })}
              />
              <SliderParam
                label="Wet mix"
                valueText={`${Math.round(fx.reverb.mix * 100)}%`}
                min={0}
                max={1}
                step={0.05}
                value={fx.reverb.mix}
                onChange={(v) => patchFx('reverb', { mix: v })}
              />
            </EffectRow>

            {/* Chorus */}
            <EffectRow
              title="Chorus"
              subtitle="Stereo dual-LFO shimmer"
              enabled={fx.chorus.enabled}
              expanded={!!expandedFx['chorus']}
              onToggle={() => patchFx('chorus', { enabled: !fx.chorus.enabled })}
              onExpand={() => setExpandedFx((p) => ({ ...p, chorus: !p.chorus }))}
              onReset={() => patchFx('chorus', { ...DEFAULT_EFFECTS_SETTINGS.chorus, enabled: fx.chorus.enabled })}
            >
              <SliderParam
                label="Rate"
                valueText={`${fx.chorus.rateHz.toFixed(2)} Hz`}
                min={0.1}
                max={5.0}
                step={0.1}
                value={fx.chorus.rateHz}
                onChange={(v) => patchFx('chorus', { rateHz: v })}
              />
              <SliderParam
                label="Depth"
                valueText={`${fx.chorus.depthMs.toFixed(1)} ms`}
                min={0.5}
                max={10}
                step={0.5}
                value={fx.chorus.depthMs}
                onChange={(v) => patchFx('chorus', { depthMs: v })}
              />
              <SliderParam
                label="Base delay"
                valueText={`${Math.round(fx.chorus.baseDelayMs)} ms`}
                min={5}
                max={35}
                step={1}
                value={fx.chorus.baseDelayMs}
                onChange={(v) => patchFx('chorus', { baseDelayMs: v })}
              />
              <SliderParam
                label="Stereo spread"
                valueText={`${Math.round(fx.chorus.spread * 100)}%`}
                min={0}
                max={1}
                step={0.05}
                value={fx.chorus.spread}
                onChange={(v) => patchFx('chorus', { spread: v })}
              />
              <SliderParam
                label="Mix"
                valueText={`${Math.round(fx.chorus.mix * 100)}%`}
                min={0}
                max={1}
                step={0.05}
                value={fx.chorus.mix}
                onChange={(v) => patchFx('chorus', { mix: v })}
              />
            </EffectRow>

            {/* Noise Gate */}
            <EffectRow
              title="Noise Gate"
              subtitle="Envelope-driven silence & hiss gate"
              enabled={fx.noiseGate.enabled}
              expanded={!!expandedFx['gate']}
              onToggle={() => patchFx('noiseGate', { enabled: !fx.noiseGate.enabled })}
              onExpand={() => setExpandedFx((p) => ({ ...p, gate: !p.gate }))}
              onReset={() => patchFx('noiseGate', { ...DEFAULT_EFFECTS_SETTINGS.noiseGate, enabled: fx.noiseGate.enabled })}
            >
              <SliderParam
                label="Threshold"
                valueText={`${Math.round(fx.noiseGate.thresholdDb)} dB`}
                min={-80}
                max={-20}
                step={1}
                value={fx.noiseGate.thresholdDb}
                onChange={(v) => patchFx('noiseGate', { thresholdDb: v })}
              />
              <SliderParam
                label="Attack"
                valueText={`${Math.round(fx.noiseGate.attackMs)} ms`}
                min={1}
                max={50}
                step={1}
                value={fx.noiseGate.attackMs}
                onChange={(v) => patchFx('noiseGate', { attackMs: v })}
              />
              <SliderParam
                label="Release"
                valueText={`${Math.round(fx.noiseGate.releaseMs)} ms`}
                min={20}
                max={500}
                step={10}
                value={fx.noiseGate.releaseMs}
                onChange={(v) => patchFx('noiseGate', { releaseMs: v })}
              />
              <SliderParam
                label="Reduction range"
                valueText={`${Math.round(fx.noiseGate.rangeDb)} dB`}
                min={-60}
                max={0}
                step={2}
                value={fx.noiseGate.rangeDb}
                onChange={(v) => patchFx('noiseGate', { rangeDb: v })}
              />
            </EffectRow>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: 10-BAND EQUALIZER                                     */}
        {/* ============================================================ */}
        {activeTab === 'equalizer' && (
          <div className="space-y-3">
            {/* Top Bar: On/Off Bypass, Preset Dropdown, A/B, Reset */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={eq.enabled}
                  onChange={(e) => patchEq({ enabled: e.target.checked })}
                  className="w-4 h-4 accent-[var(--accent,#10b981)] cursor-pointer"
                />
                <span className="font-semibold text-white">
                  {eq.enabled ? 'EQ On' : 'Bypassed'}
                </span>
              </label>

              <div className="flex items-center gap-1.5">
                <select
                  aria-label="EQ Preset"
                  value={eq.presetId}
                  onChange={(e) => {
                    const found = allEqPresets.find((p) => p.id === e.target.value);
                    if (found) handleSelectEqPreset(found);
                  }}
                  className="bg-[#1e1e26] border border-white/15 rounded-lg px-2 py-1 text-[11px] text-white outline-none cursor-pointer"
                >
                  <option value="custom" disabled>
                    Custom
                  </option>
                  {allEqPresets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleToggleAb}
                  className={`px-2 py-1 rounded-lg border text-[10px] font-bold cursor-pointer ${
                    isAbFlat
                      ? 'bg-amber-500 text-black border-amber-400'
                      : 'bg-white/10 text-zinc-300 border-white/15 hover:text-white'
                  }`}
                  title="A/B compare current curve vs flat"
                >
                  A/B
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsAbFlat(false);
                    patchEq({
                      preampDb: 0,
                      bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                      presetId: 'flat',
                    });
                  }}
                  className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-semibold text-zinc-200 cursor-pointer"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Live Frequency Response Curve + Faint Spectrum */}
            <div className="rounded-lg bg-black/40 border border-white/10 p-1.5">
              <canvas
                ref={curveCanvasRef}
                width={380}
                height={70}
                className="w-full h-[64px] block"
                aria-label="Equalizer frequency response curve"
              />
            </div>

            {/* Preamp + 10 Vertical Sliders */}
            <div className="grid grid-cols-11 gap-1 pt-1 select-none">
              {/* Preamp */}
              <div className="flex flex-col items-center gap-1 border-r border-white/10 pr-1">
                <span className="text-[9px] font-mono text-zinc-300">
                  {eq.preampDb > 0 ? `+${eq.preampDb.toFixed(1)}` : eq.preampDb.toFixed(1)}
                </span>
                <div
                  role="slider"
                  tabIndex={0}
                  aria-label="Preamp"
                  aria-valuemin={EQ_MIN_DB}
                  aria-valuemax={EQ_MAX_DB}
                  aria-valuenow={eq.preampDb}
                  aria-valuetext={`Preamp, ${eq.preampDb.toFixed(1)} dB`}
                  onDoubleClick={() => patchEq({ preampDb: 0 })}
                  onKeyDown={(e) => {
                    const step = e.shiftKey ? 2 : 0.5;
                    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
                      e.preventDefault();
                      patchEq({ preampDb: Math.min(EQ_MAX_DB, eq.preampDb + step) });
                    } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
                      e.preventDefault();
                      patchEq({ preampDb: Math.max(EQ_MIN_DB, eq.preampDb - step) });
                    }
                  }}
                  onPointerDown={(e) => {
                    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                    const rect = e.currentTarget.getBoundingClientRect();
                    const ratio = 1 - Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
                    patchEq({ preampDb: Math.round((EQ_MIN_DB + ratio * 24) * 2) / 2 });
                  }}
                  onPointerMove={(e) => {
                    if (e.buttons !== 1) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const ratio = 1 - Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
                    patchEq({ preampDb: Math.round((EQ_MIN_DB + ratio * 24) * 2) / 2 });
                  }}
                  className="relative w-5 h-28 bg-white/10 rounded-full cursor-ns-resize touch-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <div className="absolute inset-x-0 top-1/2 h-px bg-white/30" />
                  <div
                    className="absolute left-0.5 right-0.5 h-2.5 rounded-full bg-amber-400 transition-all duration-100"
                    style={{
                      bottom: `calc(${((eq.preampDb - EQ_MIN_DB) / 24) * 100}% - 5px)`,
                    }}
                  />
                </div>
                <span className="text-[9px] text-amber-300 font-semibold">Pre</span>
              </div>

              {/* 10 Frequency Bands */}
              {EQ_FREQUENCIES.map((freq, idx) => {
                const db = eq.bands[idx] ?? 0;
                const pct = ((db - EQ_MIN_DB) / (EQ_MAX_DB - EQ_MIN_DB)) * 100;
                return (
                  <div key={freq} className="flex flex-col items-center gap-1">
                    <span className="text-[9px] font-mono text-zinc-400">
                      {db > 0 ? `+${db.toFixed(0)}` : db.toFixed(0)}
                    </span>
                    <div
                      role="slider"
                      tabIndex={0}
                      aria-label={`${EQ_LABELS[idx]} Hz band`}
                      aria-valuemin={EQ_MIN_DB}
                      aria-valuemax={EQ_MAX_DB}
                      aria-valuenow={db}
                      aria-valuetext={formatDbValuetext(EQ_LABELS[idx], db)}
                      onDoubleClick={() => handleBandChange(idx, 0)}
                      onKeyDown={(e) => handleBandKeyDown(idx, e)}
                      onPointerDown={(e) => {
                        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                        handleVerticalPointer(idx, e);
                      }}
                      onPointerMove={(e) => {
                        if (e.buttons === 1) handleVerticalPointer(idx, e);
                      }}
                      className="relative w-4 h-28 bg-white/10 rounded-full cursor-ns-resize touch-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                      <div className="absolute inset-x-0 top-1/2 h-px bg-white/25" />
                      <div
                        className="absolute left-0.5 right-0.5 h-2.5 rounded-full bg-[var(--accent,#10b981)] transition-all duration-150"
                        style={{ bottom: `calc(${pct}% - 5px)` }}
                      />
                    </div>
                    <span className="text-[9px] text-zinc-400 font-mono">{EQ_LABELS[idx]}</span>
                  </div>
                );
              })}
            </div>

            {/* Save Custom Preset + Import/Export */}
            <div className="pt-2 border-t border-white/10 flex flex-wrap items-center gap-1.5">
              <input
                type="text"
                placeholder="Save preset name..."
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                className="flex-1 min-w-[120px] bg-[#1e1e26] border border-white/15 rounded-lg px-2 py-1 text-[11px] text-white outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  const name = newPresetName.trim();
                  if (!name) return;
                  const id = `custom_${Date.now()}`;
                  const created: EqPreset = { id, name, preampDb: eq.preampDb, bands: [...eq.bands] };
                  patchEq({ customPresets: [...(eq.customPresets || []), created], presetId: id });
                  setNewPresetName('');
                  setStatusNotice(`Saved EQ preset "${name}"`);
                }}
                className="px-2.5 py-1 rounded-lg bg-white text-black font-semibold text-[11px] cursor-pointer"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  const blob = new Blob([JSON.stringify(eq.customPresets || [], null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'myujiku-eq-presets.json';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="px-2 py-1 rounded-lg bg-white/10 text-zinc-200 text-[10px] cursor-pointer"
              >
                Export
              </button>
              <button
                type="button"
                onClick={() => importEqRef.current?.click()}
                className="px-2 py-1 rounded-lg bg-white/10 text-zinc-200 text-[10px] cursor-pointer"
              >
                Import
              </button>
              <input
                ref={importEqRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  f.text().then((txt) => {
                    try {
                      const arr = JSON.parse(txt);
                      if (Array.isArray(arr)) {
                        patchEq({ customPresets: [...(eq.customPresets || []), ...arr] });
                        setStatusNotice('Imported EQ presets');
                      }
                    } catch {
                      setStatusNotice('Invalid preset JSON');
                    }
                  });
                }}
              />
            </div>

            {eq.customPresets && eq.customPresets.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {eq.customPresets.map((cp) => (
                  <div key={cp.id} className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/10 text-[10px]">
                    <button type="button" onClick={() => handleSelectEqPreset(cp)} className="text-white cursor-pointer">
                      {cp.name}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        patchEq({ customPresets: eq.customPresets.filter((x) => x.id !== cp.id) })
                      }
                      className="text-rose-400 hover:text-rose-300 cursor-pointer ml-1"
                      title="Delete preset"
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: MASTER SECTION & DIAGNOSTICS                          */}
        {/* ============================================================ */}
        {activeTab === 'master' && (
          <div className="space-y-3">
            {/* Clipping Indicator + One-Click Fix */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/30 border border-white/10">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isClipping ? 'bg-rose-500 animate-ping' : 'bg-emerald-500/50'
                  }`}
                />
                <span className="font-semibold text-[11px]">
                  {isClipping ? 'Clipping detected (0 dBFS)' : 'Output headroom clean'}
                </span>
              </div>
              {isClipping && (
                <button
                  type="button"
                  onClick={() => patchEq({ preampDb: Math.max(EQ_MIN_DB, eq.preampDb - 3) })}
                  className="px-2 py-0.5 rounded bg-rose-500 text-white text-[10px] font-bold cursor-pointer"
                >
                  Fix: lower preamp
                </button>
              )}
            </div>

            <div className="p-3 rounded-xl bg-[#1c1c22] border border-white/10 space-y-2.5">
              <SliderParam
                label="Output Gain Trim"
                valueText={`${master.outputGainDb > 0 ? '+' : ''}${master.outputGainDb.toFixed(1)} dB`}
                min={-12}
                max={12}
                step={0.5}
                value={master.outputGainDb}
                onChange={(v) => patchMaster({ outputGainDb: v })}
              />
              <SliderParam
                label="Balance (L / R)"
                valueText={
                  master.balance === 0
                    ? 'Center'
                    : master.balance < 0
                    ? `${Math.round(Math.abs(master.balance) * 100)}% L`
                    : `${Math.round(master.balance * 100)}% R`
                }
                min={-1}
                max={1}
                step={0.05}
                value={master.balance}
                onChange={(v) => patchMaster({ balance: v })}
              />
              <SliderParam
                label="Stereo Width (M/S)"
                valueText={`${Math.round(master.stereoWidthPct)}%`}
                min={0}
                max={200}
                step={5}
                value={master.stereoWidthPct}
                onChange={(v) => patchMaster({ stereoWidthPct: v })}
              />
              <SliderParam
                label="Master Bass Shelf"
                valueText={`${master.bassDb > 0 ? '+' : ''}${master.bassDb.toFixed(1)} dB`}
                min={-12}
                max={12}
                step={0.5}
                value={master.bassDb}
                onChange={(v) => patchMaster({ bassDb: v })}
              />
              <SliderParam
                label="Master Treble Shelf"
                valueText={`${master.trebleDb > 0 ? '+' : ''}${master.trebleDb.toFixed(1)} dB`}
                min={-12}
                max={12}
                step={0.5}
                value={master.trebleDb}
                onChange={(v) => patchMaster({ trebleDb: v })}
              />
            </div>

            {/* Compressor & Limiter */}
            <div className="p-3 rounded-xl bg-[#1c1c22] border border-white/10 space-y-2.5">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="font-semibold text-white">Brick-Wall Limiter (-1 dB)</span>
                <input
                  type="checkbox"
                  checked={master.limiterEnabled}
                  onChange={(e) => patchMaster({ limiterEnabled: e.target.checked })}
                  className="w-4 h-4 accent-[var(--accent,#10b981)] cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer pt-1 border-t border-white/10">
                <span className="font-semibold text-white">Master Compressor</span>
                <input
                  type="checkbox"
                  checked={master.compressor.enabled}
                  onChange={(e) =>
                    patchMaster({ compressor: { ...master.compressor, enabled: e.target.checked } })
                  }
                  className="w-4 h-4 accent-[var(--accent,#10b981)] cursor-pointer"
                />
              </label>

              {master.compressor.enabled && (
                <div className="space-y-2 pt-1">
                  <SliderParam
                    label="Threshold"
                    valueText={`${master.compressor.thresholdDb} dB`}
                    min={-50}
                    max={0}
                    step={1}
                    value={master.compressor.thresholdDb}
                    onChange={(v) => patchMaster({ compressor: { ...master.compressor, thresholdDb: v } })}
                  />
                  <SliderParam
                    label="Ratio"
                    valueText={`${master.compressor.ratio.toFixed(1)}:1`}
                    min={1}
                    max={20}
                    step={0.5}
                    value={master.compressor.ratio}
                    onChange={(v) => patchMaster({ compressor: { ...master.compressor, ratio: v } })}
                  />
                  <SliderParam
                    label="Makeup Gain"
                    valueText={`+${master.compressor.makeupDb.toFixed(1)} dB`}
                    min={0}
                    max={12}
                    step={0.5}
                    value={master.compressor.makeupDb}
                    onChange={(v) => patchMaster({ compressor: { ...master.compressor, makeupDb: v } })}
                  />
                </div>
              )}
            </div>

            {/* Audio Diagnostics & Reset */}
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  const dsp = getDspEngine();
                  dsp.playTestSweep();
                  setDiagnostics(dsp.getDiagnostics());
                }}
                className="px-3 py-1.5 rounded-lg bg-[var(--accent,#10b981)] text-black font-bold text-[11px] cursor-pointer"
              >
                Audio diagnostics
              </button>
              <button
                type="button"
                onClick={() => patchMaster({ ...DEFAULT_MASTER_SETTINGS, compressor: { ...DEFAULT_MASTER_SETTINGS.compressor } })}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-zinc-200 font-semibold text-[11px] cursor-pointer"
              >
                Reset Master
              </button>
            </div>

            {diagnostics && (
              <div className="p-2.5 rounded-lg bg-black/50 border border-white/10 text-[10px] font-mono text-zinc-300 space-y-1">
                <div>Context: {diagnostics.contextState} | {diagnostics.sampleRate} Hz | Headroom: {diagnostics.headroomDb.toFixed(1)} dB</div>
                <div>Chain: {diagnostics.connectedNodes.join(' -> ')}</div>
                <div>Active: {diagnostics.activeEffects.length > 0 ? diagnostics.activeEffects.join(', ') : 'Bypass / Clean'}</div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 4: PROFILES                                              */}
        {/* ============================================================ */}
        {activeTab === 'profiles' && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Built-in &amp; Saved Profiles
              </span>
              <div className="space-y-1">
                {allProfiles.map((p) => {
                  const active = profiles.activeProfileId === p.id;
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg border ${
                        active ? 'bg-white/10 border-white/30' : 'bg-[#1c1c22] border-white/10'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => applyProfile(p)}
                        className="text-left flex-1 font-semibold text-white cursor-pointer truncate"
                      >
                        {p.name}
                      </button>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            const dup: SoundProfile = {
                              id: `prof_${Date.now()}`,
                              name: `${p.name} Copy`,
                              snapshot: JSON.parse(JSON.stringify(p.snapshot)),
                            };
                            updateSettings('audio', {
                              profiles: { ...profiles, userProfiles: [...profiles.userProfiles, dup] },
                            });
                          }}
                          className="text-[10px] text-zinc-400 hover:text-white cursor-pointer"
                        >
                          Duplicate
                        </button>
                        {!p.builtin && (
                          <button
                            type="button"
                            onClick={() =>
                              updateSettings('audio', {
                                profiles: {
                                  activeProfileId: profiles.activeProfileId === p.id ? 'flat' : profiles.activeProfileId,
                                  userProfiles: profiles.userProfiles.filter((x) => x.id !== p.id),
                                },
                              })
                            }
                            className="text-[10px] text-rose-400 hover:text-rose-300 cursor-pointer"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Save Current Snapshot as Profile + Import/Export */}
            <div className="pt-2 border-t border-white/10 flex flex-wrap items-center gap-1.5">
              <input
                type="text"
                placeholder="New profile name..."
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                className="flex-1 min-w-[120px] bg-[#1e1e26] border border-white/15 rounded-lg px-2 py-1 text-[11px] text-white outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  const name = newProfileName.trim();
                  if (!name) return;
                  const id = `prof_${Date.now()}`;
                  const newProf: SoundProfile = {
                    id,
                    name,
                    snapshot: {
                      eq: { enabled: eq.enabled, preampDb: eq.preampDb, bands: [...eq.bands], presetId: eq.presetId },
                      effects: JSON.parse(JSON.stringify(fx)),
                      master: JSON.parse(JSON.stringify(master)),
                    },
                  };
                  updateSettings('audio', {
                    profiles: {
                      activeProfileId: id,
                      userProfiles: [...profiles.userProfiles, newProf],
                    },
                  });
                  setNewProfileName('');
                  setStatusNotice(`Saved profile "${name}"`);
                }}
                className="px-2.5 py-1 rounded-lg bg-white text-black font-semibold text-[11px] cursor-pointer"
              >
                Save As
              </button>
              <button
                type="button"
                onClick={() => {
                  const blob = new Blob([JSON.stringify(profiles.userProfiles || [], null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'myujiku-sound-profiles.json';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="px-2 py-1 rounded-lg bg-white/10 text-zinc-200 text-[10px] cursor-pointer"
              >
                Export
              </button>
              <button
                type="button"
                onClick={() => importProfileRef.current?.click()}
                className="px-2 py-1 rounded-lg bg-white/10 text-zinc-200 text-[10px] cursor-pointer"
              >
                Import
              </button>
              <input
                ref={importProfileRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  f.text().then((txt) => {
                    try {
                      const arr = JSON.parse(txt);
                      if (Array.isArray(arr)) {
                        updateSettings('audio', {
                          profiles: {
                            ...profiles,
                            userProfiles: [...profiles.userProfiles, ...arr],
                          },
                        });
                        setStatusNotice('Imported sound profiles');
                      }
                    } catch {
                      setStatusNotice('Invalid profiles JSON');
                    }
                  });
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EffectRow({
  title,
  subtitle,
  enabled,
  expanded,
  onToggle,
  onExpand,
  onReset,
  children,
}: {
  title: string;
  subtitle: string;
  enabled: boolean;
  expanded: boolean;
  onToggle: () => void;
  onExpand: () => void;
  onReset: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border transition-colors ${
        enabled ? 'bg-white/10 border-white/25' : 'bg-[#1b1b22] border-[#262630]'
      }`}
    >
      <div className="flex items-center justify-between p-2.5 gap-2">
        <button
          type="button"
          onClick={onExpand}
          className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
        >
          <svg
            className={`w-3.5 h-3.5 text-zinc-400 transition-transform shrink-0 ${expanded ? 'rotate-90' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <div className="min-w-0">
            <p className="font-semibold text-white truncate">{title}</p>
            <p className="text-[10px] text-zinc-400 truncate">{subtitle}</p>
          </div>
        </button>

        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={`Toggle ${title}`}
          onClick={onToggle}
          className={`w-8 h-4 rounded-full transition-colors p-0.5 flex items-center shrink-0 cursor-pointer ${
            enabled ? 'bg-[var(--accent,#10b981)] justify-end' : 'bg-zinc-700 justify-start'
          }`}
        >
          <div className="w-3 h-3 rounded-full bg-white shadow" />
        </button>
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-white/10 space-y-2">
          {children}
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={onReset}
              className="text-[10px] text-zinc-400 hover:text-white underline cursor-pointer"
            >
              Reset {title}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SliderParam({
  label,
  valueText,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  valueText: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (val: number) => void;
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-zinc-300">{label}</span>
        <span className="font-mono text-zinc-400">{valueText}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-[#2a2a34] rounded-lg appearance-none cursor-pointer accent-[var(--accent,#10b981)]"
      />
    </div>
  );
}

