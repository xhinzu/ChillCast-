'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { usePlayback } from '@/context/PlaybackContext';
import { CoffeeIcon } from '@/components/common/MinimalIcons';
import UserMenu from '@/components/auth/UserMenu';
import SettingsModal from '@/components/settings/SettingsModal';
import LogoInspector from '@/components/common/LogoInspector';

interface SpotifyTopNavProps {
  activeView: string;
  setActiveView: (view: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchViewMode?: 'list' | 'grid';
  setSearchViewMode?: (mode: 'list' | 'grid') => void;
}

export default function SpotifyTopNav({
  activeView,
  setActiveView,
  searchQuery,
  setSearchQuery,
  searchViewMode = 'list',
  setSearchViewMode,
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
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isDesktop] = useState(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(
      (window as unknown as { chillcastDesktop?: unknown }).chillcastDesktop ||
        (window as unknown as { myujikuDesktop?: unknown }).myujikuDesktop
    );
  });

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
    <header className="h-14 w-full bg-black flex items-center justify-between px-2.5 sm:px-6 shrink-0 z-40 select-none border-b border-[#1c1c1c] titlebar-drag">
      {/* Left: Brand & Navigation arrows */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0 titlebar-no-drag">
        <LogoInspector
          onHomeClick={() => {
            setActiveView('home');
            setSearchQuery('');
          }}
          onOpenInspectModal={() => {
            window.dispatchEvent(new CustomEvent('myujiku_open_inspect_modal'));
          }}
        />

        {/* Navigation arrows (Desktop only) */}
        <div className="hidden sm:flex items-center gap-2 ml-2">
          <button
            type="button"
            onClick={() => {
              setActiveView('home');
              setSearchQuery('');
            }}
            className="w-8 h-8 rounded-full bg-[#161616] hover:bg-[#262626] border border-[#2a2a2a] text-white flex items-center justify-center text-sm transition-colors cursor-pointer"
            title="Go to Home"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveView(activeView === 'home' ? 'ambience' : 'home');
              setSearchQuery('');
            }}
            className="w-8 h-8 rounded-full bg-[#161616] hover:bg-[#262626] border border-[#2a2a2a] text-white flex items-center justify-center text-sm transition-colors cursor-pointer"
            title="Toggle View"
          >
            ›
          </button>
        </div>
      </div>

      {/* Center: Functional YouTube Music Search Bar */}
      <div className="flex-1 max-w-lg mx-2 sm:mx-4 titlebar-no-drag">
        <div className="relative flex items-center">
          <span className="absolute left-3 sm:left-3.5 text-[#888888] text-sm pointer-events-none">
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
            className="w-full h-9 sm:h-10 rounded-full bg-[#1c1c1c] hover:bg-[#242424] focus:bg-[#242424] text-white placeholder-[#777777] text-xs pl-8 sm:pl-10 pr-16 sm:pr-20 outline-none border border-[#2c2c2c] focus:border-[#666666] transition-all"
          />

          <div className="absolute right-2 sm:right-2.5 flex items-center gap-0.5 sm:gap-1">
            {/* Small view mode toggle button near cross */}
            {setSearchViewMode && (
              <button
                type="button"
                onClick={() => {
                  const nextMode = searchViewMode === 'list' ? 'grid' : 'list';
                  setSearchViewMode(nextMode);
                  if (activeView !== 'search' && searchQuery.trim()) {
                    setActiveView('search');
                  }
                }}
                className="p-1 sm:p-1.5 rounded-full text-[#888888] hover:text-white hover:bg-[#282828] transition-colors cursor-pointer flex items-center justify-center"
                title={searchViewMode === 'list' ? 'Switch to Grid view' : 'Switch to List view'}
                aria-label={searchViewMode === 'list' ? 'Switch to Grid view' : 'Switch to List view'}
              >
                {searchViewMode === 'list' ? (
                  /* Grid icon */
                  <svg
                    className="w-3.5 h-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                  </svg>
                ) : (
                  /* List icon */
                  <svg
                    className="w-3.5 h-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="8" y1="6" x2="21" y2="6" />
                    <line x1="8" y1="12" x2="21" y2="12" />
                    <line x1="8" y1="18" x2="21" y2="18" />
                    <line x1="3" y1="6" x2="3.01" y2="6" />
                    <line x1="3" y1="12" x2="3.01" y2="12" />
                    <line x1="3" y1="18" x2="3.01" y2="18" />
                  </svg>
                )}
              </button>
            )}

            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="text-[#888888] hover:text-white text-xs cursor-pointer p-1 rounded-full hover:bg-[#282828] transition-colors"
                title="Clear search"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Right: Buy Me a Coffee & Status indicator */}
      <div className={`flex items-center gap-2 sm:gap-3 shrink-0 titlebar-no-drag transition-all ${isDesktop ? 'sm:mr-36 mr-28' : ''}`}>
        {/* Playback status pulse */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[#161616] border border-[#282828] text-xs text-[#888888]">
          <span
            className={`w-2 h-2 rounded-full ${
              playbackState === 'playing'
                ? 'bg-white animate-pulse'
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
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#262626] hover:bg-[#333333] border border-[#3e3e3e] text-white font-medium text-xs shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer select-none"
        >
          <CoffeeIcon className="w-3.5 h-3.5 text-amber-300" />
          <span className="tracking-tight text-xs font-semibold">
            <span className="hidden sm:inline">Buy me a </span>coffee
          </span>
        </button>

        {/* Settings Button */}
        <button
          type="button"
          onClick={() => setIsSettingsModalOpen(true)}
          title="Settings (Discord Rich Presence, Preferences)"
          className="w-8 h-8 rounded-full bg-[#202020] hover:bg-[#2c2c2c] border border-[#333333] flex items-center justify-center text-zinc-300 hover:text-white transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
        >
          <svg className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        {/* User Account / Sign In Menu */}
        <UserMenu onOpenSettings={() => setIsSettingsModalOpen(true)} />
      </div>

      {/* ─────────────────────────────── SETTINGS MODAL ─────────────────────────────── */}
      {isSettingsModalOpen && (
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
        />
      )}

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
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#242424] text-zinc-200 border border-[#383838] text-xs font-semibold mb-1">
                <CoffeeIcon className="w-3.5 h-3.5 text-amber-300" /> Buy Me a Coffee
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Support ChillCast
              </h3>
              <p className="text-xs text-[#999999]">
                Scan with <strong className="text-white font-semibold">FamPay</strong> or any UPI App to buy me a coffee!
              </p>
            </div>

            {/* FamPay QR Code Image Container */}
            <div className="relative mx-auto w-64 h-64 sm:w-72 sm:h-72 rounded-2xl overflow-hidden bg-black border border-[#333333] shadow-xl flex items-center justify-center p-2">
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
                <span className="px-2 py-0.5 rounded-md bg-[#222222] text-[10px] font-bold text-zinc-300 border border-[#333333]">FamPay</span>
                <span className="px-2 py-0.5 rounded-md bg-[#222222] text-[10px] font-bold text-zinc-300 border border-[#333333]">GPay</span>
                <span className="px-2 py-0.5 rounded-md bg-[#222222] text-[10px] font-bold text-zinc-300 border border-[#333333]">PhonePe</span>
                <span className="px-2 py-0.5 rounded-md bg-[#222222] text-[10px] font-bold text-zinc-300 border border-[#333333]">Paytm</span>
              </div>
              <p className="text-[11px] text-[#777777]">
                Every coffee helps keep ChillCast ad-free & hosted. Thank you!
              </p>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
