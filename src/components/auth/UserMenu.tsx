'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useUser } from '@/hooks/useUser';
import AuthModal from './AuthModal';
import ProfileModal from './ProfileModal';

export default function UserMenu() {
  const { user, profile, signOut } = useUser();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [authError, setAuthError] = useState<string | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  // Capture any auth error parameters from OAuth redirects
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const err =
      url.searchParams.get('auth_error') ||
      url.searchParams.get('error_description') ||
      url.searchParams.get('error');

    if (err) {
      setAuthError(decodeURIComponent(err.replace(/\+/g, ' ')));
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Compute initials fallback
  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'Listener';
  const initials = displayName.trim().slice(0, 2).toUpperCase();

  // If not signed in: Render "Sign in" button
  if (!user) {
    return (
      <>
        <button
          type="button"
          onClick={() => setIsAuthModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white font-medium text-xs transition-all hover:scale-105 active:scale-95 cursor-pointer select-none"
          title="Sign in or create account"
        >
          <svg className="w-3.5 h-3.5 fill-current text-zinc-300" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
          </svg>
          <span className="tracking-tight text-xs font-semibold">
            <span className="hidden sm:inline">Sign in / </span>Join
          </span>
        </button>

        {isAuthModalOpen && (
          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
          />
        )}

        {authError && (
          <div className="fixed top-16 right-4 z-[200] max-w-sm bg-[#1e1315] border border-rose-500/50 text-rose-200 text-xs p-3.5 rounded-xl shadow-2xl flex items-start gap-2.5 animate-in slide-in-from-top-2 duration-200">
            <span className="text-sm">⚠️</span>
            <div className="flex-1">
              <p className="font-semibold text-rose-100">Sign-in Notice</p>
              <p className="text-[11px] text-rose-300/90 mt-0.5">{authError}</p>
            </div>
            <button
              type="button"
              onClick={() => setAuthError(null)}
              className="text-rose-400 hover:text-white text-xs cursor-pointer p-0.5"
            >
              ✕
            </button>
          </div>
        )}
      </>
    );
  }

  // If signed in: Render avatar + display name dropdown menu
  return (
    <div className="relative" ref={menuRef}>
      {authError && (
        <div className="fixed top-16 right-4 z-[200] max-w-sm bg-[#1e1315] border border-rose-500/50 text-rose-200 text-xs p-3.5 rounded-xl shadow-2xl flex items-start gap-2.5 animate-in slide-in-from-top-2 duration-200">
          <span className="text-sm">⚠️</span>
          <div className="flex-1">
            <p className="font-semibold text-rose-100">Sign-in Notice</p>
            <p className="text-[11px] text-rose-300/90 mt-0.5">{authError}</p>
          </div>
          <button
            type="button"
            onClick={() => setAuthError(null)}
            className="text-rose-400 hover:text-white text-xs cursor-pointer p-0.5"
          >
            ✕
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={() => setIsDropdownOpen((prev) => !prev)}
        className="flex items-center gap-2 p-1 pr-2.5 rounded-full bg-[#161616] hover:bg-[#222222] border border-[#2c2c2c] transition-all cursor-pointer select-none"
        title="Open user profile menu"
        aria-expanded={isDropdownOpen}
      >
        {/* Avatar */}
        <div className="relative w-7 h-7 rounded-full overflow-hidden bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center text-white text-[11px] font-bold shrink-0">
          {profile?.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={displayName}
              fill
              sizes="28px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <span>{initials}</span>
          )}
        </div>

        {/* Display name */}
        <span className="text-xs font-semibold text-zinc-200 max-w-[80px] sm:max-w-[120px] truncate">
          {displayName}
        </span>

        {/* Chevron icon */}
        <svg
          className={`w-3 h-3 text-zinc-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isDropdownOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-[#141416] border border-[#2a2a30] rounded-2xl shadow-2xl py-1.5 z-50 text-white animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3.5 py-2.5 border-b border-[#222228]">
            <p className="text-xs font-bold text-white truncate">{displayName}</p>
            <p className="text-[10px] text-zinc-400 truncate">{user.email}</p>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsDropdownOpen(false);
              setIsProfileModalOpen(true);
            }}
            className="w-full text-left px-3.5 py-2 text-xs text-zinc-200 hover:text-white hover:bg-[#202026] flex items-center gap-2 transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 fill-current text-zinc-400" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
            <span>Profile</span>
          </button>

          <button
            type="button"
            onClick={async () => {
              setIsDropdownOpen(false);
              await signOut();
            }}
            className="w-full text-left px-3.5 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-[#202026] flex items-center gap-2 transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
            </svg>
            <span>Sign Out</span>
          </button>
        </div>
      )}

      {/* Modals */}
      {isProfileModalOpen && (
        <ProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
        />
      )}
    </div>
  );
}
