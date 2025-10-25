import axios from 'axios';
import { OllamaResponse } from '../types';

const OLLAMA_API_URL = 'http://localhost:11434/api';

// GPU acceleration configuration
// Note: These are system environment variables that should be set where Ollama runs
// The browser cannot access process.env, so these are defaults for documentation
export const OLLAMA_GPU_CONFIG = {
  // CUDA for NVIDIA GPUs - set CUDA_VISIBLE_DEVICES=0 in system environment
  CUDA_VISIBLE_DEVICES: '0',
  // ROCm for AMD GPUs - set HIP_VISIBLE_DEVICES=0 in system environment
  HIP_VISIBLE_DEVICES: '0',
  // Ollama GPU layers (higher = more GPU usage) - set OLLAMA_GPU_LAYERS=35
  OLLAMA_GPU_LAYERS: '35',
  // GPU memory allocation - set OLLAMA_MAX_LOADED_MODELS=1
  OLLAMA_MAX_LOADED_MODELS: '1',
  // Enable GPU acceleration - set OLLAMA_GPU=true
  OLLAMA_GPU: 'true',
};

// Batch processing queue
let batchQueue: Array<{
  message: string;
  addMessage: (message: { content: string; role: 'assistant'; mode: 'offline' }) => void;
  model: string;
  temperature: number;
  resolve: () => void;
  reject: (error: any) => void;
}> = [];

let isProcessingBatch = false;

// Local response cache
interface CacheEntry {
  response: string;
  timestamp: number;
  model: string;
  temperature: number;
}

const responseCache = new Map<string, CacheEntry>();
const CACHE_EXPIRY = 1000 * 60 * 30; // 30 minutes
const MAX_CACHE_SIZE = 100;

function generateCacheKey(message: string, model: string, temperature: number): string {
  return `${model}_${temperature}_${message.slice(0, 100)}`;
}

function getCachedResponse(message: string, model: string, temperature: number): string | null {
  const key = generateCacheKey(message, model, temperature);
  const entry = responseCache.get(key);

  if (!entry) return null;

  // Check if cache entry has expired
  if (Date.now() - entry.timestamp > CACHE_EXPIRY) {
    responseCache.delete(key);
    return null;
  }

  // Update timestamp for LRU behavior
  entry.timestamp = Date.now();
  return entry.response;
}

function setCachedResponse(message: string, model: string, temperature: number, response: string): void {
  const key = generateCacheKey(message, model, temperature);

  // Remove oldest entries if cache is full
  if (responseCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = Array.from(responseCache.entries())
      .sort(([,a], [,b]) => a.timestamp - b.timestamp)[0][0];
    responseCache.delete(oldestKey);
  }

  responseCache.set(key, {
    response,
    timestamp: Date.now(),
    model,
    temperature
  });
}

export function getCacheStats(): { size: number; hitRate: number } {
  return {
    size: responseCache.size,
    hitRate: 0 // Would need to track hits/misses for accurate rate
  };
}

export function clearResponseCache(): void {
  responseCache.clear();
}

