/**
 * ConversationTestPanel
 * Simple test panel to verify Task 3.4 features in the UI
 */

import React, { useState, useEffect } from 'react';
import { ConversationList } from './ConversationList';
import { BranchVisualization } from './BranchVisualization';
import { TagSelector } from './ConversationTags';
import { useConversations } from '../hooks/useConversations';
import { DEFAULT_TAGS } from '../types/conversation';

export const ConversationTestPanel: React.FC = () => {
  const {
    conversations,
    currentConversation,
    loading,
    error,
    createNewConversation,
    selectConversation,
    deleteConversation,
    archiveConversation,
    pinConversation,
    addMessage,
    createBranch,
    switchBranch,
    addTag,
    removeTag,
  } = useConversations();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showBranchView, setShowBranchView] = useState(false);
  const [testMessage, setTestMessage] = useState('');

  // Create initial test conversation on mount if empty
  useEffect(() => {
    if (conversations.length === 0) {
      const initTestData = async () => {
        try {
          await createNewConversation(
            [
              {
                id: 'init-1',
                content: 'Welcome to the conversation test! This is your first message.',
                role: 'user',
                mode: 'online',
                timestamp: new Date(),
              },
              {
                id: 'init-2',
                content: 'Hello! I can help you test the conversation features. Try creating branches, adding tags, and more!',
                role: 'assistant',
                mode: 'online',
                timestamp: new Date(),
              },
            ],
            [DEFAULT_TAGS[0]] // Add "Work" tag
          );
        } catch (err) {
          console.error('Failed to create initial conversation:', err);
        }
      };
      initTestData();
    }
  }, [conversations.length, createNewConversation]);

  const handleAddTestMessage = async () => {
    if (!currentConversation || !testMessage.trim()) return;

    try {
      await addMessage(currentConversation.id, {
        id: `msg-${Date.now()}`,
        content: testMessage,
        role: 'user',
        mode: 'online',
        timestamp: new Date(),
      });
      setTestMessage('');

      // Add AI response
      setTimeout(async () => {
        await addMessage(currentConversation.id, {
          id: `msg-${Date.now()}-ai`,
          content: `You said: "${testMessage}". This is a test AI response!`,
          role: 'assistant',
          mode: 'online',
          timestamp: new Date(),
        });
      }, 500);
    } catch (err) {
      console.error('Failed to add message:', err);
    }
  };

  const handleCreateBranch = async () => {
    if (!currentConversation) return;

    try {
      const messageIndex = Math.floor(currentConversation.messages.length / 2);
      await createBranch(
        currentConversation.id,
        messageIndex,
        `Branch ${currentConversation.branches.length + 1}`
      );
      alert('Branch created successfully!');
    } catch (err) {
      console.error('Failed to create branch:', err);
    }
  };

  return (
    <div className="h-screen flex bg-gray-50 dark:bg-gray-900">
      {/* Sidebar - Conversation List */}
      <div className="w-80 border-r border-gray-200 dark:border-gray-700 overflow-hidden">
        <ConversationList
          conversations={conversations}
          currentConversationId={currentConversation?.id}
          onSelectConversation={selectConversation}
          onCreateNew={() => createNewConversation()}
          onDeleteConversation={deleteConversation}
          onArchiveConversation={archiveConversation}
          onPinConversation={pinConversation}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedTags={selectedTags}
          onTagFilterChange={setSelectedTags}
          loading={loading}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                🧪 Task 3.4 Test Panel
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {currentConversation
                  ? `Testing: ${currentConversation.title}`
                  : 'Select a conversation to begin'}
              </p>
            </div>
            
            {currentConversation && (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowBranchView(!showBranchView)}
                  className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                >
                  {showBranchView ? '💬 Messages' : '🌳 Branches'}
                </button>
                <button
                  onClick={handleCreateBranch}
                  className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  ➕ Create Branch
                </button>
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="mt-2 p-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded text-sm">
              ❌ {error}
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : currentConversation ? (
            <>
              {showBranchView ? (
                /* Branch View */
                <BranchVisualization
                  branches={currentConversation.branches}
                  currentBranchId={currentConversation.currentBranchId}
                  onSwitchBranch={(branchId) =>
                    switchBranch(currentConversation.id, branchId)
                  }
                />
              ) : (
                /* Message View */
                <div className="space-y-4">
                  {/* Tags */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold mb-2">🏷️ Tags</h3>
                    <TagSelector
                      currentTags={currentConversation.tags}
                      onAddTag={(tag) => addTag(currentConversation.id, tag)}
                      onRemoveTag={(tagId) => removeTag(currentConversation.id, tagId)}
                    />
                  </div>

                  {/* Messages */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold mb-2">
                      💬 Messages ({currentConversation.messageCount})
                    </h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {currentConversation.messages.map((msg, index) => (
                        <div
                          key={msg.id}
                          className={`p-3 rounded-lg ${
                            msg.role === 'user'
                              ? 'bg-blue-100 dark:bg-blue-900 ml-8'
                              : 'bg-gray-100 dark:bg-gray-700 mr-8'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold">
                              {msg.role === 'user' ? '👤 You' : '🤖 AI'} #{index + 1}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(msg.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-sm">{msg.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Add Message Test */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold mb-2">✍️ Add Test Message</h3>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={testMessage}
                        onChange={(e) => setTestMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddTestMessage()}
                        placeholder="Type a test message..."
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                      />
                      <button
                        onClick={handleAddTestMessage}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                      >
                        Send
                      </button>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold mb-2">📊 Stats</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Messages:</p>
                        <p className="font-bold">{currentConversation.messageCount}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Branches:</p>
                        <p className="font-bold">{currentConversation.branches.length}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Tags:</p>
                        <p className="font-bold">{currentConversation.tags.length}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Pinned:</p>
                        <p className="font-bold">{currentConversation.isPinned ? '✅' : '❌'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <p className="text-lg mb-2">👈 Select a conversation</p>
                <p className="text-sm">or create a new one to get started</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Stats */}
        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-3">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Total Conversations: {conversations.length}</span>
            <span>
              Total Messages:{' '}
              {conversations.reduce((sum, c) => sum + c.messageCount, 0)}
            </span>
            <span>Status: {loading ? '⏳ Loading...' : '✅ Ready'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
