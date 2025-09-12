import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PortfolioEntry } from '../types';
import { 
    TrashIcon, HighlightIcon, TextColorIcon, UndoIcon, RedoIcon, PrintIcon, ChevronDownIcon, 
    BoldIcon, ItalicIcon, UnderlineIcon, LinkIcon, AlignCenterIcon, AlignLeftIcon, AlignRightIcon, 
    AlignJustifyIcon, ListBulletedIcon, ListNumberedIcon, OutdentIcon, IndentIcon, ClearFormattingIcon,
    PlusIcon, MinusIcon, SearchIcon, FormatPainterIcon, AddCommentIcon, LineSpacingIcon, ChecklistIcon, MoreVerticalIcon,
    ImageIcon
} from './Icons';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface EditorProps {
  entry: PortfolioEntry;
  onUpdate: (id: string, updates: Partial<PortfolioEntry>) => void;
  onDelete: (id:string) => void;
  accentColor: string;
  isSidebarCollapsed: boolean;
  saveStatus: SaveStatus;
  saveError: string | null;
}

const ToolbarButton: React.FC<{ onClick?: (e: React.MouseEvent) => void; onMouseDown?: (e: React.MouseEvent) => void; isActive?: boolean; title: string; children: React.ReactNode; disabled?: boolean; className?: string }> = 
({ onClick, onMouseDown, isActive, title, children, disabled, className }) => {
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
            className={`${baseClasses} ${disabled ? disabledClasses : (isActive ? activeClasses : inactiveClasses)} ${className}`}
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

const EditorToolbar: React.FC<{ accentColor: string; editorRef: React.RefObject<HTMLDivElement>, onTriggerImageUpload: () => void }> = ({ accentColor, editorRef, onTriggerImageUpload }) => {
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
        if (!editorRef.current) return;
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

    }, [editorRef]);

    useEffect(() => {
        const editor = editorRef.current;
        const handleSelectionChange = () => {
            if (document.activeElement === editor) {
                updateToolbarState();
            }
        };
        document.addEventListener('selectionchange', handleSelectionChange);
        editor?.addEventListener('focus', updateToolbarState);
        editor?.addEventListener('click', updateToolbarState);
        editor?.addEventListener('keyup', updateToolbarState);
        return () => {
            document.removeEventListener('selectionchange', handleSelectionChange);
            editor?.removeEventListener('focus', updateToolbarState);
            editor?.removeEventListener('click', updateToolbarState);
            editor?.removeEventListener('keyup', updateToolbarState);
        }
    }, [updateToolbarState, editorRef]);


    const ALL_COLORS = [
        { name: 'Accent', value: accentColor },
        '#ef4444', '#f97316', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef',
        '#f43f5e', '#fca5a5', '#fdba74', '#bef264', '#86efac', '#67e8f9', '#93c5fd', '#c4b5fd', '#f0abfc',
        '#ec4899', '#9ca3af', '#6b7280', '#4b5563', '#374151', '#1f2937', '#111827', '#000000',
    ];

    const ColorPicker: React.FC<{ command: 'foreColor' | 'hiliteColor' }> = ({ command }) => (
        <div className="relative group">
            <ToolbarButton title={command === 'foreColor' ? "Text Color" : "Highlight Color"}>
                {command === 'foreColor' ? <TextColorIcon /> : <HighlightIcon />}
            </ToolbarButton>
            <div className="absolute top-full left-0 mt-1 p-2 bg-white dark:bg-gray-800 border border-gray-300/50 dark:border-gray-600/50 rounded-md shadow-lg hidden group-hover:block z-20">
                <div className="flex flex-col gap-2 p-2">
                    <div className="flex gap-2">
                        {ALL_COLORS.slice(0, 10).map((color, index) => (
                            <button key={index} onMouseDown={(e) => { e.preventDefault(); execCmd(command, typeof color === 'object' ? color.value : color); }} className="w-6 h-6 rounded-full border border-gray-400/50" style={{ backgroundColor: typeof color === 'object' ? color.value : color }} title={typeof color === 'object' ? color.name : color}></button>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        {ALL_COLORS.slice(10).map((color, index) => (
                            <button key={index} onMouseDown={(e) => { e.preventDefault(); execCmd(command, typeof color === 'object' ? color.value : color); }} className="w-6 h-6 rounded-full border border-gray-400/50" style={{ backgroundColor: typeof color === 'object' ? color.value : color }} title={typeof color === 'object' ? color.name : color}></button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
    
    const AlignmentPicker = () => {
      const icons: { [key: string]: React.ReactNode } = {
        left: <AlignLeftIcon />,
        center: <AlignCenterIcon />,
        right: <AlignRightIcon />,
        justify: <AlignJustifyIcon />,
      };
      const alignments = [
          { name: 'left', command: 'justifyLeft', icon: <AlignLeftIcon /> },
          { name: 'center', command: 'justifyCenter', icon: <AlignCenterIcon /> },
          { name: 'right', command: 'justifyRight', icon: <AlignRightIcon /> },
          { name: 'justify', command: 'justifyFull', icon: <AlignJustifyIcon /> },
      ];
      return (
          <div className="relative group">
              <button className="flex items-center gap-1 p-1.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                  {icons[alignment]}
                  <ChevronDownIcon className="w-4 h-4" />
              </button>
              <div className="absolute top-full left-0 mt-1 p-1 bg-white dark:bg-gray-700 border border-gray-300/50 dark:border-gray-600/50 rounded-md shadow-lg hidden group-hover:block z-20">
                  {alignments.map(item => (
                      <button key={item.name} onMouseDown={(e) => { e.preventDefault(); execCmd(item.command); }} className="block w-full text-left p-2 rounded hover:bg-black/5 dark:hover:bg-white/5">
                          {item.icon}
                      </button>
                  ))}
              </div>
          </div>
      );
    }

    return (
        <div className="editor-toolbar flex items-center gap-1 p-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-300/50 dark:border-gray-700/50 sticky top-0 z-10 backdrop-blur-sm">
            <ToolbarButton title="Undo" onClick={() => execCmd('undo')}><UndoIcon /></ToolbarButton>
            <ToolbarButton title="Redo" onClick={() => execCmd('redo')}><RedoIcon /></ToolbarButton>
            <ToolbarButton title="Print" onClick={() => window.print()}><PrintIcon /></ToolbarButton>
            
            <ToolbarSeparator />
            <ToolbarButton title="Bold" onClick={() => execCmd('bold')} isActive={isBold}><BoldIcon /></ToolbarButton>
            <ToolbarButton title="Italic" onClick={() => execCmd('italic')} isActive={isItalic}><ItalicIcon /></ToolbarButton>
            <ToolbarButton title="Underline" onClick={() => execCmd('underline')} isActive={isUnderline}><UnderlineIcon /></ToolbarButton>
            <ColorPicker command="foreColor" />
            <ColorPicker command="hiliteColor" />
            <ToolbarSeparator />

            <AlignmentPicker />
            <ToolbarButton title="Bulleted List" onClick={() => execCmd('insertUnorderedList')}><ListBulletedIcon /></ToolbarButton>
            <ToolbarButton title="Numbered List" onClick={() => execCmd('insertOrderedList')}><ListNumberedIcon /></ToolbarButton>
            <ToolbarButton title="Decrease Indent" onClick={() => execCmd('outdent')}><OutdentIcon /></ToolbarButton>
            <ToolbarButton title="Increase Indent" onClick={() => execCmd('indent')}><IndentIcon /></ToolbarButton>

            <ToolbarSeparator />

            <ToolbarButton title="Insert Image" onClick={onTriggerImageUpload}><ImageIcon /></ToolbarButton>
            <ToolbarButton title="Insert Link" onClick={() => {const url = prompt('Enter a URL:'); if(url) execCmd('createLink', url);}}><LinkIcon /></ToolbarButton>
            
            <ToolbarSeparator />
            <ToolbarButton title="Clear Formatting" onClick={() => execCmd('removeFormat')}><ClearFormattingIcon /></ToolbarButton>
        </div>
    );
};


const Editor: React.FC<EditorProps> = ({ entry, onUpdate, onDelete, accentColor, isSidebarCollapsed, saveStatus, saveError }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  const updateEntry = useCallback(
    (updates: Partial<PortfolioEntry>) => {
        onUpdate(entry.id, updates);
    },
    [entry.id, onUpdate]
  );
  
  const debouncedUpdate = useRef(
    ((callback: (updates: Partial<PortfolioEntry>) => void, delay: number) => {
      let timeout: number;
      return (updates: Partial<PortfolioEntry>) => {
        clearTimeout(timeout);
        timeout = window.setTimeout(() => {
          callback(updates);
        }, delay);
      };
    })(updateEntry, 1000)
  ).current;

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== entry.content) {
      editorRef.current.innerHTML = entry.content;
    }
    if (titleInputRef.current && titleInputRef.current.value !== entry.title) {
        titleInputRef.current.value = entry.title;
    }
  }, [entry]);

  const handleContentChange = () => {
    if (editorRef.current) {
      debouncedUpdate({ content: editorRef.current.innerHTML });
    }
  };
  
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      debouncedUpdate({ title: e.target.value });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Tab') {
        e.preventDefault();
        if (e.shiftKey) {
            document.execCommand('outdent');
        } else {
            document.execCommand('indent');
        }
    }
  }

  const compressAndInsertImage = useCallback((file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
              const canvas = document.createElement('canvas');
              const MAX_WIDTH = 1024;
              const scaleSize = MAX_WIDTH / img.width;
              canvas.width = MAX_WIDTH;
              canvas.height = img.height * scaleSize;

              const ctx = canvas.getContext('2d');
              if (!ctx) return;
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              
              // Get the compressed base64 string
              const dataUrl = canvas.toDataURL(file.type, 0.8); // 80% quality
              
              document.execCommand('insertImage', false, dataUrl);
              handleContentChange();
          };
          img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      compressAndInsertImage(file);
    }
    e.target.value = ''; // Reset input
  };
  
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    // First, handle image pasting
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            const file = items[i].getAsFile();
            if (file) {
                e.preventDefault();
                compressAndInsertImage(file);
                return; // Image handled, stop further processing
            }
        }
    }
  
    // Next, handle HTML content for color correction in dark theme
    const pastedHtml = e.clipboardData.getData('text/html');
    if (pastedHtml) {
        e.preventDefault();

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = pastedHtml;

        // Function to check if a color is black or very dark
        const isBlackOrVeryDark = (color: string) => {
            if (!color) return false;
            color = color.toLowerCase().trim();
            if (['black', '#000', '#000000', 'rgb(0, 0, 0)'].includes(color)) {
                return true;
            }
            const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
            if (rgbMatch) {
                const r = parseInt(rgbMatch[1], 10);
                const g = parseInt(rgbMatch[2], 10);
                const b = parseInt(rgbMatch[3], 10);
                // Consider color dark if average component is below a threshold (e.g., 35)
                return (r + g + b) / 3 < 35;
            }
            return false;
        };

        // Traverse all elements in the pasted content and correct colors
        const allElements = tempDiv.querySelectorAll('*');
        allElements.forEach(el => {
            const element = el as HTMLElement;
            if (element.style && isBlackOrVeryDark(element.style.color)) {
                element.style.color = '#FFFFFF'; // Change to white
            }
            if (element.tagName.toLowerCase() === 'font' && element.hasAttribute('color')) {
                const colorAttr = element.getAttribute('color');
                if (colorAttr && isBlackOrVeryDark(colorAttr)) {
                    element.setAttribute('color', '#FFFFFF');
                }
            }
        });
        
        const cleanedHtml = tempDiv.innerHTML;
        document.execCommand('insertHTML', false, cleanedHtml);

    } else {
      // For plain text, let the browser handle the paste. The `onInput` event will trigger the save.
      // This timeout is a fallback for edge cases where `onInput` might not fire reliably.
      setTimeout(handleContentChange, 100);
    }
  };

  const getSaveStatusMessage = () => {
    switch (saveStatus) {
        case 'saving':
            return <p className="text-sm text-gray-500 dark:text-gray-400">Saving...</p>;
        case 'saved':
            return <p className="text-sm text-green-600 dark:text-green-400">Saved</p>;
        case 'error':
            return <p className="text-sm text-red-500 dark:text-red-400" title={saveError || "Could not save. Please check storage permissions or try exporting your work."}>Error saving</p>;
        default:
            return null;
    }
  };


  return (
    <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-900">
      <EditorToolbar 
        accentColor={accentColor} 
        editorRef={editorRef} 
        onTriggerImageUpload={() => imageInputRef.current?.click()}
      />
      <div className="flex-grow overflow-y-auto">
        <div className={`mx-auto ${isSidebarCollapsed ? 'max-w-4xl' : 'max-w-3xl'} p-4`}>
            <div className="editor-header flex justify-between items-center mb-4">
                <input
                    ref={titleInputRef}
                    type="text"
                    defaultValue={entry.title}
                    onChange={handleTitleChange}
                    placeholder="Untitled Entry"
                    className="text-4xl font-bold bg-transparent focus:outline-none w-full text-gray-900 dark:text-white"
                />
                 <div className="flex items-center gap-4">
                    {getSaveStatusMessage()}
                    <button onClick={() => onDelete(entry.id)} title="Delete Entry" className="p-2 text-gray-500 dark:text-gray-400 hover:bg-red-500/10 hover:text-red-400 rounded-full transition-colors">
                        <TrashIcon className="w-5 h-5"/>
                    </button>
                 </div>
            </div>

            <div
                ref={editorRef}
                className="prose-editor focus:outline-none p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm min-h-[calc(100vh-200px)]"
                contentEditable
                onInput={handleContentChange}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                suppressContentEditableWarning={true}
                aria-label="Portfolio entry content"
            />
        </div>
      </div>
      <input 
        type="file" 
        ref={imageInputRef} 
        onChange={handleImageUpload}
        className="hidden" 
        accept="image/*" 
      />
    </div>
  );
};

export default Editor;