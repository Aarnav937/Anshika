import React, { useState, useEffect, useRef } from 'react';

interface MessageEditorProps {
  initialContent: string;
  onSave: (newContent: string) => void;
  onCancel: () => void;
}

const MessageEditor: React.FC<MessageEditorProps> = ({
  initialContent,
  onSave,
  onCancel,
}) => {
  const [content, setContent] = useState(initialContent);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Focus the textarea and move cursor to end
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.selectionStart = content.length;
      textareaRef.current.selectionEnd = content.length;
    }
  }, []);

  useEffect(() => {
    // Auto-resize textarea to fit content
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  const handleSave = () => {
    const trimmedContent = content.trim();
    if (trimmedContent && trimmedContent !== initialContent) {
      onSave(trimmedContent);
    } else {
      onCancel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div className="w-full">
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full bg-gray-800 text-gray-100 rounded-lg px-4 py-3 border border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[60px]"
        placeholder="Edit your message..."
      />
      
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-gray-500">
          Press Enter to save, Shift+Enter for new line, Esc to cancel
        </span>
        
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-300 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!content.trim() || content.trim() === initialContent}
            className="px-3 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageEditor;
