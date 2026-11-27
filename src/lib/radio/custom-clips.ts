export const MAX_CUSTOM_CLIPS = 50;
export const MAX_CLIP_BYTES = 8 * 1024 * 1024; // 8 MB
export const MAX_CLIP_DURATION_SEC = 30;
const DB_NAME = 'myujiku_rj_clips_v1';
const STORE_NAME = 'clips';

export interface CustomRjClipMeta {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  durationSec: number;
  addedAt: number;
}

interface StoredClip extends CustomRjClipMeta {
  blob: Blob;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Failed to open RJ clips DB'));
  });
}

export function isValidClipType(file: File): boolean {
  const allowed = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/ogg'];
  if (allowed.includes(file.type.toLowerCase())) return true;
  return /\.(mp3|wav|ogg)$/i.test(file.name);
}

async function measureAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      const dur = isFinite(audio.duration) ? audio.duration : 0;
      URL.revokeObjectURL(url);
      resolve(dur);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };
    audio.src = url;
  });
}

export async function listCustomRjClips(): Promise<CustomRjClipMeta[]> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => {
        const items = (req.result as StoredClip[]).map((c) => ({
          id: c.id,
          name: c.name,
          mimeType: c.mimeType,
          sizeBytes: c.sizeBytes,
          durationSec: c.durationSec,
          addedAt: c.addedAt,
        }));
        resolve(items);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function addCustomRjClip(file: File): Promise<{ ok: boolean; error?: string; clip?: CustomRjClipMeta }> {
  if (!isValidClipType(file)) {
    return { ok: false, error: `${file.name}: Only mp3, wav, or ogg files are supported.` };
  }
  if (file.size > MAX_CLIP_BYTES) {
    return { ok: false, error: `${file.name}: Exceeds 8 MB limit.` };
  }
  const existing = await listCustomRjClips();
  if (existing.length >= MAX_CUSTOM_CLIPS) {
    return { ok: false, error: `Maximum of ${MAX_CUSTOM_CLIPS} custom clips reached.` };
  }
  const dur = await measureAudioDuration(file);
  if (dur > MAX_CLIP_DURATION_SEC) {
    return { ok: false, error: `${file.name}: Exceeds 30 second limit (${Math.round(dur)}s).` };
  }

  const clip: StoredClip = {
    id: `clip-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: file.name,
    mimeType: file.type || 'audio/mpeg',
    sizeBytes: file.size,
    durationSec: Math.round(dur * 10) / 10,
    addedAt: Date.now(),
    blob: file,
  };

  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(clip);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  return {
    ok: true,
    clip: {
      id: clip.id,
      name: clip.name,
      mimeType: clip.mimeType,
      sizeBytes: clip.sizeBytes,
      durationSec: clip.durationSec,
      addedAt: clip.addedAt,
    },
  };
}

export async function deleteCustomRjClip(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearAllCustomRjClips(): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {}
}

export async function getRandomCustomRjClipBlob(): Promise<{ meta: CustomRjClipMeta; blob: Blob } | null> {
  try {
    const db = await openDb();
    const all = await new Promise<StoredClip[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve(req.result as StoredClip[]);
      req.onerror = () => reject(req.error);
    });
    if (!all || all.length === 0) return null;
    const picked = all[Math.floor(Math.random() * all.length)];
    return {
      meta: {
        id: picked.id,
        name: picked.name,
        mimeType: picked.mimeType,
        sizeBytes: picked.sizeBytes,
        durationSec: picked.durationSec,
        addedAt: picked.addedAt,
      },
      blob: picked.blob,
    };
  } catch {
    return null;
  }
}

