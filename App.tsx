import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Editor from './components/Editor';
import WelcomePage from './components/WelcomePage';
import EmptyState from './components/EmptyState';
import { PortfolioData, PortfolioEntry } from './types';
import { BookOpenIcon } from './components/Icons';

// Type definition for FileSystemFileHandle, which may not be in all TS lib versions.
// This ensures our code knows about the API.
declare global {
  interface Window {
    showOpenFilePicker(options?: any): Promise<FileSystemFileHandle[]>;
    showSaveFilePicker(options?: any): Promise<FileSystemFileHandle>;
  }
  // FIX: Added definitions for FileSystemFileHandle permission methods to resolve TypeScript errors.
  // These are part of the File System Access API, which may not be included in default TS DOM type libraries.
  interface FileSystemFileHandle {
    queryPermission(options?: { mode: 'read' | 'readwrite' }): Promise<PermissionState>;
    requestPermission(options?: { mode: 'read' | 'readwrite' }): Promise<PermissionState>;
  }
}

// --- IndexedDB Helper Functions ---
const DB_NAME = 'portfolio-writer-db';
const STORE_NAME = 'file-handles';
const KEY = 'last-opened';

let dbPromise: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
  if (dbPromise) {
    return dbPromise;
  }
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => {
      console.error("Error opening DB", request.error);
      reject("Error opening DB");
    };
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
  });
  return dbPromise;
}

async function saveFileHandle(handle: FileSystemFileHandle): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  store.put(handle, KEY);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getFileHandle(): Promise<FileSystemFileHandle | null> {
    try {
        const db = await getDb();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(KEY);
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error("Could not get file handle from DB", error);
        return null;
    }
}

async function clearFileHandle(): Promise<void> {
  try {
    const db = await getDb();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(KEY);
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error("Could not clear file handle from DB", error);
  }
}
// --- End IndexedDB Helper Functions ---


