/**
 * Live Connection Manager
 * 
 * Manages WebSocket connection to Gemini Live API with:
 * - Auto-reconnection with exponential backoff
 * - Connection state management
 * - Event handling
 * - Error recovery
 * 
 * Version: 1.0
 * Phase: 1 - Foundation
 */

import { EventEmitter } from 'events';
import {
  ConnectionState,
  LiveConnectionConfig,
  ConnectionInfo,
} from '../types/live-api';
import { CONNECTION_CONFIG, DEBUG_CONFIG } from '../config/liveModeConfig';
import {
  WebSocketProtocolHandler,
  SetupMessage,
  ServerMessage,
  WSState
} from './WebSocketProtocolHandler';

export class LiveConnectionManager extends EventEmitter {
  private wsHandler: WebSocketProtocolHandler;
  private connectionState: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = CONNECTION_CONFIG.reconnect.maxAttempts;
  private reconnectDelay = CONNECTION_CONFIG.reconnect.baseDelay;
  private intentionalDisconnect = false;
  private lastConfig: LiveConnectionConfig | null = null;
  private connectedAt: Date | null = null;
  private lastError: string | null = null;
  private messageUnsubscribe: (() => void) | null = null;
  private errorUnsubscribe: (() => void) | null = null;
  private stateUnsubscribe: (() => void) | null = null;

  constructor() {
    super();
    this.wsHandler = new WebSocketProtocolHandler();
    this.log('LiveConnectionManager initialized');
  }

  // ============================================================================
  // PUBLIC METHODS
  // ============================================================================

