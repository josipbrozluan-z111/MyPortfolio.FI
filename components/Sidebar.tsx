import React, { useState, useRef, useEffect } from 'react';
import { Topic, PortfolioEntry, GoogleDriveUser } from '../types';
import { PlusIcon, TrashIcon, DownloadIcon, UploadIcon, BookOpenIcon, CogIcon, FolderIcon, ChevronDownIcon, SunIcon, MoonIcon, ChevronLeftIcon, ChevronRightIcon, GoogleIcon, SpinnerIcon, CheckCircleIcon, ExclamationCircleIcon } from './Icons';

type DriveStatus = {
  status: 'idle' | 'loading' | 'success' | 'error';
  message: string;
};

interface SidebarProps {
  topics: Topic[];
  activeEntryId: string | null;
  accentColor: string;
  isCollapsed: boolean;
  autoSaveEnabled: boolean;
  autoSaveInterval: number;
  isGapiReady: boolean;
  isSignedIn: boolean;
  driveUser: GoogleDriveUser | null;
  driveStatus: DriveStatus;
  onSelectEntry: (id: string) => void;
  onCreateTopic: () => void;
  onCreateEntry: (topicId: string) => void;
  onDeleteEntry: (id: string) => void;
  onDeleteTopic: (topicId: string) => void;
  onDownload: () => void;
  onTriggerUpload: () => void;
  onSetAccentColor: (color: string) => void;
  onToggleSidebar: () => void;
  onSetAutoSaveEnabled: (enabled: boolean) => void;
  onSetAutoSaveInterval: (interval: number) => void;
  onDriveSignIn: () => void;
  onDriveSignOut: () => void;
  onSaveToDrive: () => void;
  onLoadFromDrive: () => void;
}

const ACCENT_COLORS = [
    '#34d399', // emerald-400
    '#fbbf24', // amber-400
    '#60a5fa', // blue-400
    '#f87171', // red-400
    '#a78bfa', // violet-400
    '#06b6d4', // cyan-600
];

