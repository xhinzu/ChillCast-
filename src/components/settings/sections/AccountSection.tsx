'use client';

import React, { useState, useEffect } from 'react';
import { useSettings } from '@/lib/settings/useSettings';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { playlistSyncEngine, type SyncStatus } from '@/lib/sync/playlist-sync';
import type { User } from '@supabase/supabase-js';
import { SettingsCheckIcon } from '../SettingsIcons';

export default function AccountSection() {
  const { settings, updateSettings, resetSection } = useSettings();
  const [user, setUser] = useState<User | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const [lastSyncedTime, setLastSyncedTime] = useState<string>('Just now');
  const [isSyncingNow, setIsSyncingNow] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user || null);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    const unsubscribe = playlistSyncEngine.subscribeStatus((st) => {
      setSyncStatus(st);
      if (st === 'synced') {
        const meta = playlistSyncEngine.getMetadata();
        if (meta.lastSyncedAt > 0) {
          setLastSyncedTime(new Date(meta.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
      unsubscribe();
    };
  }, []);

  const handleSyncNow = async () => {
    if (!user) return;
    setIsSyncingNow(true);
    try {
      await playlistSyncEngine.pullChanges();
      await playlistSyncEngine.pushChanges();
      setLastSyncedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch {
      // handled inside engine
    } finally {
      setIsSyncingNow(false);
    }
  };

  const handleSignOut = async () => {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      await supabase.auth.signOut();
      setUser(null);
      setActionNotice('Signed out. Your playlists are preserved safely on this device.');
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  const handleDeleteCloudData = async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !user) return;

    try {
      await supabase.from('playlist_items').delete().eq('user_id', user.id);
      await supabase.from('playlists').delete().eq('user_id', user.id);
      await supabase.from('user_settings').delete().eq('user_id', user.id);
      setDeleteConfirm(false);
      setActionNotice('All cloud data successfully deleted. Local copies remain safe.');
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err) {
      console.error('Delete error:', err);
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
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
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
                  style={{ borderColor: 'var(--accent)' }}
                  className="w-10 h-10 rounded-full border-2"
                />
              ) : (
                <div
                  style={{
                    backgroundColor: 'var(--accent)',
                    color: 'var(--accent-contrast)',
                  }}
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-base"
                >
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
                syncStatus === 'synced'
                  ? 'bg-emerald-400'
                  : syncStatus === 'syncing'
                  ? 'bg-amber-400 animate-ping'
                  : syncStatus === 'error'
                  ? 'bg-red-400'
                  : 'bg-zinc-500'
              }`}
            />
            <span className="text-xs font-medium text-white capitalize">
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
            style={{
              backgroundColor: settings.account.syncPlaylistsAndLiked ? 'var(--accent)' : '#2e2e36',
            }}
            className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
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
            style={{
              backgroundColor: settings.account.syncSettings ? 'var(--accent)' : '#2e2e36',
            }}
            className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow-lg ring-0 transition duration-200 ease-in-out ${
                settings.account.syncSettings ? 'translate-x-4 bg-white' : 'translate-x-0 bg-zinc-400'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Action feedback notice */}
      {actionNotice && (
        <div
          style={{
            backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)',
            borderColor: 'color-mix(in srgb, var(--accent) 30%, transparent)',
            color: 'var(--accent)',
          }}
          className="p-3 rounded-xl border text-xs flex items-center gap-2"
        >
          <SettingsCheckIcon className="w-3.5 h-3.5 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Data Management & Export */}
      <div className="bg-[#17171a] border border-[#282830] rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-xs font-semibold text-white">Your Data &amp; Privacy</h4>
          <p className="text-[11px] text-zinc-400">Download a full JSON copy of your local playlists or delete your cloud backups.</p>
        </div>
        <div className="flex items-center gap-2">
          {user && (
            deleteConfirm ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleDeleteCloudData}
                  className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-semibold text-white transition-colors cursor-pointer"
                >
                  Confirm Delete Cloud Data
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(false)}
                  className="px-2 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setDeleteConfirm(true)}
                className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-xs font-semibold text-red-400 transition-colors cursor-pointer"
              >
                Delete Cloud Data
              </button>
            )
          )}
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