  /**
   * Connect to Gemini Live API
   */
  async connect(config: LiveConnectionConfig): Promise<void> {
    if (this.connectionState === 'connected') {
      throw new Error('Already connected. Disconnect before reconnecting.');
    }

    this.setConnectionState('connecting');
    this.log('Connecting to Gemini Live API...', config);

    try {
      // Validate API key
      if (!config.apiKey || config.apiKey.trim() === '') {
        throw new Error('Invalid API key provided');
      }

      // Store config for reconnection
      this.lastConfig = config;

      // Build setup message for Gemini Live API
      const setupMessage: SetupMessage = {
        model: 'models/gemini-2.0-flash-exp',
        generationConfig: {
          temperature: config.temperature || 0.7,
          maxOutputTokens: config.maxOutputTokens || 8192,
          responseModalities: config.responseModalities || ['TEXT', 'AUDIO'],
        },
        systemInstruction: config.systemInstruction
          ? {
              parts: [{ text: config.systemInstruction }],
            }
          : undefined,
        tools: config.tools || [],
      };

      // Set up event handlers BEFORE connection
      this.setupEventHandlers();

      // Connect via WebSocket
      await this.wsHandler.connect(config.apiKey, setupMessage);

      this.connectedAt = new Date();
      this.setConnectionState('connected');
      this.emit('connected');
      this.reconnectAttempts = 0;
      this.lastError = null;

      this.log('Connected successfully');
    } catch (error: any) {
      this.lastError = error.message;
      this.setConnectionState('error');
      this.cleanupEventHandlers();
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Disconnect from Live API
   */
  async disconnect(): Promise<void> {
    if (this.connectionState === 'disconnected') {
      this.log('Already disconnected');
      return;
    }

    this.intentionalDisconnect = true;

    try {
      this.log('Disconnecting...');
      await this.wsHandler.disconnect();
      this.cleanupEventHandlers();
      this.connectedAt = null;
      this.setConnectionState('disconnected');
      this.emit('disconnected');
    } catch (error: any) {
      this.error('Error during disconnect:', error);
      // Force cleanup even if close fails
      this.cleanupEventHandlers();
      this.connectedAt = null;
      this.setConnectionState('disconnected');
    } finally {
      this.intentionalDisconnect = false;
      this.reconnectAttempts = 0;
    }
  }

  /**
   * Manually trigger reconnect
   */
  async reconnect(): Promise<void> {
    if (!this.lastConfig) {
      throw new Error('No previous connection config available');
    }

    await this.disconnect();
    await this.connect(this.lastConfig);
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connectionState === 'connected' && this.wsHandler.isConnected();
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Get WebSocket handler (for sending messages)
   */
  getWebSocketHandler(): WebSocketProtocolHandler {
    if (!this.wsHandler.isConnected()) {
      throw new Error('Not connected. Call connect() first.');
    }
    return this.wsHandler;
  }

  /**
   * Get detailed connection information
   */
  getConnectionInfo(): ConnectionInfo {
    return {
      state: this.connectionState,
      reconnectAttempts: this.reconnectAttempts,
      hasSession: this.wsHandler.isConnected(),
      connectedAt: this.connectedAt || undefined,
      lastError: this.lastError || undefined,
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Set connection state and emit event
   */
  private setConnectionState(state: ConnectionState): void {
    const previousState = this.connectionState;
    this.connectionState = state;
    
    if (previousState !== state) {
      this.log(`State changed: ${previousState} → ${state}`);
      this.emit('stateChange', state);
    }
  }

  /**
   * Set up event handlers for WebSocket
   */
  private setupEventHandlers(): void {
    this.log('Setting up event handlers');

    // Clean up any existing handlers
    this.cleanupEventHandlers();

    // Handle incoming messages
    this.messageUnsubscribe = this.wsHandler.onMessage((message: ServerMessage) => {
      this.log('Received message from API');
      this.emit('message', message);
    });

    // Handle errors
    this.errorUnsubscribe = this.wsHandler.onError((error: Error) => {
      this.error('WebSocket error:', error);
      this.lastError = error.message;
      this.setConnectionState('error');
      this.emit('error', error);
    });

    // Handle state changes
    this.stateUnsubscribe = this.wsHandler.onStateChange((wsState: WSState) => {
      this.log('WebSocket state changed:', wsState);
      
      // Map WebSocket states to connection states
      if (wsState === 'connected') {
        // Already handled in connect() method
      } else if (wsState === 'disconnected') {
        this.handleClose();
      } else if (wsState === 'error') {
        this.setConnectionState('error');
      }
    });
  }

  /**
   * Clean up event handlers
   */
  private cleanupEventHandlers(): void {
    if (this.messageUnsubscribe) {
      this.messageUnsubscribe();
      this.messageUnsubscribe = null;
    }
    if (this.errorUnsubscribe) {
      this.errorUnsubscribe();
      this.errorUnsubscribe = null;
    }
    if (this.stateUnsubscribe) {
      this.stateUnsubscribe();
      this.stateUnsubscribe = null;
    }
  }

  /**
   * Handle connection close
   */
  private handleClose(): void {
    const previousState = this.connectionState;
    this.setConnectionState('disconnected');
    this.connectedAt = null;
    this.cleanupEventHandlers();
    this.emit('disconnected');

    // Only auto-reconnect if disconnect was unexpected
    if (!this.intentionalDisconnect && previousState === 'connected') {
      this.log('Unexpected disconnect, attempting reconnect');
      this.attemptReconnect();
    }
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private async attemptReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.error('Max reconnection attempts reached');
      this.emit('error', new Error('Failed to reconnect after multiple attempts'));
      return;
    }

    this.reconnectAttempts++;
    this.setConnectionState('reconnecting');

    // Calculate exponential backoff delay
    const delay = CONNECTION_CONFIG.reconnect.exponentialBackoff
      ? Math.min(
          this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
          CONNECTION_CONFIG.reconnect.maxDelay
        )
      : this.reconnectDelay;

    this.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    await new Promise((resolve) => setTimeout(resolve, delay));

    try {
      if (this.lastConfig) {
        await this.connect(this.lastConfig);
      }
    } catch (error: any) {
      this.error('Reconnection failed:', error);
      // Will try again via handleClose if still needed
    }
  }

  // ============================================================================
  // LOGGING UTILITIES
  // ============================================================================

  private log(...args: any[]): void {
    if (DEBUG_CONFIG.enabled && DEBUG_CONFIG.logLevels.connection) {
      console.log('[LiveConnection]', ...args);
    }
  }

  private error(...args: any[]): void {
    if (DEBUG_CONFIG.enabled && DEBUG_CONFIG.logLevels.errors) {
      console.error('[LiveConnection]', ...args);
    }
  }
}
