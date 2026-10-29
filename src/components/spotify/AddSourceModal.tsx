'use client';

import React, { useState, useRef } from 'react';
import {
  MusicNoteIcon,
  PlayIcon,
  HeadphonesIcon,
  FolderIcon,
} from '@/components/common/MinimalIcons';

export interface CustomPlaylistTrack {
  id: string;
  title: string;
  artist: string;
  duration?: string;
  thumbnail?: string;
  addedAt: number;
}

export interface SavedPlaylistItem {
  id: string;
  title: string;
  subtitle: string;
  type: 'youtube' | 'spotify' | 'custom';
  targetUrl: string;
  icon?: string;
  tracks?: CustomPlaylistTrack[];
  description?: string;
  createdAt: number;
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
  const [selectedMethod, setSelectedMethod] = useState<'youtube' | 'spotify' | 'custom' | null>(null);
  const [playlistTitle, setPlaylistTitle] = useState('');
  const [playlistDescription, setPlaylistDescription] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleResetAndClose = () => {
    setSelectedMethod(null);
    setPlaylistTitle('');
    setPlaylistDescription('');
    setUrlInput('');
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedMethod === 'custom') {
      const title = playlistTitle.trim() || 'My Custom Playlist';
      const newItem: SavedPlaylistItem = {
        id: `custom-pl-${Date.now()}`,
        title,
        subtitle: '0 songs • Custom Playlist',
        type: 'custom',
        targetUrl: '',
        icon: 'music',
        tracks: [],
        description: playlistDescription.trim() || 'Custom playlist on Chillify',
        createdAt: Date.now(),
      };

      onSavePlaylist(newItem);
      handleResetAndClose();
      return;
    }

    if (!urlInput.trim()) return;

    const title = playlistTitle.trim() || (selectedMethod === 'youtube' ? 'YouTube Playlist' : 'Spotify Playlist');

