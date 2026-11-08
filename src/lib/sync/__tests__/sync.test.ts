import assert from 'node:assert';
import {
  mergePlaylists,
  migrateLocalPlaylists,
  generateUUID,
  type SyncedPlaylist,
} from '../playlist-sync';

console.log('--- RUNNING PLAYLIST SYNC ENGINE UNIT TESTS ---');

// 1. UUID Generation & Legacy Migration Tests
console.log('\n1. Testing Legacy Migration & UUID Stability...');
const legacy = [
  {
    id: 'liked-songs',
    title: 'Liked Songs',
    tracks: [
      { id: 'yt-1', title: 'Song One', artist: 'Artist A', duration: 180 },
    ],
  },
  {
    id: 'custom-playlist-123',
    title: 'Study Beats',
    tracks: [
      { id: 'yt-2', title: 'Song Two', artist: 'Artist B', duration: 210 },
    ],
  },
];

const migrated = migrateLocalPlaylists(legacy);
assert.strictEqual(migrated.length, 2, 'Should migrate all legacy playlists');
assert.strictEqual(migrated[0].kind, 'liked', 'Liked songs playlist must have kind: liked');
assert.strictEqual(migrated[0].items?.length, 1, 'Should migrate tracks into items');
assert.ok(migrated[0].items![0].position > 0, 'Should assign fractional position');
assert.strictEqual(migrated[1].name, 'Study Beats', 'Should preserve playlist title');
console.log('   ✓ Legacy playlists successfully converted to synced models with UUIDs');

// 2. Add on Both Sides Merge Test
console.log('\n2. Testing Concurrent Additions (Local & Cloud)...');
const localList: SyncedPlaylist[] = [
  {
    id: 'pl-1',
    name: 'Chill Vibes',
    kind: 'normal',
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-08T10:00:00Z',
    items: [
      {
        id: 'item-1',
        playlist_id: 'pl-1',
        position: 1000,
        track: { source: 'youtube', sourceId: 'yt-1', title: 'Track 1', artist: 'Artist 1', durationSec: 180 },
        added_at: '2026-11-08T10:00:00Z',
      },
    ],
  },
  {
    id: 'pl-local-only',
    name: 'Local Only',
    kind: 'normal',
    created_at: '2026-11-08T11:00:00Z',
    updated_at: '2026-11-08T11:00:00Z',
    items: [],
  },
];

const cloudList: SyncedPlaylist[] = [
  {
    id: 'pl-1',
    name: 'Chill Vibes Renamed in Cloud',
    kind: 'normal',
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-08T10:30:00Z', // Later update timestamp!
    items: [
      {
        id: 'item-2',
        playlist_id: 'pl-1',
        position: 2000,
        track: { source: 'youtube', sourceId: 'yt-2', title: 'Track 2', artist: 'Artist 2', durationSec: 200 },
        added_at: '2026-11-08T10:30:00Z',
      },
    ],
  },
  {
    id: 'pl-cloud-only',
    name: 'Cloud Only',
    kind: 'normal',
    created_at: '2026-11-08T09:00:00Z',
    updated_at: '2026-11-08T09:00:00Z',
    items: [],
  },
];

const merged = mergePlaylists(localList, cloudList);
assert.strictEqual(merged.length, 3, 'Should preserve pl-1, pl-local-only, and pl-cloud-only');

const pl1 = merged.find((p) => p.id === 'pl-1')!;
assert.strictEqual(pl1.name, 'Chill Vibes Renamed in Cloud', 'LWW: Cloud title should win due to later timestamp');
assert.strictEqual(pl1.items?.length, 2, 'Should union items from both local and cloud');
console.log('   ✓ Additions from both sides merged with LWW resolution');

// 3. Tombstone & Soft Delete Tests
console.log('\n3. Testing Item Tombstone & Deletion Resolution...');
const withDeletedItem: SyncedPlaylist[] = [
  {
    id: 'pl-1',
    name: 'Chill Vibes',
    kind: 'normal',
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-08T12:00:00Z',
    items: [
      {
        id: 'item-1',
        playlist_id: 'pl-1',
        position: 1000,
        track: { source: 'youtube', sourceId: 'yt-1', title: 'Track 1', artist: 'Artist 1', durationSec: 180 },
        added_at: '2026-11-08T10:00:00Z',
        deleted_at: '2026-11-08T11:59:00Z', // Deleted locally!
      },
      {
        id: 'item-2',
        playlist_id: 'pl-1',
        position: 2000,
        track: { source: 'youtube', sourceId: 'yt-2', title: 'Track 2', artist: 'Artist 2', durationSec: 200 },
        added_at: '2026-11-08T10:30:00Z',
      },
    ],
  },
];

