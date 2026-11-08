'use client';

import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface SyncedTrackSnapshot {
  source: string;
  sourceId: string;
  title: string;
  artist: string;
  durationSec: number;
  thumbnail?: string;
}

export interface SyncedPlaylistItem {
  id: string; // uuid
  playlist_id: string;
  user_id?: string;
  position: number;
  track: SyncedTrackSnapshot;
  added_at: string;
  deleted_at?: string | null;
}

export interface SyncedPlaylist {
  id: string; // uuid
  user_id?: string;
  name: string;
  description?: string;
  cover_url?: string;
  kind: 'normal' | 'liked';
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  items?: SyncedPlaylistItem[];
  // Backwards compatibility with SavedPlaylistItem
  title?: string;
  subtitle?: string;
  type?: string;
  targetUrl?: string;
  icon?: string;
  coverUrl?: string;
  tracks?: any[];
}

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';
export type FirstLoginMergeChoice = 'merge' | 'cloud_only' | 'keep_local';

const STORAGE_PLAYLISTS_KEY = 'chillify_saved_playlists';
const STORAGE_SYNC_META_KEY = 'myujiku_sync_metadata';
const STORAGE_OFFLINE_QUEUE_KEY = 'myujiku_sync_offline_queue';

interface SyncMetadata {
  lastSyncedAt: number;
  lastUserId: string | null;
  hasPromptedMerge: boolean;
}

/**
 * Generate a standard UUID v4
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Deterministically hash any arbitrary string to a standard UUID v4 format.
 * Guarantees that legacy non-UUID playlist IDs stay completely stable across restarts.
 */
export function stringToUUID(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  const hex2 = Math.abs((hash * 31) | 0).toString(16).padStart(8, '0');
  const hex3 = Math.abs((hash * 59) | 0).toString(16).padStart(8, '0');
  const hex4 = Math.abs((hash * 97) | 0).toString(16).padStart(8, '0');
  return `${hex}-${hex2.slice(0, 4)}-4${hex2.slice(4, 7)}-8${hex3.slice(0, 3)}-${hex4.slice(0, 12)}`.toLowerCase();
}

/**
 * Migrate legacy playlist objects to guarantee stable UUIDs and proper timestamps
 */
export function migrateLocalPlaylists(rawPlaylists: any[]): SyncedPlaylist[] {
  if (!Array.isArray(rawPlaylists)) return [];

  return rawPlaylists.map((p) => {
    const isLiked = p.id === 'liked-songs' || p.kind === 'liked' || p.title === 'Liked Songs' || p.name === 'Liked Songs';
    // If not a valid UUID format, compute deterministic stable UUID or preserve
    const isValidUUID = typeof p.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p.id);
    const stableId = isValidUUID
      ? p.id
      : (isLiked ? '00000000-0000-4000-8000-000000000001' : (p.syncId || stringToUUID(String(p.id || 'playlist'))));

    const title = p.title || p.name || (isLiked ? 'Liked Songs' : 'My Playlist');

    // Retain or reconstitute tracks array
    const tracks: any[] = (Array.isArray(p.tracks) && p.tracks.length > 0)
      ? p.tracks
      : (p.items || []).map((it: any) => ({
          id: it.track?.sourceId || it.id || '',
          title: it.track?.title || 'Unknown',
          artist: it.track?.artist || 'Unknown',
          duration: typeof it.track?.durationSec === 'number'
            ? `${Math.floor(it.track.durationSec / 60)}:${String(Math.floor(it.track.durationSec % 60)).padStart(2, '0')}`
            : '0:00',
          thumbnail: it.track?.thumbnail,
          addedAt: it.added_at ? new Date(it.added_at).getTime() : Date.now(),
        }));

    const items: SyncedPlaylistItem[] = tracks.map((t: any, index: number) => {
      const itemValidUUID = t.itemUuid && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t.itemUuid);
      return {
        id: itemValidUUID ? t.itemUuid : stringToUUID(`${stableId}-${t.id || t.sourceId || index}`),
        playlist_id: stableId,
        position: (index + 1) * 1000,
        track: {
          source: t.source || 'youtube',
          sourceId: t.id || t.sourceId || '',
          title: t.title || 'Untitled',
          artist: t.artist || 'Unknown Artist',
          durationSec: typeof t.duration === 'number' ? t.duration : 0,
          thumbnail: t.thumbnail,
        },
        added_at: t.addedAt ? new Date(t.addedAt).toISOString() : new Date().toISOString(),
        deleted_at: null,
      };
    });

    return {
      id: stableId,
      name: title,
      title: title,
      subtitle: p.subtitle || `${tracks.length} song${tracks.length === 1 ? '' : 's'} • ${isLiked ? 'Liked Songs' : 'Custom Playlist'}`,
      type: p.type || 'custom',
      icon: p.icon || (isLiked ? 'heart' : 'music'),
      targetUrl: p.targetUrl || '',
      description: p.description,
      cover_url: p.coverUrl || p.cover_url,
      coverUrl: p.coverUrl || p.cover_url,
      kind: isLiked ? 'liked' : 'normal',
      created_at: p.createdAt ? new Date(p.createdAt).toISOString() : (p.created_at || new Date().toISOString()),
      updated_at: p.updatedAt ? new Date(p.updatedAt).toISOString() : (p.updated_at || new Date().toISOString()),
      deleted_at: null,
      items,
      tracks,
    };
  });
}

