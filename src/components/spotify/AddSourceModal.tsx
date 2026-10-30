'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  MusicNoteIcon,
  PlayIcon,
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
  coverUrl?: string;
  tracks?: CustomPlaylistTrack[];
  description?: string;
  createdAt: number;
}

interface AddSourceModalProps {
  isOpen: boolean;
  initialMethod?: 'youtube' | 'custom' | null;
  onClose: () => void;
  onSavePlaylist: (item: SavedPlaylistItem) => void;
  onUploadLocalFile: (file: File) => void;
}

function resizeImageToDataUrl(file: File, maxDim = 400): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (!result) return resolve('');
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(result);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => resolve(result);
      img.src = result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AddSourceModal({
  isOpen,
  initialMethod = null,
  onClose,
  onSavePlaylist,
  onUploadLocalFile,
}: AddSourceModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<'youtube' | 'custom' | null>(initialMethod);
  const [playlistTitle, setPlaylistTitle] = useState('');
  const [playlistDescription, setPlaylistDescription] = useState('');
  const [coverPhoto, setCoverPhoto] = useState<string>('');
  const [coverUrlInput, setCoverUrlInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const coverFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedMethod(initialMethod);
    }
  }, [isOpen, initialMethod]);

  if (!isOpen) return null;

  const handleResetAndClose = () => {
    setSelectedMethod(null);
    setPlaylistTitle('');
    setPlaylistDescription('');
    setCoverPhoto('');
    setCoverUrlInput('');
    setUrlInput('');
    onClose();
  };

  const handleCoverFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImageToDataUrl(file, 400);
      setCoverPhoto(dataUrl);
      setCoverUrlInput('');
    } catch (err) {
      console.warn('Failed to read cover image:', err);
    }
  };

  const handleCoverUrlChange = (val: string) => {
    setCoverUrlInput(val);
    setCoverPhoto(val.trim());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedMethod === 'custom') {
      const title = playlistTitle.trim() || 'My Custom Playlist';
      const finalCover = coverPhoto.trim() || undefined;

      const newItem: SavedPlaylistItem = {
        id: `custom-pl-${Date.now()}`,
        title,
        subtitle: '0 songs • Custom Playlist',
        type: 'custom',
        targetUrl: '',
        icon: 'music',
        coverUrl: finalCover,
        tracks: [],
        description: playlistDescription.trim() || 'Custom playlist on Chillify',
        createdAt: Date.now(),
      };

      onSavePlaylist(newItem);
      handleResetAndClose();
      return;
    }

    if (!urlInput.trim()) return;

    const title = playlistTitle.trim() || 'YouTube Playlist';

    const newItem: SavedPlaylistItem = {
      id: `saved-${Date.now()}`,
      title,
      subtitle: 'Playlist • YouTube',
      type: 'youtube',
      targetUrl: urlInput.trim(),
      icon: 'youtube',
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
      <div className="w-full max-w-md bg-[#161616] border border-[#2a2a2a] rounded-2xl p-6 shadow-2xl relative animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
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
          <h2 className="text-lg font-bold text-white tracking-tight">
            {selectedMethod === 'custom' ? 'Create Custom Playlist' : 'Add to Library'}
          </h2>
          <p className="text-xs text-[#888888] mt-1">
            {selectedMethod === 'custom'
              ? 'Give your playlist a name, custom cover picture, and vibe.'
              : 'Select how you want to add music into your Chillify library.'}
          </p>
        </div>

        {/* Method Picker Options (Spotify removed) */}
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
                  Name your playlist, upload a cover photo, add songs later
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

            {/* Playlist Title */}
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

            {/* Custom Cover Photo Option */}
            <div>
              <label className="block text-xs font-semibold text-[#888888] mb-1.5">
                Cover Photo (Optional)
              </label>

              <div className="flex items-center gap-3.5 p-3 rounded-xl bg-[#202020] border border-[#2d2d2d]">
                {/* Image Preview / Placeholder */}
                <div className="w-16 h-16 rounded-xl bg-[#181818] border border-[#333] flex items-center justify-center overflow-hidden shrink-0 relative group">
                  {coverPhoto ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={coverPhoto}
                        alt="Playlist Cover Preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setCoverPhoto('');
                          setCoverUrlInput('');
                        }}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-rose-300 text-xs font-bold transition-opacity cursor-pointer"
                        title="Remove cover photo"
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-[#666]">
                      <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                        <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Upload or Link Input */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <input
                    ref={coverFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCoverFileUpload}
                  />

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => coverFileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg bg-[#2a2a2a] hover:bg-[#333333] border border-[#3a3a3a] text-white text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <span>Choose File</span>
                    </button>
                    {coverPhoto && (
                      <button
                        type="button"
                        onClick={() => {
                          setCoverPhoto('');
                          setCoverUrlInput('');
                        }}
                        className="text-[11px] text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <input
                    type="text"
                    value={coverUrlInput}
                    onChange={(e) => handleCoverUrlChange(e.target.value)}
                    placeholder="Or paste image link (https://...)"
                    className="w-full bg-[#181818] border border-[#333] focus:border-[#555] rounded-lg px-2.5 py-1 text-[11px] text-white placeholder-[#666] outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Description */}
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
          /* Form for YouTube */
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
                placeholder="e.g. My Chill YouTube Mix"
                className="w-full bg-[#202020] border border-[#333] focus:border-[#666] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#777] outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#888888] mb-1.5">
                YouTube URL (Video or Playlist)
              </label>
              <input
                type="text"
                required
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://youtube.com/playlist?list=... or video link"
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