interface EntryListItemProps {
  entry: PortfolioEntry;
  isActive: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

const EntryListItem: React.FC<EntryListItemProps> = ({ entry, isActive, onSelect, onDelete }) => (
    <div
        onClick={() => onSelect(entry.id)}
        className={`group flex justify-between items-center p-2.5 pl-3 rounded-md cursor-pointer transition-colors ${
            isActive
            ? 'bg-black/10 dark:bg-white/5'
            : 'text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-gray-700/50'
        }`}
    >
        <div className="flex-1 truncate">
            <p className={`font-semibold text-sm truncate ${isActive ? 'accent-text' : ''}`}>{entry.title || 'Untitled Entry'}</p>
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
            </div>
        </div>
        <button
            onClick={(e) => { e.stopPropagation(); onDelete(entry.id); }}
            className="ml-2 p-1 rounded-full text-gray-400 hover:bg-red-500/10 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Delete entry"
        >
            <TrashIcon className="w-4 h-4" />
        </button>
    </div>
);

const ToggleSwitch: React.FC<{ checked: boolean; onChange: (checked: boolean) => void }> = ({ checked, onChange }) => (
    <button
        type="button"
        className={`${
            checked ? 'accent-bg' : 'bg-gray-400 dark:bg-gray-600'
        } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ring-accent focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-200 dark:focus:ring-offset-gray-700`}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
    >
        <span
            aria-hidden="true"
            className={`${
                checked ? 'translate-x-5' : 'translate-x-0'
            } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
        />
    </button>
);


const Sidebar: React.FC<SidebarProps> = ({
  topics,
  activeEntryId,
  accentColor,
  isCollapsed,
  autoSaveEnabled,
  autoSaveInterval,
  isGapiReady,
  isSignedIn,
  driveUser,
  driveStatus,
  onSelectEntry,
  onCreateTopic,
  onCreateEntry,
  onDeleteEntry,
  onDeleteTopic,
  onDownload,
  onTriggerUpload,
  onSetAccentColor,
  onToggleSidebar,
  onSetAutoSaveEnabled,
  onSetAutoSaveInterval,
  onDriveSignIn,
  onDriveSignOut,
  onSaveToDrive,
  onLoadFromDrive,
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

  const DriveStatusIndicator = () => {
    if (driveStatus.status === 'idle') return null;
    
    let icon;
    let colorClass;
    switch (driveStatus.status) {
      case 'loading':
        icon = <SpinnerIcon className="w-4 h-4 animate-spin" />;
        colorClass = "text-gray-600 dark:text-gray-300";
        break;
      case 'success':
        icon = <CheckCircleIcon className="w-4 h-4" />;
        colorClass = "text-green-600 dark:text-green-400";
        break;
      case 'error':
        icon = <ExclamationCircleIcon className="w-4 h-4" />;
        colorClass = "text-red-500 dark:text-red-400";
        break;
    }
    
    return (
        <div className={`flex items-center gap-2 text-xs px-2 py-1 rounded-md ${colorClass} bg-gray-300/50 dark:bg-gray-900/50`}>
            {icon}
            <span className="flex-1 truncate" title={driveStatus.message}>{driveStatus.message}</span>
        </div>
    );
  };

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

      {!isCollapsed ? (
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
                        {topic.entries.length > 0 ? topic.entries.map((entry) => (
                            <EntryListItem
                                key={entry.id}
                                entry={entry}
                                isActive={activeEntryId === entry.id}
                                onSelect={onSelectEntry}
                                onDelete={onDeleteEntry}
                            />
                        )) : (
                            <div className="p-2.5 pl-3 text-sm text-gray-500 dark:text-gray-400">No entries in this topic.</div>
                        )}
                    </div>
                )}
                </div>
            ))}
            </div>
        </div>
      ) : (
        <div className="flex-grow"></div>
      )}
      
      <div ref={settingsRef} className="p-4 border-t border-gray-300/50 dark:border-gray-700/50 relative">
          {!isCollapsed && settingsOpen && (
              <div className="absolute bottom-full left-4 right-4 mb-2 p-2 bg-gray-200 dark:bg-gray-700 rounded-md shadow-lg border border-gray-300/50 dark:border-gray-600/50 text-sm text-gray-800 dark:text-white">
                  <div className="p-2 space-y-4">
                      {/* Google Drive Section */}
                      <div>
                        <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">GOOGLE DRIVE SYNC</div>
                        {!isSignedIn ? (
                            <>
                                <button
                                    onClick={onDriveSignIn}
                                    disabled={!isGapiReady || driveStatus.status === 'loading'}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-colors bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-wait"
                                >
                                    <GoogleIcon className="w-4 h-4" />
                                    Connect to Google Drive
                                </button>
                            </>
                        ) : (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 p-2 rounded-md bg-black/5 dark:bg-white/5">
                                    <img src={driveUser?.picture} alt="User" className="w-8 h-8 rounded-full" />
                                    <div className="flex-1 truncate">
                                        <p className="font-semibold truncate text-xs">{driveUser?.name}</p>
                                        <p className="text-gray-500 dark:text-gray-400 truncate text-xs">{driveUser?.email}</p>
                                    </div>
                                    <button onClick={onDriveSignOut} className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">Sign out</button>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => { onSaveToDrive(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-300/70 dark:hover:bg-gray-600/80 focus:outline-none transition-colors text-left" disabled={driveStatus.status === 'loading'}>
                                        <UploadIcon className="w-5 h-5" /> Save
                                    </button>
                                    <button onClick={() => { onLoadFromDrive(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-300/70 dark:hover:bg-gray-600/80 focus:outline-none transition-colors text-left" disabled={driveStatus.status === 'loading'}>
                                        <DownloadIcon className="w-5 h-5" /> Load
                                    </button>
                                </div>
                                <DriveStatusIndicator />
                            </div>
                        )}
                      </div>
                      <div className="border-t border-gray-300/50 dark:border-gray-600/50"></div>

                      <div>
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

                      <div>
                        <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">AUTO-SAVE</div>
                        <div className="flex items-center justify-between">
                            <label htmlFor="auto-save-toggle" className="font-medium">Enable Auto-save</label>
                            <ToggleSwitch checked={autoSaveEnabled} onChange={onSetAutoSaveEnabled} />
                        </div>
                        <div className={`mt-3 ${!autoSaveEnabled ? 'opacity-50' : ''}`}>
                            <label htmlFor="auto-save-interval" className="block font-medium">
                                Save Interval: <span className="font-bold">{(autoSaveInterval / 1000).toFixed(1)}s</span>
                            </label>
                            <input
                                id="auto-save-interval"
                                type="range"
                                min="500"
                                max="5000"
                                step="250"
                                value={autoSaveInterval}
                                onChange={e => onSetAutoSaveInterval(Number(e.target.value))}
                                disabled={!autoSaveEnabled}
                                className="w-full h-2 bg-gray-300 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-bg"
                            />
                        </div>
                      </div>
                  </div>

                  <div className="border-t border-gray-300/50 dark:border-gray-600/50 my-2"></div>
                  <div className="space-y-1 p-1">
                      <button
                          onClick={() => { onTriggerUpload(); setSettingsOpen(false); }}
                          className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-300/70 dark:hover:bg-gray-600/80 focus:outline-none transition-colors text-left"
                      >
                          <UploadIcon className="w-5 h-5" />
                          Import Project
                      </button>
                      <button
                          onClick={() => { onDownload(); setSettingsOpen(false); }}
                          className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-300/70 dark:hover:bg-gray-600/80 focus:outline-none transition-colors text-left"
                      >
                          <DownloadIcon className="w-5 h-5" />
                          Export Project
                      </button>
                  </div>
              </div>
          )}
          <div className="flex items-center">
            <button
                onClick={() => setSettingsOpen(!settingsOpen)}
                disabled={isCollapsed}
                className={`flex-grow flex items-center ${isCollapsed ? 'justify-center' : ''} gap-2 px-4 py-2 text-sm font-medium bg-black/5 dark:bg-gray-700/80 text-gray-800 dark:text-white rounded-md hover:bg-black/10 dark:hover:bg-gray-600/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-800 ring-accent transition-colors ${isCollapsed ? 'cursor-not-allowed opacity-50' : ''}`}
                title={isCollapsed ? "Expand sidebar for settings" : "Settings & Actions"}
            >
                <CogIcon className="w-5 h-5" />
                {!isCollapsed && 'Settings & Actions'}
            </button>
          </div>
      </div>
    </div>
  );
};

export default Sidebar;