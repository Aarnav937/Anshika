/**
 * useConversations Hook
 * Manages conversation state and operations
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Conversation,
  ConversationMetadata,
  ConversationFilter,
  ConversationSortOption,
  ConversationTag,
  ConversationBranch,
} from '../types/conversation';
import { Message } from '../types';
import { conversationStorageService } from '../services/conversationStorageService';

interface UseConversationsReturn {
  // Current state
  conversations: ConversationMetadata[];
  currentConversation: Conversation | null;
  loading: boolean;
  error: string | null;

  // Filters and sort
  filter: ConversationFilter;
  sortOption: ConversationSortOption;

  // Actions
  loadConversations: () => Promise<void>;
  createNewConversation: (messages?: Message[], tags?: ConversationTag[]) => Promise<string>;
  selectConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  updateConversationTitle: (id: string, title: string, isCustom?: boolean) => Promise<void>;
  addTag: (conversationId: string, tag: ConversationTag) => Promise<void>;
  removeTag: (conversationId: string, tagId: string) => Promise<void>;
  archiveConversation: (id: string, archive?: boolean) => Promise<void>;
  pinConversation: (id: string, pin?: boolean) => Promise<void>;
  addMessage: (conversationId: string, message: Message) => Promise<void>;
  createBranch: (conversationId: string, messageIndex: number, title?: string) => Promise<ConversationBranch>;
  switchBranch: (conversationId: string, branchId: string) => Promise<void>;
  setFilter: (filter: ConversationFilter) => void;
  setSortOption: (sort: ConversationSortOption) => void;
  refreshCurrentConversation: () => Promise<void>;
}

export function useConversations(): UseConversationsReturn {
  const [conversations, setConversations] = useState<ConversationMetadata[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ConversationFilter>({});
  const [sortOption, setSortOption] = useState<ConversationSortOption>({
    field: 'updatedAt',
    direction: 'desc',
  });

  /**
   * Load conversations from storage
   */
  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const convos = await conversationStorageService.getConversations(filter, sortOption);
      setConversations(convos);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
      console.error('Error loading conversations:', err);
    } finally {
      setLoading(false);
    }
  }, [filter, sortOption]);

  /**
   * Create new conversation
   */
  const createNewConversation = useCallback(async (
    messages: Message[] = [],
    tags: ConversationTag[] = []
  ): Promise<string> => {
    try {
      setError(null);
      const conversation = await conversationStorageService.createConversation(messages, tags);
      await loadConversations();
      return conversation.id;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create conversation';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [loadConversations]);

  /**
   * Select and load a conversation
   */
  const selectConversation = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const conversation = await conversationStorageService.getConversation(id);
      if (!conversation) {
        throw new Error('Conversation not found');
      }
      setCurrentConversation(conversation);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversation');
      console.error('Error loading conversation:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Delete conversation
   */
  const deleteConversation = useCallback(async (id: string) => {
    try {
      setError(null);
      await conversationStorageService.deleteConversation(id);
      
      // If deleted conversation was current, clear it
      if (currentConversation?.id === id) {
        setCurrentConversation(null);
      }
      
      await loadConversations();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete conversation';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [currentConversation, loadConversations]);

  /**
   * Update conversation title
   */
  const updateConversationTitle = useCallback(async (
    id: string,
    title: string,
    isCustom: boolean = true
  ) => {
    try {
      setError(null);
      await conversationStorageService.updateConversationTitle(id, title, isCustom);
      
      // Refresh current if it's the one being updated
      if (currentConversation?.id === id) {
        await selectConversation(id);
      }
      
      await loadConversations();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update title';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [currentConversation, loadConversations, selectConversation]);

  /**
   * Add tag to conversation
   */
  const addTag = useCallback(async (conversationId: string, tag: ConversationTag) => {
    try {
      setError(null);
      await conversationStorageService.addTagToConversation(conversationId, tag);
      
      if (currentConversation?.id === conversationId) {
        await selectConversation(conversationId);
      }
      
      await loadConversations();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to add tag';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [currentConversation, loadConversations, selectConversation]);

  /**
   * Remove tag from conversation
   */
  const removeTag = useCallback(async (conversationId: string, tagId: string) => {
    try {
      setError(null);
      await conversationStorageService.removeTagFromConversation(conversationId, tagId);
      
      if (currentConversation?.id === conversationId) {
        await selectConversation(conversationId);
      }
      
      await loadConversations();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to remove tag';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [currentConversation, loadConversations, selectConversation]);

  /**
   * Archive/Unarchive conversation
   */
  const archiveConversation = useCallback(async (id: string, archive: boolean = true) => {
    try {
      setError(null);
      await conversationStorageService.archiveConversation(id, archive);
      
      if (currentConversation?.id === id) {
        await selectConversation(id);
      }
      
      await loadConversations();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to archive conversation';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [currentConversation, loadConversations, selectConversation]);

  /**
   * Pin/Unpin conversation
   */
  const pinConversation = useCallback(async (id: string, pin: boolean = true) => {
    try {
      setError(null);
      await conversationStorageService.pinConversation(id, pin);
      
      if (currentConversation?.id === id) {
        await selectConversation(id);
      }
      
      await loadConversations();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to pin conversation';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [currentConversation, loadConversations, selectConversation]);

  /**
   * Add message to conversation
   */
  const addMessage = useCallback(async (conversationId: string, message: Message) => {
    try {
      setError(null);
      await conversationStorageService.addMessageToConversation(conversationId, message);
      
      if (currentConversation?.id === conversationId) {
        await selectConversation(conversationId);
      }
      
      await loadConversations();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to add message';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [currentConversation, loadConversations, selectConversation]);

  /**
   * Create a new branch
   */
  const createBranch = useCallback(async (
    conversationId: string,
    messageIndex: number,
    title?: string
  ): Promise<ConversationBranch> => {
    try {
      setError(null);
      const branch = await conversationStorageService.createBranch(conversationId, messageIndex, title);
      
      if (currentConversation?.id === conversationId) {
        await selectConversation(conversationId);
      }
      
      return branch;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create branch';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [currentConversation, selectConversation]);

  /**
   * Switch to a different branch
   */
  const switchBranch = useCallback(async (conversationId: string, branchId: string) => {
    try {
      setError(null);
      await conversationStorageService.switchBranch(conversationId, branchId);
      
      if (currentConversation?.id === conversationId) {
        await selectConversation(conversationId);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to switch branch';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [currentConversation, selectConversation]);

  /**
   * Refresh current conversation from storage
   */
  const refreshCurrentConversation = useCallback(async () => {
    if (currentConversation) {
      await selectConversation(currentConversation.id);
    }
  }, [currentConversation, selectConversation]);

  // Load conversations on mount and when filter/sort changes
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  return {
    conversations,
    currentConversation,
    loading,
    error,
    filter,
    sortOption,
    loadConversations,
    createNewConversation,
    selectConversation,
    deleteConversation,
    updateConversationTitle,
    addTag,
    removeTag,
    archiveConversation,
    pinConversation,
    addMessage,
    createBranch,
    switchBranch,
    setFilter,
    setSortOption,
    refreshCurrentConversation,
  };
}
