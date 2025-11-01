/**
 * Streaming Gemini Service
 *
 * Provides streaming AI responses using Gemini's streaming API for real-time,
 * word-by-word response display. Integrates seamlessly with existing personality
 * system, tool calling, and error handling.
 *
 * @author A.N.S.H.I.K.A. Development Team
 * @version 1.0.0
 * @since 2025-10-31
 */

import { ToolCall } from '../types';
import { executeTool, getEnabledTools } from './toolManager';
import { generatePersonalityPrompt, recordInteraction } from './personalityPromptGenerator';
import type { PersonalityConfig } from '../types/personality';
import { loadPersonalityConfig, savePersonalityConfig } from './personalityStorageService';
import { detectContext, shouldSwitchMode } from './contextDetector';
import { analyzeSentiment } from './sentimentAnalyzer';
import { secureStorage } from './secureStorageService';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface StreamingOptions {
  onChunk?: (chunk: string) => void;
  onComplete?: (fullResponse: string) => void;
  onError?: (error: Error) => void;
  onStart?: () => void;
  signal?: AbortSignal;
  temperature?: number;
  webSearchEnabled?: boolean;
}

export interface StreamInfo {
  id: string;
  messageId: string;
  status: 'initializing' | 'active' | 'paused' | 'cancelled' | 'completed' | 'error';
  startTime: number;
  chunksReceived: number;
  totalChunks: number;
  lastChunkTime: number;
  error?: Error;
}

export interface ProcessedChunk {
  content: string;
  isComplete: boolean;
  metadata?: {
    finishReason?: string;
    safetyRatings?: Array<{
      category: string;
      probability: string;
    }>;
    citationMetadata?: Array<{
      startIndex: number;
      endIndex: number;
      uri: string;
      title?: string;
    }>;
  };
}

export interface StreamBuffer {
  chunks: ProcessedChunk[];
  fullContent: string;
  isComplete: boolean;
  lastUpdate: number;
}

// ============================================================================
// Stream Processor Utility
// ============================================================================

export class StreamProcessor {
  private buffer: StreamBuffer;

  constructor() {
    this.buffer = {
      chunks: [],
      fullContent: '',
      isComplete: false,
      lastUpdate: Date.now()
    };
  }

  /**
   * Process a raw chunk from the streaming API
   */
  processChunk(rawChunk: {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
        }>;
      };
      finishReason?: string;
      safetyRatings?: Array<{
        category: string;
        probability: string;
      }>;
      citationMetadata?: Array<{
        startIndex: number;
        endIndex: number;
        uri: string;
        title?: string;
      }>;
    }>;
  }): ProcessedChunk {
    try {
      // Handle Gemini streaming response format
      const candidate = rawChunk.candidates?.[0];
      if (!candidate) {
        return { content: '', isComplete: false };
      }

      const content = candidate.content;
      const parts = content?.parts || [];
      let chunkContent = '';

      // Extract text from parts
      for (const part of parts) {
        if (part.text) {
          chunkContent += part.text;
        }
      }

      const isComplete = candidate.finishReason === 'STOP' ||
                        candidate.finishReason === 'MAX_TOKENS' ||
                        candidate.finishReason === 'SAFETY';

      return {
        content: chunkContent,
        isComplete,
        metadata: {
          finishReason: candidate.finishReason,
          safetyRatings: candidate.safetyRatings,
          citationMetadata: candidate.citationMetadata
        }
      };
    } catch (error) {
      console.error('Error processing streaming chunk:', error);
      return { content: '', isComplete: false };
    }
  }

  /**
   * Add a processed chunk to the buffer
   */
  addChunk(chunk: ProcessedChunk): void {
    this.buffer.chunks.push(chunk);
    this.buffer.fullContent += chunk.content;
    this.buffer.isComplete = chunk.isComplete;
    this.buffer.lastUpdate = Date.now();
  }

  /**
   * Get the current buffer state
   */
  getBuffer(): StreamBuffer {
    return { ...this.buffer };
  }

  /**
   * Clear the buffer
   */
  clear(): void {
    this.buffer = {
      chunks: [],
      fullContent: '',
      isComplete: false,
      lastUpdate: Date.now()
    };
  }

  /**
   * Get formatted content for display
   */
  getFormattedContent(): string {
    return this.buffer.fullContent;
  }

  /**
   * Check if streaming is complete
   */
  isComplete(): boolean {
    return this.buffer.isComplete;
  }
}

