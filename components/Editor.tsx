
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PortfolioEntry } from '../types';
import { 
    TrashIcon, HighlightIcon, TextColorIcon, UndoIcon, RedoIcon, PrintIcon, ChevronDownIcon, 
    BoldIcon, ItalicIcon, UnderlineIcon, LinkIcon, AlignCenterIcon, AlignLeftIcon, AlignRightIcon, 
    AlignJustifyIcon, ListBulletedIcon, ListNumberedIcon, OutdentIcon, IndentIcon, ClearFormattingIcon,
    PlusIcon, MinusIcon
} from './Icons';

interface EditorProps {
  entry: PortfolioEntry;
  onUpdate: (id: string, updates: Partial<PortfolioEntry>) => void;
  onDelete: (id:string) => void;
  accentColor: string;
  theme: 'light' | 'dark';
}

const ToolbarButton: React.FC<{ onClick: () => void; isActive?: boolean; title: string; children: React.ReactNode }> = 
({ onClick, isActive, title, children }) => (
    <button
        title={title}
        onMouseDown={e => { e.preventDefault(); onClick(); }}
        className={`p-2 rounded ${isActive ? 'bg-black/20 dark:bg-white/20' : 'hover:bg-black/10 dark:hover:bg-white/10'} transition-colors`}
    >
        {children}
    </button>
);

const ToolbarDropdown: React.FC<{ label: React.ReactNode; children: React.ReactNode; widthClass?: string; }> = ({ label, children, widthClass = "w-40" }) => (
    <div className="relative group">
        <button className="flex items-center gap-1 p-2 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
            {label}
            <ChevronDownIcon className="w-4 h-4" />
        </button>
        <div className={`absolute top-full left-0 mt-1 bg-gray-50 dark:bg-gray-700 border border-gray-300/50 dark:border-gray-600/50 rounded-md shadow-lg hidden group-hover:block ${widthClass} z-20`}>
            {children}
        </div>
    </div>
);

const FONT_FAMILIES = ['Arial', 'Verdana', 'Times New Roman', 'Georgia', 'Courier New', 'Lucida Console'];

