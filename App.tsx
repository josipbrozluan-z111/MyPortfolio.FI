import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Editor from './components/Editor';
import WelcomePage from './components/WelcomePage';
import EmptyState from './components/EmptyState';
import { PortfolioData, PortfolioEntry, Topic } from './types';
import { BookOpenIcon } from './components/Icons';
import { loadPortfolioData, savePortfolioData, clearOldLocalStorageData } from './services/storageService';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

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

  // --- Accent Color State ---
  const [accentColor, setAccentColor] = useState<string>(() => {
      return localStorage.getItem('accentColor') || '#06b6d4'; // Default cyan-600
  });

  // Effect for handling all accent-color-related side-effects
  useEffect(() => {
    // 1. Update CSS custom property for styling
    document.documentElement.style.setProperty('--accent-color', accentColor);

    // 2. Persist accent color choice to localStorage
    try {
      localStorage.setItem('accentColor', accentColor);
    } catch (error) {
      console.warn('Could not save accent color to localStorage:', error);
    }
  }, [accentColor]); // Re-run this effect whenever the accentColor state changes
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


  // Helper function to process loaded data, handling migration from old format
  const processLoadedData = useCallback((data: any) => {
      let newPortfolioData: PortfolioData;
      
      if (data && Array.isArray(data.topics)) {
        newPortfolioData = data;
      } else if (data && Array.isArray(data.entries)) {
        console.log("Old data format detected. Migrating to new topic-based structure.");
        const newTopic: Topic = {
          id: `topic-${Date.now()}`,
          name: 'General',
          createdAt: new Date().toISOString(),
          entries: data.entries,
        };
        newPortfolioData = { topics: [newTopic] };
      } else {
        console.error("Loaded data has invalid structure.");
        return; // Avoid setting corrupt data
      }
      
      setPortfolioData(newPortfolioData);

      // Validate the activeEntryId from localStorage, or set a default one
      const lastActiveId = localStorage.getItem('activeEntryId');
      const allEntryIds = new Set(newPortfolioData.topics.flatMap(t => t.entries.map(e => e.id)));
      if (lastActiveId && allEntryIds.has(lastActiveId)) {
        setActiveEntryId(lastActiveId);
      } else {
        // Set to first entry if last active is invalid or not found
        setActiveEntryId(newPortfolioData.topics[0]?.entries[0]?.id || null);
      }
  }, []);

  // Initial load from storage (IndexedDB with localStorage fallback/migration)
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const data = await loadPortfolioData();
        
        if (data) {
          processLoadedData(data);
        } else {
          const savedData = localStorage.getItem('portfolioData');
          if (savedData) {
            console.log("Migrating data from localStorage to IndexedDB.");
            const parsedData = JSON.parse(savedData);
            processLoadedData(parsedData);
            // The save effect will handle saving to IndexedDB. We clear old storage after.
            clearOldLocalStorageData();
          }
        }
      } catch (error) {
        console.error("Failed to load or parse data from storage", error);
        // Clear potentially corrupted old data
        clearOldLocalStorageData();
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
      setSaveError(null); // Clear previous errors on new save attempt
      
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
          // Set a more specific error message
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

  const handleCreateNewProject = () => {
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
            if (typeof text !== 'string') {
                throw new Error("File could not be read as text");
            }
            const parsedData = JSON.parse(text);
            processLoadedData(parsedData);
        } catch (error) {
            console.error("Error importing project:", error);
            alert("Failed to import file. Please ensure it is a valid portfolio JSON file.");
        }
    };
    reader.onerror = () => {
        console.error("Error reading file:", reader.error);
        alert("Could not read the selected file.");
    };

    reader.readAsText(file);
    
    if (event.target) {
        event.target.value = '';
    }
  };


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
            ...currentData!,
            topics: [newTopic, ...(currentData?.topics || [])],
        }));
    }
  };

  const handleDeleteTopic = (topicId: string) => {
    const topicToDelete = portfolioData?.topics.find(t => t.id === topicId);
    if (!topicToDelete) return;
    
    if (window.confirm(`Are you sure you want to delete the topic "${topicToDelete.name}" and all its entries?`)) {
        const newTopics = portfolioData!.topics.filter(t => t.id !== topicId);
        
        const activeEntryWasInDeletedTopic = topicToDelete.entries.some(e => e.id === activeEntryId);

        setPortfolioData({
            ...portfolioData!,
            topics: newTopics,
        });

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
        const newTopics = currentData!.topics.map(topic => {
            if (topic.id === topicId) {
                return { ...topic, entries: [newEntry, ...topic.entries] };
            }
            return topic;
        });
        return {
          ...currentData!,
          topics: newTopics,
        };
    });
    setActiveEntryId(newEntry.id);
  };

  const handleDeleteEntry = (id: string) => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      const newTopics = portfolioData!.topics.map(topic => {
        const updatedEntries = topic.entries.filter(entry => entry.id !== id);
        return { ...topic, entries: updatedEntries };
      });

      setPortfolioData({
        ...portfolioData!,
        topics: newTopics,
      });

      if (activeEntryId === id) {
        const firstEntry = newTopics.flatMap(t => t.entries)[0];
        setActiveEntryId(firstEntry?.id || null);
      }
    }
  };

  const handleUpdateEntry = useCallback((id: string, updates: Partial<PortfolioEntry>) => {
    setPortfolioData(currentData => {
        if (!currentData) return null;
        const newTopics = currentData.topics.map(topic => ({
          ...topic,
          entries: topic.entries.map(entry =>
            entry.id === id ? { ...entry, ...updates } : entry
          )
        }));
        return { ...currentData, topics: newTopics };
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
      return <Editor entry={activeEntry} onUpdate={handleUpdateEntry} onDelete={handleDeleteEntry} accentColor={accentColor} isSidebarCollapsed={isSidebarCollapsed} saveStatus={saveStatus} saveError={saveError} />;
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
  
  // Render welcome page if no project is loaded
  if (!portfolioData) {
    return (
      <>
        <input type="file" ref={importInputRef} onChange={handleFileSelected} className="hidden" accept="application/json,.json" />
        <WelcomePage 
            onCreateProject={handleCreateNewProject} 
            onTriggerUpload={handleImportProject} 
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
        onSelectEntry={setActiveEntryId}
        onCreateTopic={handleAddNewTopic}
        onCreateEntry={handleAddNewEntry}
        onDeleteEntry={handleDeleteEntry}
        onDeleteTopic={handleDeleteTopic}
        onDownload={handleDownload}
        onTriggerUpload={handleImportProject}
        onSetAccentColor={setAccentColor}
        onToggleSidebar={toggleSidebar}
      />
      <main className="flex-1">
        {renderMainContent()}
      </main>
    </div>
  );
};

export default App;