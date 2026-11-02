'use client';

import React, { useState, useEffect, useCallback, useId } from 'react';
import { TrackInfo } from '@/types/playback';
import { SearchCandidateItem } from '@/app/api/lyrics/search/route';

interface LrcVersionsDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  currentTrack: TrackInfo | null;
  currentLrcText: string;
  onCopyLrc: (text: string, label?: string) => void;
  onApplyCandidate: (candidate: SearchCandidateItem) => void;
  currentOffset: number;
  onApplyOffset: (offset: number, desc?: string) => void;
  onOpenPasteModal: () => void;
  playingDuration?: number;
  initialTitle: string;
  initialArtist: string;
}

export default function LrcVersionsDropdown({
  isOpen,
  onClose,
  currentTrack,
  currentLrcText,
  onCopyLrc,
  onApplyCandidate,
  currentOffset,
  onApplyOffset,
  onOpenPasteModal,
  playingDuration,
  initialTitle,
  initialArtist,
}: LrcVersionsDropdownProps) {
  const [searchTitle, setSearchTitle] = useState(initialTitle || '');
  const [searchArtist, setSearchArtist] = useState(initialArtist || '');
  const [candidates, setCandidates] = useState<SearchCandidateItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [copiedId, setCopiedId] = useState<number | 'current' | null>(null);
  const searchInputId = useId();
  const artistInputId = useId();

  // Sync initial title/artist whenever track changes
  useEffect(() => {
    setSearchTitle(initialTitle || currentTrack?.title || '');
    setSearchArtist(initialArtist || currentTrack?.artist || '');
    setHasSearched(false);
    setCandidates([]);
  }, [initialTitle, initialArtist, currentTrack?.id, currentTrack?.title, currentTrack?.artist]);

  // Execute candidate search query
  const performSearch = useCallback(
    async (titleOverride?: string, artistOverride?: string) => {
      const qTitle = (titleOverride ?? searchTitle).trim();
      const qArtist = (artistOverride ?? searchArtist).trim();
      if (!qTitle) return;

      setIsLoading(true);
      setHasSearched(true);

      try {
        const params = new URLSearchParams({
          title: qTitle,
          artist: qArtist,
        });
        if (playingDuration && playingDuration > 0) {
          params.set('duration', Math.round(playingDuration).toString());
        }

        const res = await fetch(`/api/lyrics/search?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setCandidates(data.results || []);
        } else {
          setCandidates([]);
        }
      } catch {
        setCandidates([]);
      } finally {
        setIsLoading(false);
      }
    },
    [searchTitle, searchArtist, playingDuration]
  );

  // Auto-search on first open if no candidates yet
  useEffect(() => {
    if (isOpen && !hasSearched && currentTrack?.title) {
      performSearch(initialTitle || currentTrack.title, initialArtist || currentTrack.artist || '');
    }
  }, [isOpen, hasSearched, currentTrack?.title, currentTrack?.artist, initialTitle, initialArtist, performSearch]);

  // Handle copying candidate LRC with inline feedback
  const handleCopyCandidate = (cand: SearchCandidateItem) => {
    const lrc = cand.syncedLyrics || cand.plainLyrics || '';
    if (!lrc) {
      onCopyLrc('', `LRC for ${cand.trackName}`);
      return;
    }
    onCopyLrc(lrc, `LRC for "${cand.trackName}"`);
    setCopiedId(cand.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Handle copying active current song LRC
  const handleCopyCurrent = () => {
    onCopyLrc(currentLrcText, 'current song LRC');
    setCopiedId('current');
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="LRC Versions & Sync"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[#121212] border border-[#2a2a2a] rounded-2xl p-4 sm:p-6 max-w-xl w-full shadow-2xl relative max-h-[90vh] flex flex-col text-white overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div className="min-w-0 pr-4">
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg">📑</span>
              <h2 className="text-base sm:text-lg font-bold text-white truncate">
                LRC Versions & Timing
              </h2>
            </div>
            <p className="text-xs text-zinc-400 truncate mt-0.5">
              {currentTrack ? `${currentTrack.title} • ${currentTrack.artist || 'Unknown'}` : 'Select a version or copy LRC'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white flex items-center justify-center text-sm transition-colors cursor-pointer shrink-0"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Quick Actions Strip: Copy Current LRC + Paste Custom LRC */}
        <div className="py-3 flex items-center gap-2 flex-wrap border-b border-white/5 shrink-0">
          <button
            type="button"
            onClick={handleCopyCurrent}
            disabled={!currentLrcText}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
              copiedId === 'current'
                ? 'bg-emerald-500 text-black font-bold'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
            title="Copy the entire active .lrc text to your clipboard"
          >
            <span>{copiedId === 'current' ? '✓' : '📋'}</span>
            <span>{copiedId === 'current' ? 'Copied Current LRC!' : 'Copy Current Song LRC'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenPasteModal();
            }}
            className="px-3 py-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/60 text-xs font-semibold text-zinc-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Paste or import custom .lrc file text"
          >
            <span>📥</span>
            <span>Paste Custom LRC</span>
          </button>
        </div>

        {/* Live Rhythm / Timing Offset Nudge Bar */}
        <div className="py-2.5 px-3 my-2 rounded-xl bg-[#181818] border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 font-medium">Sync Offset:</span>
            <span
              className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                currentOffset === 0
                  ? 'bg-zinc-800 text-zinc-300'
                  : currentOffset > 0
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}
            >
              {currentOffset > 0 ? `+${currentOffset.toFixed(1)}s` : `${currentOffset.toFixed(1)}s`}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onApplyOffset(currentOffset - 0.5, 'Nudged -0.5s')}
              className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] font-mono font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer"
              title="Shift lyrics 0.5s earlier"
            >
              -0.5s
            </button>
            <button
              type="button"
              onClick={() => onApplyOffset(currentOffset - 0.1, 'Nudged -0.1s')}
              className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] font-mono font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer"
              title="Shift lyrics 0.1s earlier"
            >
              -0.1s
            </button>
            {currentOffset !== 0 && (
              <button
                type="button"
                onClick={() => onApplyOffset(0, 'Reset offset')}
                className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] font-mono font-semibold text-amber-300 hover:text-white transition-colors cursor-pointer"
                title="Reset timing offset to 0.0s"
              >
                0.0s
              </button>
            )}
            <button
              type="button"
              onClick={() => onApplyOffset(currentOffset + 0.1, 'Nudged +0.1s')}
              className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] font-mono font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer"
              title="Shift lyrics 0.1s later"
            >
              +0.1s
            </button>
            <button
              type="button"
              onClick={() => onApplyOffset(currentOffset + 0.5, 'Nudged +0.5s')}
              className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] font-mono font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer"
              title="Shift lyrics 0.5s later"
            >
              +0.5s
            </button>
          </div>
        </div>

        {/* Search Query Inputs */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            performSearch();
          }}
          className="flex flex-col gap-2 pt-1 pb-3 shrink-0"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label htmlFor={artistInputId} className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                Artist Name
              </label>
              <input
                id={artistInputId}
                type="text"
                value={searchArtist}
                onChange={(e) => setSearchArtist(e.target.value)}
                placeholder="Artist name"
                className="w-full px-3 py-1.5 rounded-xl bg-[#1c1c1c] border border-[#303030] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
            <div>
              <label htmlFor={searchInputId} className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                Song Title
              </label>
              <input
                id={searchInputId}
                type="text"
                value={searchTitle}
                onChange={(e) => setSearchTitle(e.target.value)}
                placeholder="Song title"
                className="w-full px-3 py-1.5 rounded-xl bg-[#1c1c1c] border border-[#303030] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !searchTitle.trim()}
            className="w-full py-1.5 rounded-xl bg-white hover:bg-zinc-200 disabled:opacity-40 text-black text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow"
          >
            {isLoading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                <span>Searching all synced versions...</span>
              </>
            ) : (
              <>
                <span>🔍</span>
                <span>Search Lyrics Candidates</span>
              </>
            )}
          </button>
        </form>

        {/* Candidate List (Scrollable) */}
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2 min-h-0 divide-y divide-white/5">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-zinc-400 flex flex-col items-center gap-2.5">
              <div className="w-7 h-7 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
              <span>Fetching matching LRC candidates...</span>
            </div>
          ) : candidates.length > 0 ? (
            <div className="flex flex-col gap-2 pt-1">
              <div className="flex items-center justify-between text-[11px] text-zinc-400 px-1 pb-1">
                <span className="font-semibold uppercase tracking-wider text-zinc-300">
                  Found Versions ({candidates.length})
                </span>
                <span className="text-[10px] text-zinc-500">Copy LRC or tap Apply</span>
              </div>

              {candidates.map((cand, idx) => {
                const diffText =
                  cand.diffSeconds !== undefined
                    ? cand.diffSeconds === 0
                      ? '±0s'
                      : cand.diffSeconds > 0
                      ? `+${cand.diffSeconds}s`
                      : `${cand.diffSeconds}s`
                    : null;

                const isCopied = copiedId === cand.id;

                return (
                  <div
                    key={cand.id}
                    className="p-3 rounded-xl bg-[#181818] hover:bg-[#1e1e1e] border border-[#282828] transition-all flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-white truncate">
                            {cand.trackName}
                          </span>
                          {idx === 0 && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Best Match
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-400 truncate">
                          {cand.artistName}
                          {cand.albumName ? ` • ${cand.albumName}` : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                        {cand.syncedType === 'word' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Word-Synced
                          </span>
                        ) : cand.syncedType === 'line' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                            Line-Synced
                          </span>
                        ) : cand.syncedType === 'instrumental' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Instrumental
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700">
                            Plain Text
                          </span>
                        )}

                        {cand.duration && (
                          <span className="text-[10px] font-mono text-zinc-300 bg-black/50 px-1.5 py-0.5 rounded border border-white/5">
                            {Math.floor(cand.duration / 60)}:{(cand.duration % 60).toString().padStart(2, '0')}
                            {diffText ? ` (${diffText})` : ''}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Preview Lines */}
                    {cand.previewLines && cand.previewLines.length > 0 && (
                      <div className="text-[11px] font-mono text-zinc-300/80 bg-black/40 px-2.5 py-1.5 rounded-lg flex flex-col gap-0.5">
                        {cand.previewLines.slice(0, 3).map((line, lIdx) => (
                          <div key={lIdx} className="truncate">
                            {line}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Action Buttons for this candidate */}
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/5">
                      <button
                        type="button"
                        onClick={() => handleCopyCandidate(cand)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                          isCopied
                            ? 'bg-emerald-500 text-black font-bold'
                            : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
                        }`}
                        title="Copy this candidate's raw .lrc format to clipboard"
                      >
                        <span>{isCopied ? '✓' : '📋'}</span>
                        <span>{isCopied ? 'Copied LRC!' : 'Copy LRC'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onApplyCandidate(cand);
                          onClose();
                        }}
                        className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-all cursor-pointer shadow flex items-center gap-1"
                        title="Set this version as the active synced lyrics for this song"
                      >
                        <span>✓</span>
                        <span>Apply</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : hasSearched ? (
            <div className="py-8 text-center text-xs text-zinc-400 flex flex-col items-center gap-3">
              <span className="text-3xl">🔍</span>
              <p className="max-w-xs leading-relaxed">
                No matching synced lyrics found for &ldquo;{searchTitle}&rdquo;. Try simplifying the title or paste custom LRC below.
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPasteModal();
                }}
                className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 border border-zinc-700"
              >
                <span>📥</span>
                <span>Paste Custom LRC</span>
              </button>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-zinc-500">
              Submit search query above to load matching synced lyrics versions.
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-3 mt-2 border-t border-white/10 shrink-0">
          <span className="text-[11px] text-zinc-500">
            All LRC copies include full timestamps
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 cursor-pointer transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
