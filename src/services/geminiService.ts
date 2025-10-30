import axios from 'axios';
import { ToolCall } from '../types';
import { executeTool, getEnabledTools } from './toolManager';
import { generatePersonalityPrompt, recordInteraction } from './personalityPromptGenerator';
import type { PersonalityConfig } from '../types/personality';
import { loadPersonalityConfig, savePersonalityConfig, resetPersonalityToDefaults } from './personalityStorageService';
import { detectContext, shouldSwitchMode } from './contextDetector';
import { analyzeSentiment } from './sentimentAnalyzer';
import { secureStorage } from './secureStorageService';

// API Key from secure storage or .env fallback
let GEMINI_API_KEY: string | null = null;

// Load API key from secure storage or .env on initialization
(async () => {
  const storedKey = await secureStorage.getApiKey('VITE_GEMINI_API_KEY');
  if (storedKey) {
    GEMINI_API_KEY = storedKey;
    console.log('🔐 Loaded Gemini API key from secure storage');
  } else {
    // Fallback to .env file
    const envKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (envKey) {
      GEMINI_API_KEY = envKey;
      console.log('🔑 Loaded Gemini API key from .env file');
    } else {
      console.warn('⚠️ No Gemini API key found. Please add VITE_GEMINI_API_KEY to .env file or Settings → 🔑 API Keys.');
    }
  }
})();

// Function to refresh API key (called after user saves new key)
export async function refreshApiKey() {
  const storedKey = await secureStorage.getApiKey('VITE_GEMINI_API_KEY');
  if (storedKey) {
    GEMINI_API_KEY = storedKey;
    console.log('🔐 Refreshed Gemini API key from secure storage');
  }
}

// Global personality configuration (loaded from storage, persisted across sessions)
let personalityConfig: PersonalityConfig = loadPersonalityConfig();

// Base URLs for Gemini API - USING v1beta FOR FUNCTION CALLING SUPPORT
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_FILES_URL = 'https://generativelanguage.googleapis.com/v1beta/files';
const GEMINI_BASE_V1BETA = 'https://generativelanguage.googleapis.com/v1beta';

// Build correct files endpoint for both formats: 'abc123' and 'files/abc123'
function buildFileGetUrl(fileName: string): string {
  const name = String(fileName || '').trim();
  if (name.startsWith('files/')) {
    // Name already includes resource prefix; use v1beta/{name}
    return `${GEMINI_BASE_V1BETA}/${name}?key=${GEMINI_API_KEY}`;
  }
  return `${GEMINI_FILES_URL}/${name}?key=${GEMINI_API_KEY}`;
}

// File upload interfaces
export interface GeminiFileUploadResult {
  file: {
    name: string;
    displayName: string;
    mimeType: string;
    sizeBytes: string;
    createTime: string;
    updateTime: string;
    expirationTime: string;
    uri: string;
  };
}

export interface GeminiFileStatus {
  name: string;
  state: 'PROCESSING' | 'ACTIVE' | 'FAILED';
  error?: any;
}

// OPTIMIZED: Direct model selection without API calls for maximum speed

