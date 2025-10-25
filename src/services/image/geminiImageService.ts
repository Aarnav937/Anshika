// Gemini Image Service (Online Mode)
// Uses Google Gemini 2.5 Flash Image for image generation

import {
  OnlineGenerationParams,
  GeneratedImage,
  ServiceStatus
} from '../../types/imageGeneration';
import { ProgressTracker } from './progressTrackingService';

// Get API key from environment
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

// Gemini 2.5 Flash Image model (discovered October 2025)
const GEMINI_IMAGE_MODEL = 'models/gemini-2.5-flash-image';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * Gemini Image Service
 * Handles online image generation via Google Cloud
 */
export class GeminiImageService {
  private initialized: boolean = false;
  private generationInProgress: boolean = false;
  private currentAbortController: AbortController | null = null;

  /**
   * Initialize service and verify API access
   */
  async initialize(): Promise<void> {
    console.log('🔧 Initializing Gemini Image Service...');

    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key not configured. Please set VITE_GEMINI_API_KEY.');
    }

    try {
      // Verify API key works
      const testUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`;
      const response = await fetch(testUrl);

      if (!response.ok) {
        throw new Error(`API key verification failed: ${response.status}`);
      }

      this.initialized = true;
      console.log('✅ Gemini Image Service initialized');

      // Note: Imagen API availability check would go here
      console.warn('⚠️ Note: Gemini 2.5 Flash image generation requires Vertex AI setup');
      console.warn('⚠️ This implementation is a placeholder for when Imagen API is available');

    } catch (error) {
      console.error('❌ Gemini Image Service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Generate image using Gemini/Imagen API
   */
  async generateImage(
    params: OnlineGenerationParams,
    progressTracker?: ProgressTracker
  ): Promise<GeneratedImage> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (this.generationInProgress) {
      throw new Error('Generation already in progress');
    }

    this.generationInProgress = true;
    this.currentAbortController = new AbortController();

    const startTime = Date.now();

    try {
      // Start simulated progress (10-15 seconds for online generation)
      const estimatedDuration = params.quality === 'hd' ? 15000 : 10000;
      progressTracker?.startSimulatedProgress(estimatedDuration);

      console.log('🎨 Starting online generation with Gemini 2.5 Flash...');
      console.log('📝 Prompt:', params.prompt);
      console.log('⚙️ Parameters:', params);

      // IMPORTANT: As of October 2025, we need to check if Imagen 3 is available
      // For now, we'll create a mock implementation that will be replaced
      // when the actual Imagen API endpoint is confirmed

      // Use real Gemini 2.5 Flash Image generation
      const imageBlob = await this.generateViaGeminiImage(params, progressTracker);

      // Calculate generation time
      const generationTime = (Date.now() - startTime) / 1000;

      // Complete progress
      progressTracker?.complete();

      // Create object URL for display
      const url = URL.createObjectURL(imageBlob);

      const result: GeneratedImage = {
        id: crypto.randomUUID(),
        blob: imageBlob,
        url,
        metadata: {
          prompt: params.prompt,
          enhancedPrompt: params.enhancedPrompt,
          negativePrompt: params.negativePrompt,
          mode: 'online',
          model: 'gemini-2.5-flash-image',
          parameters: params,
          timestamp: new Date(),
          generationTime,
          seed: params.seed,
          fileSize: imageBlob.size,
          resolution: this.getResolutionForAspectRatio(params.aspectRatio, params.quality),
          tags: []
        }
      };

      console.log('✅ Online generation complete:', generationTime.toFixed(2), 'seconds');
      return result;

    } catch (error) {
      progressTracker?.error(error instanceof Error ? error.message : 'Generation failed');
      throw error;

    } finally {
      this.generationInProgress = false;
      this.currentAbortController = null;
    }
  }

  /**
   * Generate via Gemini 2.5 Flash Image model
   * Uses the real Gemini image generation API
   * Supports both text-to-image and image-to-image
   */
  private async generateViaGeminiImage(
    params: OnlineGenerationParams,
    progressTracker?: ProgressTracker
  ): Promise<Blob> {
    try {
      // Use Gemini 2.5 Flash Image model
      const endpoint = `${GEMINI_API_BASE}/${GEMINI_IMAGE_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

      // Prepare parts array
      const parts: any[] = [];

      // Add reference image if provided (image-to-image)
      if (params.referenceImage) {
        progressTracker?.updateProgress({
          percentage: 30,
          message: '📸 Processing reference image...'
        });

        const referenceBase64 = await this.blobToBase64(params.referenceImage);
        const referenceMimeType = params.referenceImage.type;

        parts.push({
          inlineData: {
            mimeType: referenceMimeType,
            data: referenceBase64
          }
        });

        // Add transformation instructions
        const transformStrength = params.transformationStrength ?? 0.7;
        const transformInstruction = transformStrength < 0.3 
          ? 'Subtly modify this image based on: '
          : transformStrength < 0.6
          ? 'Transform this image based on: '
          : transformStrength < 0.8
          ? 'Heavily transform this image based on: '
          : 'Completely reimagine this image based on: ';

        parts.push({
          text: transformInstruction + (params.enhancedPrompt || params.prompt)
        });
      } else {
        // Text-to-image generation
        parts.push({
          text: params.enhancedPrompt || params.prompt
        });
      }

      // Prepare request body
      const requestBody = {
        contents: [{
          parts
        }],
        generationConfig: {
          responseModalities: ["image"]
        }
      };

      progressTracker?.updateProgress({
        percentage: 50,
        message: params.referenceImage 
          ? '🎨 Transforming image with Gemini...'
          : '🌐 Generating with Gemini 2.5 Flash Image...'
      });

      // Make API call
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: this.currentAbortController?.signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API request failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      progressTracker?.updateProgress({
        percentage: 80,
        message: '📥 Downloading image...'
      });

      // Extract image from response
      const candidate = data.candidates?.[0];
      if (candidate?.content?.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData?.mimeType?.startsWith('image/')) {
            const base64Image = part.inlineData.data;
            return this.base64ToBlob(base64Image, part.inlineData.mimeType);
          }
        }
      }

