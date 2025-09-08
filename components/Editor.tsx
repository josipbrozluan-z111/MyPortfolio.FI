import React, { useState, useEffect } from 'react';
import { PortfolioEntry } from '../types';
import { TrashIcon } from './Icons';

interface EditorProps {
  entry: PortfolioEntry;
  onUpdate: (id: string, updates: Partial<PortfolioEntry>) => void;
  onDelete: (id: string) => void;
}

const Editor: React.FC<EditorProps> = ({ entry, onUpdate, onDelete }) => {
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
  
  const renderContent = (text: string) => {
    // Regex to split by markdown image syntax: ![alt](src)
    const parts = text.split(/(!\[.*?\]\(.*?\))/g);
    return parts.map((part, index) => {
      const match = part.match(/!\[(.*?)\]\((.*?)\)/);
      if (match) {
        return <img key={index} src={match[2]} alt={match[1]} className="my-4 rounded-lg shadow-lg max-w-full h-auto mx-auto"/>;
      }
      if (part) {
        return <p key={index} className="text-gray-300 whitespace-pre-wrap leading-relaxed">{part}</p>;
      }
      return null;
    });
  };

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
        <button
          onClick={() => onDelete(entry.id)}
          className="p-2 rounded-full text-gray-400 hover:bg-red-500/20 hover:text-red-400 transition-colors"
          aria-label="Delete entry"
        >
          <TrashIcon className="w-5 h-5" />
        </button>
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Writing Area */}
        <div className="w-1/2 flex flex-col p-6 overflow-y-auto">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start writing..."
            className="flex-1 bg-transparent w-full h-full resize-none focus:outline-none text-gray-200 leading-relaxed"
          />
        </div>

        {/* Preview and Tools */}
        <div className="w-1/2 border-l border-gray-700/50 flex flex-col">
          <div className="flex-1 p-6 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 text-gray-300 border-b border-gray-700 pb-2">Live Preview</h3>
            <div className="prose prose-invert prose-sm max-w-none">
              {renderContent(content)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Editor;