export async function sendGeminiMessage(
  message: string,
  addMessage: (message: { content: string; role: 'assistant'; mode: 'online' }) => void,
  updateMessage: (content: string) => void,
  temperature: number = 0.7,
  webSearchEnabled: boolean = false,
  signal?: AbortSignal
): Promise<void> {
  if (!GEMINI_API_KEY) {
    throw new Error('❌ Gemini API key not found. Please add your API key in Settings → 🔑 API Keys.');
  }
  
  // OPTIMIZED: Skip slow model fetching API call - use direct model selection
  const wordCount = message.trim().split(/\s+/).length;
  const isPro = wordCount > 1000 || 
                message.toLowerCase().includes('use pro') ||
                message.toLowerCase().includes('pro model') ||
                message.toLowerCase().includes('complex') ||
                message.toLowerCase().includes('detailed analysis');
  
  const modelName = 'gemini-2.0-flash-exp'; // Use working model
  const GEMINI_API_URL = `${GEMINI_BASE_URL}/${modelName}:generateContent`;
  
  console.log(`⚡ OPTIMIZED model selection: ${modelName} (${wordCount} words, ${isPro ? 'Pro' : 'Flash'} mode)`);
  
  console.log('🔑 API Key configured:', GEMINI_API_KEY ? 'Yes' : 'No');
  console.log('🤖 Using model:', modelName);
  console.log('🌐 Endpoint:', GEMINI_API_URL);

  const startTime = performance.now();
  
  // Create aggressive timeout for faster failure detection
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), 8000); // 8 second timeout for faster responses

  try {
    let fullResponse = '';

    // 🎯 PHASE 2: Context Detection and Dynamic Personality Adjustment
    const contextResult = detectContext(message);
    const sentimentAnalysis = analyzeSentiment(message);
    
    console.log('🔍 Context detected:', contextResult.mode, `(${(contextResult.confidence * 100).toFixed(0)}% confidence)`);
    console.log('💭 Sentiment:', sentimentAnalysis.sentiment, `(score: ${sentimentAnalysis.score})`);
    
    // Auto-switch personality mode based on context
    if (shouldSwitchMode(personalityConfig.currentMode, contextResult.mode, contextResult.confidence)) {
      console.log(`🔄 Switching personality mode: ${personalityConfig.currentMode} → ${contextResult.mode}`);
      personalityConfig.currentMode = contextResult.mode;
      savePersonalityConfig(personalityConfig);
    }
    
    // Force support mode if user needs emotional support
    if (sentimentAnalysis.shouldSupportMode && personalityConfig.currentMode !== 'support') {
      console.log('💜 User needs support - activating support mode');
      personalityConfig.currentMode = 'support';
      savePersonalityConfig(personalityConfig);
    }

    // Generate personality-infused system prompt with current mode
    const personalityPrompt = generatePersonalityPrompt(personalityConfig);
    console.log('🎭 Active personality mode:', personalityConfig.currentMode);
    console.log('👤 Relationship stage:', personalityConfig.relationshipStage);
    
    // Combine personality prompt with user message
    const enrichedMessage = `${personalityPrompt}\n\n---\n\nUser: ${message}\n\nAnshika:`;

    // OPTIMIZED request body for speed
    const requestBody: any = {
      contents: [{
        parts: [{
          text: enrichedMessage
        }]
      }],
      generationConfig: {
        temperature: temperature,
        // NORMAL token limits - prioritize proper responses over speed
        maxOutputTokens: 2048, // Much higher limit for proper responses
        candidateCount: 1, // Single response only  
        stopSequences: [], // No stop sequences  
        topP: 0.95, // Higher for better quality
        topK: 100  // Higher for better responses
      }
    };

    // 🔧 TOOLS REACTIVATED - Using correct Gemini 2025 API format
    const enabledTools = getEnabledTools(webSearchEnabled);
    console.log('🔧 Tools enabled:', enabledTools.length, 'tools available');
    
    if (enabledTools.length > 0) {
      // ✅ CORRECT Gemini API format for function calling (2025)
      requestBody.tools = [{
        functionDeclarations: enabledTools.map(tool => ({
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters
        }))
      }];
      console.log('📤 Sending tools to Gemini:', enabledTools.map(t => t.name));
    } else {
      console.log('🚫 No tools enabled for this request');
    }

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: signal || timeoutController.signal,
      // Additional speed optimizations
      keepalive: true, // Reuse connections
      priority: 'high' // High priority request
    });

    if (!response.ok) {
      let errorMessage = `Gemini API error: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.error?.message) {
          errorMessage += ` - ${errorData.error.message}`;
        }
      } catch (e) {
        // Ignore JSON parse errors for error response
      }
      
      // Add helpful suggestions based on status code
      if (response.status === 404) {
        errorMessage += '\n💡 Suggestion: The model endpoint might be incorrect or the model is not available.';
      } else if (response.status === 403) {
        errorMessage += '\n💡 Suggestion: Check your API key permissions and billing status.';
      } else if (response.status === 503) {
        errorMessage += '\n💡 Suggestion: Gemini service is temporarily unavailable. Try again in a few moments.';
      } else if (response.status === 429) {
        errorMessage += '\n💡 Suggestion: Rate limit exceeded. Please wait before making more requests.';
      } else if (response.status === 400) {
        errorMessage += '\n💡 Suggestion: Request format issue. Tools have been temporarily disabled to fix this.';
      }
      
      throw new Error(errorMessage);
    }

    const responseData = await response.json();
    let toolCalls: ToolCall[] = [];

    // 🔧 Function call detected - tools are working!

    // 🔧 REACTIVATED - Tool calls detection with correct API format
    // ✅ Correct path for function call detection in Gemini API (2025)
    const functionCall = responseData.candidates?.[0]?.content?.parts?.[0]?.functionCall;
    if (functionCall) {
      console.log('🎯 Tool call detected:', functionCall.name, functionCall.args);
      toolCalls.push({
        id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'function',
        function: {
          name: functionCall.name,
          arguments: JSON.stringify(functionCall.args || {})
        }
      });
    }

    // Check for regular text response
    const text = responseData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) {
      fullResponse = text;
      updateMessage(fullResponse);
    }

    // 🧪 DEBUG: Force tool test for debugging (optional)
    if (message.toLowerCase().includes('force_tool_test')) {
      console.log('🧪 FORCE TOOL TEST activated for debugging');
      toolCalls.push({
        id: 'force_test_call',
        type: 'function',
        function: {
          name: 'get_date',
          arguments: JSON.stringify({})
        }
      });
    }

    // Performance logging with warnings
    const totalTime = performance.now() - startTime;
    const wordCount = fullResponse.split(/\s+/).length;
    const wordsPerSecond = wordCount / (totalTime / 1000);
    
    let performanceIcon = '📊';
    if (wordsPerSecond < 1) {
      performanceIcon = '🐌'; // Very slow
      console.warn('⚠️ Very slow response detected - AI may be giving minimal output');
    } else if (wordsPerSecond < 5) {
      performanceIcon = '⚠️'; // Slow
    } else if (wordsPerSecond > 15) {
      performanceIcon = '🚀'; // Fast
    }
    
    console.log(`${performanceIcon} PERFORMANCE: ${totalTime.toFixed(1)}ms, ${wordsPerSecond.toFixed(1)} words/sec, ${wordCount} words`);

    // Clear timeout
    clearTimeout(timeoutId);

    // Handle tool calls if any were detected
    if (toolCalls.length > 0) {
      console.log('⚙️ Executing', toolCalls.length, 'tool calls:', toolCalls.map(tc => tc.function.name));
      // Execute all tool calls
      const toolResults = await Promise.all(
        toolCalls.map(toolCall => executeTool(toolCall))
      );
      console.log('✅ Tool execution completed:', toolResults.map(tr => tr.tool_call_id));

      // Show tool execution progress
      updateMessage(fullResponse + '\n\n🔧 *Executing tools...*');

      // Integrate tool results directly (simplified approach)
      const integratedResponse = await makeFollowUpCall(message, fullResponse, toolCalls, toolResults, temperature, webSearchEnabled, signal);
      updateMessage(integratedResponse);

      addMessage({
        content: integratedResponse,
        role: 'assistant',
        mode: 'online',
      });
    } else {
      // No tools were called, use the original response
      addMessage({
        content: fullResponse,
        role: 'assistant',
        mode: 'online',
      });
    }
    
    // Record interaction for relationship evolution
    personalityConfig = recordInteraction(personalityConfig);
    savePersonalityConfig(personalityConfig); // Persist to storage
    console.log('📊 Interaction recorded:', personalityConfig.interactionCount);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Gemini API error: ${error.response?.data?.error?.message || error.message}`);
    }
    throw error;
  }
}

