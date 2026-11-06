'use client';

import React, { useEffect, useState } from 'react';
import {
  DISCORD_SETTINGS_CHANGED_EVENT,
  getDiscordPresenceEnabled,
  getDiscordPresenceShareRoom,
  setDiscordPresenceEnabled,
  setDiscordPresenceShareRoom,
} from '@/lib/discord/presence-settings';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [discordEnabled, setDiscordEnabled] = useState<boolean>(() => getDiscordPresenceEnabled());
  const [shareRoom, setShareRoom] = useState<boolean>(() => getDiscordPresenceShareRoom());
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  useEffect(() => {
    const handleSync = () => {
      setDiscordEnabled(getDiscordPresenceEnabled());
      setShareRoom(getDiscordPresenceShareRoom());
    };
    window.addEventListener(DISCORD_SETTINGS_CHANGED_EVENT, handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener(DISCORD_SETTINGS_CHANGED_EVENT, handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleToggleDiscord = (checked: boolean) => {
    setDiscordEnabled(checked);
    setDiscordPresenceEnabled(checked);
  };

  const handleToggleShareRoom = (checked: boolean) => {
    setShareRoom(checked);
    setDiscordPresenceShareRoom(checked);
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#121214] border border-[#26262a] rounded-2xl shadow-2xl p-6 sm:p-7 relative text-white space-y-6 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#222228] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#1e1e24] border border-[#2e2e36] flex items-center justify-center text-zinc-300">
              <svg className="w-4 h-4 fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Settings</h2>
              <p className="text-[11px] text-zinc-400">Manage integrations & preferences</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#1c1c20] hover:bg-[#282830] text-zinc-400 hover:text-white flex items-center justify-center transition-colors text-sm cursor-pointer"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Discord Rich Presence Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              {/* Discord Icon */}
              <div className="w-8 h-8 rounded-lg bg-[#5865F2]/15 border border-[#5865F2]/30 flex items-center justify-center text-[#5865F2] shrink-0">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Discord Rich Presence</h3>
                <p className="text-[11px] text-zinc-400">Display now-playing status on Discord</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsHelpOpen((prev) => !prev)}
              className="text-xs text-zinc-400 hover:text-white underline underline-offset-4 cursor-pointer"
            >
              {isHelpOpen ? 'Hide setup' : 'Setup guide'}
            </button>
          </div>

          {/* Main Toggle Box */}
          <div className="bg-[#17171a] border border-[#282830] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <label
                htmlFor="discord-presence-toggle"
                className="text-xs sm:text-sm font-medium text-white cursor-pointer select-none"
              >
                Show what I&apos;m listening to on Discord
              </label>

              {/* Styled Switch */}
              <button
                type="button"
                id="discord-presence-toggle"
                role="switch"
                aria-checked={discordEnabled}
                onClick={() => handleToggleDiscord(!discordEnabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  discordEnabled ? 'bg-white' : 'bg-[#2e2e36]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full shadow-lg ring-0 transition duration-200 ease-in-out ${
                    discordEnabled ? 'translate-x-5 bg-black' : 'translate-x-0 bg-zinc-400'
                  }`}
                />
              </button>
            </div>

            {/* Privacy Note */}
            <p className="text-[11px] text-zinc-400 leading-relaxed border-t border-[#22222a] pt-2.5">
              Only works with the PreMiD app and extension. Shows song title, artist, and the app name.
            </p>

            {/* Sub-toggle: Share Room Link */}
            {discordEnabled && (
              <div className="pt-2 border-t border-[#22222a] flex items-center justify-between gap-4 animate-in fade-in duration-150">
                <div>
                  <label
                    htmlFor="discord-presence-share-room"
                    className="text-xs font-medium text-zinc-200 cursor-pointer select-none block"
                  >
                    Share room link in presence
                  </label>
                  <p className="text-[10px] text-zinc-500">
                    Adds a &quot;Join my room&quot; button on Discord when you are in a Together room.
                  </p>
                </div>

                <button
                  type="button"
                  id="discord-presence-share-room"
                  role="switch"
                  aria-checked={shareRoom}
                  onClick={() => handleToggleShareRoom(!shareRoom)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    shareRoom ? 'bg-white' : 'bg-[#2e2e36]'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow-lg ring-0 transition duration-200 ease-in-out ${
                      shareRoom ? 'translate-x-4 bg-black' : 'translate-x-0 bg-zinc-400'
                    }`}
                  />
                </button>
              </div>
            )}
          </div>

          {/* Help & Setup Popover / Accordion */}
          {isHelpOpen && (
            <div className="bg-[#141418] border border-[#24242e] rounded-xl p-4 space-y-3 animate-in fade-in duration-200 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white text-xs">How to connect with PreMiD</span>
                <a
                  href="https://premid.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-2 flex items-center gap-1"
                >
                  <span>premid.app</span>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>

              <div className="p-2.5 rounded-lg bg-[#1a1a22] border border-[#282836] text-[11px] text-zinc-300 leading-normal">
                <strong>Important Notice:</strong> Discord Rich Presence cannot be set by a browser website directly. Your Discord status will only appear if you have PreMiD installed. The app&apos;s name (&quot;MyuJiku&quot;) and logo in Discord come from the PreMiD presence listing.
              </div>

              <ol className="space-y-2 text-zinc-300 list-decimal list-inside text-[11px] leading-relaxed">
                <li>
                  Download and install the <strong className="text-white">PreMiD Desktop Application</strong> from{' '}
                  <a
                    href="https://premid.app/downloads"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white underline"
                  >
                    premid.app/downloads
                  </a>.
                </li>
                <li>
                  Install the <strong className="text-white">PreMiD Browser Extension</strong> on your web browser (Chrome, Brave, Edge, or Firefox).
                </li>
                <li>
                  Ensure the PreMiD desktop app is running in your system tray and connected.
                </li>
                <li>
                  Turn <strong className="text-white">ON</strong> the toggle above.
                </li>
                <li>
                  Start playing music on MyuJiku — your Discord profile will show your live track with album art and elapsed time!
                </li>
              </ol>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
