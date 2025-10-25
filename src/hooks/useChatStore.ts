import { useState, useCallback } from 'react';
import { ChatMode, Message, ChatState } from '../types';

// MEMORY DISABLED - Simple in-memory storage only
const initialState: ChatState = {
  messages: [],
  isLoading: false,
  currentMode: 'online',
  selectedModel: 'gemma3:4b',
  availableModels: ['gemma3:4b', 'llama2', 'mistral'],
  onlineTemperature: 0.7,
  offlineTemperature: 0.7,
  webSearchEnabled: true,  // ENABLED BY DEFAULT
  voiceEnabled: false,
};

export function useChatStore() {
  const [state, setState] = useState<ChatState>(() => {
    // MEMORY DISABLED - Always start fresh
    return initialState;
  });

  // MEMORY DISABLED - Don't persist to localStorage
  // useEffect(() => {
  //   localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  // }, [state]);

  const setMode = useCallback((mode: ChatMode) => {
    setState(prev => ({ ...prev, currentMode: mode }));
  }, []);

  const setLoading = useCallback((isLoading: boolean) => {
    setState(prev => ({ ...prev, isLoading }));
  }, []);

  const addMessage = useCallback((message: Omit<Message, 'id' | 'timestamp'>) => {
    const newMessage: Message = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, newMessage],
    }));
  }, []);

  const updateMessage = useCallback((id: string, updates: Partial<Message>) => {
    setState(prev => ({
      ...prev,
      messages: prev.messages.map(msg =>
        msg.id === id ? { ...msg, ...updates } : msg
      ),
    }));
  }, []);

  const clearMessages = useCallback(() => {
    setState(prev => ({ ...prev, messages: [] }));
  }, []);

  const setSelectedModel = useCallback((model: string) => {
    setState(prev => ({ ...prev, selectedModel: model }));
  }, []);

  const setAvailableModels = useCallback((models: string[]) => {
    setState(prev => ({ ...prev, availableModels: models }));
  }, []);

  const setOnlineTemperature = useCallback((temperature: number) => {
    setState(prev => ({ ...prev, onlineTemperature: temperature }));
  }, []);

  const setOfflineTemperature = useCallback((temperature: number) => {
    setState(prev => ({ ...prev, offlineTemperature: temperature }));
  }, []);

  const setWebSearchEnabled = useCallback((enabled: boolean) => {
    setState(prev => ({ ...prev, webSearchEnabled: enabled }));
  }, []);

  const setVoiceEnabled = useCallback((enabled: boolean) => {
    setState(prev => ({ ...prev, voiceEnabled: enabled }));
  }, []);

  const editMessage = useCallback((id: string, newContent: string) => {
    setState(prev => ({
      ...prev,
      messages: prev.messages.map(msg => {
        if (msg.id === id) {
          const editHistory = msg.editHistory || [];
          return {
            ...msg,
            content: newContent,
            editHistory: [...editHistory, { content: msg.content, timestamp: new Date() }]
          };
        }
        return msg;
      })
    }));
  }, []);

  const pinMessage = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      messages: prev.messages.map(msg =>
        msg.id === id ? { ...msg, isPinned: !msg.isPinned } : msg
      )
    }));
  }, []);

  const deleteMessage = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      messages: prev.messages.filter(msg => msg.id !== id)
    }));
  }, []);

  const addReaction = useCallback((id: string, emoji: string) => {
    setState(prev => ({
      ...prev,
      messages: prev.messages.map(msg => {
        if (msg.id === id) {
          const reactions = msg.reactions || [];
          const existingReaction = reactions.find(r => r.emoji === emoji);
          
          if (existingReaction) {
            return {
              ...msg,
              reactions: reactions.map(r =>
                r.emoji === emoji ? { ...r, count: r.count + 1 } : r
              )
            };
          } else {
            return {
              ...msg,
              reactions: [...reactions, { emoji, count: 1 }]
            };
          }
        }
        return msg;
      })
    }));
  }, []);

  return {
    ...state,
    setMode,
    setLoading,
    addMessage,
    updateMessage,
    clearMessages,
    setSelectedModel,
    setAvailableModels,
    setOnlineTemperature,
    setOfflineTemperature,
    setWebSearchEnabled,
    setVoiceEnabled,
    editMessage,
    pinMessage,
    deleteMessage,
    addReaction,
  };
}