async function processBatchQueue(): Promise<void> {
  if (isProcessingBatch || batchQueue.length === 0) return;

  isProcessingBatch = true;

  while (batchQueue.length > 0) {
    const request = batchQueue.shift();
    if (!request) continue;

    try {
      await sendOllamaMessageSingle(request.message, request.addMessage, request.model, request.temperature);
      request.resolve();
    } catch (error) {
      request.reject(error);
    }

    // Small delay between requests to prevent overwhelming the system
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  isProcessingBatch = false;
}

async function sendOllamaMessageSingle(
  message: string,
  addMessage: (message: { content: string; role: 'assistant'; mode: 'offline' }) => void,
  model: string,
  temperature: number = 0.7
): Promise<void> {
  try {
    // Check cache first
    const cachedResponse = getCachedResponse(message, model, temperature);
    if (cachedResponse) {
      console.log('Using cached response for:', message.slice(0, 50));
      addMessage({
        content: cachedResponse,
        role: 'assistant',
        mode: 'offline',
      });
      return;
    }

    const response = await axios.post<OllamaResponse>(
      `${OLLAMA_API_URL}/chat`,
      {
        model,
        messages: [{
          role: 'user',
          content: message
        }],
        stream: false,
        options: {
          temperature: temperature,
          // Remove token limits for unlimited generation
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.data.message?.content) {
      throw new Error('No response from Ollama');
    }

    const responseContent = response.data.message.content;

    // Cache the response
    setCachedResponse(message, model, temperature, responseContent);

    addMessage({
      content: responseContent,
      role: 'assistant',
      mode: 'offline',
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED') {
        console.error('❌ Ollama connection refused - service not running');
        throw new Error('Cannot connect to Ollama. Please start Ollama by running "ollama serve" in a terminal.');
      }
      if (error.response?.status === 404) {
        throw new Error(`Model "${model}" not found. Available models: ${(await getAvailableModels()).join(', ')}`);
      }
      throw new Error(`Ollama error: ${error.response?.data?.error || error.message}`);
    }
    throw error;
  }
}

export async function sendOllamaMessage(
  message: string,
  addMessage: (message: { content: string; role: 'assistant'; mode: 'offline' }) => void,
  model: string,
  temperature: number = 0.7
): Promise<void> {
  return new Promise((resolve, reject) => {
    batchQueue.push({
      message,
      addMessage,
      model,
      temperature,
      resolve,
      reject
    });

    // Start processing the queue
    processBatchQueue();
  });
}

export async function getAvailableModels(): Promise<string[]> {
  try {
    const response = await axios.get(`${OLLAMA_API_URL}/tags`);
    return response.data.models?.map((model: any) => model.name) || [];
  } catch (error) {
    console.warn('Could not fetch models from Ollama:', error);
    return ['gemma3:4b', 'llama2', 'mistral']; // Fallback models
  }
}

export async function checkOllamaStatus(): Promise<boolean> {
  try {
    await axios.get(`${OLLAMA_API_URL}/tags`);
    return true;
  } catch {
    return false;
  }
}

export async function checkGPUStatus(): Promise<{ available: boolean; type?: string; memory?: string }> {
  try {
    // This is a placeholder - actual GPU detection would require Ollama API extensions
    // For now, we'll assume GPU is available if Ollama is running
    const isRunning = await checkOllamaStatus();
    return {
      available: isRunning && OLLAMA_GPU_CONFIG.OLLAMA_GPU === 'true',
      type: 'CUDA/ROCm', // Would need actual detection
      memory: 'Unknown' // Would need actual detection
    };
  } catch {
    return { available: false };
  }
}

export async function preloadModel(model: string = 'gemma3:4b'): Promise<boolean> {
  try {
    console.log(`Pre-loading model: ${model}`);

    // Send a simple warmup message to load the model into memory
    await axios.post(`${OLLAMA_API_URL}/chat`, {
      model,
      messages: [{
        role: 'user',
        content: 'Hello' // Simple warmup message
      }],
      stream: false,
      options: {
        temperature: 0.1,
        num_predict: 10 // Keep it short
      }
    }, {
      timeout: 30000 // 30 second timeout for model loading
    });

    console.log(`Model ${model} pre-loaded successfully`);
    return true;
  } catch (error) {
    console.warn(`Failed to pre-load model ${model}:`, error);
    return false;
  }
}

export async function preloadCommonModels(): Promise<void> {
  const modelsToPreload = ['gemma3:4b']; // Add more models as needed

  console.log('Starting model pre-loading...');

  for (const model of modelsToPreload) {
    try {
      await preloadModel(model);
    } catch (error) {
      console.warn(`Failed to preload ${model}, continuing...`);
    }
  }

  console.log('Model pre-loading completed');
}

export function getGPUSetupInstructions(): string {
  return `
GPU Acceleration Setup for Ollama:

1. For NVIDIA GPUs (CUDA):
   - Install CUDA toolkit: https://developer.nvidia.com/cuda-downloads
   - Ollama automatically detects CUDA
   - Set OLLAMA_GPU_LAYERS for memory usage

2. For AMD GPUs (ROCm):
   - Install ROCm: https://docs.amd.com/
   - Set HIP_VISIBLE_DEVICES environment variable

3. Environment Variables:
   export OLLAMA_GPU=true
   export OLLAMA_GPU_LAYERS=35
   export CUDA_VISIBLE_DEVICES=0

4. Verify GPU usage:
   ollama ps
   # Look for GPU memory usage

Note: GPU acceleration can provide 5-20x speed improvements for local AI!
  `.trim();
}
