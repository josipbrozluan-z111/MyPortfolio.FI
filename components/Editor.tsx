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
    
    const execCmd = (command: string, value?: string) => {
        document.execCommand(command, false, value);
        props.editorRef.current?.focus();
        updateToolbarState();
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

    }, [props.editorRef]);

    useEffect(() => {
        const editor = props.editorRef.current;
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
    }, [updateToolbarState, props.editorRef]);

    const ColorPicker: React.FC<{ command: 'foreColor' | 'hiliteColor' }> = ({ command }) => (
        <div className="relative group">
            <ToolbarButton title={command === 'foreColor' ? "Text Color" : "Highlight Color"}>
                {command === 'foreColor' ? <TextColorIcon /> : <HighlightIcon />}
            </ToolbarButton>
            <div className="absolute top-full left-0 mt-1 p-2 bg-white dark:bg-gray-800 border border-gray-300/50 dark:border-gray-600/50 rounded-md shadow-lg hidden group-hover:block z-20">
              <div className="grid grid-cols-9 gap-1">
                <button onMouseDown={(e) => { e.preventDefault(); execCmd(command, props.accentColor); }} className="w-6 h-6 rounded-full border border-gray-400/50" style={{ backgroundColor: props.accentColor }} title="Accent"></button>
                {['#ef4444', '#f97316', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e', '#ec4899', '#9ca3af', '#6b7280', '#4b5563', '#374151', '#1f2937', '#000000'].map((color) => (
                    <button key={color} onMouseDown={(e) => { e.preventDefault(); execCmd(command, color); }} className="w-6 h-6 rounded-full border border-gray-400/50" style={{ backgroundColor: color }} title={color}></button>
                ))}
              </div>
            </div>
        </div>
    );
    
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
            <ToolbarButton title="Align Left" onClick={() => execCmd('justifyLeft')} isActive={alignment === 'left'}><AlignLeftIcon /></ToolbarButton>
            <ToolbarButton title="Align Center" onClick={() => execCmd('justifyCenter')} isActive={alignment === 'center'}><AlignCenterIcon /></ToolbarButton>
            <ToolbarButton title="Align Right" onClick={() => execCmd('justifyRight')} isActive={alignment === 'right'}><AlignRightIcon /></ToolbarButton>
            <ToolbarButton title="Bulleted List" onClick={() => execCmd('insertUnorderedList')}><ListBulletedIcon /></ToolbarButton>
            <ToolbarButton title="Numbered List" onClick={() => execCmd('insertOrderedList')}><ListNumberedIcon /></ToolbarButton>
            <ToolbarButton title="Decrease Indent" onClick={() => execCmd('outdent')}><OutdentIcon /></ToolbarButton>
            <ToolbarButton title="Increase Indent" onClick={() => execCmd('indent')}><IndentIcon /></ToolbarButton>
            <ToolbarSeparator />
            <ToolbarButton title="Insert Image" onClick={props.onTriggerImageUpload}><ImageIcon /></ToolbarButton>
            <ToolbarButton title="Insert Link" onClick={() => {const url = prompt('Enter a URL:'); if(url) execCmd('createLink', url);}}><LinkIcon /></ToolbarButton>
            <ToolbarSeparator />
            <ToolbarButton title="Clear Formatting" onClick={() => execCmd('removeFormat')}><ClearFormattingIcon /></ToolbarButton>

            <div className="ml-auto">
                <SaveStatusIndicator 
                    status={props.saveStatus}
                    error={props.saveError}
                    autoSaveEnabled={props.autoSaveEnabled}
                    hasPendingChanges={props.hasPendingChanges}
                    onManualSave={props.onManualSave}
                />
            </div>
        </div>
    );
};


