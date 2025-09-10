import React, { useState, useEffect, useRef } from 'react';
import { PortfolioEntry } from '../types';
import { TrashIcon, HeadingIcon, HighlightIcon, TextColorIcon, ChevronDownIcon } from './Icons';

interface EditorProps {
  entry: PortfolioEntry;
  onUpdate: (id: string, updates: Partial<PortfolioEntry>) => void;
  onDelete: (id:string) => void;
  saveStatus: 'unsaved' | 'saving' | 'saved';
  accentColor: string;
}

const EditorToolbar: React.FC<{ accentColor: string }> = ({ accentColor }) => {
    const execCmd = (command: string, value?: string) => {
        document.execCommand(command, false, value);
    };

    return (
        <div className="p-2 border-b border-gray-300/70 dark:border-gray-700/50 flex items-center gap-1 bg-gray-200/50 dark:bg-gray-800/30 sticky top-0 backdrop-blur-sm z-10">
            {/* Heading Dropdown */}
            <div className="relative group">
                <button className="p-2 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                    <HeadingIcon className="w-5 h-5" />
                </button>
                <div className="absolute top-full left-0 mt-1 bg-gray-200 dark:bg-gray-700 border border-gray-300/50 dark:border-gray-600/50 rounded-md shadow-lg hidden group-hover:block w-32">
                    <button onClick={() => execCmd('formatBlock', '<h1>')} className="block w-full text-left px-3 py-1.5 text-sm hover:bg-black/10 dark:hover:bg-white/10"><h1>Heading 1</h1></button>
                    <button onClick={() => execCmd('formatBlock', '<h2>')} className="block w-full text-left px-3 py-1.5 text-sm hover:bg-black/10 dark:hover:bg-white/10"><h2>Heading 2</h2></button>
                    <button onClick={() => execCmd('formatBlock', '<h3>')} className="block w-full text-left px-3 py-1.5 text-sm hover:bg-black/10 dark:hover:bg-white/10"><h3>Heading 3</h3></button>
                    <button onClick={() => execCmd('formatBlock', '<p>')} className="block w-full text-left px-3 py-1.5 text-sm hover:bg-black/10 dark:hover:bg-white/10">Paragraph</button>
                </div>
            </div>
            
             {/* Highlight Button */}
            <button onClick={() => execCmd('hiliteColor', accentColor)} className="p-2 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors" aria-label="Highlight text">
                <HighlightIcon className="w-5 h-5" />
            </button>

             {/* Text Color Dropdown */}
            <div className="relative group">
                <button className="p-2 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                    <TextColorIcon className="w-5 h-5" />
                </button>
                <div className="absolute top-full left-0 mt-1 bg-gray-200 dark:bg-gray-700 border border-gray-300/50 dark:border-gray-600/50 rounded-md shadow-lg hidden group-hover:block p-2">
                    <div className="grid grid-cols-4 gap-2">
                        {['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#FFFFFF', '#6B7280', '#000000'].map(color => (
                            <button key={color} onClick={() => execCmd('foreColor', color)} className="w-6 h-6 rounded-full border border-black/10" style={{ backgroundColor: color }} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};


const Editor: React.FC<EditorProps> = ({ entry, onUpdate, onDelete, saveStatus, accentColor }) => {
  const [title, setTitle] = useState(entry.title);
  const editorRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    setTitle(entry.title);
    if (editorRef.current && editorRef.current.innerHTML !== entry.content) {
        editorRef.current.innerHTML = entry.content;
    }
  }, [entry.id, entry.title, entry.content]);

  const handleContentChange = () => {
    if (editorRef.current) {
        onUpdate(entry.id, { content: editorRef.current.innerHTML });
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      if (title !== entry.title) {
        onUpdate(entry.id, { title });
      }
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [title, entry.id, entry.title, onUpdate]);
  
  const getStatusText = () => {
    switch(saveStatus) {
      case 'saving': return 'Saving...';
      case 'saved': return 'Saved';
      case 'unsaved': return 'Unsaved changes';
      default: return '';
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-100 dark:bg-gray-900 overflow-hidden">
      {/* Editor Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-300/70 dark:border-gray-700/50 flex items-center justify-between bg-gray-200/30 dark:bg-gray-800/30">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Entry Title"
          className="bg-transparent text-xl font-bold w-full focus:outline-none text-gray-900 dark:text-white"
        />
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500 dark:text-gray-400 italic w-32 text-right">
            {getStatusText()}
          </span>
          <button
            onClick={() => onDelete(entry.id)}
            className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
            aria-label="Delete entry"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <EditorToolbar accentColor={accentColor} />
        <div className="flex-1 overflow-y-auto">
            <div
                ref={editorRef}
                contentEditable={true}
                onInput={handleContentChange}
                className="prose-editor max-w-4xl mx-auto p-8 w-full h-full text-gray-800 dark:text-gray-200"
            />
        </div>
      </div>
    </div>
  );
};

export default Editor;