const App: React.FC = () => {
  const [portfolioData, setPortfolioData] = useState<PortfolioData>({ entries: [] });
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>('saved');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const autoLoadLastProject = async () => {
      try {
        const handle = await getFileHandle();
        if (!handle) {
          setIsLoading(false);
          return;
        }

        const permission = await handle.queryPermission({ mode: 'readwrite' });
        if (permission !== 'granted') {
          if ((await handle.requestPermission({ mode: 'readwrite' })) !== 'granted') {
            await clearFileHandle();
            setIsLoading(false);
            return;
          }
        }

        const file = await handle.getFile();
        const contents = await file.text();
        const parsedData: PortfolioData = JSON.parse(contents);

        if (parsedData && Array.isArray(parsedData.entries)) {
          setFileHandle(handle);
          setPortfolioData(parsedData);
          setActiveEntryId(parsedData.entries[0]?.id || null);
          setSaveStatus('saved');
        } else {
          console.warn("Invalid data in saved file handle. Clearing.");
          await clearFileHandle();
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'NotFoundError') {
            alert('The previously opened file could not be found. It may have been moved or deleted.');
        } else {
            console.error("Failed to auto-load last project:", error);
        }
        await clearFileHandle();
      } finally {
        setIsLoading(false);
      }
    };

    autoLoadLastProject();
  }, []);

  // Debounced auto-save effect
  useEffect(() => {
    if (saveStatus !== 'unsaved' || !fileHandle) {
      return;
    }

    const handler = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(portfolioData, null, 2));
        await writable.close();
        setSaveStatus('saved');
      } catch (error) {
        console.error("Auto-save failed:", error);
        alert("Auto-save failed. Your changes might not be saved. Please try exporting your work.");
        setSaveStatus('unsaved'); // Revert status on failure
      }
    }, 1500); // 1.5-second debounce delay

    return () => {
      clearTimeout(handler);
    };
  }, [portfolioData, fileHandle, saveStatus]);
  
  // Mark changes as unsaved
  const updatePortfolioData = (newData: PortfolioData) => {
    setPortfolioData(newData);
    if(fileHandle) { // Only set unsaved status if a file is loaded
      setSaveStatus('unsaved');
    }
  }

  const handleCreateNewProject = async () => {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: 'portfolio-data.json',
        types: [{
          description: 'JSON Files',
          accept: { 'application/json': ['.json'] },
        }],
      });
      
      const newEntry: PortfolioEntry = {
        id: `entry-${Date.now()}`,
        title: 'New Entry',
        content: '',
        createdAt: new Date().toISOString(),
      };
      const newPortfolioData = { entries: [newEntry] };
      
      const writable = await handle.createWritable();
      await writable.write(JSON.stringify(newPortfolioData, null, 2));
      await writable.close();
      
      await saveFileHandle(handle);

      setFileHandle(handle);
      setPortfolioData(newPortfolioData);
      setActiveEntryId(newEntry.id);
      setSaveStatus('saved');

    } catch (error) {
      if ((error as DOMException).name !== 'AbortError') {
        console.error("Error creating new project file:", error);
        alert("Could not create new project file.");
      }
    }
  };

  const handleImportProject = async () => {
    try {
      const [handle] = await window.showOpenFilePicker({
         types: [{
          description: 'JSON Files',
          accept: { 'application/json': ['.json'] },
        }],
        multiple: false,
      });

      const file = await handle.getFile();
      const contents = await file.text();
      const parsedData: PortfolioData = JSON.parse(contents);

       if (parsedData && Array.isArray(parsedData.entries)) {
          await saveFileHandle(handle);
          setFileHandle(handle);
          setPortfolioData(parsedData);
          setActiveEntryId(parsedData.entries[0]?.id || null);
          setSaveStatus('saved');
        } else {
          throw new Error("Invalid JSON structure.");
        }

    } catch (error) {
       if ((error as DOMException).name !== 'AbortError') {
        console.error("Error importing project:", error);
        alert("Failed to import file. Please ensure it is a valid portfolio JSON file.");
      }
    }
  }

  const handleAddNewEntry = () => {
    const newEntry: PortfolioEntry = {
      id: `entry-${Date.now()}`,
      title: 'New Entry',
      content: '',
      createdAt: new Date().toISOString(),
    };
    updatePortfolioData({
      ...portfolioData,
      entries: [newEntry, ...portfolioData.entries],
    });
    setActiveEntryId(newEntry.id);
  };

  const handleDeleteEntry = (id: string) => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      const updatedEntries = portfolioData.entries.filter(entry => entry.id !== id);
      updatePortfolioData({
        ...portfolioData,
        entries: updatedEntries,
      });
      if (activeEntryId === id) {
        setActiveEntryId(updatedEntries[0]?.id || null);
      }
    }
  };

  const handleUpdateEntry = useCallback((id: string, updates: Partial<PortfolioEntry>) => {
    const newEntries = portfolioData.entries.map(entry =>
      entry.id === id ? { ...entry, ...updates } : entry
    );
    updatePortfolioData({ ...portfolioData, entries: newEntries });
  }, [portfolioData]);

  const handleDownload = () => {
    const dataStr = JSON.stringify(portfolioData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.download = 'portfolio-data.json';
    link.href = url;
    document.body.appendChild(link); // For cross-browser compatibility
    link.click();
    document.body.removeChild(link); // Clean up
    URL.revokeObjectURL(url);
  };

  const activeEntry = portfolioData.entries.find(e => e.id === activeEntryId);

  const renderMainContent = () => {
    if (activeEntry) {
      return <Editor entry={activeEntry} onUpdate={handleUpdateEntry} onDelete={handleDeleteEntry} saveStatus={saveStatus}/>;
    }
    return <EmptyState />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-gray-900">
        <div className="flex flex-col items-center justify-center text-center p-8 text-gray-400">
          <BookOpenIcon className="w-24 h-24 mb-6 text-gray-600 animate-pulse"/>
          <h2 className="text-2xl font-semibold">Loading Your Workspace</h2>
          <p className="mt-2">Please wait a moment...</p>
        </div>
      </div>
    );
  }

  if (!fileHandle) {
    return (
      <WelcomePage 
          onCreateProject={handleCreateNewProject} 
          onTriggerUpload={handleImportProject} 
      />
    );
  }

  return (
    <div className="flex h-screen w-screen font-sans">
      <Sidebar
        entries={portfolioData.entries}
        activeEntryId={activeEntryId}
        onSelectEntry={setActiveEntryId}
        onCreateEntry={handleAddNewEntry}
        onDeleteEntry={handleDeleteEntry}
        onDownload={handleDownload}
        onTriggerUpload={handleImportProject}
      />
      <main className="flex-1 bg-gray-900">
        {renderMainContent()}
      </main>
    </div>
  );
};

export default App;