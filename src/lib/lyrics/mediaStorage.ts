/**
 * IndexedDB storage for custom user backgrounds (images and videos up to ~25MB).
 * Never uploads files to any server.
 */

const DB_NAME = 'myujiku_media_db';
const DB_VERSION = 1;
const STORE_NAME = 'background_media';
const KEY = 'custom_bg';

export interface StoredMedia {
  blob: Blob;
  type: string;
  name: string;
  size: number;
  timestamp: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveCustomMedia(file: File): Promise<void> {
  if (file.size > 26 * 1024 * 1024) {
    throw new Error('File exceeds 25 MB limit');
  }

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const record: StoredMedia = {
      blob: file,
      type: file.type,
      name: file.name,
      size: file.size,
      timestamp: Date.now(),
    };

    const req = store.put(record, KEY);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function loadCustomMedia(): Promise<StoredMedia | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(KEY);

    req.onsuccess = () => {
      resolve(req.result || null);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteCustomMedia(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(KEY);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
