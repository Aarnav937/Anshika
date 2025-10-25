import React from 'react';

interface MessageQuickActionsProps {
  role: 'user' | 'assistant';
  isPinned?: boolean;
  onEdit?: () => void;
  onPin: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onReact: (emoji: string) => void;
}

export const MessageQuickActions: React.FC<MessageQuickActionsProps> = ({
  role,
  isPinned = false,
  onEdit,
  onPin,
  onCopy,
  onDelete,
  onReact,
}) => {
  return (
    <div className="absolute right-2 top-2 flex items-center gap-1 bg-gray-800/95 backdrop-blur-sm rounded-lg px-2 py-1 shadow-lg border border-gray-700">
      {/* Edit - Only for user messages */}
      {role === 'user' && onEdit && (
        <button
          onClick={onEdit}
          className="p-1.5 hover:bg-gray-700 rounded transition-colors"
          title="Edit message"
          aria-label="Edit message"
        >
          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      )}

      {/* Pin */}
      <button
        onClick={onPin}
        className="p-1.5 hover:bg-gray-700 rounded transition-colors"
        title={isPinned ? "Unpin message" : "Pin message"}
        aria-label={isPinned ? "Unpin message" : "Pin message"}
      >
        <svg className={`w-4 h-4 ${isPinned ? 'text-yellow-400' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z" />
        </svg>
      </button>

      {/* Copy */}
      <button
        onClick={onCopy}
        className="p-1.5 hover:bg-gray-700 rounded transition-colors"
        title="Copy message"
        aria-label="Copy message"
      >
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      </button>

      {/* React */}
      <button
        onClick={() => onReact('❤️')}
        className="p-1.5 hover:bg-gray-700 rounded transition-colors"
        title="React with heart"
        aria-label="React with heart"
      >
        <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      </button>

      {/* Delete */}
      <button
        onClick={onDelete}
        className="p-1.5 hover:bg-gray-700 rounded transition-colors"
        title="Delete message"
        aria-label="Delete message"
      >
        <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
};
