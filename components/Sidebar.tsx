
import React, { useState, useRef, useEffect } from 'react';
import { Topic, PortfolioEntry } from '../types';
import { PlusIcon, TrashIcon, DownloadIcon, UploadIcon, BookOpenIcon, CogIcon, FolderIcon, ChevronDownIcon } from './Icons';

interface SidebarProps {
  topics: Topic[];
  activeEntryId: string | null;
  onSelectEntry: (id: string) => void;
  onCreateTopic: () => void;
  onCreateEntry: (topicId: string) => void;
  onDeleteEntry: (id: string) => void;
  onDeleteTopic: (topicId: string) => void;
  onDownload: () => void;
  onTriggerUpload: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  topics,
  activeEntryId,
  onSelectEntry,
  onCreateTopic,
  onCreateEntry,
  onDeleteEntry,
  onDeleteTopic,
  onDownload,
  onTriggerUpload,
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

  return (
    <div className="w-1/4 max-w-sm bg-gray-800/50 backdrop-blur-sm border-r border-gray-700/50 flex flex-col h-full">
      <div className="p-4 border-b border-gray-700/50">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BookOpenIcon className="w-7 h-7 text-cyan-400"/>
            Portfolio Writer
        </h1>
        <p className="text-sm text-gray-400 mt-1">Your personal writing space.</p>
      </div>

      <div className="flex-grow p-2 overflow-y-auto">
        <button
          onClick={onCreateTopic}
          className="w-full flex items-center justify-center gap-2 mb-2 px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded-md hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          New Topic
        </button>
        <div className="space-y-1">
          {topics.map((topic) => (
            <div key={topic.id}>
              <div
                onClick={() => toggleTopic(topic.id)}
                className="group flex justify-between items-center p-2 rounded-md cursor-pointer hover:bg-gray-700/50 transition-colors"
              >
                 <div className="flex items-center gap-2 flex-1 truncate">
                    <FolderIcon className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                    <span className="font-semibold text-sm text-gray-200 truncate">{topic.name}</span>
                 </div>
                 <div className="flex items-center">
                    <button
                        onClick={(e) => { e.stopPropagation(); onCreateEntry(topic.id); }}
                        className="p-1 rounded-full text-gray-400 hover:bg-cyan-500/20 hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="New entry in this topic"
                    >
                        <PlusIcon className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDeleteTopic(topic.id); }}
                        className="ml-1 p-1 rounded-full text-gray-400 hover:bg-red-500/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Delete topic"
                    >
                        <TrashIcon className="w-4 h-4" />
                    </button>
                    <ChevronDownIcon className={`w-5 h-5 text-gray-400 ml-2 transform transition-transform ${expandedTopics.has(topic.id) ? 'rotate-180' : ''}`} />
                 </div>
              </div>

              {expandedTopics.has(topic.id) && (
                <div className="pl-4 pt-1 space-y-1 border-l-2 border-gray-700 ml-2">
                    {topic.entries.map((entry) => (
                        <div
                        key={entry.id}
                        onClick={() => onSelectEntry(entry.id)}
                        className={`group flex justify-between items-center p-2.5 pl-3 rounded-md cursor-pointer transition-colors ${
                            activeEntryId === entry.id
                            ? 'bg-cyan-500/20 text-cyan-300'
                            : 'text-gray-300 hover:bg-gray-700/50'
                        }`}
                        >
                            <div className="flex-1 truncate">
                                <p className="font-semibold text-sm truncate">{entry.title || 'Untitled Entry'}</p>
                                <p className="text-xs text-gray-400 truncate">{new Date(entry.createdAt).toLocaleDateString()}</p>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); onDeleteEntry(entry.id); }}
                                className="ml-2 p-1 rounded-full text-gray-400 hover:bg-red-500/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
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
      
      <div ref={settingsRef} className="p-4 border-t border-gray-700/50 relative">
        {settingsOpen && (
            <div className="absolute bottom-full left-4 right-4 mb-2 p-2 bg-gray-700 rounded-md shadow-lg border border-gray-600/50">
                <div className="space-y-1">
                     <button
                        onClick={() => { onTriggerUpload(); setSettingsOpen(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-white rounded-md hover:bg-gray-600/80 focus:outline-none transition-colors text-left"
                    >
                        <UploadIcon className="w-5 h-5" />
                        Import Project
                    </button>
                    <button
                        onClick={() => { onDownload(); setSettingsOpen(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-white rounded-md hover:bg-gray-600/80 focus:outline-none transition-colors text-left"
                    >
                        <DownloadIcon className="w-5 h-5" />
                        Export Project
                    </button>
                </div>
            </div>
        )}
        <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-700/80 rounded-md hover:bg-gray-600/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500 transition-colors"
        >
            <CogIcon className="w-5 h-5" />
            Settings
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
