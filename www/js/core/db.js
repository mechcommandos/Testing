/**
 * Stockage local versionné. IndexedDB derrière une petite interface (get, getAll, put, delete, query) ;
 * si IndexedDB est indisponible (navigation privée de certains navigateurs, environnement de test),
 * une mémoire volatile prend le relais et `persistent` vaut false : l'interface le signale.
 *
 * Les migrations sont numérotées et ne font qu'ajouter : une base ancienne est mise à niveau à l'ouverture.
 */

export const DB_NAME = 'layjou';

// Chaque migration reçoit la base IndexedDB en cours de mise à niveau.
export const MIGRATIONS = [
  // 1 : schéma initial
  (db) => {
    db.createObjectStore('profiles', { keyPath: 'id' });
    const sessions = db.createObjectStore('sessions', { keyPath: 'id' });
    sessions.createIndex('profileId', 'profileId');
    const results = db.createObjectStore('results', { keyPath: 'id' });
    results.createIndex('profileId', 'profileId');
    results.createIndex('profileGame', ['profileId', 'gameId']);
    const progress = db.createObjectStore('progress', { keyPath: 'key' });
    progress.createIndex('profileId', 'profileId');
    db.createObjectStore('settings', { keyPath: 'key' });
    db.createObjectStore('syncQueue', { keyPath: 'id' });
  },
];

export const DB_VERSION = MIGRATIONS.length;

const STORES = ['profiles', 'sessions', 'results', 'progress', 'settings', 'syncQueue'];
const INDEXES = {
  sessions: { profileId: (r) => r.profileId },
  results: { profileId: (r) => r.profileId, profileGame: (r) => [r.profileId, r.gameId] },
  progress: { profileId: (r) => r.profileId },
};

function promisify(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

class IdbStorage {
  constructor(db) {
    this.db = db;
    this.persistent = true;
  }

  tx(store, mode = 'readonly') {
    return this.db.transaction(store, mode).objectStore(store);
  }

  get(store, key) { return promisify(this.tx(store).get(key)); }
  getAll(store) { return promisify(this.tx(store).getAll()); }
  put(store, value) { return promisify(this.tx(store, 'readwrite').put(structuredClone(value))); }
  delete(store, key) { return promisify(this.tx(store, 'readwrite').delete(key)); }
  clear(store) { return promisify(this.tx(store, 'readwrite').clear()); }
  query(store, index, value) { return promisify(this.tx(store).index(index).getAll(IDBKeyRange.only(value))); }

  /** Écrit plusieurs enregistrements atomiquement (tout ou rien). */
  putMany(entries) {
    // IndexedDB refuse une transaction sans magasin : rien à écrire, rien à faire.
    if (!entries.length) return Promise.resolve();
    const stores = [...new Set(entries.map((e) => e.store))];
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(stores, 'readwrite');
      for (const { store, value, remove } of entries) {
        if (remove) tx.objectStore(store).delete(remove);
        else tx.objectStore(store).put(structuredClone(value));
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }
}

/** Même interface, en mémoire : utilisée en repli et dans les tests. */
export class MemoryStorage {
  constructor() {
    this.persistent = false;
    this.data = Object.fromEntries(STORES.map((s) => [s, new Map()]));
  }

  keyOf(store, value) {
    return store === 'progress' || store === 'settings' ? value.key : value.id;
  }

  async get(store, key) { const v = this.data[store].get(key); return v === undefined ? undefined : structuredClone(v); }
  async getAll(store) { return [...this.data[store].values()].map((v) => structuredClone(v)); }
  async put(store, value) { this.data[store].set(this.keyOf(store, value), structuredClone(value)); }
  async delete(store, key) { this.data[store].delete(key); }
  async clear(store) { this.data[store].clear(); }

  async query(store, index, value) {
    const pick = INDEXES[store][index];
    const target = JSON.stringify(value);
    return (await this.getAll(store)).filter((r) => JSON.stringify(pick(r)) === target);
  }

  async putMany(entries) {
    for (const { store, value, remove } of entries) {
      if (remove) this.data[store].delete(remove);
      else this.data[store].set(this.keyOf(store, value), structuredClone(value));
    }
  }
}

/** Ouvre la base persistante, ou la mémoire si IndexedDB est indisponible. */
export async function openStorage({ name = DB_NAME, indexedDB = globalThis.indexedDB } = {}) {
  if (!indexedDB) return new MemoryStorage();
  try {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open(name, DB_VERSION);
      request.onupgradeneeded = (event) => {
        for (let v = event.oldVersion; v < DB_VERSION; v++) MIGRATIONS[v](request.result, request.transaction);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('Base bloquée par un autre onglet'));
    });
    return new IdbStorage(db);
  } catch (error) {
    console.warn('[Layjou] IndexedDB indisponible, mémoire volatile utilisée', error);
    return new MemoryStorage();
  }
}
