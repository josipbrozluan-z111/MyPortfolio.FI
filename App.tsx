import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Editor from './components/Editor';
import WelcomePage from './components/WelcomePage';
import EmptyState from './components/EmptyState';
import { PortfolioData, PortfolioEntry, Topic } from './types';
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
  const [portfolioData, setPortfolioData] = useState<PortfolioData>({ topics: [] });
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>('saved');
  const [isLoading, setIsLoading] = useState(true);
  const [lastModified, setLastModified] = useState<number | null>(null);

  // --- Theme State ---
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem('theme');
    return (savedTheme === 'light' || savedTheme === 'dark') ? savedTheme : 'dark';
  });
  const [accentColor, setAccentColorState] = useState<string>(() => {
      return localStorage.getItem('accentColor') || '#06b6d4'; // Default cyan-600
  });

  const handleSetTheme = (newTheme: 'light' | 'dark') => {
      setThemeState(newTheme);
      localStorage.setItem('theme', newTheme);
  };

  const handleSetAccentColor = (color: string) => {
      setAccentColorState(color);
      localStorage.setItem('accentColor', color);
  };
  
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    root.style.setProperty('--accent-color', accentColor);
  }, [theme, accentColor]);
  // --- End Theme State ---

  // Helper function to process loaded data, handling migration from old format
  const processLoadedData = useCallback((data: any, handle?: FileSystemFileHandle) => {
      if (data && Array.isArray(data.topics)) {
        // New format, load directly
        setPortfolioData(data);
        setActiveEntryId(data.topics[0]?.entries[0]?.id || null);
      } else if (data && Array.isArray(data.entries)) {
        // Old format, migrate it
        console.log("Old data format detected. Migrating to new topic-based structure.");
        const newTopic: Topic = {
          id: `topic-${Date.now()}`,
          name: 'General',
          createdAt: new Date().toISOString(),
          entries: data.entries,
        };
        const newPortfolioData: PortfolioData = { topics: [newTopic] };
        setPortfolioData(newPortfolioData);
        setActiveEntryId(newPortfolioData.topics[0]?.entries[0]?.id || null);
        // Mark as unsaved so the new structure gets written back to the file
        if (handle) {
          setSaveStatus('unsaved');
        }
      } else {
        throw new Error("Invalid JSON structure.");
      }
  }, []);


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
        const parsedData = JSON.parse(contents);

        setLastModified(file.lastModified);
        setFileHandle(handle);
        processLoadedData(parsedData, handle);
        setSaveStatus('saved');
        
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
  }, [processLoadedData]);

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

        const updatedFile = await fileHandle.getFile();
        setLastModified(updatedFile.lastModified);
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

  // Effect to detect external file changes on window focus
  useEffect(() => {
    const checkForExternalChanges = async () => {
      if (!fileHandle || !lastModified) {
        return;
      }

      try {
        const file = await fileHandle.getFile();
        
        // Check if file on disk is newer than our last known version
        // Add a small buffer (2ms) to avoid issues with timestamp precision
        if (file.lastModified > lastModified + 2) {
          const message = saveStatus === 'unsaved'
            ? "The project file has been changed on disk, and you have unsaved changes in the app. Reloading will discard your changes. Do you want to reload?"
            : "The project file has been changed on disk. Do you want to reload it?";
          
          if (window.confirm(message)) {
            // User wants to reload
            const contents = await file.text();
            const parsedData = JSON.parse(contents);
            processLoadedData(parsedData);
            setLastModified(file.lastModified);
            setSaveStatus('saved');
            alert('Project reloaded from disk.');
          } else {
            // User wants to keep their version, which will overwrite external changes on next save
            setSaveStatus('unsaved');
            alert("External changes ignored. Your version will be saved, overwriting the changes on disk.");
          }
        }
      } catch (error) {
        // Handle cases like file being deleted or becoming inaccessible
        if (error instanceof DOMException && error.name === 'NotFoundError') {
            alert('The project file seems to have been moved or deleted. Cannot check for updates.');
        } else {
            console.error("Error checking for external file changes:", error);
        }
      }
    };

    window.addEventListener('focus', checkForExternalChanges);

    return () => {
      window.removeEventListener('focus', checkForExternalChanges);
    };
  }, [fileHandle, lastModified, saveStatus, processLoadedData]);

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
        title: 'My First Entry',
        content: '<h1>Welcome!</h1><p>This is your first entry in your new portfolio. Use the toolbar above to format your text.</p>',
        createdAt: new Date().toISOString(),
      };
      const newTopic: Topic = {
        id: `topic-${Date.now()}`,
        name: 'My First Topic',
        createdAt: new Date().toISOString(),
        entries: [newEntry],
      };
      const newPortfolioData: PortfolioData = { topics: [newTopic] };
      
      const writable = await handle.createWritable();
      await writable.write(JSON.stringify(newPortfolioData, null, 2));
      await writable.close();
      
      await saveFileHandle(handle);
      
      const newFile = await handle.getFile();
      setLastModified(newFile.lastModified);

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
      const parsedData = JSON.parse(contents);
      
      setLastModified(file.lastModified);
      await saveFileHandle(handle);
      setFileHandle(handle);
      processLoadedData(parsedData);
      setSaveStatus('saved');
    } catch (error) {
       if ((error as DOMException).name !== 'AbortError') {
        console.error("Error importing project:", error);
        alert("Failed to import file. Please ensure it is a valid portfolio JSON file.");
      }
    }
  }

  const handleAddNewTopic = () => {
    const topicName = prompt("Enter new topic name:", "New Topic");
    if (topicName && topicName.trim()) {
        const newTopic: Topic = {
            id: `topic-${Date.now()}`,
            name: topicName.trim(),
            createdAt: new Date().toISOString(),
            entries: [],
        };
        setPortfolioData(currentData => ({
            ...currentData,
            topics: [newTopic, ...currentData.topics],
        }));
        if(fileHandle) setSaveStatus('unsaved');
    }
  };

  const handleDeleteTopic = (topicId: string) => {
    const topicToDelete = portfolioData.topics.find(t => t.id === topicId);
    if (window.confirm(`Are you sure you want to delete the topic "${topicToDelete?.name}" and all its entries?`)) {
        const newTopics = portfolioData.topics.filter(t => t.id !== topicId);
        
        const activeEntryWasInDeletedTopic = topicToDelete?.entries.some(e => e.id === activeEntryId);

        setPortfolioData({
            ...portfolioData,
            topics: newTopics,
        });
        if(fileHandle) setSaveStatus('unsaved');

        if (activeEntryWasInDeletedTopic) {
            setActiveEntryId(newTopics[0]?.entries[0]?.id || null);
        }
    }
  };


  const handleAddNewEntry = (topicId: string) => {
    const newEntry: PortfolioEntry = {
      id: `entry-${Date.now()}`,
      title: 'New Entry',
      content: '',
      createdAt: new Date().toISOString(),
    };
    setPortfolioData(currentData => {
        const newTopics = currentData.topics.map(topic => {
            if (topic.id === topicId) {
                return { ...topic, entries: [newEntry, ...topic.entries] };
            }
            return topic;
        });
        return {
          ...currentData,
          topics: newTopics,
        };
    });
    if(fileHandle) setSaveStatus('unsaved');
    setActiveEntryId(newEntry.id);
  };

  const handleDeleteEntry = (id: string) => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      const newTopics = portfolioData.topics.map(topic => {
        const updatedEntries = topic.entries.filter(entry => entry.id !== id);
        return { ...topic, entries: updatedEntries };
      });

      setPortfolioData({
        ...portfolioData,
        topics: newTopics,
      });
      if(fileHandle) setSaveStatus('unsaved');

      if (activeEntryId === id) {
        const firstEntry = newTopics.flatMap(t => t.entries)[0];
        setActiveEntryId(firstEntry?.id || null);
      }
    }
  };

  const handleUpdateEntry = useCallback((id: string, updates: Partial<PortfolioEntry>) => {
    setPortfolioData(currentData => {
        const newTopics = currentData.topics.map(topic => ({
          ...topic,
          entries: topic.entries.map(entry =>
            entry.id === id ? { ...entry, ...updates } : entry
          )
        }));
        return { ...currentData, topics: newTopics };
    });
    if (fileHandle) {
        setSaveStatus('unsaved');
    }
  }, [fileHandle]);

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

  const activeEntry = portfolioData.topics
    .flatMap(topic => topic.entries)
    .find(e => e.id === activeEntryId);

  const renderMainContent = () => {
    if (activeEntry) {
      return <Editor entry={activeEntry} onUpdate={handleUpdateEntry} onDelete={handleDeleteEntry} saveStatus={saveStatus} accentColor={accentColor} theme={theme} />;
    }
    return <EmptyState />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-gray-100 dark:bg-gray-900">
        <div className="flex flex-col items-center justify-center text-center p-8 text-gray-500 dark:text-gray-400">
          <BookOpenIcon className="w-24 h-24 mb-6 text-gray-400 dark:text-gray-600 animate-pulse"/>
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
        topics={portfolioData.topics}
        activeEntryId={activeEntryId}
        theme={theme}
        accentColor={accentColor}
        onSelectEntry={setActiveEntryId}
        onCreateTopic={handleAddNewTopic}
        onCreateEntry={handleAddNewEntry}
        onDeleteEntry={handleDeleteEntry}
        onDeleteTopic={handleDeleteTopic}
        onDownload={handleDownload}
        onTriggerUpload={handleImportProject}
        onSetTheme={handleSetTheme}
        onSetAccentColor={handleSetAccentColor}
      />
      <main className="flex-1 bg-gray-100 dark:bg-gray-900">
        {renderMainContent()}
      </main>
    </div>
  );
};

export default App;