'use client';

import React, { useState } from 'react';
import { useRoom } from '@/context/RoomContext';
import { PlaybackControlPermission, AddSongPermission } from '@/types/room';

interface RoomSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RoomSettingsModal({ isOpen, onClose }: RoomSettingsModalProps) {
  const {
    room,
    members,
    currentMember,
    updateSettings,
    kickMember,
    transferHost,
    endRoom,
  } = useRoom();

  const [roomName, setRoomName] = useState(room?.name || '');
  const [controlPlayback, setControlPlayback] = useState<PlaybackControlPermission>(
    room?.settings.controlPlayback || 'host'
  );
  const [addSongs, setAddSongs] = useState<AddSongPermission>(
    room?.settings.addSongs || 'everyone'
  );
  const [locked, setLocked] = useState(room?.settings.locked || false);
  const [maxMembers, setMaxMembers] = useState(room?.settings.maxMembers || 12);
  const [saving, setSaving] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);

  if (!isOpen || !room) return null;

  const handleSave = async () => {
    setSaving(true);
    await updateSettings(
      {
        controlPlayback,
        addSongs,
        locked,
        maxMembers,
      },
      roomName.trim() || room.name
    );
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#181818] border border-[#2a2a2a] rounded-2xl w-full max-w-lg shadow-2xl p-6 text-white max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#282828]">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span>⚙️</span> Room Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-[#888888] hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6 pt-5">
          {/* Room Name */}
          <div>
            <label className="block text-xs font-semibold text-[#888888] uppercase tracking-wider mb-2">
              Room Name
            </label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              maxLength={40}
              className="w-full bg-[#121212] border border-[#333333] rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-white transition-colors"
              placeholder="e.g. Midnight Chill Room"
            />
          </div>

          {/* Control Playback Permission */}
          <div>
            <label className="block text-xs font-semibold text-[#888888] uppercase tracking-wider mb-2">
              Who Can Control Playback (Play / Pause / Seek / Next)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setControlPlayback('host')}
                className={`px-3 py-2.5 rounded-lg text-sm font-semibold border transition-all text-center ${
                  controlPlayback === 'host'
                    ? 'bg-white text-black border-white'
                    : 'bg-[#121212] text-[#888888] border-[#333333] hover:text-white'
                }`}
              >
                Host Only (Default)
              </button>
              <button
                type="button"
                onClick={() => setControlPlayback('everyone')}
                className={`px-3 py-2.5 rounded-lg text-sm font-semibold border transition-all text-center ${
                  controlPlayback === 'everyone'
                    ? 'bg-white text-black border-white'
                    : 'bg-[#121212] text-[#888888] border-[#333333] hover:text-white'
                }`}
              >
                Everyone
              </button>
            </div>
          </div>

          {/* Add Songs Permission */}
          <div>
            <label className="block text-xs font-semibold text-[#888888] uppercase tracking-wider mb-2">
              Who Can Add Songs To Queue
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAddSongs('everyone')}
                className={`px-3 py-2.5 rounded-lg text-sm font-semibold border transition-all text-center ${
                  addSongs === 'everyone'
                    ? 'bg-white text-black border-white'
                    : 'bg-[#121212] text-[#888888] border-[#333333] hover:text-white'
                }`}
              >
                Everyone (Default)
              </button>
              <button
                type="button"
                onClick={() => setAddSongs('host')}
                className={`px-3 py-2.5 rounded-lg text-sm font-semibold border transition-all text-center ${
                  addSongs === 'host'
                    ? 'bg-white text-black border-white'
                    : 'bg-[#121212] text-[#888888] border-[#333333] hover:text-white'
                }`}
              >
                Host Only
              </button>
            </div>
          </div>

          {/* Lock Room Toggle */}
          <div className="flex items-center justify-between p-3.5 bg-[#121212] border border-[#282828] rounded-xl">
            <div>
              <p className="text-sm font-semibold">Lock Room</p>
              <p className="text-xs text-[#888888]">Prevent new members from joining</p>
            </div>
            <button
              type="button"
              onClick={() => setLocked(!locked)}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                locked ? 'bg-red-500' : 'bg-[#333333]'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform absolute top-0.5 ${
                  locked ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Max Members Slider */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-semibold text-[#888888] uppercase tracking-wider">
                Max Members
              </label>
              <span className="text-sm font-bold text-white">{maxMembers} members</span>
            </div>
            <input
              type="range"
              min={2}
              max={20}
              value={maxMembers}
              onChange={(e) => setMaxMembers(Number(e.target.value))}
              className="w-full spotify-slider"
            />
            <div className="flex justify-between text-[11px] text-[#666666] mt-1">
              <span>2</span>
              <span>12 (Default)</span>
              <span>20 (Cap)</span>
            </div>
          </div>

          {/* Member Management */}
          <div>
            <label className="block text-xs font-semibold text-[#888888] uppercase tracking-wider mb-2">
              Manage Members ({members.length})
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {members.map((m) => {
                const isThisHost = m.id === room.host_id;
                const isMe = m.id === currentMember?.id;

                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-2.5 bg-[#121212] border border-[#242424] rounded-lg text-sm"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      {m.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={m.avatar}
                          alt={m.name}
                          className="w-7 h-7 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-[#2a2a2a] text-white flex items-center justify-center text-xs font-bold shrink-0">
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="truncate">{m.name}</span>
                      {isThisHost && (
                        <span className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full border border-yellow-400/20">
                          Host 👑
                        </span>
                      )}
                    </div>

                    {!isThisHost && !isMe && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => transferHost(m.id)}
                          className="px-2.5 py-1 text-xs text-[#888888] hover:text-white bg-[#1a1a1a] hover:bg-[#252525] rounded border border-[#333333] transition-colors"
                          title="Transfer room host to this member"
                        >
                          Make Host
                        </button>
                        <button
                          type="button"
                          onClick={() => kickMember(m.id)}
                          className="px-2.5 py-1 text-xs text-red-400 hover:text-red-300 bg-red-950/20 hover:bg-red-950/40 rounded border border-red-900/30 transition-colors"
                          title="Remove from room"
                        >
                          Kick
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* End Room Section */}
          <div className="pt-4 border-t border-[#282828]">
            {confirmEnd ? (
              <div className="p-3 bg-red-950/30 border border-red-800/40 rounded-xl space-y-2">
                <p className="text-xs text-red-200">
                  Are you sure you want to end this room for all listeners?
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      endRoom();
                      onClose();
                    }}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-semibold transition-colors"
                  >
                    Yes, End Room
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmEnd(false)}
                    className="px-3 py-1.5 bg-[#282828] text-white rounded text-xs transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmEnd(true)}
                className="w-full py-2.5 border border-red-900/40 text-red-400 hover:bg-red-950/30 rounded-xl text-sm font-semibold transition-colors"
              >
                End Room
              </button>
            )}
          </div>
        </div>

        {/* Action Footer */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[#282828]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-[#888888] hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="px-5 py-2 rounded-lg text-sm font-semibold bg-white text-black hover:bg-neutral-200 transition-colors cursor-pointer"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