// ============================================================================
// Stream Buffer Manager
// ============================================================================

export class StreamBufferManager {
  private buffers: Map<string, StreamBuffer> = new Map();
  private processors: Map<string, StreamProcessor> = new Map();

  /**
   * Create a new stream buffer
   */
  createBuffer(streamId: string): StreamProcessor {
    const processor = new StreamProcessor();
    this.processors.set(streamId, processor);
    this.buffers.set(streamId, processor.getBuffer());
    return processor;
  }

  /**
   * Get buffer for a stream
   */
  getBuffer(streamId: string): StreamBuffer | undefined {
    return this.buffers.get(streamId);
  }

  /**
   * Update buffer for a stream
   */
  updateBuffer(streamId: string, buffer: StreamBuffer): void {
    this.buffers.set(streamId, buffer);
  }

  /**
   * Remove buffer for a stream
   */
  removeBuffer(streamId: string): void {
    this.buffers.delete(streamId);
    this.processors.delete(streamId);
  }

  /**
   * Get processor for a stream
   */
  getProcessor(streamId: string): StreamProcessor | undefined {
    return this.processors.get(streamId);
  }

  /**
   * Clear all buffers
   */
  clearAll(): void {
    this.buffers.clear();
    this.processors.clear();
  }

  /**
   * Get all active stream IDs
   */
  getActiveStreams(): string[] {
    return Array.from(this.buffers.keys());
  }
}

// ============================================================================
// Streaming Gemini Service
// ============================================================================

export class StreamingGeminiService {
  private static instance: StreamingGeminiService;
  private apiKey: string | null = null;
  private bufferManager: StreamBufferManager;
  private activeStreams: Map<string, StreamInfo> = new Map();
  private personalityConfig: PersonalityConfig;

  // Configuration
  private readonly BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
  private readonly DEFAULT_MODEL = 'gemini-2.0-flash-exp';
  private readonly CHUNK_DELAY = 50; // ms between chunks for smooth animation

  private constructor() {
    this.bufferManager = new StreamBufferManager();
    this.personalityConfig = loadPersonalityConfig();

    // Initialize API key
    this.initializeApiKey();
  }

  static getInstance(): StreamingGeminiService {
    if (!StreamingGeminiService.instance) {
      StreamingGeminiService.instance = new StreamingGeminiService();
    }
    return StreamingGeminiService.instance;
  }

  /**
   * Initialize API key from secure storage
   */
  private async initializeApiKey(): Promise<void> {
    try {
      const storedKey = await secureStorage.getApiKey('VITE_GEMINI_API_KEY');
      if (storedKey) {
        this.apiKey = storedKey;
        console.log('🔐 StreamingGeminiService: API key loaded from secure storage');
      } else {
        const envKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (envKey) {
          this.apiKey = envKey;
          console.log('🔑 StreamingGeminiService: API key loaded from environment');
        } else {
          console.warn('⚠️ StreamingGeminiService: No API key found');
        }
      }
    } catch (error) {
      console.error('❌ StreamingGeminiService: Failed to initialize API key:', error);
    }
  }

  /**
   * Refresh API key (called after user updates key)
   */
  async refreshApiKey(): Promise<void> {
    await this.initializeApiKey();
  }

  /**
   * Send a streaming message
   */
  async sendStreamingMessage(
    message: string,
    options: StreamingOptions,
    images?: File[]
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('❌ Gemini API key not found. Please add your API key in Settings → 🔑 API Keys.');
    }