    const newItem: SavedPlaylistItem = {
      id: `saved-${Date.now()}`,
      title,
      subtitle: selectedMethod === 'youtube' ? 'Playlist • YouTube' : 'Playlist • Spotify',
      type: selectedMethod === 'youtube' ? 'youtube' : 'spotify',
      targetUrl: urlInput.trim(),
      icon: selectedMethod === 'youtube' ? 'youtube' : 'headphones',
      createdAt: Date.now(),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#161616] border border-[#2a2a2a] rounded-2xl p-6 shadow-2xl relative animate-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          type="button"
          onClick={handleResetAndClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#222222] hover:bg-[#2c2c2c] text-[#888888] hover:text-white flex items-center justify-center transition-colors text-sm cursor-pointer border border-[#333333]"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div className="mb-5">
          <h2 className="text-lg font-bold text-white tracking-tight">Add to Library</h2>
          <p className="text-xs text-[#888888] mt-1">
            Select how you want to add music into your Chillify library.
          </p>
        </div>

        {/* Method Picker Options */}
        {!selectedMethod ? (
          <div className="space-y-2.5">
            {/* Option 1: Custom Playlist */}
            <button
              type="button"
              onClick={() => setSelectedMethod('custom')}
              className="w-full p-3.5 rounded-xl bg-[#202020] hover:bg-[#262626] border border-[#2e2e2e] hover:border-[#444444] flex items-center gap-3.5 text-left transition-all cursor-pointer group shadow-sm"
            >
              <div className="w-11 h-11 rounded-xl bg-[#2a2a2a] border border-[#383838] text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <MusicNoteIcon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white group-hover:text-zinc-200 transition-colors">
                    Custom Playlist
                  </h3>
                  <span className="px-1.5 py-0.5 rounded bg-white text-black font-extrabold text-[9px] uppercase tracking-wide">
                    New
                  </span>
                </div>
                <p className="text-xs text-[#888888] mt-0.5">
                  Name your playlist now, add songs to it later
                </p>
              </div>
            </button>

            {/* Option 2: YouTube */}
            <button
              type="button"
              onClick={() => setSelectedMethod('youtube')}
              className="w-full p-3.5 rounded-xl bg-[#202020] hover:bg-[#262626] border border-[#2e2e2e] hover:border-[#444444] flex items-center gap-3.5 text-left transition-all cursor-pointer group"
            >
              <div className="w-11 h-11 rounded-xl bg-[#2a2a2a] border border-[#383838] text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <PlayIcon className="w-5 h-5 text-white ml-0.5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white group-hover:text-zinc-200 transition-colors">
                  YouTube Playlist or Track
                </h3>
                <p className="text-xs text-[#888888] mt-0.5">
                  Paste any YouTube video or playlist link
                </p>
              </div>
            </button>

            {/* Option 3: Spotify */}
            <button
              type="button"
              onClick={() => setSelectedMethod('spotify')}
              className="w-full p-3.5 rounded-xl bg-[#202020] hover:bg-[#262626] border border-[#2e2e2e] hover:border-[#444444] flex items-center gap-3.5 text-left transition-all cursor-pointer group"
            >
              <div className="w-11 h-11 rounded-xl bg-[#2a2a2a] border border-[#383838] text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <HeadphonesIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white group-hover:text-zinc-200 transition-colors">
                  Spotify Playlist
                </h3>
                <p className="text-xs text-[#888888] mt-0.5">
                  Paste a Spotify playlist URL to resolve tracks
                </p>
              </div>
            </button>

            {/* Option 4: Local Audio */}
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
              className="w-full p-3.5 rounded-xl bg-[#202020] hover:bg-[#262626] border border-[#2e2e2e] hover:border-[#444444] flex items-center gap-3.5 text-left transition-all cursor-pointer group"
            >
              <div className="w-11 h-11 rounded-xl bg-[#2a2a2a] border border-[#383838] text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <FolderIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white group-hover:text-zinc-200 transition-colors">
                  Upload Custom Audio
                </h3>
                <p className="text-xs text-[#888888] mt-0.5">
                  Play .mp3, .wav, or .flac directly from your device
                </p>
              </div>
            </button>
          </div>
        ) : selectedMethod === 'custom' ? (
          /* Form for Custom Playlist */
          <form onSubmit={handleSubmit} className="space-y-4">
            <button
              type="button"
              onClick={() => setSelectedMethod(null)}
              className="text-xs text-zinc-300 hover:text-white flex items-center gap-1 cursor-pointer mb-2"
            >
              ← Choose a different method
            </button>

            <div>
              <label className="block text-xs font-semibold text-[#888888] mb-1.5">
                Playlist Name <span className="text-white">*</span>
              </label>
              <input
                type="text"
                required
                autoFocus
                value={playlistTitle}
                onChange={(e) => setPlaylistTitle(e.target.value)}
                placeholder="e.g. My Chill Mix, Study Vibez, Late Night..."
                className="w-full bg-[#202020] border border-[#333] focus:border-[#666] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#777] outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#888888] mb-1.5">
                Description (Optional)
              </label>
              <input
                type="text"
                value={playlistDescription}
                onChange={(e) => setPlaylistDescription(e.target.value)}
                placeholder="Give your playlist a vibe or notes..."
                className="w-full bg-[#202020] border border-[#333] focus:border-[#666] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#777] outline-none transition-colors"
              />
            </div>

            <div className="p-3 rounded-xl bg-[#202020] border border-[#2d2d2d] text-xs text-[#888888]">
              <p>
                After creating this playlist, you can search any song on Chillify and click <strong className="text-white">+ Add to Playlist</strong> to build your collection!
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-4 py-2 rounded-full bg-[#242424] hover:bg-[#2c2c2c] text-xs font-semibold text-[#888888] hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-full bg-white hover:bg-zinc-200 text-xs font-bold text-black transition-colors shadow-md cursor-pointer"
              >
                Create Playlist
              </button>
            </div>
          </form>
        ) : (
          /* Form for YouTube or Spotify */
          <form onSubmit={handleSubmit} className="space-y-4">
            <button
              type="button"
              onClick={() => setSelectedMethod(null)}
              className="text-xs text-zinc-300 hover:text-white flex items-center gap-1 cursor-pointer mb-2"
            >
              ← Choose a different method
            </button>

            <div>
              <label className="block text-xs font-semibold text-[#888888] mb-1.5">
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
                className="w-full bg-[#202020] border border-[#333] focus:border-[#666] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#777] outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#888888] mb-1.5">
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
                className="w-full bg-[#202020] border border-[#333] focus:border-[#666] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#777] outline-none transition-colors"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-4 py-2 rounded-full bg-[#242424] hover:bg-[#2c2c2c] text-xs font-semibold text-[#888888] hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-full bg-white hover:bg-zinc-200 text-xs font-bold text-black transition-colors shadow-md cursor-pointer"
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