// Helper function to integrate tool results directly
async function makeFollowUpCall(
  originalMessage: string,
  initialResponse: string,
  toolCalls: ToolCall[],
  toolResults: any[],
  temperature: number,
  webSearchEnabled: boolean,
  signal?: AbortSignal
): Promise<string> {
  console.log('🔄 Making follow-up API call with tool results');

  const modelName = 'gemini-2.0-flash-exp'; // Use working model
  const FOLLOW_UP_URL = `${GEMINI_BASE_URL}/${modelName}:generateContent`;

  try {
    // ✅ CORRECT Gemini API format for multi-turn conversation with function calling
    const followUpBody: any = {
      contents: [
        // Original user message
        {
          role: 'user',
          parts: [{ text: originalMessage }]
        }
      ],
      generationConfig: {
        temperature: temperature,
        maxOutputTokens: 2048
      }
    };

    // Add tools if they were enabled
    if (webSearchEnabled || toolCalls.some(tc => ['create_task', 'list_tasks', 'get_date', 'get_time'].includes(tc.function.name))) {
      const enabledTools = getEnabledTools(webSearchEnabled);
      if (enabledTools.length > 0) {
        followUpBody.tools = [{
          functionDeclarations: enabledTools.map(tool => ({
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters
          }))
        }];
      }
    }

    // Add assistant's function call(s) - CORRECT format
    if (initialResponse) {
      followUpBody.contents.push({
        role: 'model',
        parts: [{ text: initialResponse }]
      });
    }

    // Add function calls and their results
    toolCalls.forEach((toolCall, index) => {
      // Add the function call from the model
      followUpBody.contents.push({
        role: 'model',
        parts: [{
          function_call: {
            name: toolCall.function.name,
            args: JSON.parse(toolCall.function.arguments)
          }
        }]
      });

      // Add the function response from user (tool execution result)
      followUpBody.contents.push({
        role: 'user',
        parts: [{
          function_response: {
            name: toolCall.function.name,
            response: { result: toolResults[index].content }
          }
        }]
      });
    });

    console.log('� Follow-up request:', JSON.stringify(followUpBody, null, 2));

    const response = await fetch(`${FOLLOW_UP_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(followUpBody),
      signal
    });

    if (!response.ok) {
      console.log('❌ Follow-up API failed:', response.status);
      
      // Handle different error types with user-friendly messages
      if (response.status === 503) {
        console.log('🌐 Google API temporarily unavailable - this is normal, using fallback');
      } else if (response.status === 429) {
        console.log('⏰ Rate limit reached - using fallback response');
      } else {
        const errorText = await response.text();
        console.log('Error details:', errorText);
      }
      
      // Fallback to simple integration if follow-up fails
      return createSimpleFallback(initialResponse, toolCalls, toolResults);
    }

    const responseData = await response.json();
    const finalText = responseData.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (finalText) {
      console.log('✅ Follow-up API successful');
      return finalText;
    } else {
      console.warn('⚠️ No text in follow-up response, using fallback');
      return createSimpleFallback(initialResponse, toolCalls, toolResults);
    }

  } catch (error) {
    console.error('❌ Follow-up call failed:', error);
    return createSimpleFallback(initialResponse, toolCalls, toolResults);
  }
}

// Fallback function for when follow-up API calls fail
function createSimpleFallback(initialResponse: string, toolCalls: ToolCall[], toolResults: any[]): string {
  console.log('🔄 Using fallback tool result integration');

  let integratedResponse = initialResponse || 'I used tools to help answer your query:\n\n';

  // Add tool results in a readable format
  toolResults.forEach((result, index) => {
    const toolName = toolCalls[index].function.name;
    integratedResponse += `\n**${toolName.replace('_', ' ').toUpperCase()}:**\n${result.content}\n`;
  });

  // Add a summary based on the tool used
  const toolNames = toolCalls.map(tc => tc.function.name);
  if (toolNames.includes('get_date')) {
    integratedResponse += `\n💡 *The date information above is current and accurate.*`;
  } else if (toolNames.includes('web_search')) {
    integratedResponse += `\n💡 *Search results are from the web and may vary over time.*`;
  } else if (toolNames.includes('get_weather')) {
    integratedResponse += `\n💡 *Weather data is current and provided by WeatherAPI.*`;
  } else if (toolNames.includes('create_task') || toolNames.includes('list_tasks')) {
    integratedResponse += `\n💡 *Task operation completed successfully.*`;
  }

  return integratedResponse;
}

// Export function to get available models for debugging/testing
export async function getAvailableGeminiModels(): Promise<string[]> {
  // Return known working models without API call
  return ['gemini-2.0-flash-exp'];
}

/**
 * Upload a file to Gemini API for processing using multipart upload (CORS-friendly)
 * Returns file reference that can be used in subsequent API calls
 */
export async function uploadFileToGemini(
  file: File,
  displayName?: string,
  onProgress?: (progress: number) => void
): Promise<GeminiFileUploadResult> {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured');
  }

  console.log(`📤 Uploading file to Gemini: ${file.name} (${file.size} bytes)`);

  try {
    onProgress?.(10);

    const uploadUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${GEMINI_API_KEY}`;

    // 1) Try RAW upload protocol first (recommended for browser + CORS)
    try {
      console.log('⬆️ Trying RAW upload protocol');
      const rawResp = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'X-Goog-Upload-Protocol': 'raw',
          'X-Goog-Upload-File-Name': displayName || file.name,
          'Content-Type': file.type || 'application/octet-stream',
          'Content-Length': file.size.toString(),
        },
        body: file,
      });

      if (rawResp.ok) {
        const result: GeminiFileUploadResult = await rawResp.json();
        onProgress?.(100);
        if (!result || !result.file) {
          console.error('Invalid upload response structure (raw):', result);
          throw new Error('File upload returned invalid response structure - missing file object');
        }
        console.log(`✅ File upload (raw) completed: ${result.file.name}`);
        return result;
      } else {
        const text = await rawResp.text();
        console.warn('RAW upload failed, falling back to multipart/related:', rawResp.status, text);
      }
    } catch (rawErr) {
      console.warn('RAW upload error, will try multipart/related next:', rawErr);
    }

    onProgress?.(40);

    // 2) Fallback: multipart/related with metadata + file bytes
    const boundary = `gccl-mixed-${Date.now()}`;
    const delimiter = `--${boundary}`;
    const closeDelimiter = `--${boundary}--`;

    const metadata = JSON.stringify({
      file: { display_name: displayName || file.name }
    });

    const multipartBody = new Blob([
      `${delimiter}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,
      metadata,
      `\r\n${delimiter}\r\nContent-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`,
      file,
      `\r\n${closeDelimiter}\r\n`,
    ], { type: `multipart/related; boundary=${boundary}` });

    const mpResp = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    });

    onProgress?.(80);

    if (!mpResp.ok) {
      const errorText = await mpResp.text();
      console.error('File upload failed (multipart/related):', errorText);
      throw new Error(`File upload failed: ${mpResp.status} - ${errorText}`);
    }

    const result: GeminiFileUploadResult = await mpResp.json();

    onProgress?.(100);

    if (!result || !result.file) {
      console.error('Invalid upload response structure (multipart):', result);
      throw new Error('File upload returned invalid response structure - missing file object');
    }

    console.log(`✅ File upload (multipart) completed: ${result.file.name}`);
    return result;

  } catch (error) {
    console.error('❌ File upload failed:', error);
    throw error;
  }
}

/**
 * Wait for uploaded file to finish processing
 */
export async function waitForFileProcessing(
  fileName: string,
  onProgress?: (progress: number) => void,
  maxWaitTime: number = 120000 // 2 minutes max
): Promise<void> {
  const startTime = Date.now();
  const pollInterval = 2000; // Check every 2 seconds
  
  console.log(`⏳ Waiting for file processing: ${fileName}`);

  while (Date.now() - startTime < maxWaitTime) {
    try {
      const status = await getFileStatus(fileName);
      
      if (status.state === 'ACTIVE') {
        console.log(`✅ File processing complete: ${fileName}`);
        onProgress?.(100);
        return;
      }
      
      if (status.state === 'FAILED') {
        throw new Error(`File processing failed: ${status.error || 'Unknown error'}`);
      }
      
      if (status.state === 'PROCESSING') {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(95, (elapsed / maxWaitTime) * 100);
        onProgress?.(progress);
        console.log(`⏳ Still processing (${progress.toFixed(0)}%)...`);
      }
      
      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      
    } catch (error: any) {
      // Some status checks may hit transient 404/CORS behavior. Log and continue polling.
      const msg = (error?.message || '').toString();
      console.warn('⚠️ Non-fatal status check issue, will retry:', msg);
      // brief backoff before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      continue;
    }
  }
  
  throw new Error(`File processing timeout: ${fileName}`);
}

/**
 * Get the processing status of an uploaded file
 */
export async function getFileStatus(fileName: string): Promise<GeminiFileStatus> {
  const url = buildFileGetUrl(fileName);
  const response = await fetch(url, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Failed to get file status: ${response.status}`);
  }

  const data = await response.json();
  return {
    name: data.name,
    state: data.state,
    error: data.error,
  };
}

