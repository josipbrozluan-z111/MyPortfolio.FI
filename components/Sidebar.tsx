import React, { useState, useRef, useEffect } from 'react';
import { Topic, PortfolioEntry } from '../types';
import { PlusIcon, TrashIcon, DownloadIcon, UploadIcon, BookOpenIcon, CogIcon, FolderIcon, ChevronDownIcon, SunIcon, MoonIcon, ChevronLeftIcon, ChevronRightIcon } from './Icons';

interface SidebarProps {
  topics: Topic[];
  activeEntryId: string | null;
  theme: 'light' | 'dark';
  accentColor: string;
  isCollapsed: boolean;
  onSelectEntry: (id: string) => void;
  onCreateTopic: () => void;
  onCreateEntry: (topicId: string) => void;
  onDeleteEntry: (id: string) => void;
  onDeleteTopic: (topicId: string) => void;
  onDownload: () => void;
  onTriggerUpload: () => void;
  onSetTheme: (theme: 'light' | 'dark') => void;
  onSetAccentColor: (color: string) => void;
  onToggleSidebar: () => void;
}

const ACCENT_COLORS = [
    '#34d399', // emerald-400
    '#fbbf24', // amber-400
    '#60a5fa', // blue-400
    '#f87171', // red-400
    '#a78bfa', // violet-400
    '#06b6d4', // cyan-600
];

