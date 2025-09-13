import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PortfolioEntry } from '../types';
import { 
    TrashIcon, HighlightIcon, TextColorIcon, UndoIcon, RedoIcon, PrintIcon, ChevronDownIcon, 
    BoldIcon, ItalicIcon, UnderlineIcon, LinkIcon, AlignCenterIcon, AlignLeftIcon, AlignRightIcon, 
    AlignJustifyIcon, ListBulletedIcon, ListNumberedIcon, OutdentIcon, IndentIcon, ClearFormattingIcon,
    ImageIcon, SaveIcon, SpinnerIcon, CheckCircleIcon, ExclamationCircleIcon
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
  autoSaveEnabled: boolean;
  autoSaveInterval: number;
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

const ToolbarSeparator: React.FC = () => (
    <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1"></div>
);

const FONT_FAMILIES = ['Arial', 'Verdana', 'Times New Roman', 'Georgia', 'Courier New', 'Lucida Console'];
const FONT_SIZE_MAP: { [key: number]: number } = { 1: 8, 2: 10, 3: 12, 4: 14, 5: 18, 6: 24, 7: 36 };

const SaveStatusIndicator: React.FC<{
    status: SaveStatus;
    error: string | null;
    autoSaveEnabled: boolean;
    hasPendingChanges: boolean;
    onManualSave: () => void;
}> = ({ status, error, autoSaveEnabled, hasPendingChanges, onManualSave }) => {
    if (status === 'saving') {
        return <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400"><SpinnerIcon className="w-4 h-4 animate-spin" /> Saving...</div>;
    }
    if (status === 'saved') {
        return <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400"><CheckCircleIcon className="w-4 h-4" /> Saved</div>;
    }
    if (status === 'error') {
        return <div className="flex items-center gap-2 text-sm text-red-500 dark:text-red-400" title={error || ''}><ExclamationCircleIcon className="w-4 h-4" /> Error</div>;
    }
    if (!autoSaveEnabled) {
        return (
            <button
                onClick={onManualSave}
                disabled={!hasPendingChanges}
                className="flex items-center gap-2 px-3 py-1 text-sm font-semibold rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-60 enabled:accent-bg enabled:text-white enabled:accent-bg-hover"
            >
                <SaveIcon className="w-4 h-4"/>
                {hasPendingChanges ? 'Save' : 'Saved'}
            </button>
        );
    }
    if (hasPendingChanges) {
        return <div className="text-sm text-gray-500 dark:text-gray-400">Unsaved changes...</div>
    }
    return null; // idle and no pending changes
};

const PRESET_COLORS = [
    // Grayscale
    '#FFFFFF', '#E0E0E0', '#BDBDBD', '#9E9E9E', '#757575', '#424242', '#212121', '#000000',
    // Reds
    '#FFEBEE', '#FFCDD2', '#EF9A9A', '#E57373', '#EF5350', '#F44336', '#E53935', '#D32F2F',
    // Oranges
    '#FFF3E0', '#FFE0B2', '#FFCC80', '#FFB74D', '#FFA726', '#FF9800', '#FB8C00', '#F57C00',
    // Greens
    '#E8F5E9', '#C8E6C9', '#A5D6A7', '#81C784', '#66BB6A', '#4CAF50', '#43A047', '#388E3C',
    // Blues
    '#E3F2FD', '#BBDEFB', '#90CAF9', '#64B5F6', '#42A5F5', '#2196F3', '#1E88E5', '#1976D2',
    // Violets
    '#EDE7F6', '#D1C4E9', '#B39DDB', '#9575CD', '#7E57C2', '#673AB7', '#5E35B1', '#512DA8',
];

const ColorPickerPopover: React.FC<{
  onSelectColor: (color: string) => void;
  onClose: () => void;
  isHighlight?: boolean;
}> = ({ onSelectColor, onClose, isHighlight }) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div ref={popoverRef} className="absolute z-10 top-full mt-2 w-56 bg-gray-100 dark:bg-gray-700 rounded-md shadow-lg border border-gray-300/50 dark:border-gray-600/50 p-2">
      <div className="grid grid-cols-8 gap-1">
        {PRESET_COLORS.map(color => (
          <button
            key={color}
            title={color}
            className="w-6 h-6 rounded-sm border border-transparent hover:border-blue-400"
            style={{ backgroundColor: color }}
            onClick={() => { onSelectColor(color); onClose(); }}
          />
        ))}
      </div>
      {isHighlight && (
          <>
            <div className="border-t border-gray-300 dark:border-gray-600 my-2"></div>
            <button
                onClick={() => { onSelectColor('transparent'); onClose(); }}
                className="w-full text-left p-1 text-sm rounded hover:bg-gray-200 dark:hover:bg-gray-600"
            >
                No Color
            </button>
          </>
      )}
    </div>
  );
};


