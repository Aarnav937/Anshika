export type MemoryType =
  | 'preference'
  | 'fact'
  | 'context'
  | 'relationship'
  | 'instruction';

export interface Memory {
  id: string;
  type: MemoryType;
  content: string;
  keywords: string[];
  embedding?: number[];
  confidence: number;
  source: {
    conversationId: string;
    messageId: string;
    timestamp: Date;
  };
  lastAccessed: Date;
  accessCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemoryContext {
  relevantMemories: Memory[];
  userProfile: UserProfile;
  recentTopics: string[];
}

export interface UserProfile {
  id?: string;
  name?: string;
  preferences: Record<string, unknown>;
  facts: string[];
  communicationStyle?: 'formal' | 'casual' | 'technical';
}
