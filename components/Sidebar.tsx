import React from 'react';
import { PortfolioEntry } from '../types';
import { PlusIcon, TrashIcon, DownloadIcon, UploadIcon, BookOpenIcon } from './Icons';

interface SidebarProps {
  entries: PortfolioEntry[];
  activeEntryId: string | null;
  onSelectEntry: (id: string) => void;
  onCreateEntry: () => void;
  onDeleteEntry: (id: string) => void;
  onDownload: () => void;
  onTriggerUpload: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  entries,
  activeEntryId,
  onSelectEntry,
  onCreateEntry,
  onDeleteEntry,
  onDownload,
  onTriggerUpload,
}) => {
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
          onClick={onCreateEntry}
          className="w-full flex items-center justify-center gap-2 mb-2 px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded-md hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          New Entry
        </button>
        <div className="space-y-1">
          {entries.map((entry) => (
            <div
              key={entry.id}
              onClick={() => onSelectEntry(entry.id)}
              className={`group flex justify-between items-center p-3 rounded-md cursor-pointer transition-colors ${
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
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteEntry(entry.id);
                }}
                className="ml-2 p-1 rounded-full text-gray-400 hover:bg-red-500/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Delete entry"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
      
      <div className="p-4 border-t border-gray-700/50 space-y-2">
        <div className="flex gap-2">
            <button
                onClick={onTriggerUpload}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-700/80 rounded-md hover:bg-gray-600/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500 transition-colors"
            >
                <UploadIcon className="w-5 h-5" />
                Import
            </button>
            <button
                onClick={onDownload}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-700/80 rounded-md hover:bg-gray-600/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500 transition-colors"
            >
                <DownloadIcon className="w-5 h-5" />
                Export
            </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