const EditorToolbar: React.FC<{ accentColor: string; theme: 'light' | 'dark', editorRef: React.RefObject<HTMLDivElement> }> = ({ accentColor, theme, editorRef }) => {
    const [isBold, setIsBold] = useState(false);
    const [isItalic, setIsItalic] = useState(false);
    const [isUnderline, setIsUnderline] = useState(false);
    const [alignment, setAlignment] = useState('left');
    
    const execCmd = (command: string, value?: string) => {
        document.execCommand(command, false, value);
        editorRef.current?.focus();
        updateToolbarState();
    };
    
    const updateToolbarState = useCallback(() => {
        setIsBold(document.queryCommandState('bold'));
        setIsItalic(document.queryCommandState('italic'));
        setIsUnderline(document.queryCommandState('underline'));

        const isCenter = document.queryCommandState('justifyCenter');
        const isRight = document.queryCommandState('justifyRight');
        const isJustify = document.queryCommandState('justifyFull');
        if (isCenter) setAlignment('center');
        else if (isRight) setAlignment('right');
        else if (isJustify) setAlignment('justify');
        else setAlignment('left');
    }, []);

    useEffect(() => {
        const handleSelectionChange = () => {
            if (document.activeElement === editorRef.current) {
                updateToolbarState();
            }
        };
        document.addEventListener('selectionchange', handleSelectionChange);
        return () => document.removeEventListener('selectionchange', handleSelectionChange);
    }, [updateToolbarState, editorRef]);


    const defaultTextColor = theme === 'dark' ? '#E5E7EB' : '#1F2937'; // gray-200 and gray-800
    const ALL_COLORS = [
        { name: 'Accent', value: accentColor }, { name: 'Default Text', value: defaultTextColor }, { name: 'Red', value: '#EF4444' },
        { name: 'Orange', value: '#F97316' }, { name: 'Green', value: '#10B981' }, { name: 'Blue', value: '#3B82F6' },
        { name: 'Purple', value: '#8B5CF6' }, { name: 'White', value: '#FFFFFF' }, { name: 'Light Gray', value: '#9CA3AF' },
        { name: 'Gray', value: '#6B7280' }, { name: 'Black', value: '#000000' },
    ];

    const handleLink = () => {
        const url = prompt('Enter the URL:');
        if (url) {
            execCmd('createLink', url);
        }
    };
    
    return (
        <div className="p-1 border-b border-gray-300/70 dark:border-gray-700/50 flex items-center gap-1 flex-wrap bg-gray-100 dark:bg-gray-800/80 sticky top-0 backdrop-blur-sm z-10">
            <ToolbarButton onClick={() => execCmd('undo')} title="Undo"><UndoIcon /></ToolbarButton>
            <ToolbarButton onClick={() => execCmd('redo')} title="Redo"><RedoIcon /></ToolbarButton>
            <ToolbarButton onClick={() => window.print()} title="Print"><PrintIcon /></ToolbarButton>
            
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1"></div>

            <ToolbarDropdown label={<span className="text-sm w-24 truncate">Normal text</span>}>
                <button onClick={() => execCmd('formatBlock', '<h1>')} className="block w-full text-left px-3 py-1.5 text-sm hover:bg-black/10 dark:hover:bg-white/10"><h1>Heading 1</h1></button>
                <button onClick={() => execCmd('formatBlock', '<h2>')} className="block w-full text-left px-3 py-1.5 text-sm hover:bg-black/10 dark:hover:bg-white/10"><h2>Heading 2</h2></button>
                <button onClick={() => execCmd('formatBlock', '<h3>')} className="block w-full text-left px-3 py-1.5 text-sm hover:bg-black/10 dark:hover:bg-white/10"><h3>Heading 3</h3></button>
                <button onClick={() => execCmd('formatBlock', '<p>')} className="block w-full text-left px-3 py-1.5 text-sm hover:bg-black/10 dark:hover:bg-white/10">Paragraph</button>
            </ToolbarDropdown>

            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1"></div>

            <ToolbarDropdown label={<span className="text-sm w-24 truncate">Arial</span>}>
                 {FONT_FAMILIES.map(font => (
                    <button key={font} onClick={() => execCmd('fontName', font)} className="block w-full text-left px-3 py-1.5 text-sm hover:bg-black/10 dark:hover:bg-white/10" style={{ fontFamily: font }}>{font}</button>
                 ))}
            </ToolbarDropdown>

            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1"></div>

            <ToolbarButton onClick={() => execCmd('bold')} isActive={isBold} title="Bold"><BoldIcon /></ToolbarButton>
            <ToolbarButton onClick={() => execCmd('italic')} isActive={isItalic} title="Italic"><ItalicIcon /></ToolbarButton>
            <ToolbarButton onClick={() => execCmd('underline')} isActive={isUnderline} title="Underline"><UnderlineIcon /></ToolbarButton>
            
             <div className="relative group">
                <ToolbarButton onClick={() => {}} title="Text Color"><TextColorIcon /></ToolbarButton>
                <div className="absolute top-full left-0 mt-1 bg-gray-50 dark:bg-gray-700 border border-gray-300/50 dark:border-gray-600/50 rounded-md shadow-lg hidden group-hover:block p-2 z-20">
                    <div className="grid grid-cols-6 gap-1.5">
                         {ALL_COLORS.map(color => (
                            <button key={color.name} title={color.name} onMouseDown={(e) => { e.preventDefault(); execCmd('foreColor', color.value);}}
                                className={`w-6 h-6 rounded-full transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 ring-offset-2 ring-offset-gray-50 dark:ring-offset-gray-700 ring-accent ${color.value === '#FFFFFF' ? 'border border-black/20' : ''}`}
                                style={{ backgroundColor: color.value }} aria-label={`Set text color to ${color.name}`} />
                        ))}
                    </div>
                </div>
            </div>
             <div className="relative group">
                <ToolbarButton onClick={() => {}} title="Highlight Color"><HighlightIcon /></ToolbarButton>
                 <div className="absolute top-full left-0 mt-1 bg-gray-50 dark:bg-gray-700 border border-gray-300/50 dark:border-gray-600/50 rounded-md shadow-lg hidden group-hover:block p-2 z-20">
                    <div className="grid grid-cols-6 gap-1.5">
                         {ALL_COLORS.map(color => (
                            <button key={color.name} title={color.name} onMouseDown={(e) => { e.preventDefault(); execCmd('hiliteColor', color.value);}}
                                className={`w-6 h-6 rounded-full transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 ring-offset-2 ring-offset-gray-50 dark:ring-offset-gray-700 ring-accent ${color.value === '#FFFFFF' ? 'border border-black/20' : ''}`}
                                style={{ backgroundColor: color.value }} aria-label={`Set text color to ${color.name}`} />
                        ))}
                    </div>
                </div>
            </div>

            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1"></div>
            
            <ToolbarButton onClick={handleLink} title="Insert Link"><LinkIcon /></ToolbarButton>
            
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1"></div>

            <ToolbarButton onClick={() => execCmd('justifyLeft')} isActive={alignment === 'left'} title="Align Left"><AlignLeftIcon /></ToolbarButton>
            <ToolbarButton onClick={() => execCmd('justifyCenter')} isActive={alignment === 'center'} title="Align Center"><AlignCenterIcon /></ToolbarButton>
            <ToolbarButton onClick={() => execCmd('justifyRight')} isActive={alignment === 'right'} title="Align Right"><AlignRightIcon /></ToolbarButton>
            <ToolbarButton onClick={() => execCmd('justifyFull')} isActive={alignment === 'justify'} title="Align Justify"><AlignJustifyIcon /></ToolbarButton>
            
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1"></div>

            <ToolbarButton onClick={() => execCmd('insertUnorderedList')} title="Bulleted List"><ListBulletedIcon /></ToolbarButton>
            <ToolbarButton onClick={() => execCmd('insertOrderedList')} title="Numbered List"><ListNumberedIcon /></ToolbarButton>
            <ToolbarButton onClick={() => execCmd('outdent')} title="Decrease Indent"><OutdentIcon /></ToolbarButton>
            <ToolbarButton onClick={() => execCmd('indent')} title="Increase Indent"><IndentIcon /></ToolbarButton>

            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1"></div>

            <ToolbarButton onClick={() => execCmd('removeFormat')} title="Clear Formatting"><ClearFormattingIcon /></ToolbarButton>
        </div>
    );
};

const Editor: React.FC<EditorProps> = ({ entry, onUpdate, onDelete, accentColor, theme }) => {
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
  
  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Editor Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-300/70 dark:border-gray-700/50 flex items-center justify-between bg-gray-100/30 dark:bg-gray-800/30">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Entry Title"
          className="bg-transparent text-xl font-bold w-full focus:outline-none text-gray-900 dark:text-white"
        />
        <div className="flex items-center gap-4">
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
        <EditorToolbar accentColor={accentColor} theme={theme} editorRef={editorRef} />
        <div className="flex-1 overflow-y-auto">
            <div
                ref={editorRef}
                contentEditable={true}
                onInput={handleContentChange}
                className="prose-editor max-w-4xl mx-auto p-8 w-full h-full text-gray-800 dark:text-gray-200 focus:outline-none"
                spellCheck="true"
            />
        </div>
      </div>
    </div>
  );
};

export default Editor;