/**
 * Merge two sets of playlists using Last-Write-Wins (LWW) and item tombstones
 */
export function mergePlaylists(
  localList: SyncedPlaylist[],
  cloudList: SyncedPlaylist[]
): SyncedPlaylist[] {
  const mergedMap = new Map<string, SyncedPlaylist>();

  // Index cloud playlists
  for (const cloud of cloudList) {
    mergedMap.set(cloud.id, { ...cloud, items: [...(cloud.items || [])] });
  }

  // Merge or insert local playlists
  for (const local of localList) {
    const existingCloud = mergedMap.get(local.id);
    if (!existingCloud) {
      const sortedItems = [...(local.items || [])]
        .filter((it) => !it.deleted_at)
        .sort((a, b) => a.position - b.position);
      mergedMap.set(local.id, { ...local, items: sortedItems });
      continue;
    }

    // Last-write-wins on playlist metadata
    const localTime = new Date(local.updated_at).getTime();
    const cloudTime = new Date(existingCloud.updated_at).getTime();

    const winner = localTime > cloudTime ? local : existingCloud;
    const loser = localTime > cloudTime ? existingCloud : local;

    // Merge items within this playlist
    const itemMap = new Map<string, SyncedPlaylistItem>();

    // Put loser items first
    for (const item of loser.items || []) {
      itemMap.set(item.track.sourceId || item.id, item);
    }

    // Overwrite with winner items or respect tombstones
    for (const item of winner.items || []) {
      const key = item.track.sourceId || item.id;
      const existing = itemMap.get(key);
      if (!existing) {
        itemMap.set(key, item);
      } else {
        // If one is deleted, respect deleted_at tombstone with latest timestamp
        if (item.deleted_at && !existing.deleted_at) {
          itemMap.set(key, item);
        } else if (!item.deleted_at && existing.deleted_at) {
          const itemAdded = new Date(item.added_at).getTime();
          const existDeleted = new Date(existing.deleted_at).getTime();
          if (itemAdded > existDeleted) {
            itemMap.set(key, item); // Re-added after deletion
          }
        } else {
          itemMap.set(key, item);
        }
      }
    }

    // Filter out permanently deleted items and sort by position
    const mergedItems = Array.from(itemMap.values())
      .filter((it) => !it.deleted_at)
      .sort((a, b) => a.position - b.position);

    mergedMap.set(local.id, {
      ...winner,
      items: mergedItems,
    });
  }

  return Array.from(mergedMap.values()).filter((p) => !p.deleted_at);
}

