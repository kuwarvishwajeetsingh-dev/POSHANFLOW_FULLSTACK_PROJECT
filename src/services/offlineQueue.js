import { openDB } from 'idb';

const DB_NAME = 'poshanflow_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'pending_mutations';

/**
 * Initializes and returns the IndexedDB database instance.
 */
async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: 'id',
          autoIncrement: true,
        });
        store.createIndex('timestamp', 'timestamp');
        store.createIndex('action', 'action');
      }
    },
  });
}

export const offlineQueue = {
  /**
   * Enqueues a mutation to IndexedDB.
   * 
   * @param {string} action - 'attendance' | 'stock' | 'purchase_order'
   * @param {object} payload - Action data
   * @returns {Promise<number>} Inserted queue ID
   */
  enqueue: async (action, payload) => {
    try {
      const db = await getDB();
      const item = {
        action,
        payload,
        timestamp: Date.now(),
        retryCount: 0,
      };
      const id = await db.add(STORE_NAME, item);
      return id;
    } catch (error) {
      console.error('Failed to enqueue offline item to IndexedDB:', error);
      return null;
    }
  },

  /**
   * Retrieves all pending mutations from IndexedDB.
   * 
   * @returns {Promise<Array>}
   */
  getAllPending: async () => {
    try {
      const db = await getDB();
      const items = await db.getAll(STORE_NAME);
      return items || [];
    } catch (error) {
      console.warn('Failed to read pending IndexedDB mutations:', error);
      return [];
    }
  },

  /**
   * Removes a successfully synchronized mutation by its ID.
   * 
   * @param {number|string} id 
   */
  remove: async (id) => {
    try {
      const db = await getDB();
      await db.delete(STORE_NAME, id);
    } catch (error) {
      console.warn('Failed to delete item from IndexedDB:', error);
    }
  },

  /**
   * Clears all pending mutations from the queue.
   */
  clearAll: async () => {
    try {
      const db = await getDB();
      await db.clear(STORE_NAME);
    } catch (error) {
      console.warn('Failed to clear IndexedDB:', error);
    }
  },

  /**
   * Returns the count of pending offline items.
   */
  count: async () => {
    try {
      const db = await getDB();
      return await db.count(STORE_NAME);
    } catch {
      return 0;
    }
  },
};
