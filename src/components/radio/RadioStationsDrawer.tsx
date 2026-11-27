'use client';

import React, { useMemo, useState } from 'react';
import { useRadio } from '@/context/RadioContext';

export default function RadioStationsDrawer({ isOpen }: { isOpen: boolean }) {
  const {
    stations,
    band,
    setBand,
    activeStation,
    frequency,
    presets,
    tuneToStation,
    savePreset,
    rescanStations,
  } = useRadio();

  const [query, setQuery] = useState('');
  const [tagFilter, setTagFilter] = useState('All');
  const [langFilter, setLangFilter] = useState('All');

  const bandStations = useMemo(
    () => stations.filter((s) => s.band === band),
    [stations, band]
  );

  const tags = useMemo(
    () => ['All', ...Array.from(new Set(bandStations.map((s) => s.tag)))],
    [bandStations]
  );

  const langs = useMemo(
    () => ['All', ...Array.from(new Set(bandStations.map((s) => s.language)))],
    [bandStations]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return bandStations.filter((s) => {
      if (tagFilter !== 'All' && s.tag !== tagFilter) return false;
      if (langFilter !== 'All' && s.language !== langFilter) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.tag.toLowerCase().includes(q) ||
        String(s.frequency).includes(q)
      );
    });
  }, [bandStations, query, tagFilter, langFilter]);

  if (!isOpen) return null;

  return (
    <aside
      aria-label="Radio Stations Directory"
      className="w-full lg:w-80 shrink-0 bg-[#111115] border border-[#24242d] rounded-2xl p-4 flex flex-col gap-3 max-h-[540px]"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">Stations</h3>
          <div className="inline-flex rounded-md bg-black/50 border border-white/10 p-0.5 text-[10px]">
            {(['FM', 'AM'] as const).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBand(b)}
                className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                  band === b ? 'bg-[var(--accent)] text-black' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={rescanStations}
          className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-[10px] font-semibold text-zinc-300 border border-white/10 cursor-pointer"
          title="Re-seed and regenerate station lineup"
        >
          Re-scan
        </button>
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search station, genre, MHz..."
        aria-label="Search radio stations"
        className="w-full px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[var(--accent)]"
      />

      <div className="grid grid-cols-2 gap-1.5">
        <select
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          aria-label="Filter by tag"
          className="px-2 py-1 rounded-lg bg-black/50 border border-white/10 text-[11px] text-zinc-200"
        >
          {tags.map((t) => (
            <option key={t} value={t} className="bg-zinc-900">
              Tag: {t}
            </option>
          ))}
        </select>
        <select
          value={langFilter}
          onChange={(e) => setLangFilter(e.target.value)}
          aria-label="Filter by language"
          className="px-2 py-1 rounded-lg bg-black/50 border border-white/10 text-[11px] text-zinc-200"
        >
          {langs.map((l) => (
            <option key={l} value={l} className="bg-zinc-900">
              Lang: {l}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
        {filtered.map((st) => {
          const isTuned = activeStation?.id === st.id || Math.abs(frequency - st.frequency) < 0.05;
          const presetSlot = presets.find((p) => p.stationId === st.id)?.slot;
          const nextFreeSlot = [1, 2, 3, 4, 5, 6].find((n) => !presets.some((p) => p.slot === n)) || 1;
          return (
            <div
              key={st.id}
              className={`flex items-center justify-between gap-2 p-2 rounded-xl border transition-colors ${
                isTuned
                  ? 'bg-[var(--accent)]/15 border-[var(--accent)]/40 text-white'
                  : 'bg-[#17171d] border-[#25252f] text-zinc-300 hover:border-zinc-600'
              }`}
            >
              <button
                type="button"
                onClick={() => tuneToStation(st)}
                className="flex-1 text-left min-w-0 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-bold text-[var(--accent)] shrink-0">
                    {st.band === 'FM' ? st.frequency.toFixed(1) : st.frequency}
                  </span>
                  <span className="text-xs font-semibold truncate">{st.name}</span>
                </div>
                <div className="text-[10px] text-zinc-400 truncate mt-0.5">
                  {st.tag} · {st.language}
                </div>
              </button>
              <button
                type="button"
                onClick={() => savePreset(presetSlot || nextFreeSlot, st)}
                className={`px-1.5 py-1 rounded-md text-[10px] font-bold border cursor-pointer shrink-0 ${
                  presetSlot
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-white/5 text-zinc-400 hover:text-white border-white/10'
                }`}
                title={presetSlot ? `Saved to Preset ${presetSlot}` : `Save to Preset ${nextFreeSlot}`}
                aria-label={presetSlot ? `Saved to Preset ${presetSlot}` : `Save ${st.name} to preset`}
              >
                {presetSlot ? `P${presetSlot}` : 'Star'}
              </button>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