    const streamId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Initialize stream info
    const streamInfo: StreamInfo = {
      id: streamId,
      messageId,
      status: 'initializing',
      startTime: Date.now(),
      chunksReceived: 0,
      totalChunks: 0,
      lastChunkTime: 0
    };

    this.activeStreams.set(streamId, streamInfo);

    try {
      // Create buffer for this stream
      const processor = this.bufferManager.createBuffer(streamId);

      // Update stream status
      streamInfo.status = 'active';
      this.activeStreams.set(streamId, streamInfo);

      // Notify start
      options.onStart?.();

      // Perform streaming request
      const fullResponse = await this.performStreamingRequest(message, options, streamId, processor, images);

      // Update stream status
      streamInfo.status = 'completed';
      this.activeStreams.set(streamId, streamInfo);

      // Notify completion
      options.onComplete?.(fullResponse);

      return fullResponse;

    } catch (error) {
      // Update stream status
      streamInfo.status = 'error';
      streamInfo.error = error as Error;
      this.activeStreams.set(streamId, streamInfo);

      // Notify error
      options.onError?.(error as Error);

      // Clean up
      this.bufferManager.removeBuffer(streamId);
      this.activeStreams.delete(streamId);

      throw error;
    }
  }

  /**
   * Perform the actual streaming HTTP request
   */
  private async performStreamingRequest(
    message: string,
    options: StreamingOptions,
    streamId: string,
    processor: StreamProcessor,
    images?: File[]
  ): Promise<string> {
    // Use default model
    const modelName = this.DEFAULT_MODEL;

    const url = `${this.BASE_URL}/${modelName}:streamGenerateContent?alt=sse&key=${this.apiKey}`;

    // 🎯 PHASE 2: Context Detection and Dynamic Personality Adjustment
    const contextResult = detectContext(message);
    const sentimentAnalysis = analyzeSentiment(message);

    console.log('🔍 StreamingGeminiService: Context detected:', contextResult.mode, `(${(contextResult.confidence * 100).toFixed(0)}% confidence)`);
    console.log('💭 StreamingGeminiService: Sentiment:', sentimentAnalysis.sentiment, `(score: ${sentimentAnalysis.score})`);

    // Auto-switch personality mode based on context
    if (shouldSwitchMode(this.personalityConfig.currentMode, contextResult.mode, contextResult.confidence)) {
      console.log(`🔄 StreamingGeminiService: Switching personality mode: ${this.personalityConfig.currentMode} → ${contextResult.mode}`);
      this.personalityConfig.currentMode = contextResult.mode;
      savePersonalityConfig(this.personalityConfig);
    }

    // Force support mode if user needs emotional support
    if (sentimentAnalysis.shouldSupportMode && this.personalityConfig.currentMode !== 'support') {
      console.log('💜 StreamingGeminiService: User needs support - activating support mode');
      this.personalityConfig.currentMode = 'support';
      savePersonalityConfig(this.personalityConfig);
    }

    // Generate personality-infused system prompt
    const personalityPrompt = generatePersonalityPrompt(this.personalityConfig);
    console.log('🎭 StreamingGeminiService: Active personality mode:', this.personalityConfig.currentMode);

    // Combine personality prompt with user message
    const enrichedMessage = `${personalityPrompt}\n\n---\n\nUser: ${message}\n\nAnshika:`;

    // Build parts array with text and images
    const parts: any[] = [{ text: enrichedMessage }];

    // Add images if provided
    if (images && images.length > 0) {
      console.log(`📸 StreamingGeminiService: Adding ${images.length} image(s) to multimodal request`);
      
      for (const image of images) {
        // Convert image to base64
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(image);
        });
        
        // Remove data URL prefix (e.g., "data:image/png;base64,")
        const base64 = base64Data.split(',')[1];
        
        parts.push({
          inline_data: {
            mime_type: image.type,
            data: base64
          }
        });
      }
    }

    // Prepare request body with standard parameters
    const requestBody: {
      contents: Array<{
        parts: any[];
      }>;
      generationConfig: {
        temperature: number;
        maxOutputTokens: number;
        candidateCount: number;
        stopSequences: string[];
        topP: number;
        topK: number;
      };
      tools?: Array<{
        functionDeclarations: Array<{
          name: string;
          description: string;
          parameters: Record<string, unknown>;
        }>;
      }>;
    } = {
      contents: [{
        parts: parts
      }],
      generationConfig: {
        temperature: options.temperature || 0.7,
        maxOutputTokens: 2048,
        candidateCount: 1,
        stopSequences: [],
        topP: 0.95,
        topK: 100,
      }
    };

    // 🔧 Add tools if enabled
    const enabledTools = getEnabledTools(options.webSearchEnabled || false);
    if (enabledTools.length > 0) {
      requestBody.tools = [{
        functionDeclarations: enabledTools.map(tool => ({
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters
        }))
      }];
      console.log('🔧 StreamingGeminiService: Tools enabled:', enabledTools.map(t => t.name));
    }

    console.log(`⚡ StreamingGeminiService: Starting stream for model: ${modelName}`);

    // Perform streaming fetch
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: options.signal
    });

    if (!response.ok) {
      let errorMessage = `Gemini streaming API error: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.error?.message) {
          errorMessage += ` - ${errorData.error.message}`;
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
      throw new Error(errorMessage);
    }

    // Process streaming response
    return this.processStreamingResponse(response, options, streamId, processor);
  }

  /**
   * Process the streaming response from Gemini API
   */
  private async processStreamingResponse(
    response: Response,
    options: StreamingOptions,
    streamId: string,
    processor: StreamProcessor
  ): Promise<string> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body reader available');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let fullResponse = '';
    const toolCalls: ToolCall[] = [];

    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          console.log('✅ StreamingGeminiService: Stream completed');
          break;
        }

        // Decode chunk
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();

            if (data === '[DONE]') {
              console.log('🏁 StreamingGeminiService: Received [DONE] signal');
              continue;
            }

            try {
              const chunk = JSON.parse(data);
              const processedChunk = processor.processChunk(chunk);

              // Check for tool calls in the chunk
              const functionCall = chunk.candidates?.[0]?.content?.parts?.[0]?.functionCall;
              if (functionCall) {
                console.log('🎯 StreamingGeminiService: Tool call detected:', functionCall.name);
                toolCalls.push({
                  id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  type: 'function',
                  function: {
                    name: functionCall.name,
                    arguments: JSON.stringify(functionCall.args || {})
                  }
                });
              }

              if (processedChunk.content) {
                // Add chunk to processor
                processor.addChunk(processedChunk);
                fullResponse += processedChunk.content;

                // Notify chunk callback
                options.onChunk?.(processedChunk.content);

                // Update stream info
                const streamInfo = this.activeStreams.get(streamId);
                if (streamInfo) {
                  streamInfo.chunksReceived++;
                  streamInfo.lastChunkTime = Date.now();
                  this.activeStreams.set(streamId, streamInfo);
                }

                // Small delay for smooth animation
                await new Promise(resolve => setTimeout(resolve, this.CHUNK_DELAY));
              }

              if (processedChunk.isComplete) {
                console.log('🎯 StreamingGeminiService: Response completed');
                break;
              }

            } catch (parseError) {
              console.warn('⚠️ StreamingGeminiService: Failed to parse chunk:', data, parseError);
              continue;
            }
          }
        }

        // Check if stream was cancelled
        if (options.signal?.aborted) {
          console.log('🛑 StreamingGeminiService: Stream cancelled');
          break;
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Handle tool calls if any were detected
    if (toolCalls.length > 0) {
      console.log('⚙️ StreamingGeminiService: Executing', toolCalls.length, 'tool calls');
      try {
        const toolResults = await Promise.all(
          toolCalls.map(toolCall => executeTool(toolCall))
        );
        console.log('✅ StreamingGeminiService: Tool execution completed');

        // Integrate tool results into the response
        const toolIntegration = toolCalls.map((call, index) =>
          `\n**${call.function.name.replace('_', ' ').toUpperCase()}:**\n${toolResults[index].content}`
        ).join('\n');

        fullResponse += toolIntegration;
      } catch (toolError) {
        console.error('❌ StreamingGeminiService: Tool execution failed:', toolError);
        fullResponse += '\n\n⚠️ Some tools failed to execute.';
      }
    }

    // Record interaction for personality evolution
    this.personalityConfig = recordInteraction(this.personalityConfig);
    savePersonalityConfig(this.personalityConfig);

    return fullResponse;
  }

  /**
   * Cancel an active stream
   */
  cancelStream(streamId: string): void {
    const streamInfo = this.activeStreams.get(streamId);
    if (streamInfo && streamInfo.status === 'active') {
      streamInfo.status = 'cancelled';
      this.activeStreams.set(streamId, streamInfo);
      this.bufferManager.removeBuffer(streamId);
      console.log(`🛑 StreamingGeminiService: Stream ${streamId} cancelled`);
    }
  }

  /**
   * Pause an active stream
   */
  pauseStream(streamId: string): void {
    const streamInfo = this.activeStreams.get(streamId);
    if (streamInfo && streamInfo.status === 'active') {
      streamInfo.status = 'paused';
      this.activeStreams.set(streamId, streamInfo);
      console.log(`⏸️ StreamingGeminiService: Stream ${streamId} paused`);
    }
  }

  /**
   * Resume a paused stream
   */
  resumeStream(streamId: string): void {
    const streamInfo = this.activeStreams.get(streamId);
    if (streamInfo && streamInfo.status === 'paused') {
      streamInfo.status = 'active';
      this.activeStreams.set(streamId, streamInfo);
      console.log(`▶️ StreamingGeminiService: Stream ${streamId} resumed`);
    }
  }

  /**
   * Get stream information
   */
  getStreamInfo(streamId: string): StreamInfo | undefined {
    return this.activeStreams.get(streamId);
  }

  /**
   * Get all active streams
   */
  getActiveStreams(): StreamInfo[] {
    return Array.from(this.activeStreams.values());
  }

  /**
   * Get buffer for a stream
   */
  getStreamBuffer(streamId: string): StreamBuffer | undefined {
    return this.bufferManager.getBuffer(streamId);
  }

  /**
   * Clean up completed/failed streams
   */
  cleanupStreams(): void {
    const now = Date.now();
    const timeout = 5 * 60 * 1000; // 5 minutes

    for (const [streamId, streamInfo] of this.activeStreams.entries()) {
      if (
        streamInfo.status === 'completed' ||
        streamInfo.status === 'error' ||
        streamInfo.status === 'cancelled' ||
        (now - streamInfo.startTime) > timeout
      ) {
        this.activeStreams.delete(streamId);
        this.bufferManager.removeBuffer(streamId);
      }
    }
  }

  /**
   * Get current personality configuration
   */
  getPersonalityConfig(): PersonalityConfig {
    return { ...this.personalityConfig };
  }

  /**
   * Update personality configuration
   */
  updatePersonalityConfig(config: Partial<PersonalityConfig>): void {
    this.personalityConfig = {
      ...this.personalityConfig,
      ...config
    };
    savePersonalityConfig(this.personalityConfig);
    console.log('🎭 StreamingGeminiService: Personality config updated');
  }
}

// ============================================================================
// Singleton Instance Export
// ============================================================================

export const streamingGeminiService = StreamingGeminiService.getInstance();

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if streaming is supported in current environment
 */
export function isStreamingSupported(): boolean {
  return typeof ReadableStream !== 'undefined' &&
         typeof AbortController !== 'undefined';
}

/**
 * Get streaming configuration defaults
 */
export function getStreamingDefaults() {
  return {
    enabled: true,
    chunkDelay: 50,
    maxBufferSize: 100,
    autoScroll: true,
    showTypingIndicator: true
  };
}

/**
 * Validate streaming options
 */
export function validateStreamingOptions(options: StreamingOptions): boolean {
  if (options.temperature && (options.temperature < 0 || options.temperature > 2)) {
    return false;
  }
  return true;
}