const EditorToolbar: React.FC<{ 
    accentColor: string; 
    editorRef: React.RefObject<HTMLDivElement>;
    onTriggerImageUpload: () => void;
    saveStatus: SaveStatus;
    saveError: string | null;
    autoSaveEnabled: boolean;
    hasPendingChanges: boolean;
    onManualSave: () => void;
}> = (props) => {
    const [isBold, setIsBold] = useState(false);
    const [isItalic, setIsItalic] = useState(false);
    const [isUnderline, setIsUnderline] = useState(false);
    const [alignment, setAlignment] = useState('left');
    const [activePopover, setActivePopover] = useState<'textColor' | 'highlightColor' | null>(null);
    const [currentColor, setCurrentColor] = useState('inherit');
    const [currentHighlight, setCurrentHighlight] = useState('inherit');

    const execCmd = (command: string, value?: string) => {
        document.execCommand(command, false, value);
        props.editorRef.current?.focus();
        updateToolbarState();
    };

    const handleColorSelection = (type: 'textColor' | 'highlightColor', color: string) => {
        if (type === 'textColor') {
            execCmd('foreColor', color);
        } else {
            execCmd('backColor', color);
        }
        setActivePopover(null);
    };
    
    const updateToolbarState = useCallback(() => {
        if (!props.editorRef.current) return;
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

        setCurrentColor(document.queryCommandValue('foreColor') || 'inherit');
        setCurrentHighlight(document.queryCommandValue('backColor') || 'inherit');
        
    }, [props.editorRef]);

    useEffect(() => {
        const editor = props.editorRef.current;
        const handleSelectionChange = () => {
            updateToolbarState();
        };

        if (editor) {
            document.addEventListener('selectionchange', handleSelectionChange);
            editor.addEventListener('focus', updateToolbarState);
            editor.addEventListener('click', updateToolbarState);
            editor.addEventListener('keyup', updateToolbarState);
        }
        
        return () => {
             if (editor) {
                document.removeEventListener('selectionchange', handleSelectionChange);
                editor.removeEventListener('focus', updateToolbarState);
                editor.removeEventListener('click', updateToolbarState);
                editor.removeEventListener('keyup', updateToolbarState);
            }
        }
    }, [props.editorRef, updateToolbarState]);

    const handleImageUpload = () => {
        const url = prompt('Enter image URL:');
        if (url) {
            const img = `<img src="${url}" style="max-width: 100%; height: auto; border-radius: 8px;" />`;
            execCmd('insertHTML', img);
        }
    };
    
    return (
        <div className="p-2 border-b border-gray-300 dark:border-gray-700 flex items-center justify-between flex-wrap gap-y-2 editor-toolbar">
            <div className="flex items-center flex-wrap gap-x-0.5">
                <ToolbarButton title="Undo" onClick={() => execCmd('undo')}><UndoIcon /></ToolbarButton>
                <ToolbarButton title="Redo" onClick={() => execCmd('redo')}><RedoIcon /></ToolbarButton>
                <ToolbarButton title="Print" onClick={() => window.print()}><PrintIcon /></ToolbarButton>
                <ToolbarSeparator />
                <ToolbarButton title="Bold" onClick={() => execCmd('bold')} isActive={isBold}><BoldIcon /></ToolbarButton>
                <ToolbarButton title="Italic" onClick={() => execCmd('italic')} isActive={isItalic}><ItalicIcon /></ToolbarButton>
                <ToolbarButton title="Underline" onClick={() => execCmd('underline')} isActive={isUnderline}><UnderlineIcon /></ToolbarButton>
                <ToolbarSeparator />
                <div className="relative">
                    <ToolbarButton title="Text Color" onClick={() => setActivePopover(activePopover === 'textColor' ? null : 'textColor')}>
                        <span className="flex flex-col items-center">
                            <TextColorIcon />
                            <div className="w-5 h-1 mt-0.5" style={{ backgroundColor: currentColor === 'inherit' ? 'transparent' : currentColor }}></div>
                        </span>
                    </ToolbarButton>
                    {activePopover === 'textColor' && (
                        <ColorPickerPopover 
                            onSelectColor={(color) => handleColorSelection('textColor', color)}
                            onClose={() => setActivePopover(null)}
                        />
                    )}
                </div>
                <div className="relative">
                     <ToolbarButton title="Highlight Color" onClick={() => setActivePopover(activePopover === 'highlightColor' ? null : 'highlightColor')}>
                        <span className="flex flex-col items-center">
                            <HighlightIcon />
                            <div className="w-5 h-1 mt-0.5" style={{ backgroundColor: currentHighlight === 'inherit' ? 'transparent' : currentHighlight }}></div>
                        </span>
                    </ToolbarButton>
                    {activePopover === 'highlightColor' && (
                        <ColorPickerPopover 
                            onSelectColor={(color) => handleColorSelection('highlightColor', color)}
                            onClose={() => setActivePopover(null)}
                            isHighlight={true}
                        />
                    )}
                </div>
                <ToolbarSeparator />
                <ToolbarButton title="Align Left" onClick={() => execCmd('justifyLeft')} isActive={alignment === 'left'}><AlignLeftIcon /></ToolbarButton>
                <ToolbarButton title="Align Center" onClick={() => execCmd('justifyCenter')} isActive={alignment === 'center'}><AlignCenterIcon /></ToolbarButton>
                <ToolbarButton title="Align Right" onClick={() => execCmd('justifyRight')} isActive={alignment === 'right'}><AlignRightIcon /></ToolbarButton>
                <ToolbarButton title="Justify" onClick={() => execCmd('justifyFull')} isActive={alignment === 'justify'}><AlignJustifyIcon /></ToolbarButton>
                <ToolbarSeparator />
                <ToolbarButton title="Bulleted List" onClick={() => execCmd('insertUnorderedList')}><ListBulletedIcon /></ToolbarButton>
                <ToolbarButton title="Numbered List" onClick={() => execCmd('insertOrderedList')}><ListNumberedIcon /></ToolbarButton>
                <ToolbarSeparator />
                <ToolbarButton title="Insert Image" onClick={handleImageUpload}><ImageIcon /></ToolbarButton>
                <ToolbarButton title="Insert Link" onClick={() => {
                    const url = prompt('Enter URL:');
                    if (url) execCmd('createLink', url);
                }}><LinkIcon /></ToolbarButton>
                <ToolbarSeparator />
                <ToolbarButton title="Clear Formatting" onClick={() => execCmd('removeFormat')}><ClearFormattingIcon /></ToolbarButton>
            </div>
            <div className="pr-2">
                <SaveStatusIndicator 
                    status={props.saveStatus} 
                    error={props.saveError} 
                    autoSaveEnabled={props.autoSaveEnabled}
                    hasPendingChanges={false} // This should be wired up if we track changes
                    onManualSave={props.onManualSave}
                />
            </div>
        </div>
    );
};

