// src/services/WebSocketProtocolHandler.ts

import { EventEmitter } from 'events';

export type WSState = 'disconnected' | 'connecting' | 'connected' | 'error';

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

export class WebSocketProtocolHandler extends EventEmitter {
  private ws: WebSocket | null = null;
  private state: WSState = 'disconnected';
  private messageListeners: Array<(message: ServerMessage) => void> = [];
  private errorListeners: Array<(error: Error) => void> = [];
  private stateListeners: Array<(state: WSState) => void> = [];

  constructor() {
    super();
  }

  async connect(apiKey: string, setupMessage: SetupMessage): Promise<void> {
    if (this.state === 'connected') {
      throw new Error('Already connected');
    }

    this.setState('connecting');

    try {
      // Build WebSocket URL for Gemini Live API
      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;

      this.ws = new WebSocket(wsUrl);

      return new Promise((resolve, reject) => {
        if (!this.ws) return reject(new Error('WebSocket not initialized'));

        this.ws.onopen = () => {
          // Send setup message
          this.send(setupMessage);
          this.setState('connected');
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: ServerMessage = JSON.parse(event.data);
            this.messageListeners.forEach(listener => listener(message));
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onerror = (_error) => {
          const wsError = new Error('WebSocket connection error');
          this.errorListeners.forEach(listener => listener(wsError));
          this.setState('error');
          reject(wsError);
        };

        this.ws.onclose = () => {
          this.setState('disconnected');
          this.stateListeners.forEach(listener => listener('disconnected'));
        };
      });
    } catch (error) {
      this.setState('error');
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
    }
    this.ws = null;
    this.setState('disconnected');
  }

  send(message: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    this.ws.send(JSON.stringify(message));
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  getState(): WSState {
    return this.state;
  }

  // Event subscription methods
  onMessage(listener: (message: ServerMessage) => void): () => void {
    this.messageListeners.push(listener);
    return () => {
      const index = this.messageListeners.indexOf(listener);
      if (index > -1) {
        this.messageListeners.splice(index, 1);
      }
    };
  }

  onError(listener: (error: Error) => void): () => void {
    this.errorListeners.push(listener);
    return () => {
      const index = this.errorListeners.indexOf(listener);
      if (index > -1) {
        this.errorListeners.splice(index, 1);
      }
    };
  }

  onStateChange(listener: (state: WSState) => void): () => void {
    this.stateListeners.push(listener);
    return () => {
      const index = this.stateListeners.indexOf(listener);
      if (index > -1) {
        this.stateListeners.splice(index, 1);
      }
    };
  }

  private setState(state: WSState): void {
    this.state = state;
    this.stateListeners.forEach(listener => listener(state));
  }
}