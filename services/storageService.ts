import { PortfolioData } from '../types';

const DB_NAME = 'PortfolioWriterDB';
const DB_VERSION = 1;
const STORE_NAME = 'portfolio';
const DATA_KEY = 'main';

let db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (db) {
      return resolve(db);
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error("Error opening IndexedDB:", request.error);
      reject(new Error("Failed to open database. Your browser might be in private mode or has blocked storage."));
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const dbInstance = (event.target as IDBOpenDBRequest).result;
      if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
        dbInstance.createObjectStore(STORE_NAME);
      }
    };
  });
}

export async function savePortfolioData(data: PortfolioData): Promise<void> {
  const currentDb = await openDB();
  return new Promise((resolve, reject) => {
    try {
      const transaction = currentDb.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(data, DATA_KEY);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        console.error('Error saving data to IndexedDB:', request.error);
        reject(request.error); // Pass the original error object for detailed diagnostics
      };
    } catch (error) {
        console.error('Error creating IndexedDB transaction:', error);
        reject(error);
    }
  });
}

export async function loadPortfolioData(): Promise<PortfolioData | null> {
  const currentDb = await openDB();
  return new Promise((resolve, reject) => {
    try {
      const transaction = currentDb.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(DATA_KEY);

      request.onsuccess = () => {
        resolve((request.result as PortfolioData) || null);
      };

      request.onerror = () => {
        console.error('Error loading data from IndexedDB:', request.error);
        reject(new Error('Failed to load data.'));
      };
    } catch (error) {
        console.error('Error creating IndexedDB transaction:', error);
        reject(error);
    }
  });
}

export function clearOldLocalStorageData() {
    try {
        if (localStorage.getItem('portfolioData')) {
            localStorage.removeItem('portfolioData');
            console.log("Removed old portfolio data from localStorage.");
        }
    } catch (e) {
        console.error("Could not remove old localStorage data:", e);
    }
}