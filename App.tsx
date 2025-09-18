import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Editor from './components/Editor';
import WelcomePage from './components/WelcomePage';
import EmptyState from './components/EmptyState';
import { PortfolioData, PortfolioEntry, Topic, GoogleDriveUser } from './types';
import { BookOpenIcon } from './components/Icons';
import { loadPortfolioData, savePortfolioData } from './services/storageService';
import { initGoogleAuth, initGoogleDriveApi, signIn, signOut, savePortfolioToDrive, loadPortfolioFromDrive, restoreSignIn } from './services/googleDriveService';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
type DriveStatus = {
  status: 'idle' | 'loading' | 'success' | 'error';
  message: string;
};

const App: React.FC = () => {
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(() => localStorage.getItem('activeEntryId'));
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });
  const importInputRef = useRef<HTMLInputElement>(null);
  const saveStatusTimeoutRef = useRef<number | undefined>(undefined);
  const driveStatusTimeoutRef = useRef<number | undefined>(undefined);

  // --- Google Drive State ---
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isDriveApiReady, setIsDriveApiReady] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [driveUser, setDriveUser] = useState<GoogleDriveUser | null>(null);
  const [driveStatus, setDriveStatus] = useState<DriveStatus>({ status: 'idle', message: '' });
  const [isDriveSyncEnabled, setIsDriveSyncEnabled] = useState<boolean>(() => {
    return localStorage.getItem('driveSyncEnabled') === 'true';
  });

  // --- Auto-save Settings ---
  const [autoSaveEnabled, setAutoSaveEnabled] = useState<boolean>(() => {
    return localStorage.getItem('autoSaveEnabled') !== 'false';
  });

  const [autoSaveInterval, setAutoSaveInterval] = useState<number>(() => {
    return parseInt(localStorage.getItem('autoSaveInterval') || '1000', 10);
  });

  useEffect(() => {
    localStorage.setItem('autoSaveEnabled', String(autoSaveEnabled));
  }, [autoSaveEnabled]);

  useEffect(() => {
    localStorage.setItem('autoSaveInterval', String(autoSaveInterval));
  }, [autoSaveInterval]);

  // --- Accent Color State ---
  const [accentColor, setAccentColor] = useState<string>(() => {
      return localStorage.getItem('accentColor') || '#06b6d4';
  });

  useEffect(() => {
    document.documentElement.style.setProperty('--accent-color', accentColor);
    localStorage.setItem('accentColor', accentColor);
  }, [accentColor]);

  // --- Sidebar State ---
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  const toggleSidebar = () => setIsSidebarCollapsed(prevState => !prevState);
  
  // Persist active entry ID
  useEffect(() => {
    if (activeEntryId) localStorage.setItem('activeEntryId', activeEntryId);
    else localStorage.removeItem('activeEntryId');
  }, [activeEntryId]);

  const processLoadedData = useCallback((data: any) => {
      if (!data || !Array.isArray(data.topics)) {
        console.error("Loaded data has invalid structure.");
        return;
      }
      
      setPortfolioData(data);

      const lastActiveId = localStorage.getItem('activeEntryId');
      const allEntryIds = new Set(data.topics.flatMap((t: Topic) => t.entries.map(e => e.id)));
      if (lastActiveId && allEntryIds.has(lastActiveId)) {
        setActiveEntryId(lastActiveId);
      } else {
        setActiveEntryId(data.topics[0]?.entries[0]?.id || null);
      }
  }, []);

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        await initGoogleAuth();
        setIsAuthReady(true);
        // Attempt to restore the user's session
        const user = await restoreSignIn();
        if (user) {
          setDriveUser(user);
          setIsSignedIn(true);
        }
      } catch (error) {
        console.error("Failed to initialize Google Auth Services:", error);
        setIsAuthReady(false);
      }
      
      try {
        const data = await loadPortfolioData();
        if (data) processLoadedData(data);
      } catch (error) {
        console.error("Failed to load data from local storage", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [processLoadedData]);

  // Auto-save to IndexedDB
  useEffect(() => {
    if (portfolioData && !isLoading) {
      clearTimeout(saveStatusTimeoutRef.current);
      setSaveStatus('saving');
      setSaveError(null);
      
      savePortfolioData(portfolioData)
        .then(() => {
          setSaveStatus('saved');
          saveStatusTimeoutRef.current = window.setTimeout(() => setSaveStatus('idle'), 2000);
        })
        .catch((error: any) => {
          console.error("Failed to save to IndexedDB:", error);
          setSaveStatus('error');
          setSaveError(error.name === 'QuotaExceededError' ? "Storage quota exceeded." : "An unexpected error occurred while saving.");
        });
    }
  }, [portfolioData, isLoading]);

  const setDriveStatusWithTimeout = (status: DriveStatus) => {
    setDriveStatus(status);
    clearTimeout(driveStatusTimeoutRef.current);
    if(status.status === 'success' || status.status === 'error') {
      driveStatusTimeoutRef.current = window.setTimeout(() => {
        setDriveStatus({ status: 'idle', message: '' });
      }, 4000);
    }
  };

  const handleDriveSignIn = async () => {
    try {
        setDriveStatusWithTimeout({ status: 'loading', message: 'Signing in...' });
        const user = await signIn();
        setDriveUser(user);
        setIsSignedIn(true);
        setDriveStatusWithTimeout({ status: 'success', message: `Signed in as ${user.name}` });
    } catch (error: any) {
        console.error("Sign in failed:", error);
        setDriveStatusWithTimeout({ status: 'error', message: error.message || "Sign-in failed." });
    }
  };

  const handleDriveSignOut = () => {
      signOut();
      setIsSignedIn(false);
      setDriveUser(null);
      setIsDriveSyncEnabled(false);
      localStorage.setItem('driveSyncEnabled', 'false');
      setIsDriveApiReady(false);
      setDriveStatus({ status: 'idle', message: '' });
  };
  
  const handleSetDriveSyncEnabled = async (enabled: boolean) => {
    setIsDriveSyncEnabled(enabled);
    localStorage.setItem('driveSyncEnabled', String(enabled));

    if (enabled && !isDriveApiReady) {
        setDriveStatusWithTimeout({ status: 'loading', message: 'Initializing Drive API...' });
        try {
            await initGoogleDriveApi();
            setIsDriveApiReady(true);
            setDriveStatusWithTimeout({ status: 'success', message: 'Drive API is ready.' });
        } catch (error: any) {
            console.error("Failed to initialize Drive API:", error);
            setIsDriveSyncEnabled(false); // Flip toggle back on failure
            localStorage.setItem('driveSyncEnabled', 'false');
            setDriveStatusWithTimeout({ status: 'error', message: `Initialization failed.` });
        }
    }
  };

  const handleSaveToDrive = async () => {
    if (!portfolioData) return;
    try {
      setDriveStatusWithTimeout({ status: 'loading', message: 'Saving to Drive...' });
      await savePortfolioToDrive(portfolioData);
      setDriveStatusWithTimeout({ status: 'success', message: 'Successfully saved.' });
    } catch (error: any) {
      setDriveStatusWithTimeout({ status: 'error', message: error.message || 'Failed to save.' });
    }
  };

  const handleLoadFromDrive = async () => {
    if (!window.confirm("Loading from Google Drive will overwrite your current local data. Are you sure?")) return;
    try {
        setDriveStatusWithTimeout({ status: 'loading', message: 'Loading from Drive...' });
        const data = await loadPortfolioFromDrive();
        if (data) {
            processLoadedData(data);
            setDriveStatusWithTimeout({ status: 'success', message: 'Successfully loaded.' });
        } else {
            setDriveStatusWithTimeout({ status: 'error', message: 'No portfolio file found.' });
        }
    } catch (error: any) {
        setDriveStatusWithTimeout({ status: 'error', message: error.message || 'Failed to load.' });
    }
  };

  const handleCreateNewProject = () => {
    const newEntry: PortfolioEntry = { id: crypto.randomUUID(), title: 'My First Entry', content: '<h1>Welcome!</h1><p>Start writing here.</p>', createdAt: new Date().toISOString() };
    const newTopic: Topic = { id: crypto.randomUUID(), name: 'My First Topic', createdAt: new Date().toISOString(), entries: [newEntry] };
    setPortfolioData({ topics: [newTopic] });
    setActiveEntryId(newEntry.id);
  };

  const handleImportProject = () => importInputRef.current?.click();

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const text = e.target?.result as string;
            processLoadedData(JSON.parse(text));
        } catch (error) {
            alert("Failed to import file. Please ensure it is a valid portfolio JSON file.");
        }
    };
    reader.readAsText(file);
    if (event.target) event.target.value = '';
  };

  const handleGoogleStart = async () => {
    try {
      const user = await signIn();
      setDriveUser(user);
      setIsSignedIn(true);
      handleCreateNewProject();
    } catch (error: any) {
      alert(`Sign-in failed: ${error.message || "An unknown error occurred."}`);
    }
  };

  const handleAddNewTopic = () => {
    const topicName = prompt("Enter new topic name:", "New Topic");
    if (topicName?.trim()) {
        const newTopic: Topic = { id: crypto.randomUUID(), name: topicName.trim(), createdAt: new Date().toISOString(), entries: [] };
        setPortfolioData(d => ({ topics: [...(d?.topics || []), newTopic] }));
    }
  };

  const handleDeleteTopic = (topicId: string) => {
    const topic = portfolioData?.topics.find(t => t.id === topicId);
    if (topic && window.confirm(`Delete "${topic.name}" and all its entries?`)) {
        setPortfolioData(d => {
            if (!d) return d;
            const newTopics = d.topics.filter(t => t.id !== topicId);
            if (topic.entries.some(e => e.id === activeEntryId)) {
                setActiveEntryId(newTopics[0]?.entries[0]?.id || null);
            }
            return { topics: newTopics };
        });
    }
  };

  const handleAddNewEntry = (topicId: string) => {
    const newEntry: PortfolioEntry = { id: crypto.randomUUID(), title: 'New Entry', content: '', createdAt: new Date().toISOString() };
    setPortfolioData(d => {
        if (!d) return d;
        const newTopics = d.topics.map(t => t.id === topicId ? { ...t, entries: [...t.entries, newEntry] } : t);
        return { topics: newTopics };
    });
    setActiveEntryId(newEntry.id);
  };

  const handleDeleteEntry = (id: string) => {
    if (window.confirm('Delete this entry?')) {
      setPortfolioData(d => {
        if (!d) return d;
        let newActiveId = activeEntryId;
        const newTopics = d.topics.map(topic => ({...topic, entries: topic.entries.filter(e => e.id !== id)}));
        if (activeEntryId === id) {
            newActiveId = newTopics.flatMap(t => t.entries)[0]?.id || null;
            setActiveEntryId(newActiveId);
        }
        return { topics: newTopics };
      });
    }
  };

  const handleUpdateEntry = useCallback((id: string, updates: Partial<PortfolioEntry>) => {
    setPortfolioData(d => {
      if (!d) return null;
      const newTopics = d.topics.map(t => {
        const index = t.entries.findIndex(e => e.id === id);
        if (index === -1) return t;
        const newEntries = [...t.entries];
        newEntries[index] = { ...newEntries[index], ...updates };
        return { ...t, entries: newEntries };
      });
      return { topics: newTopics };
    });
  }, []);

  const handleDownload = () => {
    if (!portfolioData) return;
    const blob = new Blob([JSON.stringify(portfolioData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'portfolio-data.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeEntry = portfolioData?.topics.flatMap(t => t.entries).find(e => e.id === activeEntryId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
        <div className="flex flex-col items-center text-gray-500 dark:text-gray-400">
          <BookOpenIcon className="w-24 h-24 mb-6 text-gray-400 dark:text-gray-600 animate-pulse"/>
          <h2 className="text-2xl font-semibold">Loading Your Workspace</h2>
        </div>
      </div>
    );
  }
  
  if (!portfolioData) {
    return (
      <>
        <input type="file" ref={importInputRef} onChange={handleFileSelected} className="hidden" accept=".json" />
        <WelcomePage onCreateProject={handleCreateNewProject} onTriggerUpload={handleImportProject} isAuthReady={isAuthReady} onGoogleStart={handleGoogleStart} />
      </>
    );
  }

  return (
    <div className="flex h-screen w-screen font-sans text-gray-800 dark:text-gray-200">
      <input type="file" ref={importInputRef} onChange={handleFileSelected} className="hidden" accept=".json" />
      <Sidebar
        topics={portfolioData.topics}
        activeEntryId={activeEntryId}
        accentColor={accentColor}
        isCollapsed={isSidebarCollapsed}
        autoSaveEnabled={autoSaveEnabled}
        autoSaveInterval={autoSaveInterval}
        isAuthReady={isAuthReady}
        isDriveApiReady={isDriveApiReady}
        isSignedIn={isSignedIn}
        driveUser={driveUser}
        driveStatus={driveStatus}
        isDriveSyncEnabled={isDriveSyncEnabled}
        onSelectEntry={setActiveEntryId}
        onCreateTopic={handleAddNewTopic}
        onCreateEntry={handleAddNewEntry}
        onDeleteEntry={handleDeleteEntry}
        onDeleteTopic={handleDeleteTopic}
        onDownload={handleDownload}
        onTriggerUpload={handleImportProject}
        onSetAccentColor={setAccentColor}
        onToggleSidebar={toggleSidebar}
        onSetAutoSaveEnabled={setAutoSaveEnabled}
        onSetAutoSaveInterval={setAutoSaveInterval}
        onSetDriveSyncEnabled={handleSetDriveSyncEnabled}
        onDriveSignIn={handleDriveSignIn}
        onDriveSignOut={handleDriveSignOut}
        onSaveToDrive={handleSaveToDrive}
        onLoadFromDrive={handleLoadFromDrive}
      />
      <main className="flex-1">
        {activeEntry ? <Editor 
          entry={activeEntry} 
          onUpdate={handleUpdateEntry} 
          onDelete={handleDeleteEntry} 
          accentColor={accentColor} 
          isSidebarCollapsed={isSidebarCollapsed} 
          saveStatus={saveStatus} 
          saveError={saveError}
          autoSaveEnabled={autoSaveEnabled}
          autoSaveInterval={autoSaveInterval}
        /> : <EmptyState />}
      </main>
    </div>
  );
};

export default App;