      throw new Error('No image data in Gemini response');

    } catch (error) {
      console.error('❌ Gemini image generation failed:', error);
      throw error;
    }
  }

  /**
   * Convert Blob to base64 string
   */
  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        // Remove data URL prefix
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Convert base64 to Blob
   */
  private base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteArrays = [];

    for (let i = 0; i < byteCharacters.length; i++) {
      byteArrays.push(byteCharacters.charCodeAt(i));
    }

    return new Blob([new Uint8Array(byteArrays)], { type: mimeType });
  }

  /**
   * Get resolution based on aspect ratio and quality
   */
  private getResolutionForAspectRatio(
    aspectRatio: string,
    quality: 'standard' | 'hd'
  ): { width: number; height: number } {
    const baseResolution = quality === 'hd' ? 1536 : 1024;

    switch (aspectRatio) {
      case '1:1':
        return { width: baseResolution, height: baseResolution };
      case '16:9':
        return { width: baseResolution, height: Math.round(baseResolution * 9 / 16) };
      case '9:16':
        return { width: Math.round(baseResolution * 9 / 16), height: baseResolution };
      case '4:3':
        return { width: baseResolution, height: Math.round(baseResolution * 3 / 4) };
      default:
        return { width: baseResolution, height: baseResolution };
    }
  }

  /**
   * Cancel ongoing generation
   */
  async cancelGeneration(): Promise<void> {
    if (this.currentAbortController) {
      this.currentAbortController.abort();
      console.log('🚫 Generation cancelled');
    }
  }

  /**
   * Check service status
   */
  async checkStatus(): Promise<ServiceStatus> {
    try {
      if (!GEMINI_API_KEY) {
        return {
          available: false,
          initializing: false,
          error: 'API key not configured',
          lastCheck: new Date()
        };
      }

      // Quick API check
      const testUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`;
      const response = await fetch(testUrl, {
        signal: AbortSignal.timeout(5000)
      });

      return {
        available: response.ok,
        initializing: false,
        error: response.ok ? undefined : `API check failed: ${response.status}`,
        lastCheck: new Date()
      };

    } catch (error) {
      return {
        available: false,
        initializing: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        lastCheck: new Date()
      };
    }
  }
}

// Singleton instance
let geminiImageServiceInstance: GeminiImageService | null = null;

/**
 * Get or create Gemini Image Service instance
 */
export function getGeminiImageService(): GeminiImageService {
  if (!geminiImageServiceInstance) {
    geminiImageServiceInstance = new GeminiImageService();
  }
  return geminiImageServiceInstance;
}

/**
 * Initialize Gemini Image Service
 */
export async function initializeGeminiImageService(): Promise<GeminiImageService> {
  const service = getGeminiImageService();
  await service.initialize();
  return service;
}
