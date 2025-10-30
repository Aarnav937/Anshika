import { useState, useCallback } from 'react';
import { ChatMode, Message, ChatState } from '../types';
import { streamingGeminiService, StreamingOptions } from '../services/streamingGeminiService';

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
  // Streaming state
  isStreaming: false,
  currentStreamId: null,
  streamingMessage: null,
  streamingEnabled: true,
  streamingChunkDelay: 50,
  streamingAutoScroll: true,
  streamingShowTypingIndicator: true,
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

  // Streaming methods
  const startStreaming = useCallback(async (message: string, options?: StreamingOptions, images?: File[]): Promise<string> => {
    setState(prev => ({ ...prev, isStreaming: true }));

    try {
      // Create a streaming message placeholder
      const streamingMessageId = crypto.randomUUID();
      const streamingMessage: Message = {
        id: streamingMessageId,
        content: '',
        role: 'assistant',
        timestamp: new Date(),
        mode: state.currentMode,
        isStreaming: true,
      };

      setState(prev => ({
        ...prev,
        streamingMessage,
        currentStreamId: streamingMessageId,
        messages: [...prev.messages, streamingMessage],
      }));

      // Prepare streaming options with callbacks
      const streamingOptions: StreamingOptions = {
        temperature: state.onlineTemperature,
        webSearchEnabled: state.webSearchEnabled,
        ...options,
        onStart: () => {
          console.log('🎬 Streaming started');
          options?.onStart?.();
        },
        onChunk: (chunk: string) => {
          setState(prev => {
            if (prev.streamingMessage) {
              const updatedMessage = {
                ...prev.streamingMessage,
                content: prev.streamingMessage.content + chunk,
              };
              return {
                ...prev,
                streamingMessage: updatedMessage,
                messages: prev.messages.map(msg =>
                  msg.id === streamingMessageId ? updatedMessage : msg
                ),
              };
            }
            return prev;
          });
          options?.onChunk?.(chunk);
        },
        onComplete: (fullResponse: string) => {
          setState(prev => {
            if (prev.streamingMessage) {
              const completedMessage = {
                ...prev.streamingMessage,
                content: fullResponse,
                isStreaming: false,
              };
              return {
                ...prev,
                streamingMessage: null,
                currentStreamId: null,
                isStreaming: false,
                messages: prev.messages.map(msg =>
                  msg.id === streamingMessageId ? completedMessage : msg
                ),
              };
            }
            return {
              ...prev,
              streamingMessage: null,
              currentStreamId: null,
              isStreaming: false,
            };
          });
          options?.onComplete?.(fullResponse);
        },
        onError: (error: Error) => {
          setState(prev => ({
            ...prev,
            streamingMessage: null,
            currentStreamId: null,
            isStreaming: false,
          }));
          options?.onError?.(error);
        },
      };

      // Start the streaming request
      const response = await streamingGeminiService.sendStreamingMessage(message, streamingOptions, images);
      return response;

    } catch (error) {
      setState(prev => ({
        ...prev,
        streamingMessage: null,
        currentStreamId: null,
        isStreaming: false,
      }));
      throw error;
    }
  }, [state.onlineTemperature, state.webSearchEnabled]);

  const pauseStreaming = useCallback(() => {
    if (state.currentStreamId) {
      streamingGeminiService.pauseStream(state.currentStreamId);
      setState(prev => ({ ...prev, isStreaming: false }));
    }
  }, [state.currentStreamId]);

  const resumeStreaming = useCallback(() => {
    if (state.currentStreamId) {
      streamingGeminiService.resumeStream(state.currentStreamId);
      setState(prev => ({ ...prev, isStreaming: true }));
    }
  }, [state.currentStreamId]);

  const cancelStreaming = useCallback(() => {
    if (state.currentStreamId) {
      streamingGeminiService.cancelStream(state.currentStreamId);
      setState(prev => ({
        ...prev,
        streamingMessage: null,
        currentStreamId: null,
        isStreaming: false,
      }));
    }
  }, [state.currentStreamId]);

  const setStreamingEnabled = useCallback((enabled: boolean) => {
    setState(prev => ({ ...prev, streamingEnabled: enabled }));
  }, []);

  const setStreamingChunkDelay = useCallback((delay: number) => {
    setState(prev => ({ ...prev, streamingChunkDelay: delay }));
  }, []);

  const setStreamingAutoScroll = useCallback((enabled: boolean) => {
    setState(prev => ({ ...prev, streamingAutoScroll: enabled }));
  }, []);

  const setStreamingShowTypingIndicator = useCallback((enabled: boolean) => {
    setState(prev => ({ ...prev, streamingShowTypingIndicator: enabled }));
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
    // Streaming methods
    startStreaming,
    pauseStreaming,
    resumeStreaming,
    cancelStreaming,
    setStreamingEnabled,
    setStreamingChunkDelay,
    setStreamingAutoScroll,
    setStreamingShowTypingIndicator,
  };
}
