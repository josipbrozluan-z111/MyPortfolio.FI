

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PortfolioEntry } from '../types';
import { 
    TrashIcon, HighlightIcon, TextColorIcon, UndoIcon, RedoIcon, PrintIcon, ChevronDownIcon, 
    BoldIcon, ItalicIcon, UnderlineIcon, LinkIcon, AlignCenterIcon, AlignLeftIcon, AlignRightIcon, 
    AlignJustifyIcon, ListBulletedIcon, ListNumberedIcon, OutdentIcon, IndentIcon, ClearFormattingIcon,
    PlusIcon, MinusIcon, SearchIcon, FormatPainterIcon, AddCommentIcon, LineSpacingIcon, ChecklistIcon, MoreVerticalIcon,
    ImageIcon
} from './Icons';

interface EditorProps {
  entry: PortfolioEntry;
  onUpdate: (id: string, updates: Partial<PortfolioEntry>) => void;
  onDelete: (id:string) => void;
  accentColor: string;
  theme: 'light' | 'dark';
  isSidebarCollapsed: boolean;
}

const ToolbarButton: React.FC<{ onClick?: (e: React.MouseEvent) => void; onMouseDown?: (e: React.MouseEvent) => void; isActive?: boolean; title: string; children: React.ReactNode; disabled?: boolean }> = 
({ onClick, onMouseDown, isActive, title, children, disabled }) => {
    const baseClasses = "p-1.5 rounded transition-colors";
    const activeClasses = "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-200";
    const inactiveClasses = "hover:bg-black/10 dark:hover:bg-white/10";
    const disabledClasses = "text-gray-400 dark:text-gray-500 cursor-not-allowed";

    const finalOnMouseDown = onMouseDown ? onMouseDown : (e: React.MouseEvent) => { e.preventDefault(); if(onClick) onClick(e); };

    return (
        <button
            title={title}
            onMouseDown={disabled ? undefined : finalOnMouseDown}
            onClick={disabled ? (e) => e.preventDefault() : undefined}
            disabled={disabled}
            className={`${baseClasses} ${disabled ? disabledClasses : (isActive ? activeClasses : inactiveClasses)}`}
        >
            {children}
        </button>
    );
};

const ToolbarDropdown: React.FC<{ label: React.ReactNode; children: React.ReactNode; widthClass?: string; }> = ({ label, children, widthClass = "w-40" }) => (
    <div className="relative group">
        <button className="flex items-center gap-1 p-2 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
            {label}
            <ChevronDownIcon className="w-4 h-4" />
        </button>
        <div className={`absolute top-full left-0 mt-1 bg-white dark:bg-gray-700 border border-gray-300/50 dark:border-gray-600/50 rounded-md shadow-lg hidden group-hover:block ${widthClass} z-20`}>
            {children}
        </div>
    </div>
);

const ToolbarSeparator: React.FC = () => (
    <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1"></div>
);

const FONT_FAMILIES = ['Arial', 'Verdana', 'Times New Roman', 'Georgia', 'Courier New', 'Lucida Console'];
const FONT_SIZE_MAP: { [key: number]: number } = { 1: 8, 2: 10, 3: 12, 4: 14, 5: 18, 6: 24, 7: 36 };

