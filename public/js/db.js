// Minimal IndexedDB key-value store with an in-memory fallback.
// If IndexedDB is unavailable (some private modes, very old browsers),
// records live only until the page is closed and `persistent` is false.

const DB_NAME = 'freshcheck-ai';
const DB_VERSION = 1;
export const STORES = ['scans', 'evaluations'];

let dbPromise = null;
const memoryStores = Object.fromEntries(STORES.map((s) => [s, new Map()]));
export const storageState = { persistent: true, error: null };

function open() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    let req;
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (err) {
      storageState.persistent = false;
      storageState.error = err;
      resolve(null);
      return;
    }
    req.onupgradeneeded = () => {
      for (const s of STORES) {
        if (!req.result.objectStoreNames.contains(s)) req.result.createObjectStore(s, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      storageState.persistent = false;
      storageState.error = req.error;
      resolve(null);
    };
    req.onblocked = () => {
      storageState.persistent = false;
      resolve(null);
    };
  });
  return dbPromise;
}

function tx(db, store, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    const out = fn(s);
    t.oncomplete = () => resolve(out?.result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error || new Error('Storage transaction aborted'));
  });
}

export async function put(store, value) {
  const db = await open();
  if (!db) { memoryStores[store].set(value.id, value); return; }
  await tx(db, store, 'readwrite', (s) => s.put(value));
}

export async function getAll(store) {
  const db = await open();
  if (!db) return [...memoryStores[store].values()];
  return (await tx(db, store, 'readonly', (s) => s.getAll())) || [];
}

export async function get(store, id) {
  const db = await open();
  if (!db) return memoryStores[store].get(id) || null;
  return (await tx(db, store, 'readonly', (s) => s.get(id))) || null;
}

export async function remove(store, id) {
  const db = await open();
  if (!db) { memoryStores[store].delete(id); return; }
  await tx(db, store, 'readwrite', (s) => s.delete(id));
}

export async function clear(store) {
  const db = await open();
  if (!db) { memoryStores[store].clear(); return; }
  await tx(db, store, 'readwrite', (s) => s.clear());
}

export function isQuotaError(err) {
  return !!err && (err.name === 'QuotaExceededError' || /quota/i.test(err.message || ''));
}

export function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
