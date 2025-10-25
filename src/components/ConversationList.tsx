/**
 * ConversationList Component
 * Sidebar showing all conversations with search, filters, and actions
 */

import React, { useState } from 'react';
import { ConversationMetadata } from '../types/conversation';
import { ConversationTags } from './ConversationTags';

interface ConversationListProps {
  conversations: ConversationMetadata[];
  currentConversationId?: string;
  onSelectConversation: (id: string) => void;
  onCreateNew: () => void;
  onDeleteConversation: (id: string) => void;
  onArchiveConversation: (id: string, archive: boolean) => void;
  onPinConversation: (id: string, pin: boolean) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedTags: string[];
  onTagFilterChange: (tags: string[]) => void;
  loading?: boolean;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  currentConversationId,
  onSelectConversation,
  onCreateNew,
  onDeleteConversation,
  onArchiveConversation,
  onPinConversation,
  searchQuery,
  onSearchChange,
  selectedTags,
  onTagFilterChange,
  loading = false,
}) => {
  const [showArchived, setShowArchived] = useState(false);

  // Filter conversations
  const filteredConversations = conversations.filter(c => {
    if (!showArchived && c.isArchived) return false;
    return true;
  });

  // Group by pinned
  const pinnedConvos = filteredConversations.filter(c => c.isPinned);
  const regularConvos = filteredConversations.filter(c => !c.isPinned);

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  const ConversationItem: React.FC<{ conversation: ConversationMetadata }> = ({ conversation }) => {
    const isSelected = conversation.id === currentConversationId;
    const [showActions, setShowActions] = useState(false);

    return (
      <div
        className={`
          group relative p-3 mb-2 rounded-lg cursor-pointer transition-all
          ${isSelected 
            ? 'bg-blue-100 dark:bg-blue-900 border-l-4 border-blue-500' 
            : 'hover:bg-gray-100 dark:hover:bg-gray-700'
          }
        `}
        onClick={() => onSelectConversation(conversation.id)}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {/* Title */}
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-medium text-sm truncate flex-1">
            {conversation.isPinned && <span className="mr-1">📌</span>}
            {conversation.title}
          </h3>
          
          {/* Quick Actions */}
          {showActions && (
            <div className="flex gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => onPinConversation(conversation.id, !conversation.isPinned)}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                title={conversation.isPinned ? 'Unpin' : 'Pin'}
              >
                {conversation.isPinned ? '📌' : '📍'}
              </button>
              <button
                onClick={() => onArchiveConversation(conversation.id, !conversation.isArchived)}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                title={conversation.isArchived ? 'Unarchive' : 'Archive'}
              >
                📦
              </button>
              <button
                onClick={() => {
                  if (confirm('Delete this conversation?')) {
                    onDeleteConversation(conversation.id);
                  }
                }}
                className="p-1 hover:bg-red-200 dark:hover:bg-red-900 rounded"
                title="Delete"
              >
                🗑️
              </button>
            </div>
          )}
        </div>

        {/* Tags */}
        {conversation.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {conversation.tags.map(tag => (
              <span
                key={tag.id}
                className={`
                  px-2 py-0.5 rounded-full text-xs
                  bg-${tag.color}-100 text-${tag.color}-700
                  dark:bg-${tag.color}-900 dark:text-${tag.color}-300
                `}
              >
                {tag.icon} {tag.name}
              </span>
            ))}
          </div>
        )}

        {/* Preview */}
        <p className="text-xs text-gray-600 dark:text-gray-400 truncate mb-1">
          {conversation.firstMessagePreview}
        </p>

        {/* Meta info */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{formatDate(conversation.lastMessageAt)}</span>
          <span className="flex items-center gap-2">
            <span>💬 {conversation.messageCount}</span>
            {conversation.branchCount > 1 && (
              <span>🌿 {conversation.branchCount}</span>
            )}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">Conversations</h2>
          <button
            onClick={onCreateNew}
            className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
          >
            + New
          </button>
        </div>

        {/* Search */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="🔍 Search conversations..."
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
        />

        {/* Tag Filter */}
        <div className="mt-3">
          <ConversationTags
            selectedTags={selectedTags}
            onTagSelect={(tagId) => {
              if (selectedTags.includes(tagId)) {
                onTagFilterChange(selectedTags.filter(t => t !== tagId));
              } else {
                onTagFilterChange([...selectedTags, tagId]);
              }
            }}
          />
        </div>

        {/* Show Archived Toggle */}
        <div className="mt-3 flex items-center">
          <input
            type="checkbox"
            id="showArchived"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="mr-2"
          />
          <label htmlFor="showArchived" className="text-sm text-gray-600 dark:text-gray-400">
            Show archived
          </label>
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {/* Pinned */}
            {pinnedConvos.length > 0 && (
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                  📌 Pinned
                </h3>
                {pinnedConvos.map(convo => (
                  <ConversationItem key={convo.id} conversation={convo} />
                ))}
              </div>
            )}

            {/* Regular */}
            {regularConvos.length > 0 && (
              <div>
                {pinnedConvos.length > 0 && (
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                    All Conversations
                  </h3>
                )}
                {regularConvos.map(convo => (
                  <ConversationItem key={convo.id} conversation={convo} />
                ))}
              </div>
            )}

            {/* Empty state */}
            {filteredConversations.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400 mb-3">
                  {searchQuery || selectedTags.length > 0
                    ? 'No conversations found'
                    : 'No conversations yet'
                  }
                </p>
                <button
                  onClick={onCreateNew}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Create your first conversation
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Stats Footer */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500">
        <div className="flex justify-between">
          <span>{filteredConversations.length} conversations</span>
          <span>
            {filteredConversations.reduce((sum, c) => sum + c.messageCount, 0)} messages
          </span>
        </div>
      </div>
    </div>
  );
};