const Sidebar: React.FC<SidebarProps> = ({
  topics,
  activeEntryId,
  theme,
  accentColor,
  isCollapsed,
  onSelectEntry,
  onCreateTopic,
  onCreateEntry,
  onDeleteEntry,
  onDeleteTopic,
  onDownload,
  onTriggerUpload,
  onSetTheme,
  onSetAccentColor,
  onToggleSidebar,
}) => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Populate expanded topics on initial load
    const initialExpanded = new Set<string>();
    topics.forEach(topic => {
      if (topic.entries.some(entry => entry.id === activeEntryId)) {
        initialExpanded.add(topic.id);
      }
    });
    // if no active entry, expand the first topic by default
    if (initialExpanded.size === 0 && topics.length > 0) {
        initialExpanded.add(topics[0].id);
    }
    setExpandedTopics(initialExpanded);
  }, [topics, activeEntryId]);

  const toggleTopic = (topicId: string) => {
    const newSet = new Set(expandedTopics);
    if (newSet.has(topicId)) {
      newSet.delete(topicId);
    } else {
      newSet.add(topicId);
    }
    setExpandedTopics(newSet);
  };

  // Close settings popover on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Close settings if sidebar collapses
  useEffect(() => {
    if (isCollapsed) {
        setSettingsOpen(false);
    }
  }, [isCollapsed]);

  return (
    <div className={`sidebar ${isCollapsed ? 'w-16' : 'w-1/4 max-w-sm'} bg-gray-200/50 dark:bg-gray-800/50 backdrop-blur-sm border-r border-gray-300/50 dark:border-gray-700/50 flex flex-col h-full transition-all duration-300 ease-in-out`}>
      <div className="p-4 border-b border-gray-300/50 dark:border-gray-700/50 flex items-center justify-between">
        {!isCollapsed && (
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2 truncate">
                <BookOpenIcon className="w-7 h-7 accent-text"/>
                Portfolio Writer
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">Your personal writing space.</p>
          </div>
        )}
        <button 
            onClick={onToggleSidebar} 
            className={`p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors ${isCollapsed ? 'mx-auto' : 'ml-2'}`}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRightIcon className="w-5 h-5"/> : <ChevronLeftIcon className="w-5 h-5"/>}
        </button>
      </div>

      {!isCollapsed && (
        <>
            <div className="flex-grow p-2 overflow-y-auto">
                <button
                onClick={onCreateTopic}
                className="w-full flex items-center justify-center gap-2 mb-2 px-4 py-2 text-sm font-medium text-white accent-bg accent-bg-hover rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-800 ring-accent transition-all"
                >
                <PlusIcon className="w-5 h-5" />
                New Topic
                </button>
                <div className="space-y-1">
                {topics.map((topic) => (
                    <div key={topic.id}>
                    <div
                        onClick={() => toggleTopic(topic.id)}
                        className="group flex justify-between items-center p-2 rounded-md cursor-pointer hover:bg-black/5 dark:hover:bg-gray-700/50 transition-colors"
                    >
                        <div className="flex items-center gap-2 flex-1 truncate">
                            <FolderIcon className="w-5 h-5 accent-text flex-shrink-0" />
                            <span className="font-semibold text-sm text-gray-700 dark:text-gray-200 truncate">{topic.name}</span>
                        </div>
                        <div className="flex items-center">
                            <button
                                onClick={(e) => { e.stopPropagation(); onCreateEntry(topic.id); }}
                                className="p-1 rounded-full text-gray-500 dark:text-gray-400 hover:bg-black/10 dark:hover:bg-white/10 group-hover-accent-text opacity-0 group-hover:opacity-100 transition-opacity"
                                aria-label="New entry in this topic"
                            >
                                <PlusIcon className="w-4 h-4" />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onDeleteTopic(topic.id); }}
                                className="ml-1 p-1 rounded-full text-gray-500 dark:text-gray-400 hover:bg-red-500/10 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                aria-label="Delete topic"
                            >
                                <TrashIcon className="w-4 h-4" />
                            </button>
                            <ChevronDownIcon className={`w-5 h-5 text-gray-400 ml-2 transform transition-transform ${expandedTopics.has(topic.id) ? 'rotate-180' : ''}`} />
                        </div>
                    </div>

                    {expandedTopics.has(topic.id) && (
                        <div className="pl-4 pt-1 space-y-1 border-l-2 border-gray-300 dark:border-gray-700 ml-2">
                            {topic.entries.map((entry) => (
                                <div
                                key={entry.id}
                                onClick={() => onSelectEntry(entry.id)}
                                className={`group flex justify-between items-center p-2.5 pl-3 rounded-md cursor-pointer transition-colors ${
                                    activeEntryId === entry.id
                                    ? 'bg-black/10 dark:bg-white/5'
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-gray-700/50'
                                }`}
                                >
                                    <div className="flex-1 truncate">
                                        <p className={`font-semibold text-sm truncate ${activeEntryId === entry.id ? 'accent-text' : ''}`}>{entry.title || 'Untitled Entry'}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{new Date(entry.createdAt).toLocaleDateString()}</p>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onDeleteEntry(entry.id); }}
                                        className="ml-2 p-1 rounded-full text-gray-400 hover:bg-red-500/10 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                        aria-label="Delete entry"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    </div>
                ))}
                </div>
            </div>
            
            <div ref={settingsRef} className="p-4 border-t border-gray-300/50 dark:border-gray-700/50 relative">
                {settingsOpen && (
                    <div className="absolute bottom-full left-4 right-4 mb-2 p-2 bg-gray-200 dark:bg-gray-700 rounded-md shadow-lg border border-gray-300/50 dark:border-gray-600/50">
                        <div className="p-2">
                            <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">THEME</div>
                            <div className="flex items-center justify-center bg-gray-300/70 dark:bg-gray-800/70 rounded-md p-1">
                                <button onClick={() => onSetTheme('light')} className={`w-full flex items-center justify-center gap-2 py-1.5 rounded-md text-sm transition-colors ${theme === 'light' ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-800 dark:text-gray-100' : 'text-gray-500'}`}><SunIcon className="w-4 h-4"/> Light</button>
                                <button onClick={() => onSetTheme('dark')} className={`w-full flex items-center justify-center gap-2 py-1.5 rounded-md text-sm transition-colors ${theme === 'dark' ? 'bg-gray-900 text-gray-100 shadow-sm' : 'text-gray-500'}`}><MoonIcon className="w-4 h-4"/> Dark</button>
                            </div>
                        </div>
                        <div className="p-2">
                            <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">ACCENT COLOR</div>
                            <div className="grid grid-cols-6 gap-2">
                                {ACCENT_COLORS.map(color => (
                                    <button 
                                        key={color}
                                        onClick={() => onSetAccentColor(color)}
                                        className={`w-full h-8 rounded-md transition-transform transform hover:scale-110 ${accentColor === color ? 'ring-2 ring-offset-2 ring-offset-gray-200 dark:ring-offset-gray-700 ring-accent' : ''}`}
                                        style={{ backgroundColor: color }}
                                        aria-label={`Set accent color to ${color}`}
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="border-t border-gray-300/50 dark:border-gray-600/50 my-2"></div>
                        <div className="space-y-1 p-1">
                            <button
                                onClick={() => { onTriggerUpload(); setSettingsOpen(false); }}
                                className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-800 dark:text-white rounded-md hover:bg-gray-300/70 dark:hover:bg-gray-600/80 focus:outline-none transition-colors text-left"
                            >
                                <UploadIcon className="w-5 h-5" />
                                Import Project
                            </button>
                            <button
                                onClick={() => { onDownload(); setSettingsOpen(false); }}
                                className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-800 dark:text-white rounded-md hover:bg-gray-300/70 dark:hover:bg-gray-600/80 focus:outline-none transition-colors text-left"
                            >
                                <DownloadIcon className="w-5 h-5" />
                                Export Project
                            </button>
                        </div>
                    </div>
                )}
                <button
                    onClick={() => setSettingsOpen(!settingsOpen)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-black/5 dark:bg-gray-700/80 text-gray-800 dark:text-white rounded-md hover:bg-black/10 dark:hover:bg-gray-600/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-800 ring-accent transition-colors"
                >
                    <CogIcon className="w-5 h-5" />
                    Settings & Actions
                </button>
            </div>
        </>
      )}
    </div>
  );
};

export default Sidebar;