const Editor: React.FC<EditorProps> = ({ entry, onUpdate, onDelete, accentColor, isSidebarCollapsed, saveStatus, saveError, autoSaveEnabled, autoSaveInterval }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  
  // Refs to hold the latest props and state, preventing stale closures in callbacks.
  const updateCallbackRef = useRef(onUpdate);
  const entryIdRef = useRef(entry.id);
  const autoSaveEnabledRef = useRef(autoSaveEnabled);
  const autoSaveIntervalRef = useRef(autoSaveInterval);
  
  useEffect(() => {
    updateCallbackRef.current = onUpdate;
    entryIdRef.current = entry.id;
  }, [onUpdate, entry.id]);

  useEffect(() => {
      autoSaveEnabledRef.current = autoSaveEnabled;
      autoSaveIntervalRef.current = autoSaveInterval;
  }, [autoSaveEnabled, autoSaveInterval]);


  // A more robust debounced update function that can be controlled by props.
  const debouncedUpdateManager = useRef(
    (() => {
        let timeout: number;
        let pendingUpdates: Partial<PortfolioEntry> = {};
        
        const flush = () => {
            clearTimeout(timeout);
            if (Object.keys(pendingUpdates).length > 0) {
                updateCallbackRef.current(entryIdRef.current, pendingUpdates);
                pendingUpdates = {};
            }
        };
        
        const update = (updates: Partial<PortfolioEntry>) => {
            setHasPendingChanges(true);
            pendingUpdates = { ...pendingUpdates, ...updates };
            
            clearTimeout(timeout);
            if (autoSaveEnabledRef.current) {
                timeout = window.setTimeout(flush, autoSaveIntervalRef.current);
            }
        };

        return { update, flush };
    })()
  ).current;

  // Effect to sync the editor's content when the entry prop changes.
  useEffect(() => {
    setHasPendingChanges(false); // Reset pending changes on entry switch
    if (editorRef.current && editorRef.current.innerHTML !== entry.content) {
      editorRef.current.innerHTML = entry.content;
    }
    if (titleInputRef.current && titleInputRef.current.value !== entry.title) {
        titleInputRef.current.value = entry.title;
    }
  }, [entry]);

  // When a save is confirmed, mark that we no longer have pending changes
  useEffect(() => {
      if (saveStatus === 'saved') {
          setHasPendingChanges(false);
      }
  }, [saveStatus]);

  const handleContentChange = () => {
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      const updates: Partial<PortfolioEntry> = { content: newContent };
      
      const currentTitle = titleInputRef.current?.value.trim();
      const placeholderTitles = ['new entry', 'untitled entry', 'my first entry'];
      if (!currentTitle || placeholderTitles.includes(currentTitle.toLowerCase())) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = newContent;
        const firstHeader = tempDiv.querySelector('h1, h2, h3, h4, h5, h6');
        let newTitle = '';

        if (firstHeader && firstHeader.textContent) {
          newTitle = firstHeader.textContent;
        } else {
          newTitle = (tempDiv.textContent || '').split('\n').find(line => line.trim() !== '') || '';
        }

        newTitle = newTitle.trim().substring(0, 100);

        if (newTitle && newTitle !== currentTitle) {
            updates.title = newTitle;
            if (titleInputRef.current) {
                titleInputRef.current.value = newTitle;
            }
        }
      }

      debouncedUpdateManager.update(updates);
    }
  };
  
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      debouncedUpdateManager.update({ title: e.target.value });
  };

  const handleManualSave = () => {
      debouncedUpdateManager.flush();
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Tab') {
        e.preventDefault();
        if (e.shiftKey) {
            document.execCommand('outdent');
        } else {
            document.execCommand('indent');
        }
    }
    // Manual save shortcut
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleManualSave();
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
              
              const dataUrl = canvas.toDataURL(file.type, 0.8);
              
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
    e.target.value = '';
  };
  
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            const file = items[i].getAsFile();
            if (file) {
                e.preventDefault();
                compressAndInsertImage(file);
                return;
            }
        }
    }
  
    const pastedHtml = e.clipboardData.getData('text/html');
    if (pastedHtml) {
        e.preventDefault();

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = pastedHtml;
        const cleanedHtml = tempDiv.innerHTML;
        document.execCommand('insertHTML', false, cleanedHtml);
        
        setTimeout(handleContentChange, 0);

    } else {
      setTimeout(handleContentChange, 100);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-900">
      <EditorToolbar 
        accentColor={accentColor} 
        editorRef={editorRef} 
        onTriggerImageUpload={() => imageInputRef.current?.click()}
        saveStatus={saveStatus}
        saveError={saveError}
        autoSaveEnabled={autoSaveEnabled}
        hasPendingChanges={hasPendingChanges}
        onManualSave={handleManualSave}
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