import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Editor from './components/Editor';
import WelcomePage from './components/WelcomePage';
import EmptyState from './components/EmptyState';
import { PortfolioData, PortfolioEntry, Topic, GoogleDriveUser } from './types';
import { BookOpenIcon } from './components/Icons';
import { loadPortfolioData, savePortfolioData } from './services/storageService';
import { initGoogleClient, signIn, signOut, savePortfolioToDrive, loadPortfolioFromDrive } from './services/googleDriveService';

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
  const [isGapiReady, setIsGapiReady] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [driveUser, setDriveUser] = useState<GoogleDriveUser | null>(null);
  const [driveStatus, setDriveStatus] = useState<DriveStatus>({ status: 'idle', message: '' });

  // --- Auto-save Settings ---
  const [autoSaveEnabled, setAutoSaveEnabled] = useState<boolean>(() => {
    // Defaults to true if not set
    return localStorage.getItem('autoSaveEnabled') !== 'false';
  });

  const [autoSaveInterval, setAutoSaveInterval] = useState<number>(() => {
    return parseInt(localStorage.getItem('autoSaveInterval') || '1000', 10); // Default to 1 second
  });

  useEffect(() => {
    localStorage.setItem('autoSaveEnabled', String(autoSaveEnabled));
  }, [autoSaveEnabled]);

  useEffect(() => {
    localStorage.setItem('autoSaveInterval', String(autoSaveInterval));
  }, [autoSaveInterval]);
  // --- End Auto-save Settings ---


  // --- Accent Color State ---
  const [accentColor, setAccentColor] = useState<string>(() => {
      return localStorage.getItem('accentColor') || '#06b6d4'; // Default cyan-600
  });

  useEffect(() => {
    document.documentElement.style.setProperty('--accent-color', accentColor);
    try {
      localStorage.setItem('accentColor', accentColor);
    } catch (error) {
      console.warn('Could not save accent color to localStorage:', error);
    }
  }, [accentColor]);
  // --- End Accent Color State ---


  // --- Sidebar State ---
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prevState => !prevState);
  };
  // --- End Sidebar State ---
  
  // Persist active entry ID
  useEffect(() => {
    if (activeEntryId) {
      localStorage.setItem('activeEntryId', activeEntryId);
    } else {
      localStorage.removeItem('activeEntryId');
    }
  }, [activeEntryId]);


  // Helper function to process loaded data
  const processLoadedData = useCallback((data: any) => {
      let newPortfolioData: PortfolioData;
      
      if (data && Array.isArray(data.topics)) {
        newPortfolioData = data;
      } else {
        console.error("Loaded data has invalid structure.");
        return;
      }
      
      setPortfolioData(newPortfolioData);

      const lastActiveId = localStorage.getItem('activeEntryId');
      const allEntryIds = new Set(newPortfolioData.topics.flatMap(t => t.entries.map(e => e.id)));
      if (lastActiveId && allEntryIds.has(lastActiveId)) {
        setActiveEntryId(lastActiveId);
      } else {
        setActiveEntryId(newPortfolioData.topics[0]?.entries[0]?.id || null);
      }
  }, []);

  // Initial load from storage
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        await initGoogleClient(() => setIsGapiReady(true));
        const data = await loadPortfolioData();
        if (data) {
          processLoadedData(data);
        }
      } catch (error) {
        console.error("Failed to load or parse data from storage", error);
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
          saveStatusTimeoutRef.current = window.setTimeout(() => {
              setSaveStatus('idle');
          }, 2000);
        })
        .catch((error: any) => {
          console.error("Failed to save to IndexedDB:", error);
          setSaveStatus('error');
          if (error && error.name === 'QuotaExceededError') {
              setSaveError("Storage quota exceeded. The portfolio is too large to save. Please try removing large images or exporting your data as a backup.");
          } else if (error && error.message) {
              setSaveError(`An unexpected error occurred: ${error.message}`);
          } else {
              setSaveError("An unknown error occurred while saving. Please export your work to prevent data loss.");
          }
        });
    }
  }, [portfolioData, isLoading]);

  const setDriveStatusWithTimeout = (status: DriveStatus) => {
    setDriveStatus(status);
    clearTimeout(driveStatusTimeoutRef.current);
    if(status.status === 'success' || status.status === 'error') {
      driveStatusTimeoutRef.current = window.setTimeout(() => {
        setDriveStatus({ status: 'idle', message: '' });
      }, 3000);
    }
  };

  const handleDriveSignIn = async (andThen?: 'load') => {
    try {
        setDriveStatusWithTimeout({ status: 'loading', message: 'Signing in...' });
        const user = await signIn();
        setDriveUser(user);
        setIsSignedIn(true);
        setDriveStatusWithTimeout({ status: 'success', message: `Signed in as ${user.name}` });
        if(andThen === 'load') {
            await handleLoadFromDrive();
        }
    } catch (error: any) {
        console.error("Sign in failed:", error);
        setDriveStatusWithTimeout({ status: 'error', message: `Sign in failed: ${error.message}` });
    }
  };

  const handleDriveSignOut = () => {
      signOut();
      setIsSignedIn(false);
      setDriveUser(null);
      setDriveStatusWithTimeout({ status: 'idle', message: '' });
  };

  const handleSaveToDrive = async () => {
    if (!portfolioData) return;
    try {
      setDriveStatusWithTimeout({ status: 'loading', message: 'Saving to Drive...' });
      await savePortfolioToDrive(portfolioData);
      setDriveStatusWithTimeout({ status: 'success', message: 'Successfully saved to Drive.' });
    } catch (error: any) {
      setDriveStatusWithTimeout({ status: 'error', message: error.message || 'Failed to save.' });
    }
  };

  const handleLoadFromDrive = async () => {
    if (!window.confirm("Loading from Google Drive will overwrite your current local data. Are you sure you want to continue?")) {
        return;
    }
    try {
        setDriveStatusWithTimeout({ status: 'loading', message: 'Loading from Drive...' });
        const data = await loadPortfolioFromDrive();
        if (data) {
            processLoadedData(data);
            setDriveStatusWithTimeout({ status: 'success', message: 'Successfully loaded from Drive.' });
        } else {
            setDriveStatusWithTimeout({ status: 'error', message: 'No portfolio file found in Drive.' });
        }
    } catch (error: any) {
        setDriveStatusWithTimeout({ status: 'error', message: error.message || 'Failed to load.' });
    }
  };

  const handleCreateNewProject = () => {
    const newEntry: PortfolioEntry = {
      id: crypto.randomUUID(),
      title: 'My First Entry',
      content: '<h1>Welcome!</h1><p>This is your first entry in your new portfolio. Use the toolbar above to format your text.</p>',
      createdAt: new Date().toISOString(),
    };
    const newTopic: Topic = {
      id: crypto.randomUUID(),
      name: 'My First Topic',
      createdAt: new Date().toISOString(),
      entries: [newEntry],
    };
    const newPortfolioData: PortfolioData = { topics: [newTopic] };
    
    setPortfolioData(newPortfolioData);
    setActiveEntryId(newEntry.id);
  };

  const handleImportProject = () => {
    importInputRef.current?.click();
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const text = e.target?.result;
            if (typeof text !== 'string') throw new Error("File could not be read as text");
            const parsedData = JSON.parse(text);
            processLoadedData(parsedData);
        } catch (error) {
            console.error("Error importing project:", error);
            alert("Failed to import file. Please ensure it is a valid portfolio JSON file.");
        }
    };
    reader.readAsText(file);
    if (event.target) event.target.value = '';
  };


  const handleAddNewTopic = () => {
    const topicName = prompt("Enter new topic name:", "New Topic");
    if (topicName && topicName.trim()) {
        const newTopic: Topic = {
            id: crypto.randomUUID(),
            name: topicName.trim(),
            createdAt: new Date().toISOString(),
            entries: [],
        };
        setPortfolioData(currentData => ({
            topics: [...(currentData?.topics || []), newTopic],
        }));
    }
  };

  const handleDeleteTopic = (topicId: string) => {
    const topicToDelete = portfolioData?.topics.find(t => t.id === topicId);
    if (!topicToDelete) return;
    
    if (window.confirm(`Are you sure you want to delete the topic "${topicToDelete.name}" and all its entries?`)) {
        setPortfolioData(currentData => {
            if (!currentData) return currentData;
            
            const newTopics = currentData.topics.filter(t => t.id !== topicId);
            const activeEntryWasInDeletedTopic = topicToDelete.entries.some(e => e.id === activeEntryId);

            if (activeEntryWasInDeletedTopic) {
                setActiveEntryId(newTopics[0]?.entries[0]?.id || null);
            }

            return { topics: newTopics };
        });
    }
  };


  const handleAddNewEntry = (topicId: string) => {
    const newEntry: PortfolioEntry = {
      id: crypto.randomUUID(),
      title: 'New Entry',
      content: '',
      createdAt: new Date().toISOString(),
    };
    setPortfolioData(currentData => {
        if (!currentData) return currentData;
        const newTopics = currentData.topics.map(topic => {
            if (topic.id === topicId) return { ...topic, entries: [...topic.entries, newEntry] };
            return topic;
        });
        return { topics: newTopics };
    });
    setActiveEntryId(newEntry.id);
  };

  const handleDeleteEntry = (id: string) => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      setPortfolioData(currentData => {
        if (!currentData) return currentData;
        
        let newActiveId = activeEntryId;
        let deletedEntryTopicId: string | null = null;
        let deletedEntryIndex = -1;

        for (const topic of currentData.topics) {
            const index = topic.entries.findIndex(e => e.id === id);
            if (index !== -1) {
                deletedEntryTopicId = topic.id;
                deletedEntryIndex = index;
                break;
            }
        }
        
        const newTopics = currentData.topics.map(topic => ({
          ...topic,
          entries: topic.entries.filter(entry => entry.id !== id)
        }));

        if (activeEntryId === id) {
            const topicOfDeletedEntry = newTopics.find(t => t.id === deletedEntryTopicId);
            const entriesInTopic = topicOfDeletedEntry?.entries || [];
            
            if (entriesInTopic.length > 0) {
                const newIndex = Math.min(deletedEntryIndex, entriesInTopic.length - 1);
                newActiveId = entriesInTopic[newIndex].id;
            } else {
                newActiveId = newTopics.find(t => t.entries.length > 0)?.entries[0]?.id || null;
            }
            setActiveEntryId(newActiveId);
        }

        return { topics: newTopics };
      });
    }
  };

  const handleUpdateEntry = useCallback((id: string, updates: Partial<PortfolioEntry>) => {
    setPortfolioData(currentData => {
      if (!currentData) return null;
  
      const newTopics = currentData.topics.map(topic => {
        const entryIndex = topic.entries.findIndex(entry => entry.id === id);
        if (entryIndex === -1) return topic;

        const newEntries = [...topic.entries];
        newEntries[entryIndex] = { ...newEntries[entryIndex], ...updates };
        return { ...topic, entries: newEntries };
      });
      
      return { topics: newTopics };
    });
  }, []);

  const handleDownload = () => {
    if (!portfolioData) return;
    const dataStr = JSON.stringify(portfolioData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.download = 'portfolio-data.json';
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const activeEntry = portfolioData?.topics
    .flatMap(topic => topic.entries)
    .find(e => e.id === activeEntryId);

  const renderMainContent = () => {
    if (activeEntry) {
      return <Editor 
        entry={activeEntry} 
        onUpdate={handleUpdateEntry} 
        onDelete={handleDeleteEntry} 
        accentColor={accentColor} 
        isSidebarCollapsed={isSidebarCollapsed} 
        saveStatus={saveStatus} 
        saveError={saveError}
        autoSaveEnabled={autoSaveEnabled}
        autoSaveInterval={autoSaveInterval}
      />;
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
  
  if (!portfolioData) {
    return (
      <>
        <input type="file" ref={importInputRef} onChange={handleFileSelected} className="hidden" accept="application/json,.json" />
        <WelcomePage 
            onCreateProject={handleCreateNewProject} 
            onTriggerUpload={handleImportProject} 
            isGapiReady={isGapiReady}
            onTriggerDriveLoad={() => handleDriveSignIn('load')}
        />
      </>
    );
  }

  return (
    <div className="flex h-screen w-screen font-sans text-gray-800 dark:text-gray-200">
      <input type="file" ref={importInputRef} onChange={handleFileSelected} className="hidden" accept="application/json,.json" />
      <Sidebar
        topics={portfolioData.topics}
        activeEntryId={activeEntryId}
        accentColor={accentColor}
        isCollapsed={isSidebarCollapsed}
        autoSaveEnabled={autoSaveEnabled}
        autoSaveInterval={autoSaveInterval}
        isGapiReady={isGapiReady}
        isSignedIn={isSignedIn}
        driveUser={driveUser}
        driveStatus={driveStatus}
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
        onDriveSignIn={() => handleDriveSignIn()}
        onDriveSignOut={handleDriveSignOut}
        onSaveToDrive={handleSaveToDrive}
        onLoadFromDrive={handleLoadFromDrive}
      />
      <main className="flex-1">
        {renderMainContent()}
      </main>
    </div>
  );
};

export default App;
