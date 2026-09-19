'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { usePlayback } from '@/context/PlaybackContext';

interface SpotifyTopNavProps {
  activeView: string;
  setActiveView: (view: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export default function SpotifyTopNav({
  activeView,
  setActiveView,
  searchQuery,
  setSearchQuery,
}: SpotifyTopNavProps) {
  const { playbackState } = usePlayback();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val.trim() && activeView !== 'search') {
      setActiveView('search');
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    if (activeView === 'search') {
      setActiveView('home');
    }
  };

  const [isCoffeeModalOpen, setIsCoffeeModalOpen] = useState(false);

  // Close popup with Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCoffeeModalOpen(false);
      }
    };
    if (isCoffeeModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCoffeeModalOpen]);

  return (
    <header className="h-14 w-full bg-black flex items-center justify-between px-2.5 sm:px-6 shrink-0 z-40 select-none">
      {/* Left: Brand & Navigation arrows */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <div
          onClick={() => {
            setActiveView('home');
            setSearchQuery('');
          }}
          className="flex items-center gap-1.5 sm:gap-2 cursor-pointer group"
          title="Chillify Home"
        >
          {/* Spotify Wave Icon in Electric Blue */}
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#1d90f5] flex items-center justify-center text-black shadow-md transition-transform group-hover:scale-105 shrink-0">
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5 fill-current"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424a.623.623 0 0 1-.858.207c-2.35-1.436-5.308-1.76-8.794-.963a.625.625 0 0 1-.28-1.218c3.815-.873 7.078-.504 9.725 1.116.295.18.388.567.207.858zm1.224-2.723a.782.782 0 0 1-1.077.257c-2.69-1.654-6.79-2.133-9.972-1.167a.782.782 0 0 1-.462-1.493c3.637-1.104 8.163-.574 11.254 1.326.37.228.487.712.257 1.077zm.105-2.836C14.692 8.95 9.38 8.773 6.302 9.708a.938.938 0 1 1-.548-1.794c3.518-1.069 9.387-.864 13.13 1.36a.938.938 0 0 1-1.029 1.59z" />
            </svg>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-extrabold text-base sm:text-lg tracking-tight text-white">
              Chillify
            </span>
            <span className="text-sm sm:text-base">🥰</span>
          </div>
        </div>

        {/* Navigation arrows (Desktop only) */}
        <div className="hidden sm:flex items-center gap-2 ml-2">
          <button
            type="button"
            onClick={() => setActiveView('home')}
            className="w-8 h-8 rounded-full bg-[#121212] hover:bg-[#242424] text-white flex items-center justify-center text-sm transition-colors cursor-pointer"
            title="Go to Home"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => setActiveView(activeView === 'home' ? 'ambience' : 'home')}
            className="w-8 h-8 rounded-full bg-[#121212] hover:bg-[#242424] text-white flex items-center justify-center text-sm transition-colors cursor-pointer"
            title="Toggle View"
          >
            ›
          </button>
        </div>
      </div>

      {/* Center: Functional YouTube Music Search Bar */}
      <div className="flex-1 max-w-lg mx-2 sm:mx-4">
        <div className="relative flex items-center">
          <span className="absolute left-3 sm:left-3.5 text-[#b3b3b3] text-sm pointer-events-none">
            <svg
              className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M10.533 1.278a9.255 9.255 0 1 0 5.765 16.486l4.989 4.989a.75.75 0 0 0 1.06-1.06l-4.989-4.99a9.255 9.255 0 0 0-6.825-15.425zm-7.755 9.255a7.755 7.755 0 1 1 15.51 0 7.755 7.755 0 0 1-15.51 0z" />
            </svg>
          </span>

          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => {
              if (searchQuery.trim() && activeView !== 'search') {
                setActiveView('search');
              }
            }}
            placeholder="Search songs, lo-fi beats..."
            className="w-full h-9 sm:h-10 rounded-full bg-[#242424] hover:bg-[#2a2a2a] focus:bg-[#2a2a2a] text-white placeholder-[#b3b3b3] text-xs pl-8 sm:pl-10 pr-8 sm:pr-9 outline-none border border-transparent focus:border-[#1d90f5] transition-all"
          />

          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2.5 sm:right-3 text-[#b3b3b3] hover:text-white text-xs cursor-pointer p-1"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Right: Buy Me a Coffee & Status indicator */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Playback status pulse */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[#181818] border border-[#282828] text-xs text-[#b3b3b3]">
          <span
            className={`w-2 h-2 rounded-full ${
              playbackState === 'playing'
                ? 'bg-[#1d90f5] animate-pulse'
                : 'bg-zinc-600'
            }`}
          />
          <span className="capitalize text-[11px] font-medium">{playbackState}</span>
        </div>

        {/* Buy Me a Coffee Button — Opens FamPay QR Popup */}
        <button
          type="button"
          onClick={() => setIsCoffeeModalOpen(true)}
          title="Buy me a coffee (FamPay / UPI QR)"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFDD00] hover:bg-[#ffea3b] text-black font-extrabold text-xs shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer select-none"
        >
          <span className="text-sm">☕</span>
          <span className="tracking-tight text-xs font-black">
            <span className="hidden sm:inline">Buy me a </span>coffee
          </span>
        </button>
      </div>

      {/* ─────────────────────────────── FAMPAY QR CODE POPUP MODAL ─────────────────────────────── */}
      {isCoffeeModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setIsCoffeeModalOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-[#161616] rounded-2xl border border-[#2e2e2e] shadow-2xl p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-150 relative text-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsCoffeeModalOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#242424] hover:bg-[#333333] text-[#b3b3b3] hover:text-white flex items-center justify-center transition-colors text-sm cursor-pointer"
              title="Close"
            >
              ✕
            </button>

            {/* Header */}
            <div className="space-y-1 pt-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFDD00]/15 text-[#FFDD00] border border-[#FFDD00]/30 text-xs font-bold mb-1">
                <span>☕</span> Buy Me a Coffee
              </div>
              <h3 className="text-lg font-extrabold text-white tracking-tight">
                Support Chillify 🥰
              </h3>
              <p className="text-xs text-[#b3b3b3]">
                Scan with <strong className="text-white font-semibold">FamPay</strong> or any UPI App to buy me a coffee!
              </p>
            </div>

            {/* FamPay QR Code Image Container */}
            <div className="relative mx-auto w-64 h-64 sm:w-72 sm:h-72 rounded-2xl overflow-hidden bg-black border-2 border-[#FFDD00]/40 shadow-xl shadow-[#FFDD00]/5 flex items-center justify-center p-2">
              <Image
                src="/fampay-qr.png"
                alt="FamPay UPI QR Code"
                fill
                sizes="(max-width: 640px) 256px, 288px"
                className="object-contain rounded-xl p-1"
                priority
              />
            </div>

            {/* Supported UPI Badges & Thank You */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                <span className="px-2 py-0.5 rounded-md bg-[#222222] text-[10px] font-bold text-amber-300 border border-[#333333]">FamPay</span>
                <span className="px-2 py-0.5 rounded-md bg-[#222222] text-[10px] font-bold text-blue-300 border border-[#333333]">GPay</span>
                <span className="px-2 py-0.5 rounded-md bg-[#222222] text-[10px] font-bold text-purple-300 border border-[#333333]">PhonePe</span>
                <span className="px-2 py-0.5 rounded-md bg-[#222222] text-[10px] font-bold text-sky-300 border border-[#333333]">Paytm</span>
              </div>
              <p className="text-[11px] text-[#888888]">
                Every coffee helps keep Chillify ad-free & hosted. Thank you! 💖
              </p>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
