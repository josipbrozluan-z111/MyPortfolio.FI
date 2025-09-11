import React, { useState, useEffect, useRef } from 'react';
import { PortfolioEntry } from '../types';
import { TrashIcon, HeadingIcon, HighlightIcon, TextColorIcon } from './Icons';

interface EditorProps {
  entry: PortfolioEntry;
  onUpdate: (id: string, updates: Partial<PortfolioEntry>) => void;
  onDelete: (id:string) => void;
  saveStatus: 'unsaved' | 'saving' | 'saved';
  accentColor: string;
  theme: 'light' | 'dark';
}

const EditorToolbar: React.FC<{ accentColor: string; theme: 'light' | 'dark' }> = ({ accentColor, theme }) => {
    const execCmd = (command: string, value?: string) => {
        document.execCommand(command, false, value);
    };

    const defaultTextColor = theme === 'dark' ? '#E5E7EB' : '#1F2937'; // gray-200 and gray-800

    const THEME_COLORS = [
        { name: 'Accent', value: accentColor },
        { name: 'Default Text', value: defaultTextColor },
    ];

    const STANDARD_COLORS = [
        { name: 'Red', value: '#EF4444' },
        { name: 'Orange', value: '#F97316' },
        { name: 'Green', value: '#10B981' },
        { name: 'Blue', value: '#3B82F6' },
        { name: 'Purple', value: '#8B5CF6' },
    ];

    const MONOCHROME_COLORS = [
        { name: 'White', value: '#FFFFFF' },
        { name: 'Light Gray', value: '#9CA3AF' },
        { name: 'Gray', value: '#6B7280' },
        { name: 'Black', value: '#000000' },
    ];

    return (
        <div className="p-2 border-b border-gray-300/70 dark:border-gray-700/50 flex items-center gap-1 bg-gray-200/50 dark:bg-gray-800/30 sticky top-0 backdrop-blur-sm z-10">
            {/* Heading Dropdown */}
            <div className="relative group">
                <button className="p-2 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                    <HeadingIcon className="w-5 h-5" />
                </button>
                <div className="absolute top-full left-0 mt-1 bg-gray-200 dark:bg-gray-700 border border-gray-300/50 dark:border-gray-600/50 rounded-md shadow-lg hidden group-hover:block w-32 z-20">
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
                <div className="absolute top-full left-0 mt-1 bg-gray-200 dark:bg-gray-700 border border-gray-300/50 dark:border-gray-600/50 rounded-md shadow-lg hidden group-hover:block p-3 space-y-3 z-20">
                    {/* Theme Colors */}
                    <div>
                        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 px-1">Theme</div>
                        <div className="flex items-center gap-2">
                             {THEME_COLORS.map(color => (
                                <button
                                    key={color.name}
                                    title={color.name}
                                    onClick={() => execCmd('foreColor', color.value)}
                                    className={`w-7 h-7 rounded-full transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 ring-offset-2 ring-offset-gray-200 dark:ring-offset-gray-700 ring-accent ${color.value === '#FFFFFF' ? 'border border-black/20' : ''}`}
                                    style={{ backgroundColor: color.value }}
                                    aria-label={`Set text color to ${color.name}`}
                                />
                            ))}
                        </div>
                    </div>
                    {/* Standard Colors */}
                    <div>
                         <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 px-1">Standard</div>
                        <div className="grid grid-cols-5 gap-2">
                            {STANDARD_COLORS.map(color => (
                                <button
                                    key={color.name}
                                    title={color.name}
                                    onClick={() => execCmd('foreColor', color.value)}
                                    className="w-7 h-7 rounded-full transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 ring-offset-2 ring-offset-gray-200 dark:ring-offset-gray-700 ring-accent"
                                    style={{ backgroundColor: color.value }}
                                    aria-label={`Set text color to ${color.name}`}
                                />
                            ))}
                        </div>
                    </div>
                     {/* Monochrome Colors */}
                    <div>
                         <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 px-1">Grayscale</div>
                        <div className="grid grid-cols-4 gap-2">
                            {MONOCHROME_COLORS.map(color => (
                                <button
                                    key={color.name}
                                    title={color.name}
                                    onClick={() => execCmd('foreColor', color.value)}
                                    className={`w-7 h-7 rounded-full transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 ring-offset-2 ring-offset-gray-200 dark:ring-offset-gray-700 ring-accent ${color.value === '#FFFFFF' ? 'border border-black/20' : ''}`}
                                    style={{ backgroundColor: color.value }}
                                    aria-label={`Set text color to ${color.name}`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


const Editor: React.FC<EditorProps> = ({ entry, onUpdate, onDelete, saveStatus, accentColor, theme }) => {
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
        <EditorToolbar accentColor={accentColor} theme={theme} />
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