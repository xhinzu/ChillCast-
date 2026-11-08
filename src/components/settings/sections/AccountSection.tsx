'use client';

import React, { useState, useEffect } from 'react';
import { useSettings } from '@/lib/settings/useSettings';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

export default function AccountSection() {
  const { settings, updateSettings, resetSection } = useSettings();
  const [user, setUser] = useState<User | null>(null);
  const [syncStatus, setSyncStatus] = useState<'Synced' | 'Syncing' | 'Offline' | 'Error'>('Synced');
  const [lastSyncedTime, setLastSyncedTime] = useState<string>('Just now');
  const [isSyncingNow, setIsSyncingNow] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user || null);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleSyncNow = async () => {
    setIsSyncingNow(true);
    setSyncStatus('Syncing');
    try {
      // Trigger sync event
      window.dispatchEvent(new CustomEvent('myujiku_trigger_sync'));
      setTimeout(() => {
        setIsSyncingNow(false);
        setSyncStatus('Synced');
        setLastSyncedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }, 1200);
    } catch {
      setIsSyncingNow(false);
      setSyncStatus('Error');
    }
  };

  const handleSignOut = async () => {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      await supabase.auth.signOut();
      setUser(null);
    }
  };

  const handleExportData = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      playlists: JSON.parse(localStorage.getItem('chillify_saved_playlists') || '[]'),
      settings: settings,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `myujiku-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const discordAvatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.custom_claims?.global_name || user?.email || 'Guest User';

  return (
    <div className="space-y-6 text-xs text-zinc-300">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
            Account &amp; Cloud Sync
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Local-first cloud backup for your playlists, liked tracks, and preferences
          </p>
        </div>
        <button
          type="button"
          onClick={() => resetSection('account')}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
          title="Reset account settings to defaults"
        >
          Reset Sync Options
        </button>
      </div>

      {/* Account Info Card */}
      <div className="bg-[#17171a] border border-[#282830] rounded-xl p-4 space-y-4">
        {user ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {discordAvatar ? (
                <img
                  src={discordAvatar}
                  alt={displayName}
                  className="w-10 h-10 rounded-full ring-2 ring-indigo-500/40"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-base">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h4 className="text-sm font-bold text-white">{displayName}</h4>
                <p className="text-[11px] text-zinc-400">Connected via Supabase Auth</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="px-3.5 py-1.5 rounded-lg bg-[#24242c] hover:bg-[#32323e] border border-[#383848] text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-white">Local-First Guest Mode</h4>
                <p className="text-[11px] text-zinc-400">
                  All your playlists and songs are saved safely on your device. Sign in to sync across devices.
                </p>
              </div>
              <a
                href="/auth/callback"
                className="px-4 py-1.5 rounded-lg bg-[#5865F2] hover:bg-[#4752c4] text-xs font-semibold text-white transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                Sign in with Discord
              </a>
            </div>
          </div>
        )}

        {/* Sync Status Bar */}
        <div className="pt-3 border-t border-[#22222a] flex flex-wrap items-center justify-between gap-3 bg-[#121216] p-3 rounded-lg border border-[#25252e]">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                syncStatus === 'Synced'
                  ? 'bg-emerald-400'
                  : syncStatus === 'Syncing'
                  ? 'bg-amber-400 animate-ping'
                  : 'bg-zinc-500'
              }`}
            />
            <span className="text-xs font-medium text-white">
              Status: <span className="text-zinc-300">{syncStatus}</span>
            </span>
            <span className="text-[10px] text-zinc-500">• Last synced: {lastSyncedTime}</span>
          </div>

          <button
            type="button"
            onClick={handleSyncNow}
            disabled={isSyncingNow || !user}
            className="px-3 py-1 rounded bg-[#202028] hover:bg-[#2c2c36] border border-[#30303e] text-[11px] font-semibold text-white transition-colors cursor-pointer disabled:opacity-40"
          >
            {isSyncingNow ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      </div>

      {/* Sync Preferences Toggles */}
      <div className="bg-[#17171a] border border-[#282830] rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <label className="text-xs font-semibold text-white block">Sync Playlists &amp; Liked Songs</label>
            <p className="text-[11px] text-zinc-400">
              Synchronizes your custom playlists and library tracks with cloud storage automatically.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.account.syncPlaylistsAndLiked}
            onClick={() =>
              updateSettings('account', {
                syncPlaylistsAndLiked: !settings.account.syncPlaylistsAndLiked,
              })
            }
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              settings.account.syncPlaylistsAndLiked ? 'bg-indigo-500' : 'bg-[#2e2e36]'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow-lg ring-0 transition duration-200 ease-in-out ${
                settings.account.syncPlaylistsAndLiked ? 'translate-x-4 bg-white' : 'translate-x-0 bg-zinc-400'
              }`}
            />
          </button>
        </div>

        <div className="pt-3 border-t border-[#22222a] flex items-center justify-between gap-4">
          <div>
            <label className="text-xs font-semibold text-white block">Sync Appearance &amp; Audio Preferences</label>
            <p className="text-[11px] text-zinc-400">
              Sync themes, custom colors, and DSP audio preferences across your devices (never secrets).
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.account.syncSettings}
            onClick={() =>
              updateSettings('account', {
                syncSettings: !settings.account.syncSettings,
              })
            }
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              settings.account.syncSettings ? 'bg-indigo-500' : 'bg-[#2e2e36]'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow-lg ring-0 transition duration-200 ease-in-out ${
                settings.account.syncSettings ? 'translate-x-4 bg-white' : 'translate-x-0 bg-zinc-400'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Data Management & Export */}
      <div className="bg-[#17171a] border border-[#282830] rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-xs font-semibold text-white">Your Data &amp; Privacy</h4>
          <p className="text-[11px] text-zinc-400">Download a full JSON copy of your local playlists and settings anytime.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportData}
            className="px-3.5 py-1.5 rounded-lg bg-[#24242c] hover:bg-[#32323e] border border-[#383848] text-xs font-semibold text-white transition-colors cursor-pointer"
          >
            Export My Data (.json)
          </button>
        </div>
      </div>
    </div>
  );
}
