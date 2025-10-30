// src/types/live-api.ts

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export interface LiveConnectionConfig {
  apiKey: string;
  temperature?: number;
  maxOutputTokens?: number;
  responseModalities?: ('TEXT' | 'AUDIO')[];
  systemInstruction?: string;
  tools?: any[];
}

export interface ConnectionInfo {
  state: ConnectionState;
  reconnectAttempts: number;
  hasSession: boolean;
  connectedAt?: Date;
  lastError?: string;
}

export interface SetupMessage {
  model: string;
  generationConfig: {
    temperature: number;
    maxOutputTokens: number;
    responseModalities: string[];
  };
  systemInstruction?: {
    parts: Array<{ text: string }>;
  };
  tools?: any[];
}

export interface ServerMessage {
  type: string;
  data: any;
  timestamp?: number;
}