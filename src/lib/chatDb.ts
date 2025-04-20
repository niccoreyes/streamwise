/**
 * chatDb.ts - IndexedDB utility for robust settings and preference persistence.
 * Uses a "settings" object store for key-value pairs.
 * Requires: npm install idb
 */
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface ChatDBSchema extends DBSchema {
  settings: {
    key: string;
    value: any;
  };
}

let dbPromise: Promise<IDBPDatabase<ChatDBSchema>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<ChatDBSchema>('streamwise-chat', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
      },
    });
  }
  return dbPromise;
}

export const chatDb = {
  async setSetting<T = any>(key: string, value: T): Promise<void> {
    const db = await getDb();
    await db.put('settings', value, key);
  },

  async getSetting<T = any>(key: string, defaultValue?: T): Promise<T | undefined> {
    const db = await getDb();
    const value = await db.get('settings', key);
    return value !== undefined ? value : defaultValue;
  },

  async removeSetting(key: string): Promise<void> {
    const db = await getDb();
    await db.delete('settings', key);
  },

  async getAllSettings(): Promise<Record<string, any>> {
    const db = await getDb();
    const all: Record<string, any> = {};
    let cursor = await db.transaction('settings').store.openCursor();
    while (cursor) {
      all[cursor.key as string] = cursor.value;
      cursor = await cursor.continue();
    }
    return all;
  }
};