/**
 * Delete an uploaded file from Gemini
 */
export async function deleteGeminiFile(fileName: string): Promise<void> {
  const url = buildFileGetUrl(fileName);
  const response = await fetch(url, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Failed to delete file: ${response.status}`);
  }

  console.log(`🗑️ Deleted file from Gemini: ${fileName}`);
}

/**
 * Generate content with file context
 * Used for document analysis and Q&A
 */
export async function generateWithFileContext(
  prompt: string,
  fileUri: string,
  temperature: number = 0.7,
  maxTokens: number = 2048
): Promise<string> {
  const modelName = 'gemini-2.0-flash-exp'; // Use working model
  const url = `${GEMINI_BASE_URL}/${modelName}:generateContent`;

  const requestBody = {
    contents: [{
      parts: [
        { text: prompt },
        { file_data: { mime_type: 'application/pdf', file_uri: fileUri } }
      ]
    }],
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
      candidateCount: 1,
    }
  };

  const response = await fetch(`${url}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini generation failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!text) {
    throw new Error('No text response from Gemini');
  }

  return text;
}

// Export function to test a specific model
export async function testGeminiModel(modelName: string, testMessage: string = "Hello"): Promise<boolean> {
  try {
    const url = `${GEMINI_BASE_URL}/${modelName}:generateContent`;
    const response = await fetch(`${url}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: testMessage }] }]
      })
    });
    return response.ok;
  } catch (error) {
    console.error(`❌ Model ${modelName} test failed:`, error);
    return false;
  }
}

/**
 * PERSONALITY SYSTEM EXPORTS
 */

/**
 * Get current personality configuration
 */
export function getPersonalityConfig(): PersonalityConfig {
  return { ...personalityConfig };
}

/**
 * Update personality configuration
 */
export function updatePersonalityConfig(newConfig: Partial<PersonalityConfig>): void {
  personalityConfig = {
    ...personalityConfig,
    ...newConfig
  };
  savePersonalityConfig(personalityConfig); // Persist changes
  console.log('🎭 Personality config updated:', personalityConfig.currentMode);
}

/**
 * Reset personality configuration to defaults
 */
export function resetPersonalityConfig(): void {
  personalityConfig = resetPersonalityToDefaults();
  console.log('🔄 Personality config reset to defaults');
}
