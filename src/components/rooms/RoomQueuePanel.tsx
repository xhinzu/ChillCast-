'use client';

import React, { useState } from 'react';
import { useRoom } from '@/context/RoomContext';
import { canModifyQueueItem, getRequiredSkipVotes } from '@/lib/rooms/permissions';

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function parseDurationSeconds(durStr: string): number {
  if (!durStr) return 0;
  const parts = durStr.split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

interface SearchItem {
  id: string;
  title: string;
  channel: string;
  duration: string;
  thumbnail: string;
}

export default function RoomQueuePanel() {
  const {
    room,
    queue,
    members,
    currentMember,
    skipVotes,
    hasVotedSkip,
    canAdd,
    voteSkip,
    addToQueue,
    removeFromQueue,
    reorderQueue,
  } = useRoom();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchItem[]>([]);
  const [searchToast, setSearchToast] = useState<string | null>(null);

  if (!room) return null;

  const currentItemId = room.state.queueItemId;
  const totalDurationSec = queue.reduce((acc, item) => acc + (item.duration_sec || 0), 0);
  const totalMinutes = Math.floor(totalDurationSec / 60);

  const totalMembers = Math.max(1, members.length);
  const requiredVotes = getRequiredSkipVotes(totalMembers);
  const currentVotes = skipVotes.length;
  const isHostOnlyControl = room.settings.controlPlayback === 'host';

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(searchQuery.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults((data.results || []).slice(0, 6));
      }
    } catch (err) {
      console.error('Failed to search songs:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddTrack = async (item: SearchItem, playNext: boolean = false) => {
    const res = await addToQueue({
      videoId: item.id,
      title: item.title,
      artist: item.channel || 'Unknown Artist',
      thumbnail: item.thumbnail || '',
      durationSec: parseDurationSeconds(item.duration),
    }, playNext);

    if (res.success) {
      setSearchToast(playNext ? `Set "${item.title.slice(0, 24)}..." to play next` : `Added "${item.title.slice(0, 24)}..."`);
      setTimeout(() => setSearchToast(null), 3000);
    } else if (res.error) {
      setSearchToast(res.error);
      setTimeout(() => setSearchToast(null), 4000);
    }
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const item = queue[index];
    const prevItem = queue[index - 1];
    reorderQueue(item.id, prevItem.position);
  };

  const handleMoveDown = (index: number) => {
    if (index >= queue.length - 1) return;
    const item = queue[index];
    const nextItem = queue[index + 1];
    reorderQueue(item.id, nextItem.position);
  };

  return (
    <div className="bg-[#121212] border border-[#242424] rounded-2xl flex flex-col h-full overflow-hidden">
      {/* Queue Header */}
      <div className="p-4 border-b border-[#222222] flex items-center justify-between shrink-0">
        <div>
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <span>Room Queue</span>
            <span className="text-[11px] bg-[#222222] text-[#888888] px-2 py-0.5 rounded-full font-normal">
              {queue.length} / 100
            </span>
          </h3>
          <p className="text-[11px] text-[#666666] mt-0.5">
            Total length: {totalMinutes}m {totalDurationSec % 60}s
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Add Song Button */}
          {canAdd && (
            <button
              type="button"
              onClick={() => setIsSearchOpen((prev) => !prev)}
              className={`text-xs px-3 py-1.5 rounded-full font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                isSearchOpen
                  ? 'bg-neutral-800 text-white border-neutral-600'
                  : 'bg-white text-black hover:bg-neutral-200 border-white'
              }`}
            >
              <span>{isSearchOpen ? '✕ Close' : '＋ Add Song'}</span>
            </button>
          )}

          {/* Vote to Skip (visible if controls are not host-only and song is playing) */}
          {!isHostOnlyControl && currentItemId && (
            <button
              type="button"
              onClick={voteSkip}
              disabled={hasVotedSkip}
              className={`text-xs px-3 py-1.5 rounded-full font-semibold border transition-all ${
                hasVotedSkip
                  ? 'bg-neutral-800 text-[#888888] border-[#333333]'
                  : 'bg-[#1e1e1e] text-white hover:bg-[#282828] border-[#333333] cursor-pointer'
              }`}
            >
              {hasVotedSkip ? 'Voted' : 'Vote Skip'} ({currentVotes}/{requiredVotes})
            </button>
          )}
        </div>
      </div>

      {/* Quick Search Drawer */}
      {isSearchOpen && (
        <div className="p-3 bg-[#161616] border-b border-[#242424] space-y-3 shrink-0">
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search song or artist to queue..."
              autoFocus
              className="flex-1 bg-[#101010] border border-[#2c2c2c] rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-400"
            />
            <button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="px-3.5 py-2 rounded-xl bg-white text-black font-semibold text-xs hover:bg-neutral-200 disabled:opacity-50 transition-colors cursor-pointer shrink-0"
            >
              {isSearching ? '...' : 'Search'}
            </button>
          </form>

          {searchToast && (
            <p className="text-[11px] text-emerald-400 font-medium px-1">
              {searchToast}
            </p>
          )}

          {searchResults.length > 0 && (
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {searchResults.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-[#121212] hover:bg-[#1a1a1a] border border-[#222222] transition-colors"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.thumbnail}
                    alt=""
                    className="w-8 h-8 rounded object-cover shrink-0 bg-[#222222]"
                  />
                  <div className="flex-1 min-w-0 pr-1">
                    <p className="text-xs font-medium text-white truncate">{item.title}</p>
                    <p className="text-[10px] text-[#777777] truncate">{item.channel} • {item.duration}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleAddTrack(item, false)}
                      className="px-2 py-1 rounded bg-[#222222] hover:bg-white hover:text-black text-[10px] font-semibold text-neutral-300 transition-colors cursor-pointer"
                      title="Add to queue"
                    >
                      ＋ Queue
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddTrack(item, true)}
                      className="px-2 py-1 rounded bg-[#1c1c1c] hover:bg-neutral-300 hover:text-black text-[10px] font-semibold text-[#888888] transition-colors cursor-pointer"
                      title="Play next"
                    >
                      Next
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Queue Items List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 divide-y divide-[#1e1e1e]/40">
        {queue.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center p-4 space-y-3">
            <p className="text-sm font-semibold text-white">Queue is empty</p>
            <p className="text-xs text-[#888888] max-w-xs">
              Add songs from search, browse trending tracks, or click below.
            </p>
            {canAdd && (
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                className="px-4 py-2 rounded-full bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition-colors cursor-pointer"
              >
                ＋ Add a Song
              </button>
            )}
          </div>
        ) : (
          queue.map((item, index) => {
            const isPlaying = item.id === currentItemId;
            const canModify = currentMember
              ? canModifyQueueItem(currentMember.id, room.host_id, item.added_by.id)
              : false;

            return (
              <div
                key={item.id}
                className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors pt-2.5 ${
                  isPlaying
                    ? 'bg-white/10 border border-white/20'
                    : 'hover:bg-[#1a1a1a] border border-transparent'
                }`}
              >
                {/* Index / Playing Indicator */}
                <div className="w-5 text-center shrink-0">
                  {isPlaying ? (
                    <span className="text-sm animate-pulse">▶</span>
                  ) : (
                    <span className="text-xs text-[#666666]">{index + 1}</span>
                  )}
                </div>

                {/* Track Thumbnail */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  className="w-10 h-10 rounded-md object-cover shrink-0 bg-[#242424]"
                />

                {/* Track Meta */}
                <div className="flex-1 min-w-0 pr-2">
                  <p
                    className={`text-sm font-semibold truncate ${
                      isPlaying ? 'text-white font-bold' : 'text-[#dddddd]'
                    }`}
                  >
                    {item.title}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-[#888888] mt-0.5 truncate">
                    <span className="truncate">{item.artist}</span>
                    <span>•</span>
                    <span className="shrink-0">{formatDuration(item.duration_sec)}</span>
                    <span>•</span>
                    {/* Added By Chip */}
                    <span className="inline-flex items-center gap-1 bg-[#1a1a1a] px-2 py-0.5 rounded-full text-[11px] text-[#aaaaaa] border border-[#2a2a2a] shrink-0">
                      {item.added_by.avatar && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.added_by.avatar}
                          alt=""
                          className="w-3 h-3 rounded-full"
                        />
                      )}
                      <span>{item.added_by.name}</span>
                    </span>
                  </div>
                </div>

                {/* Reorder / Remove Controls */}
                {canModify && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className="w-7 h-7 rounded hover:bg-white/10 flex items-center justify-center text-[#888888] hover:text-white disabled:opacity-20 disabled:hover:bg-transparent"
                      title="Move up"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === queue.length - 1}
                      className="w-7 h-7 rounded hover:bg-white/10 flex items-center justify-center text-[#888888] hover:text-white disabled:opacity-20 disabled:hover:bg-transparent"
                      title="Move down"
                    >
                      ▼
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFromQueue(item.id)}
                      className="w-7 h-7 rounded hover:bg-red-500/20 text-[#888888] hover:text-red-400 flex items-center justify-center cursor-pointer"
                      title="Remove from queue"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
