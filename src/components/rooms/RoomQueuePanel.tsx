'use client';

import React from 'react';
import { useRoom } from '@/context/RoomContext';
import { canModifyQueueItem, getRequiredSkipVotes } from '@/lib/rooms/permissions';

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export default function RoomQueuePanel() {
  const {
    room,
    queue,
    members,
    currentMember,
    skipVotes,
    hasVotedSkip,
    voteSkip,
    removeFromQueue,
    reorderQueue,
  } = useRoom();

  if (!room) return null;

  const currentItemId = room.state.queueItemId;
  const totalDurationSec = queue.reduce((acc, item) => acc + (item.duration_sec || 0), 0);
  const totalMinutes = Math.floor(totalDurationSec / 60);

  const totalMembers = Math.max(1, members.length);
  const requiredVotes = getRequiredSkipVotes(totalMembers);
  const currentVotes = skipVotes.length;
  const isHostOnlyControl = room.settings.controlPlayback === 'host';

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

        {/* Vote to Skip (visible if controls are not host-only and song is playing) */}
        {!isHostOnlyControl && currentItemId && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={voteSkip}
              disabled={hasVotedSkip}
              className={`text-xs px-3 py-1.5 rounded-full font-semibold border transition-all ${
                hasVotedSkip
                  ? 'bg-neutral-800 text-[#888888] border-[#333333]'
                  : 'bg-white text-black hover:bg-neutral-200 border-white cursor-pointer'
              }`}
            >
              {hasVotedSkip ? 'Voted' : 'Vote Skip'} ({currentVotes}/{requiredVotes})
            </button>
          </div>
        )}
      </div>

      {/* Queue Items List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 divide-y divide-[#1e1e1e]/40">
        {queue.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center p-4">
            <p className="text-sm font-semibold text-white">Queue is empty</p>
            <p className="text-xs text-[#888888] mt-1 max-w-xs">
              Search for tracks or browse playlists and click &quot;Add to room queue&quot;
            </p>
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
                      className="w-7 h-7 rounded hover:bg-red-500/20 text-[#888888] hover:text-red-400 flex items-center justify-center"
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

