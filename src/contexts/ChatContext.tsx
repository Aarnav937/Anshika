import { createContext, useContext, ReactNode } from 'react';
import { useChatStore } from '../hooks/useChatStore';
import { ChatState, Message, ChatMode } from '../types';

interface ChatContextType extends ChatState {
  setMode: (mode: ChatMode) => void;
  setLoading: (isLoading: boolean) => void;
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  clearMessages: () => void;
  setSelectedModel: (model: string) => void;
  setAvailableModels: (models: string[]) => void;
  setOnlineTemperature: (temperature: number) => void;
  setOfflineTemperature: (temperature: number) => void;
  setWebSearchEnabled: (enabled: boolean) => void;
  setVoiceEnabled: (enabled: boolean) => void;
  editMessage: (id: string, newContent: string) => void;
  pinMessage: (id: string) => void;
  deleteMessage: (id: string) => void;
  addReaction: (id: string, emoji: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}

interface ChatProviderProps {
  children: ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps) {
  const chatStore = useChatStore();

  return (
    <ChatContext.Provider value={chatStore}>
      {children}
    </ChatContext.Provider>
  );
}
