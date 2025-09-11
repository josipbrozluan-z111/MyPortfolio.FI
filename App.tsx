import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Editor from './components/Editor';
import WelcomePage from './components/WelcomePage';
import EmptyState from './components/EmptyState';
import { PortfolioData, PortfolioEntry, Topic } from './types';
import { BookOpenIcon } from './components/Icons';

const App: React.FC = () => {
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });
  const importInputRef = useRef<HTMLInputElement>(null);

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

  // --- Sidebar State ---
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prevState => !prevState);
  };
  // --- End Sidebar State ---

  // Helper function to process loaded data, handling migration from old format
  const processLoadedData = useCallback((data: any) => {
      let newPortfolioData: PortfolioData;
      let newActiveEntryId: string | null = null;
      
      if (data && Array.isArray(data.topics)) {
        // New format, load directly
        newPortfolioData = data;
        newActiveEntryId = data.topics[0]?.entries[0]?.id || null;
      } else if (data && Array.isArray(data.entries)) {
        // Old format, migrate it
        console.log("Old data format detected. Migrating to new topic-based structure.");
        const newTopic: Topic = {
          id: `topic-${Date.now()}`,
          name: 'General',
          createdAt: new Date().toISOString(),
          entries: data.entries,
        };
        newPortfolioData = { topics: [newTopic] };
        newActiveEntryId = newPortfolioData.topics[0]?.entries[0]?.id || null;
      } else {
        throw new Error("Invalid JSON structure.");
      }
      
      setPortfolioData(newPortfolioData);
      setActiveEntryId(newActiveEntryId);
  }, []);

  // Initial load from localStorage
  useEffect(() => {
    try {
      const savedData = localStorage.getItem('portfolioData');
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        processLoadedData(parsedData);
      }
    } catch (error) {
      console.error("Failed to load or parse data from localStorage", error);
      // Clear potentially corrupted data
      localStorage.removeItem('portfolioData');
    } finally {
      setIsLoading(false);
    }
  }, [processLoadedData]);

  // Auto-save to localStorage
  useEffect(() => {
    // We only save if portfolioData is not null (i.e., a project is loaded/created)
    if (portfolioData) {
      localStorage.setItem('portfolioData', JSON.stringify(portfolioData));
    }
  }, [portfolioData]);

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
    
    // Reset input value to allow re-importing the same file
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
    if (window.confirm(`Are you sure you want to delete the topic "${topicToDelete?.name}" and all its entries?`)) {
        const newTopics = portfolioData!.topics.filter(t => t.id !== topicId);
        
        const activeEntryWasInDeletedTopic = topicToDelete?.entries.some(e => e.id === activeEntryId);

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
        const newTopics = currentData!.topics.map(topic => ({
          ...topic,
          entries: topic.entries.map(entry =>
            entry.id === id ? { ...entry, ...updates } : entry
          )
        }));
        return { ...currentData!, topics: newTopics };
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
      return <Editor entry={activeEntry} onUpdate={handleUpdateEntry} onDelete={handleDeleteEntry} accentColor={accentColor} theme={theme} />;
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
    <div className="flex h-screen w-screen font-sans bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      <input type="file" ref={importInputRef} onChange={handleFileSelected} className="hidden" accept="application/json,.json" />
      <Sidebar
        topics={portfolioData.topics}
        activeEntryId={activeEntryId}
        theme={theme}
        accentColor={accentColor}
        isCollapsed={isSidebarCollapsed}
        onSelectEntry={setActiveEntryId}
        onCreateTopic={handleAddNewTopic}
        onCreateEntry={handleAddNewEntry}
        onDeleteEntry={handleDeleteEntry}
        onDeleteTopic={handleDeleteTopic}
        onDownload={handleDownload}
        onTriggerUpload={handleImportProject}
        onSetTheme={handleSetTheme}
        onSetAccentColor={handleSetAccentColor}
        onToggleSidebar={toggleSidebar}
      />
      <main className="flex-1">
        {renderMainContent()}
      </main>
    </div>
  );
};

export default App;