class PlaylistSyncEngine {
  private status: SyncStatus = 'idle';
  private statusListeners = new Set<(status: SyncStatus) => void>();
  private pushTimer: NodeJS.Timeout | null = null;
  private pullInterval: NodeJS.Timeout | null = null;
  private realtimeChannel: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', () => this.pullChanges());
      window.addEventListener('online', () => this.flushOfflineQueue());
    }
  }

  public getStatus(): SyncStatus {
    return this.status;
  }

  public subscribeStatus(listener: (status: SyncStatus) => void): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => this.statusListeners.delete(listener);
  }

  private setStatus(next: SyncStatus) {
    this.status = next;
    this.statusListeners.forEach((fn) => fn(next));
  }

  /**
   * Load local playlists safely from localStorage
   */
  public getLocalPlaylists(): SyncedPlaylist[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_PLAYLISTS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return migrateLocalPlaylists(parsed);
    } catch {
      return [];
    }
  }

  /**
   * Save local playlists safely to localStorage
   */
  public saveLocalPlaylists(playlists: SyncedPlaylist[]): void {
    if (typeof window === 'undefined') return;
    try {
      const normalized = playlists.map((pl) => {
        const isLiked =
          pl.id === '00000000-0000-4000-8000-000000000001' ||
          pl.kind === 'liked' ||
          pl.name === 'Liked Songs' ||
          pl.id === 'liked-songs';
        const title = pl.title || pl.name || (isLiked ? 'Liked Songs' : 'My Playlist');
        const tracks =
          pl.tracks && pl.tracks.length > 0
            ? pl.tracks
            : (pl.items || []).map((it) => ({
                id: it.track?.sourceId || it.id,
                title: it.track?.title || 'Unknown',
                artist: it.track?.artist || 'Unknown',
                duration:
                  typeof it.track?.durationSec === 'number'
                    ? `${Math.floor(it.track.durationSec / 60)}:${String(
                        Math.floor(it.track.durationSec % 60)
                      ).padStart(2, '0')}`
                    : '0:00',
                thumbnail: it.track?.thumbnail,
                addedAt: it.added_at ? new Date(it.added_at).getTime() : Date.now(),
              }));
        return {
          ...pl,
          id: isLiked ? 'liked-songs' : pl.id,
          syncId: pl.id,
          title,
          name: title,
          subtitle:
            pl.subtitle ||
            `${tracks.length} song${tracks.length === 1 ? '' : 's'} • ${
              isLiked ? 'Liked Songs' : 'Custom Playlist'
            }`,
          type: pl.type || 'custom',
          icon: pl.icon || (isLiked ? 'heart' : 'music'),
          targetUrl: pl.targetUrl || '',
          coverUrl: pl.coverUrl || pl.cover_url,
          cover_url: pl.coverUrl || pl.cover_url,
          tracks,
        };
      });
      localStorage.setItem(STORAGE_PLAYLISTS_KEY, JSON.stringify(normalized));
      window.dispatchEvent(new CustomEvent('myujiku_playlists_updated'));
      window.dispatchEvent(
        new CustomEvent('chillify_playlists_updated', { detail: { playlists: normalized } })
      );
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.warn('[Sync] Failed to save local playlists:', e);
    }
  }

  /**
   * Push local changes to Supabase cloud debounced (~2s)
   */
  public schedulePush(): void {
    if (this.pushTimer) clearTimeout(this.pushTimer);
    this.pushTimer = setTimeout(() => {
      this.pushChanges();
    }, 2000);
  }

  /**
   * Push changes immediately
   */
  public async pushChanges(): Promise<void> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      this.setStatus('syncing');
      const localPlaylists = this.getLocalPlaylists();

      for (const pl of localPlaylists) {
        // Upsert playlist
        await supabase.from('playlists').upsert({
          id: pl.id,
          user_id: user.id,
          name: pl.name,
          description: pl.description,
          cover_url: pl.cover_url,
          kind: pl.kind,
          updated_at: pl.updated_at,
          deleted_at: pl.deleted_at,
        });

        // Upsert items
        if (pl.items && pl.items.length > 0) {
          const itemPayloads = pl.items.map((it) => ({
            id: it.id,
            playlist_id: pl.id,
            user_id: user.id,
            position: it.position,
            track: it.track,
            added_at: it.added_at,
            deleted_at: it.deleted_at,
          }));

          await supabase.from('playlist_items').upsert(itemPayloads);
        }
      }

      this.setStatus('synced');
      this.updateMetadata({ lastSyncedAt: Date.now(), lastUserId: user.id });
    } catch (err) {
      console.error('[Sync] Push error:', err);
      this.setStatus('error');
    }
  }

  /**
   * Pull latest changes from Supabase
   */
  public async pullChanges(): Promise<void> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      this.setStatus('syncing');

      // 1. Fetch user's playlists
      const { data: cloudPlaylists, error: plErr } = await supabase
        .from('playlists')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null);

      if (plErr) throw plErr;

      // 2. Fetch user's playlist items
      const { data: cloudItems, error: itErr } = await supabase
        .from('playlist_items')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null);

      if (itErr) throw itErr;

      // Group items by playlist
      const itemsByPlaylist = new Map<string, SyncedPlaylistItem[]>();
      for (const it of cloudItems || []) {
        const list = itemsByPlaylist.get(it.playlist_id) || [];
        list.push(it);
        itemsByPlaylist.set(it.playlist_id, list);
      }

      const structuredCloud: SyncedPlaylist[] = (cloudPlaylists || []).map((pl) => ({
        id: pl.id,
        user_id: pl.user_id,
        name: pl.name,
        description: pl.description,
        cover_url: pl.cover_url,
        kind: pl.kind,
        created_at: pl.created_at,
        updated_at: pl.updated_at,
        deleted_at: pl.deleted_at,
        items: itemsByPlaylist.get(pl.id) || [],
      }));

      // Merge with local playlists
      const local = this.getLocalPlaylists();
      const merged = mergePlaylists(local, structuredCloud);

      this.saveLocalPlaylists(merged);
      this.setStatus('synced');
      this.updateMetadata({ lastSyncedAt: Date.now(), lastUserId: user.id });
    } catch (err) {
      console.warn('[Sync] Pull error (using local cache):', err);
      this.setStatus(navigator.onLine ? 'error' : 'offline');
    }
  }

  /**
   * Start 5-minute periodic sync & Realtime listener
   */
  public startPeriodicSync(): () => void {
    if (this.pullInterval) clearInterval(this.pullInterval);
    this.pullInterval = setInterval(() => {
      this.pullChanges();
    }, 5 * 60 * 1000);

    this.pullChanges();
    this.initRealtime();

    return () => {
      if (this.pullInterval) clearInterval(this.pullInterval);
      if (this.realtimeChannel) {
        const supabase = getSupabaseBrowserClient();
        if (supabase) supabase.removeChannel(this.realtimeChannel);
      }
    };
  }

  private initRealtime() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    this.realtimeChannel = supabase
      .channel('myujiku-playlists-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'playlists' }, () => {
        this.pullChanges();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'playlist_items' }, () => {
        this.pullChanges();
      })
      .subscribe();
  }

  public flushOfflineQueue() {
    this.pullChanges();
  }

  private updateMetadata(partial: Partial<SyncMetadata>) {
    if (typeof window === 'undefined') return;
    try {
      const meta = this.getMetadata();
      localStorage.setItem(STORAGE_SYNC_META_KEY, JSON.stringify({ ...meta, ...partial }));
    } catch {}
  }

  public getMetadata(): SyncMetadata {
    if (typeof window === 'undefined') {
      return { lastSyncedAt: 0, lastUserId: null, hasPromptedMerge: false };
    }
    try {
      const raw = localStorage.getItem(STORAGE_SYNC_META_KEY);
      return raw ? JSON.parse(raw) : { lastSyncedAt: 0, lastUserId: null, hasPromptedMerge: false };
    } catch {
      return { lastSyncedAt: 0, lastUserId: null, hasPromptedMerge: false };
    }
  }
}

export const playlistSyncEngine = new PlaylistSyncEngine();
