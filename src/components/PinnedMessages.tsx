import React from 'react';
import { Message } from '../types';

interface PinnedMessagesProps {
  messages: Message[];
  onUnpin: (id: string) => void;
  onMessageClick?: (id: string) => void;
}

export const PinnedMessages: React.FC<PinnedMessagesProps> = ({
  messages,
  onUnpin,
  onMessageClick,
}) => {
  const pinnedMessages = messages.filter(msg => msg.isPinned);

  if (pinnedMessages.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-800/50 border-b border-gray-700 p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z" />
          </svg>
          Pinned Messages ({pinnedMessages.length})
        </h3>
      </div>

      <div className="space-y-2">
        {pinnedMessages.map((message) => (
          <div
            key={message.id}
            className="bg-gray-700/50 rounded-lg p-3 flex items-start justify-between hover:bg-gray-700/70 transition-colors cursor-pointer group"
            onClick={() => onMessageClick?.(message.id)}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-medium ${message.role === 'user' ? 'text-blue-400' : 'text-green-400'}`}>
                  {message.role === 'user' ? 'You' : 'AI'}
                </span>
                <span className="text-xs text-gray-500">
                  {message.timestamp.toLocaleTimeString()}
                </span>
              </div>
              <p className="text-sm text-gray-300 line-clamp-2">
                {message.content}
              </p>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onUnpin(message.id);
              }}
              className="ml-3 p-1.5 hover:bg-gray-600 rounded transition-colors opacity-0 group-hover:opacity-100"
              title="Unpin message"
              aria-label="Unpin message"
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
