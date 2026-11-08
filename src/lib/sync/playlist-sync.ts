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
export const STORAGE_DELETED_PLAYLISTS_KEY = 'myujiku_deleted_playlists';

interface SyncMetadata {
  lastSyncedAt: number;
  lastUserId: string | null;
  hasPromptedMerge: boolean;
}

export interface DeletedTombstone {
  id: string;
  deleted_at: string;
}

// In-memory set for Node / test environments
const memoryTombstones = new Set<string>();

export function getDeletedTombstones(): DeletedTombstone[] {
  if (typeof window === 'undefined') {
    return Array.from(memoryTombstones).map((id) => ({ id, deleted_at: new Date().toISOString() }));
  }
  try {
    const raw = localStorage.getItem(STORAGE_DELETED_PLAYLISTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function recordDeletedPlaylist(playlistId: string): void {
  if (!playlistId) return;
  const isValidUUID = typeof playlistId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(playlistId);
  const uuid = isValidUUID ? playlistId : stringToUUID(playlistId);

  memoryTombstones.add(playlistId);
  memoryTombstones.add(uuid);

  if (typeof window === 'undefined') return;
  try {
    const tombstones = getDeletedTombstones();
    const now = new Date().toISOString();
    const idsToAdd = [playlistId, uuid];
    let updated = [...tombstones];
    for (const id of idsToAdd) {
      if (!updated.some((t) => t.id === id)) {
        updated.push({ id, deleted_at: now });
      }
    }
    if (updated.length > 300) {
      updated = updated.slice(updated.length - 300);
    }
    localStorage.setItem(STORAGE_DELETED_PLAYLISTS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('[Sync] Error saving deleted playlist tombstone:', err);
  }
}

export function isPlaylistDeleted(playlistId?: string | null): boolean {
  if (!playlistId) return false;
  if (memoryTombstones.has(playlistId)) return true;
  const isValidUUID = typeof playlistId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(playlistId);
  const uuid = isValidUUID ? playlistId : stringToUUID(playlistId);
  if (memoryTombstones.has(uuid)) return true;

  if (typeof window === 'undefined') return false;
  const tombstones = getDeletedTombstones();
  return tombstones.some((t) => t.id === playlistId || t.id === uuid);
}

export function parseDurationSeconds(d: string | number | undefined): number {
  if (typeof d === 'number') return isNaN(d) ? 0 : d;
  if (!d || typeof d !== 'string') return 0;
  const parts = d.trim().split(':').map((p) => parseInt(p, 10));
  if (parts.length === 2) {
    return (parts[0] || 0) * 60 + (parts[1] || 0);
  }
  if (parts.length === 3) {
    return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
  }
  const parsed = parseInt(d, 10);
  return isNaN(parsed) ? 0 : parsed;
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
 * Uploads a base64 data-URL cover image to the Supabase storage bucket 'playlist-covers'.
 * Returns public HTTPS URL if successful, otherwise keeps original.
 */
export async function uploadCoverIfDataUrl(
  supabase: SupabaseClient,
  userId: string,
  playlistId: string,
  coverUrl?: string
): Promise<string | undefined> {
  if (!coverUrl) return undefined;
  if (!coverUrl.startsWith('data:image/')) return coverUrl;

  try {
    const res = await fetch(coverUrl);
    const blob = await res.blob();
    const filePath = `${userId}/${playlistId}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from('playlist-covers')
      .upload(filePath, blob, { contentType: 'image/jpeg', upsert: true });

    if (!uploadError) {
      const { data } = supabase.storage.from('playlist-covers').getPublicUrl(filePath);
      if (data?.publicUrl) {
        return data.publicUrl;
      }
    }
  } catch (e) {
    console.warn('[Sync] Failed to upload cover to storage bucket, saving inline:', e);
  }
  return coverUrl;
}

/**
 * Migrate legacy playlist objects to guarantee stable UUIDs and proper timestamps
 */
export function migrateLocalPlaylists(rawPlaylists: any[]): SyncedPlaylist[] {
  if (!Array.isArray(rawPlaylists)) return [];

  return rawPlaylists
    .filter((p) => p && !isPlaylistDeleted(p.id) && !isPlaylistDeleted(p.syncId))
    .map((p) => {
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
            duration: typeof it.track?.durationSec === 'number' && it.track.durationSec > 0
              ? `${Math.floor(it.track.durationSec / 60)}:${String(Math.floor(it.track.durationSec % 60)).padStart(2, '0')}`
              : (it.duration || '0:00'),
            thumbnail: it.track?.thumbnail || it.thumbnail,
            addedAt: it.added_at ? new Date(it.added_at).getTime() : Date.now(),
          }));

      const items: SyncedPlaylistItem[] = tracks.map((t: any, index: number) => {
        const itemValidUUID = t.itemUuid && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t.itemUuid);
        const thumbnail =
          t.thumbnail ||
          t.artworkUrl ||
          (/^[a-zA-Z0-9_-]{11}$/.test(t.id) ? `https://i.ytimg.com/vi/${t.id}/hqdefault.jpg` : undefined);

        return {
          id: itemValidUUID ? t.itemUuid : stringToUUID(`${stableId}-${t.id || t.sourceId || index}`),
          playlist_id: stableId,
          position: (index + 1) * 1000,
          track: {
            source: t.source || 'youtube',
            sourceId: t.id || t.sourceId || '',
            title: t.title || 'Untitled',
            artist: t.artist || 'Unknown Artist',
            durationSec: parseDurationSeconds(t.duration || t.durationSec),
            thumbnail,
          },
          added_at: t.addedAt ? new Date(t.addedAt).toISOString() : new Date().toISOString(),
          deleted_at: null,
        };
      });

      // Always derive cover photo from first track's thumbnail if not explicitly given
      const firstThumb = items.length > 0 && items[0].track?.thumbnail ? items[0].track.thumbnail : undefined;
      const effectiveCover = p.coverUrl || p.cover_url || firstThumb;

      return {
        id: stableId,
        name: title,
        title: title,
        subtitle: p.subtitle || `${tracks.length} song${tracks.length === 1 ? '' : 's'} • ${isLiked ? 'Liked Songs' : 'Custom Playlist'}`,
        type: p.type || 'custom',
        icon: p.icon || (isLiked ? 'heart' : 'music'),
        targetUrl: p.targetUrl || '',
        description: p.description,
        cover_url: effectiveCover,
        coverUrl: effectiveCover,
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

  // Filter out any locally deleted playlists or cloud soft-deleted items
  const filteredCloud = cloudList.filter((c) => !isPlaylistDeleted(c.id) && !c.deleted_at);
  const filteredLocal = localList.filter((l) => !isPlaylistDeleted(l.id) && !l.deleted_at);

  // Index cloud playlists
  for (const cloud of filteredCloud) {
    mergedMap.set(cloud.id, { ...cloud, items: [...(cloud.items || [])] });
  }

  // Merge or insert local playlists
  for (const local of filteredLocal) {
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

    const mergedCover =
      winner.cover_url ||
      winner.coverUrl ||
      loser.cover_url ||
      loser.coverUrl ||
      (mergedItems.length > 0 && mergedItems[0].track?.thumbnail ? mergedItems[0].track.thumbnail : undefined);

    mergedMap.set(local.id, {
      ...winner,
      cover_url: mergedCover,
      coverUrl: mergedCover,
      items: mergedItems,
    });
  }

  return Array.from(mergedMap.values()).filter((p) => !p.deleted_at && !isPlaylistDeleted(p.id));
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
      // Automatically push local changes to cloud with debounce
      window.addEventListener('chillify_playlists_updated', () => {
        this.schedulePush();
      });
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
   * Delete a playlist from local and actively push tombstone to cloud
   */
  public async deletePlaylist(playlistId: string): Promise<void> {
    recordDeletedPlaylist(playlistId);

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const isValidUUID =
        typeof playlistId === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(playlistId);
      const uuid = isValidUUID ? playlistId : stringToUUID(playlistId);
      const targetIds = Array.from(new Set([playlistId, uuid]));
      const now = new Date().toISOString();

      for (const id of targetIds) {
        await supabase
          .from('playlists')
          .update({ deleted_at: now })
          .eq('id', id)
          .eq('user_id', user.id);

        await supabase
          .from('playlist_items')
          .update({ deleted_at: now })
          .eq('playlist_id', id)
          .eq('user_id', user.id);
      }
    } catch (err) {
      console.warn('[Sync] Direct cloud delete failed, queued in tombstones:', err);
    }
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
      const normalized = playlists
        .filter((pl) => !isPlaylistDeleted(pl.id))
        .map((pl) => {
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
                    typeof it.track?.durationSec === 'number' && it.track.durationSec > 0
                      ? `${Math.floor(it.track.durationSec / 60)}:${String(
                          Math.floor(it.track.durationSec % 60)
                        ).padStart(2, '0')}`
                      : '0:00',
                  thumbnail: it.track?.thumbnail,
                  addedAt: it.added_at ? new Date(it.added_at).getTime() : Date.now(),
                }));

          const firstThumb = tracks.length > 0 && tracks[0].thumbnail ? tracks[0].thumbnail : undefined;
          const effectiveCover = pl.coverUrl || pl.cover_url || firstThumb;

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
            coverUrl: effectiveCover,
            cover_url: effectiveCover,
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      this.setStatus('syncing');

      // 1. Push any recorded deleted tombstones to cloud first
      const tombstones = getDeletedTombstones();
      for (const t of tombstones) {
        await supabase
          .from('playlists')
          .update({ deleted_at: t.deleted_at })
          .eq('id', t.id)
          .eq('user_id', user.id);

        await supabase
          .from('playlist_items')
          .update({ deleted_at: t.deleted_at })
          .eq('playlist_id', t.id)
          .eq('user_id', user.id);
      }

      // 2. Push active local playlists
      const localPlaylists = this.getLocalPlaylists();

      for (const pl of localPlaylists) {
        if (isPlaylistDeleted(pl.id)) continue;

        // Ensure cover is a valid URL (upload if base64 data URL)
        let finalCover = pl.cover_url || pl.coverUrl;
        if (finalCover && finalCover.startsWith('data:image/')) {
          finalCover = await uploadCoverIfDataUrl(supabase, user.id, pl.id, finalCover);
        } else if (!finalCover && pl.items && pl.items.length > 0 && pl.items[0].track?.thumbnail) {
          finalCover = pl.items[0].track.thumbnail;
        }

        // Upsert playlist
        await supabase.from('playlists').upsert({
          id: pl.id,
          user_id: user.id,
          name: pl.name,
          description: pl.description,
          cover_url: finalCover,
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // If there are pending local changes waiting to be pushed, push them first so they're not overwritten!
      if (this.pushTimer) {
        clearTimeout(this.pushTimer);
        this.pushTimer = null;
        await this.pushChanges();
      }

      this.setStatus('syncing');

      // 1. Fetch user's playlists
      const { data: cloudPlaylists, error: plErr } = await supabase
        .from('playlists')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null);

      if (plErr) throw plErr;

      // Filter out any playlists that were deleted locally
      const validCloudPlaylists = (cloudPlaylists || []).filter((pl) => {
        if (isPlaylistDeleted(pl.id)) {
          // Asynchronously re-assert soft delete in Supabase
          supabase
            .from('playlists')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', pl.id)
            .eq('user_id', user.id)
            .then(() => {});
          return false;
        }
        return true;
      });

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

      const structuredCloud: SyncedPlaylist[] = validCloudPlaylists.map((pl) => {
        const items = itemsByPlaylist.get(pl.id) || [];
        const isLiked = pl.kind === 'liked' || pl.name === 'Liked Songs';
        const tracks = items.map((it) => ({
          id: it.track?.sourceId || it.id,
          title: it.track?.title || 'Unknown',
          artist: it.track?.artist || 'Unknown',
          duration:
            typeof it.track?.durationSec === 'number' && it.track.durationSec > 0
              ? `${Math.floor(it.track.durationSec / 60)}:${String(
                  Math.floor(it.track.durationSec % 60)
                ).padStart(2, '0')}`
              : '0:00',
          thumbnail: it.track?.thumbnail,
          addedAt: it.added_at ? new Date(it.added_at).getTime() : Date.now(),
        }));

        const firstThumb = tracks.length > 0 && tracks[0].thumbnail ? tracks[0].thumbnail : undefined;
        const cover = pl.cover_url || firstThumb;

        return {
          id: isLiked ? 'liked-songs' : pl.id,
          syncId: pl.id,
          name: pl.name,
          title: pl.name,
          description: pl.description,
          cover_url: cover,
          coverUrl: cover,
          kind: pl.kind,
          subtitle: `${tracks.length} song${tracks.length === 1 ? '' : 's'} • ${
            isLiked ? 'Liked Songs' : 'Synced Playlist'
          }`,
          type: 'custom',
          icon: isLiked ? 'heart' : 'music',
          targetUrl: '',
          created_at: pl.created_at,
          updated_at: pl.updated_at,
          deleted_at: pl.deleted_at,
          items,
          tracks,
        };
      });

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
