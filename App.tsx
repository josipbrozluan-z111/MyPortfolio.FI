import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Editor from './components/Editor';
import WelcomePage from './components/WelcomePage';
import EmptyState from './components/EmptyState';
import { PortfolioData, PortfolioEntry } from './types';

const App: React.FC = () => {
  const [portfolioData, setPortfolioData] = useState<PortfolioData>({ entries: [] });
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [isProjectLoaded, setIsProjectLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const savedData = localStorage.getItem('portfolioData');
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        if (parsedData && parsedData.entries && parsedData.entries.length > 0) {
            setPortfolioData(parsedData);
            setActiveEntryId(parsedData.entries[0]?.id || null);
            setIsProjectLoaded(true);
        }
      }
    } catch (error) {
      console.error("Failed to load data from localStorage", error);
    }
  }, []);

  useEffect(() => {
    if (isProjectLoaded) {
        try {
            localStorage.setItem('portfolioData', JSON.stringify(portfolioData));
        } catch (error) {
            console.error("Failed to save data to localStorage", error);
        }
    }
  }, [portfolioData, isProjectLoaded]);

  const handleCreateNewProject = () => {
    const newEntry: PortfolioEntry = {
      id: `entry-${Date.now()}`,
      title: 'New Entry',
      content: '',
      createdAt: new Date().toISOString(),
    };
    setPortfolioData({ entries: [newEntry] });
    setActiveEntryId(newEntry.id);
    setIsProjectLoaded(true);
  };

  const handleAddNewEntry = () => {
    const newEntry: PortfolioEntry = {
      id: `entry-${Date.now()}`,
      title: 'New Entry',
      content: '',
      createdAt: new Date().toISOString(),
    };
    setPortfolioData(prevData => ({
      ...prevData,
      entries: [newEntry, ...prevData.entries],
    }));
    setActiveEntryId(newEntry.id);
  };


  const handleDeleteEntry = (id: string) => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      const updatedEntries = portfolioData.entries.filter(entry => entry.id !== id);
      setPortfolioData(prevData => ({
        ...prevData,
        entries: updatedEntries,
      }));
      if (activeEntryId === id) {
        setActiveEntryId(updatedEntries.length > 0 ? updatedEntries[0].id : null);
      }
    }
  };

  const handleUpdateEntry = useCallback((id: string, updates: Partial<PortfolioEntry>) => {
    setPortfolioData(prevData => ({
      ...prevData,
      entries: prevData.entries.map(entry =>
        entry.id === id ? { ...entry, ...updates } : entry
      ),
    }));
  }, []);

  const handleDownload = () => {
    const dataStr = JSON.stringify(portfolioData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.download = 'portfolio-data.json';
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleTriggerUpload = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result;
          if (typeof text === 'string') {
            const parsedData: PortfolioData = JSON.parse(text);
            if (parsedData && Array.isArray(parsedData.entries)) {
              setPortfolioData(parsedData);
              const newActiveId = parsedData.entries.length > 0 ? parsedData.entries[0].id : null;
              setActiveEntryId(newActiveId);
              setIsProjectLoaded(true);
            } else {
              throw new Error("Invalid JSON structure.");
            }
          }
        } catch (error) {
          alert('Failed to import file. Please ensure it is a valid portfolio JSON file.');
          console.error(error);
        }
      };
      reader.readAsText(file);
    }
    event.target.value = '';
  };

  const activeEntry = portfolioData.entries.find(e => e.id === activeEntryId);

  const renderMainContent = () => {
    if (activeEntry) {
      return <Editor entry={activeEntry} onUpdate={handleUpdateEntry} onDelete={handleDeleteEntry}/>;
    }
    return <EmptyState />;
  }

  if (!isProjectLoaded) {
    return (
      <>
        <WelcomePage 
            onCreateProject={handleCreateNewProject} 
            onTriggerUpload={handleTriggerUpload} 
        />
        <input
            type="file"
            ref={fileInputRef}
            onChange={handleUpload}
            className="hidden"
            accept=".json"
        />
      </>
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
        onTriggerUpload={handleTriggerUpload}
      />
      <main className="flex-1 bg-gray-900">
        {renderMainContent()}
      </main>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleUpload}
        className="hidden"
        accept=".json"
      />
    </div>
  );
};

export default App;
