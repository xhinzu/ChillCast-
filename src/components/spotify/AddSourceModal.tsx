'use client';

import React, { useRef, useState } from 'react';
import { AdapterType } from '@/types/playback';

export interface SavedPlaylistItem {
  id: string;
  title: string;
  subtitle: string;
  type: AdapterType;
  targetUrl: string;
  icon: string;
}

interface AddSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSavePlaylist: (item: SavedPlaylistItem) => void;
  onUploadLocalFile: (file: File) => void;
}

export default function AddSourceModal({
  isOpen,
  onClose,
  onSavePlaylist,
  onUploadLocalFile,
}: AddSourceModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<'youtube' | 'spotify' | 'local' | null>(null);
  const [playlistTitle, setPlaylistTitle] = useState<string>('');
  const [urlInput, setUrlInput] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleResetAndClose = () => {
    setSelectedMethod(null);
    setPlaylistTitle('');
    setUrlInput('');
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    const title = playlistTitle.trim() || (selectedMethod === 'youtube' ? 'YouTube Playlist' : 'Spotify Playlist');

    const newItem: SavedPlaylistItem = {
      id: `saved-${Date.now()}`,
      title,
      subtitle: selectedMethod === 'youtube' ? 'Playlist • YouTube' : 'Playlist • Spotify',
      type: selectedMethod === 'youtube' ? 'youtube' : 'spotify',
      targetUrl: urlInput.trim(),
      icon: selectedMethod === 'youtube' ? '▶️' : '🎧',
    };

    onSavePlaylist(newItem);
    handleResetAndClose();
  };

  const handleLocalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadLocalFile(file);
      handleResetAndClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#181818] border border-[#282828] rounded-2xl shadow-2xl p-6 relative">
        {/* Close Button */}
        <button
          type="button"
          onClick={handleResetAndClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#242424] hover:bg-[#2e2e2e] text-[#b3b3b3] hover:text-white flex items-center justify-center text-sm transition-colors cursor-pointer"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div className="mb-6">
          <span className="text-xs font-bold uppercase tracking-wider text-[#1d90f5]">
            Add to Your Library
          </span>
          <h2 className="text-xl font-extrabold text-white mt-1">
            What method are you choosing?
          </h2>
          <p className="text-xs text-[#b3b3b3] mt-0.5">
            Select how you want to add music into your Chillify library.
          </p>
        </div>

        {/* Method 3-Option Picker */}
        {!selectedMethod ? (
          <div className="space-y-3">
            {/* Option 1: YouTube */}
            <button
              type="button"
              onClick={() => setSelectedMethod('youtube')}
              className="w-full p-4 rounded-xl bg-[#242424] hover:bg-[#2c2c2c] border border-transparent hover:border-[#1d90f5]/50 flex items-center gap-4 text-left transition-all cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-xl bg-red-600/20 text-red-500 flex items-center justify-center text-2xl shrink-0 group-hover:scale-105 transition-transform">
                ▶️
              </div>
              <div>
                <h3 className="text-sm font-bold text-white group-hover:text-[#1d90f5] transition-colors">
                  YouTube Playlist or Track
                </h3>
                <p className="text-xs text-[#b3b3b3] mt-0.5">
                  Paste any YouTube video or playlist link
                </p>
              </div>
            </button>

            {/* Option 2: Spotify */}
            <button
              type="button"
              onClick={() => setSelectedMethod('spotify')}
              className="w-full p-4 rounded-xl bg-[#242424] hover:bg-[#2c2c2c] border border-transparent hover:border-[#1d90f5]/50 flex items-center gap-4 text-left transition-all cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-xl bg-[#1d90f5]/20 text-[#1d90f5] flex items-center justify-center text-2xl shrink-0 group-hover:scale-105 transition-transform">
                🎧
              </div>
              <div>
                <h3 className="text-sm font-bold text-white group-hover:text-[#1d90f5] transition-colors">
                  Spotify Playlist
                </h3>
                <p className="text-xs text-[#b3b3b3] mt-0.5">
                  Paste a Spotify playlist URL to resolve tracks
                </p>
              </div>
            </button>

            {/* Option 3: Local Audio */}
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleLocalFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full p-4 rounded-xl bg-[#242424] hover:bg-[#2c2c2c] border border-transparent hover:border-[#1d90f5]/50 flex items-center gap-4 text-left transition-all cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-xl bg-zinc-700/50 text-zinc-300 flex items-center justify-center text-2xl shrink-0 group-hover:scale-105 transition-transform">
                📁
              </div>
              <div>
                <h3 className="text-sm font-bold text-white group-hover:text-[#1d90f5] transition-colors">
                  Upload Custom Audio
                </h3>
                <p className="text-xs text-[#b3b3b3] mt-0.5">
                  Play .mp3, .wav, or .flac directly from your device
                </p>
              </div>
            </button>
          </div>
        ) : (
          /* Form for YouTube or Spotify */
          <form onSubmit={handleSubmit} className="space-y-4">
            <button
              type="button"
              onClick={() => setSelectedMethod(null)}
              className="text-xs text-[#1d90f5] hover:underline flex items-center gap-1 cursor-pointer mb-2"
            >
              ← Choose a different method
            </button>

            <div>
              <label className="block text-xs font-semibold text-[#b3b3b3] mb-1.5">
                Playlist / Track Name
              </label>
              <input
                type="text"
                value={playlistTitle}
                onChange={(e) => setPlaylistTitle(e.target.value)}
                placeholder={
                  selectedMethod === 'youtube'
                    ? 'e.g. My Chill YouTube Mix'
                    : 'e.g. My Favorite Spotify Tracks'
                }
                className="w-full bg-[#242424] border border-[#333] focus:border-[#1d90f5] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#777] outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#b3b3b3] mb-1.5">
                {selectedMethod === 'youtube'
                  ? 'YouTube URL (Video or Playlist)'
                  : 'Spotify Playlist URL'}
              </label>
              <input
                type="text"
                required
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder={
                  selectedMethod === 'youtube'
                    ? 'https://youtube.com/playlist?list=... or video link'
                    : 'https://open.spotify.com/playlist/...'
                }
                className="w-full bg-[#242424] border border-[#333] focus:border-[#1d90f5] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#777] outline-none transition-colors"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-4 py-2 rounded-full bg-[#242424] hover:bg-[#2c2c2c] text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-full bg-[#1d90f5] hover:bg-[#3b82f6] text-xs font-bold text-white transition-colors shadow-md cursor-pointer"
              >
                Save to Library
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
