import React, { useState, useEffect } from 'react';
import { PortfolioEntry } from '../types';
import { TrashIcon } from './Icons';

interface EditorProps {
  entry: PortfolioEntry;
  onUpdate: (id: string, updates: Partial<PortfolioEntry>) => void;
  onDelete: (id: string) => void;
  saveStatus: 'unsaved' | 'saving' | 'saved';
}

const Editor: React.FC<EditorProps> = ({ entry, onUpdate, onDelete, saveStatus }) => {
  const [title, setTitle] = useState(entry.title);
  const [content, setContent] = useState(entry.content);
  
  useEffect(() => {
    setTitle(entry.title);
    setContent(entry.content);
  }, [entry.id, entry.title, entry.content]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (title !== entry.title || content !== entry.content) {
        onUpdate(entry.id, { title, content });
      }
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [title, content, entry.id, entry.title, entry.content, onUpdate]);
  
  const renderMarkdown = (markdown: string) => {
    if (!markdown) return null;

    const applyInlineFormatting = (text: string) => {
      let formattedText = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      // Bold and Italic (e.g., ***text***)
      formattedText = formattedText.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
      formattedText = formattedText.replace(/___(.*?)___/g, '<strong><em>$1</em></strong>');
      
      // Bold (e.g., **text**)
      formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      formattedText = formattedText.replace(/__(.*?)__/g, '<strong>$1</strong>');
      
      // Italic (e.g., *text*)
      formattedText = formattedText.replace(/\*(.*?)\*/g, '<em>$1</em>');
      formattedText = formattedText.replace(/_(.*?)_/g, '<em>$1</em>');
      
      return formattedText;
    };

    const blocks = markdown.split(/\n\s*\n/);

    return blocks.map((block, index) => {
      // Trim the block for accurate matching
      const trimmedBlock = block.trim();

      // Headings (h1-h6)
      const headingMatch = trimmedBlock.match(/^(#{1,6})\s(.*)/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const Tag = `h${level}` as keyof JSX.IntrinsicElements;
        const content = applyInlineFormatting(headingMatch[2]);
        return <Tag key={index} dangerouslySetInnerHTML={{ __html: content }} />;
      }
      
      // Unordered List
      if (/^[\*\-]\s/.test(trimmedBlock)) {
        const items = trimmedBlock.split('\n').map(line => line.replace(/^[\*\-]\s/, ''));
        return (
          <ul key={index} className="list-disc list-inside">
            {items.map((item, i) => (
              <li key={i} dangerouslySetInnerHTML={{ __html: applyInlineFormatting(item) }} />
            ))}
          </ul>
        );
      }
      
      // Ordered List
      if (/^\d+\.\s/.test(trimmedBlock)) {
        const items = trimmedBlock.split('\n').map(line => line.replace(/^\d+\.\s/, ''));
        return (
          <ol key={index} className="list-decimal list-inside">
            {items.map((item, i) => (
              <li key={i} dangerouslySetInnerHTML={{ __html: applyInlineFormatting(item) }} />
            ))}
          </ol>
        );
      }
      
      // Image-only block
      const imageOnlyMatch = trimmedBlock.match(/^!\[(.*?)\]\((.*?)\)$/);
      if (imageOnlyMatch) {
        return <img key={index} src={imageOnlyMatch[2]} alt={imageOnlyMatch[1]} className="my-4 rounded-lg shadow-lg max-w-full h-auto mx-auto"/>;
      }

      // Paragraph with potential inline images
      const parts = block.split(/(!\[.*?\]\(.*?\))/g).filter(part => part);
      
      if (parts.length === 0 || (parts.length === 1 && parts[0].trim() === '')) {
        return null; // Don't render empty paragraphs
      }

      return (
        <p key={index} className="text-gray-300 leading-relaxed">
          {parts.map((part, i) => {
            const imageMatch = part.match(/!\[(.*?)\]\((.*?)\)/);
            if (imageMatch) {
              return <img key={i} src={imageMatch[2]} alt={imageMatch[1]} className="my-4 rounded-lg shadow-lg max-w-full h-auto mx-auto"/>;
            } else {
              return <span key={i} dangerouslySetInnerHTML={{ __html: applyInlineFormatting(part) }} />;
            }
          })}
        </p>
      );
    });
  };

  const getStatusText = () => {
    switch(saveStatus) {
      case 'saving': return 'Saving...';
      case 'saved': return 'Saved';
      case 'unsaved': return 'Unsaved changes';
      default: return '';
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-900 overflow-hidden">
      {/* Editor Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-700/50 flex items-center justify-between bg-gray-800/30">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Entry Title"
          className="bg-transparent text-xl font-bold w-full focus:outline-none text-white"
        />
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400 italic w-32 text-right">
            {getStatusText()}
          </span>
          <button
            onClick={() => onDelete(entry.id)}
            className="p-2 rounded-full text-gray-400 hover:bg-red-500/20 hover:text-red-400 transition-colors"
            aria-label="Delete entry"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Writing Area */}
        <div className="w-1/2 flex flex-col p-6 overflow-y-auto">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start writing... (Markdown supported)"
            className="flex-1 bg-transparent w-full h-full resize-none focus:outline-none text-gray-200 leading-relaxed"
          />
        </div>

        {/* Preview and Tools */}
        <div className="w-1/2 border-l border-gray-700/50 flex flex-col">
          <div className="flex-1 p-6 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 text-gray-300 border-b border-gray-700 pb-2">Live Preview</h3>
            <div className="prose prose-invert prose-sm max-w-none">
              {renderMarkdown(content)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Editor;