const Editor: React.FC<EditorProps> = ({ entry, onUpdate, onDelete, accentColor, isSidebarCollapsed, saveStatus, saveError, autoSaveEnabled, autoSaveInterval }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const updateTimeoutRef = useRef<number | null>(null);
  const entryIdRef = useRef(entry.id);
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    entryIdRef.current = entry.id;
    onUpdateRef.current = onUpdate;
  }, [entry.id, onUpdate]);

  const [hasPendingChanges, setHasPendingChanges] = useState(false);

  const triggerUpdate = useCallback((updates: Partial<PortfolioEntry>) => {
    if (autoSaveEnabled) {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      updateTimeoutRef.current = window.setTimeout(() => {
        onUpdateRef.current(entryIdRef.current, updates);
        setHasPendingChanges(false);
      }, autoSaveInterval);
    } else {
        setHasPendingChanges(true);
    }
  }, [autoSaveEnabled, autoSaveInterval]);

  const handleManualSave = () => {
    if (!editorRef.current) return;
    const currentContent = editorRef.current.innerHTML;
    const currentTitle = editorRef.current.querySelector('h1')?.textContent || 'Untitled Entry';
    onUpdate(entry.id, { content: currentContent, title: currentTitle });
    setHasPendingChanges(false);
  };

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const content = (e.target as HTMLDivElement).innerHTML;
    const title = (e.target as HTMLDivElement).querySelector('h1')?.textContent || 'Untitled Entry';
    triggerUpdate({ content, title });
  };
  
  const parseLightness = (color: string): number => {
    color = color.toLowerCase();
    if (color.startsWith('rgb')) {
        const rgb = color.match(/\d+/g)?.map(Number);
        if (rgb && rgb.length >= 3) {
            return (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
        }
    } else if (color.startsWith('#')) {
        let hex = color.slice(1);
        if (hex.length === 3) {
            hex = hex.split('').map(c => c + c).join('');
        }
        if (hex.length === 6) {
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        }
    }
    return 0.5; // Default for unknown formats
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const pastedHtml = e.clipboardData.getData('text/html');

    if (pastedHtml) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(pastedHtml, 'text/html');
        
        // Clean styles
        doc.querySelectorAll('*').forEach(el => {
            if (el instanceof HTMLElement) {
                // Remove dark text colors for dark theme readability
                const color = el.style.color;
                if (color) {
                    const lightness = parseLightness(color);
                    // Remove very dark or very light colors to adapt to theme
                    if (lightness < 0.2 || lightness > 0.8) {
                        el.style.color = '';
                    }
                }

                // Remove background colors to avoid theme clashes
                el.style.backgroundColor = '';
                
                if (el.getAttribute('style') === '') {
                    el.removeAttribute('style');
                }
            }
        });

        document.execCommand('insertHTML', false, doc.body.innerHTML);
    } else {
        const text = e.clipboardData.getData('text/plain');
        document.execCommand('insertText', false, text);
    }

    // After paste, trigger an update
    const content = (e.target as HTMLDivElement).innerHTML;
    const title = (e.target as HTMLDivElement).querySelector('h1')?.textContent || 'Untitled Entry';
    triggerUpdate({ content, title });
  };

  // Set initial content when entry changes
  useEffect(() => {
    if (editorRef.current && entry.content !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = entry.content;
    }
    if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
    }
    setHasPendingChanges(false);
  }, [entry]);


  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-300 dark:border-gray-700 editor-header">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold truncate" style={{ color: accentColor }}>
            {entry.title || 'Untitled Entry'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Created: {new Date(entry.createdAt).toLocaleString()}
          </p>
        </div>
        <button
          onClick={() => onDelete(entry.id)}
          className="ml-4 p-2 rounded-full text-gray-500 hover:bg-red-500/10 hover:text-red-500 transition-colors"
          aria-label="Delete Entry"
        >
          <TrashIcon className="w-5 h-5" />
        </button>
      </div>

      <EditorToolbar 
        accentColor={accentColor}
        editorRef={editorRef}
        onTriggerImageUpload={() => {}}
        saveStatus={saveStatus}
        saveError={saveError}
        autoSaveEnabled={autoSaveEnabled}
        hasPendingChanges={hasPendingChanges}
        onManualSave={handleManualSave}
      />
      
      <div className="flex-grow overflow-y-auto">
        <div 
          ref={editorRef}
          contentEditable={true}
          onInput={handleInput}
          onPaste={handlePaste}
          className="prose-editor max-w-4xl mx-auto p-8 h-full bg-white dark:bg-gray-800 rounded-lg shadow-inner my-4"
          suppressContentEditableWarning={true}
          spellCheck={true}
          aria-label="Portfolio entry content"
        />
      </div>
    </div>
  );
};

export default Editor;