const mergedAfterDelete = mergePlaylists(withDeletedItem, cloudList);
const plAfterDel = mergedAfterDelete.find((p) => p.id === 'pl-1')!;
assert.strictEqual(plAfterDel.items?.length, 1, 'Deleted item must be filtered out by tombstone');
assert.strictEqual(plAfterDel.items![0].track.sourceId, 'yt-2', 'Remaining item must be yt-2');
console.log('   ✓ Tombstones properly eradicate deleted tracks');

// 4. Reorder Position Sorting Test
console.log('\n4. Testing Fractional Reorder Position Sorting...');
const reorderedItems = [
  { id: '1', playlist_id: 'pl-1', position: 3500, track: { source: 'youtube', sourceId: 'yt-3', title: 'Three', artist: '', durationSec: 0 }, added_at: '' },
  { id: '2', playlist_id: 'pl-1', position: 1200, track: { source: 'youtube', sourceId: 'yt-1', title: 'One', artist: '', durationSec: 0 }, added_at: '' },
  { id: '3', playlist_id: 'pl-1', position: 2100, track: { source: 'youtube', sourceId: 'yt-2', title: 'Two', artist: '', durationSec: 0 }, added_at: '' },
];
const plWithReorder: SyncedPlaylist = {
  id: 'pl-1',
  name: 'Sort Test',
  kind: 'normal',
  created_at: '',
  updated_at: '2026-11-08T14:00:00Z',
  items: reorderedItems,
};

const sorted = mergePlaylists([plWithReorder], []);
assert.strictEqual(sorted[0].items![0].track.title, 'One');
assert.strictEqual(sorted[0].items![1].track.title, 'Two');
assert.strictEqual(sorted[0].items![2].track.title, 'Three');
console.log('   ✓ Items sorted correctly by fractional position key');

// 5. Playlist Deletion Tombstone & Non-Resurrection Test
console.log('\n5. Testing Playlist Deletion Tombstone & Prevention of Resurrection...');
import { recordDeletedPlaylist, isPlaylistDeleted } from '../playlist-sync';

const deletedPlId = 'pl-deleted-by-user';
recordDeletedPlaylist(deletedPlId);
assert.strictEqual(isPlaylistDeleted(deletedPlId), true, 'Tombstone must register deleted playlist');

const cloudWithResurrected: SyncedPlaylist[] = [
  {
    id: deletedPlId,
    name: 'Old Zombie Playlist',
    kind: 'normal',
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-08T10:00:00Z',
    items: [],
  },
  {
    id: 'pl-valid-survivor',
    name: 'Active Playlist',
    kind: 'normal',
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-08T10:00:00Z',
    items: [],
  },
];

const mergedWithDeleted = mergePlaylists([], cloudWithResurrected);
assert.strictEqual(mergedWithDeleted.length, 1, 'Deleted playlist must NOT be resurrected by cloud list');
assert.strictEqual(mergedWithDeleted[0].id, 'pl-valid-survivor', 'Survivor playlist must be retained');
console.log('   ✓ Deleted playlists permanently barred from cloud resurrection');

// 6. Cover Artwork Preservation Test
console.log('\n6. Testing Cover Photo Derivation & Thumbnail Preservation...');
const playlistWithTrackThumb = [
  {
    id: 'custom-art-test',
    title: 'Art Vibes',
    tracks: [
      { id: 'dQw4w9WgXcQ', title: 'Song With Art', artist: 'Artist', duration: '3:30', thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg' },
    ],
  },
];
const migratedArt = migrateLocalPlaylists(playlistWithTrackThumb);
assert.strictEqual(migratedArt[0].cover_url, 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg', 'Playlist cover must derive from first track thumbnail');
assert.strictEqual(migratedArt[0].coverUrl, 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg', 'coverUrl property must match cover_url');
assert.strictEqual(migratedArt[0].items![0].track.thumbnail, 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg', 'Track thumbnail must be preserved in items');
console.log('   ✓ Cover photos and track thumbnails correctly preserved across sync models');

console.log('\n=== ALL PLAYLIST SYNC TESTS PASSED ===\n');