const EditorToolbar: React.FC<{ accentColor: string; theme: 'light' | 'dark', editorRef: React.RefObject<HTMLDivElement>, onTriggerImageUpload: () => void }> = ({ accentColor, theme, editorRef, onTriggerImageUpload }) => {
    const [isBold, setIsBold] = useState(false);
    const [isItalic, setIsItalic] = useState(false);
    const [isUnderline, setIsUnderline] = useState(false);
    const [alignment, setAlignment] = useState('left');
    const [fontSize, setFontSize] = useState(3);
    
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

        const sizeValue = parseInt(document.queryCommandValue('fontSize'), 10);
        if (!isNaN(sizeValue) && sizeValue >= 1 && sizeValue <= 7) {
            setFontSize(sizeValue);
        }

    }, []);

    useEffect(() => {
        const handleSelectionChange = () => {
            if (document.activeElement === editorRef.current) {
                updateToolbarState();
            }
        };
        document.addEventListener('selectionchange', handleSelectionChange);
        editorRef.current?.addEventListener('focus', updateToolbarState);
        editorRef.current?.addEventListener('click', updateToolbarState);
        editorRef.current?.addEventListener('keyup', updateToolbarState);
        return () => {
            document.removeEventListener('selectionchange', handleSelectionChange);
            editorRef.current?.removeEventListener('focus', updateToolbarState);
            editorRef.current?.removeEventListener('click', updateToolbarState);
            editorRef.current?.removeEventListener('keyup', updateToolbarState);
        }
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

    const handleFontSizeChange = (direction: 'increase' | 'decrease') => {
        let newSize = fontSize;
        if(direction === 'increase') newSize = Math.min(7, fontSize + 1);
        if(direction === 'decrease') newSize = Math.max(1, fontSize - 1);
        setFontSize(newSize);
        execCmd('fontSize', newSize.toString());
    }

    const getAlignmentIcon = () => {
        switch(alignment) {
            case 'center': return <AlignCenterIcon />;
            case 'right': return <AlignRightIcon />;
            case 'justify': return <AlignJustifyIcon />;
            default: return <AlignLeftIcon />;
        }
    }
    
    return (
        <div className="editor-toolbar p-1 border-b border-gray-200 dark:border-gray-700/70 flex items-center gap-0.5 flex-wrap bg-gray-50 dark:bg-gray-800/80 sticky top-0 backdrop-blur-sm z-10">
            <ToolbarButton title="Search" disabled><SearchIcon /></ToolbarButton>
            <ToolbarSeparator />

            <ToolbarButton onClick={() => execCmd('undo')} title="Undo"><UndoIcon /></ToolbarButton>
            <ToolbarButton onClick={() => execCmd('redo')} title="Redo"><RedoIcon /></ToolbarButton>
            <ToolbarButton onClick={() => window.print()} title="Print"><PrintIcon /></ToolbarButton>
            <ToolbarButton title="Format Painter" disabled><FormatPainterIcon /></ToolbarButton>
            <ToolbarSeparator />

            <ToolbarDropdown label={<span className="text-sm">100%</span>} widthClass="w-28">
                 {['50%', '75%', '100%', '125%', '150%'].map(zoom => (
                    <button key={zoom} className="block w-full text-left px-3 py-1.5 text-sm hover:bg-black/10 dark:hover:bg-white/10">{zoom}</button>
                 ))}
            </ToolbarDropdown>
            <ToolbarSeparator />

            <ToolbarDropdown label={<span className="text-sm w-24 truncate">Normal text</span>}>
                <button onClick={() => execCmd('formatBlock', '<h1>')} className="block w-full text-left px-3 py-1.5 text-sm hover:bg-black/10 dark:hover:bg-white/10"><h1>Heading 1</h1></button>
                <button onClick={() => execCmd('formatBlock', '<h2>')} className="block w-full text-left px-3 py-1.5 text-sm hover:bg-black/10 dark:hover:bg-white/10"><h2>Heading 2</h2></button>
                <button onClick={() => execCmd('formatBlock', '<h3>')} className="block w-full text-left px-3 py-1.5 text-sm hover:bg-black/10 dark:hover:bg-white/10"><h3>Heading 3</h3></button>
                <button onClick={() => execCmd('formatBlock', '<p>')} className="block w-full text-left px-3 py-1.5 text-sm hover:bg-black/10 dark:hover:bg-white/10">Paragraph</button>
            </ToolbarDropdown>
            <ToolbarSeparator />

            <ToolbarDropdown label={<span className="text-sm w-24 truncate">{document.queryCommandValue('fontName').replace(/"/g, '') || 'Arial'}</span>}>
                 {FONT_FAMILIES.map(font => (
                    <button key={font} onClick={() => execCmd('fontName', font)} className="block w-full text-left px-3 py-1.5 text-sm hover:bg-black/10 dark:hover:bg-white/10" style={{ fontFamily: font }}>{font}</button>
                 ))}
            </ToolbarDropdown>
            <ToolbarSeparator />

            <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded">
                <ToolbarButton onClick={() => handleFontSizeChange('decrease')} title="Decrease font size"><MinusIcon className="w-4 h-4" /></ToolbarButton>
                <span className="w-8 text-center text-sm px-1 dark:text-gray-200">{FONT_SIZE_MAP[fontSize] || '12'}</span>
                <ToolbarButton onClick={() => handleFontSizeChange('increase')} title="Increase font size"><PlusIcon className="w-4 h-4" /></ToolbarButton>
            </div>
            <ToolbarSeparator />

            <ToolbarButton onClick={() => execCmd('bold')} isActive={isBold} title="Bold"><BoldIcon /></ToolbarButton>
            <ToolbarButton onClick={() => execCmd('italic')} isActive={isItalic} title="Italic"><ItalicIcon /></ToolbarButton>
            <ToolbarButton onClick={() => execCmd('underline')} isActive={isUnderline} title="Underline"><UnderlineIcon /></ToolbarButton>
            
             <div className="relative group">
                <ToolbarButton onClick={() => {}} title="Text Color"><TextColorIcon /></ToolbarButton>
                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-700 border border-gray-300/50 dark:border-gray-600/50 rounded-md shadow-lg hidden group-hover:block p-3 z-20">
                    <div className="grid grid-cols-6 gap-2">
                         {ALL_COLORS.map(color => (
                            <button key={color.name} title={color.name} onMouseDown={(e) => { e.preventDefault(); execCmd('foreColor', color.value);}}
                                className={`w-6 h-6 rounded-full transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-700 ring-accent ${color.value === '#FFFFFF' ? 'border border-black/20' : ''}`}
                                style={{ backgroundColor: color.value }} aria-label={`Set text color to ${color.name}`} />
                        ))}
                    </div>
                </div>
            </div>
             <div className="relative group">
                <ToolbarButton onClick={() => {}} title="Highlight Color"><HighlightIcon /></ToolbarButton>
                 <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-700 border border-gray-300/50 dark:border-gray-600/50 rounded-md shadow-lg hidden group-hover:block p-3 z-20">
                    <div className="grid grid-cols-6 gap-2">
                         {ALL_COLORS.map(color => (
                            <button key={color.name} title={color.name} onMouseDown={(e) => { e.preventDefault(); execCmd('hiliteColor', color.value);}}
                                className={`w-6 h-6 rounded-full transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-700 ring-accent ${color.value === '#FFFFFF' ? 'border border-black/20' : ''}`}
                                style={{ backgroundColor: color.value }} aria-label={`Set highlight color to ${color.name}`} />
                        ))}
                    </div>
                </div>
            </div>
            <ToolbarSeparator />
            
            <ToolbarButton onClick={handleLink} title="Insert Link"><LinkIcon /></ToolbarButton>
            <ToolbarButton onClick={onTriggerImageUpload} title="Insert Image"><ImageIcon /></ToolbarButton>
            <ToolbarButton title="Add Comment" disabled><AddCommentIcon /></ToolbarButton>
            <ToolbarSeparator />

            <ToolbarDropdown label={getAlignmentIcon()}>
                <button onClick={() => execCmd('justifyLeft')} className="block w-full text-left px-3 py-1.5 text-sm hover:bg-black/10 dark:hover:bg-white/10"><AlignLeftIcon /></button>
                <button onClick={() => execCmd('justifyCenter')} className="block w-full text-left px-3 py-1.5 text-sm hover:bg-black/10 dark:hover:bg-white/10"><AlignCenterIcon /></button>
                <button onClick={() => execCmd('justifyRight')} className="block w-full text-left px-3 py-1.5 text-sm hover:bg-black/10 dark:hover:bg-white/10"><AlignRightIcon /></button>
                <button onClick={() => execCmd('justifyFull')} className="block w-full text-left px-3 py-1.5 text-sm hover:bg-black/10 dark:hover:bg-white/10"><AlignJustifyIcon /></button>
            </ToolbarDropdown>
            
            <ToolbarButton title="Line Spacing" disabled><LineSpacingIcon /></ToolbarButton>
            <ToolbarButton title="Checklist" disabled><ChecklistIcon /></ToolbarButton>
            <ToolbarSeparator />

            <ToolbarButton onClick={() => execCmd('insertUnorderedList')} title="Bulleted List"><ListBulletedIcon /></ToolbarButton>
            <ToolbarButton onClick={() => execCmd('insertOrderedList')} title="Numbered List"><ListNumberedIcon /></ToolbarButton>
            <ToolbarButton onClick={() => execCmd('outdent')} title="Decrease Indent"><OutdentIcon /></ToolbarButton>
            <ToolbarButton onClick={() => execCmd('indent')} title="Increase Indent"><IndentIcon /></ToolbarButton>
            <ToolbarSeparator />

            <ToolbarButton onClick={() => execCmd('removeFormat')} title="Clear Formatting"><ClearFormattingIcon /></ToolbarButton>
            <ToolbarButton title="More Options" disabled><MoreVerticalIcon /></ToolbarButton>
        </div>
    );
};

const Editor: React.FC<EditorProps> = ({ entry, onUpdate, onDelete, accentColor, theme, isSidebarCollapsed }) => {
  const [title, setTitle] = useState(entry.title);
  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
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

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Tab') {
      event.preventDefault(); // Prevent default tab behavior (focus change)

      if (event.shiftKey) {
        // Handle Shift + Tab for outdenting
        document.execCommand('outdent', false);
      } else {
        // Handle Tab for indenting by inserting four non-breaking spaces
        document.execCommand('insertHTML', false, '&nbsp;&nbsp;&nbsp;&nbsp;');
      }
    }
  };

  const insertImage = (base64Data: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
      const imgHtml = `<img src="${base64Data}" />`;
      document.execCommand('insertHTML', false, imgHtml);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          insertImage(result);
          handleContentChange(); // Trigger save after image insert
        }
      };
      reader.readAsDataURL(file);
    }
    if (event.target) {
      event.target.value = '';
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const items = event.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        event.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const result = e.target?.result;
            if (typeof result === 'string') {
              insertImage(result);
              handleContentChange(); // Trigger save after image insert
            }
          };
          reader.readAsDataURL(file);
        }
        return;
      }
    }
  };
  
  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50 dark:bg-gray-900 overflow-hidden">
      <input
        type="file"
        ref={imageInputRef}
        onChange={handleImageUpload}
        className="hidden"
        accept="image/*"
      />
      {/* Editor Header */}
      <div className="editor-header flex-shrink-0 p-4 border-b border-gray-300/70 dark:border-gray-700/50 flex items-center justify-between bg-gray-100/30 dark:bg-gray-800/30">
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
        <EditorToolbar 
            accentColor={accentColor} 
            theme={theme} 
            editorRef={editorRef} 
            onTriggerImageUpload={() => imageInputRef.current?.click()}
        />
        <div className="flex-1 overflow-y-auto">
            <div
                ref={editorRef}
                contentEditable={true}
                onInput={handleContentChange}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                className={`prose-editor mx-auto p-6 w-full h-full text-gray-800 dark:text-gray-200 focus:outline-none transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'max-w-6xl' : 'max-w-4xl'}`}
                spellCheck="true"
            />
        </div>
      </div>
    </div>
  );
};

export default Editor;