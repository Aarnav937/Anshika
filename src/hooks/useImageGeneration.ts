/**
 * useImageGeneration Hook
 * Main hook for image generation functionality
 * Updated: October 8, 2025 - Added batch generation support (Task 2.4)
 */

import { useState, useCallback, useRef } from 'react';
import {
  GenerationMode,
  QualityTier,
  GeneratedImage,
  GenerationProgress
} from '../types/imageGeneration';
import { getGeminiImageService } from '../services/image/geminiImageService';
import { ProgressTracker } from '../services/image/progressTrackingService';

export interface BatchProgress {
  index: number;
  progress: GenerationProgress | null;
  result: GeneratedImage | null;
  error: string | null;
}

interface UseImageGenerationReturn {
  // State
  mode: GenerationMode;
  qualityTier: QualityTier;
  isGenerating: boolean;
  progress: GenerationProgress | null;
  currentImage: GeneratedImage | null;
  error: string | null;
  
  // Batch generation state
  isBatchGenerating: boolean;
  batchProgress: BatchProgress[];
  batchResults: GeneratedImage[];
  
  // Actions
  generateImage: (prompt: string, params?: Partial<GenerateImageParams>) => Promise<void>;
  generateBatch: (batchSize: number, prompt: string, params?: Partial<GenerateImageParams>) => Promise<void>;
  cancelGeneration: () => void;
  setMode: (mode: GenerationMode) => void;
  setQualityTier: (tier: QualityTier) => void;
  clearError: () => void;
  clearBatch: () => void;
}

interface GenerateImageParams {
  enhancedPrompt?: string;
  negativePrompt?: string;
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3';
  quality?: 'standard' | 'hd';
  seed?: number;
  // Image-to-image transformation
  referenceImage?: Blob;
  transformationStrength?: number;
}

export function useImageGeneration(): UseImageGenerationReturn {
  // State
  const [mode, setMode] = useState<GenerationMode>('online');
  const [qualityTier, setQualityTier] = useState<QualityTier>('medium');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [currentImage, setCurrentImage] = useState<GeneratedImage | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Batch generation state
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState<BatchProgress[]>([]);
  const [batchResults, setBatchResults] = useState<GeneratedImage[]>([]);

  // Refs
  const progressTrackerRef = useRef<ProgressTracker | null>(null);
  const batchCancelledRef = useRef(false);

  /**
   * Generate image
   */
  const generateImage = useCallback(async (
    prompt: string,
    params: Partial<GenerateImageParams> = {}
  ) => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    if (isGenerating) {
      setError('Generation already in progress');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setProgress(null);
    setCurrentImage(null);

    try {
      // Create progress tracker
      const tracker = new ProgressTracker();
      progressTrackerRef.current = tracker;

      // Listen to progress updates
      tracker.onProgress((progressData: GenerationProgress) => {
        setProgress(progressData);
        
        // Check for completion or error
        if (progressData.stage === 'complete') {
          console.log('✅ Generation complete');
        }
        if (progressData.stage === 'error') {
          setError(progressData.message || 'Generation failed');
        }
      });

      // Start generation
      console.log(`🎨 Starting ${mode} mode image generation...`);

      if (mode === 'online') {
        // Use Gemini service
        const geminiService = getGeminiImageService();
        await geminiService.initialize();

        const result = await geminiService.generateImage({
          prompt,
          enhancedPrompt: params.enhancedPrompt,
          negativePrompt: params.negativePrompt,
          aspectRatio: params.aspectRatio || '1:1',
          quality: params.quality || 'standard',
          seed: params.seed,
          referenceImage: params.referenceImage,
          transformationStrength: params.transformationStrength
        }, tracker);

        setCurrentImage(result);
        console.log('✅ Image generated successfully:', result);

      } else if (mode === 'smart') {
        // Smart mode: default to online for now
        const geminiService = getGeminiImageService();
        await geminiService.initialize();

        const result = await geminiService.generateImage({
          prompt,
          enhancedPrompt: params.enhancedPrompt,
          negativePrompt: params.negativePrompt,
          aspectRatio: params.aspectRatio || '1:1',
          quality: params.quality || 'standard',
          seed: params.seed,
          referenceImage: params.referenceImage,
          transformationStrength: params.transformationStrength
        }, tracker);

        setCurrentImage(result);
        console.log('✅ Image generated successfully:', result);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('❌ Generation failed:', errorMessage);
      setError(errorMessage);

    } finally {
      setIsGenerating(false);
      progressTrackerRef.current = null;
    }
  }, [mode, qualityTier, isGenerating]);

  /**
   * Cancel ongoing generation
   */
  const cancelGeneration = useCallback(() => {
    if (progressTrackerRef.current) {
      progressTrackerRef.current.cancel();
      setIsGenerating(false);
      setProgress(null);
      console.log('🚫 Generation cancelled by user');
    }
  }, []);

  /**
   * Clear error message
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Generate batch of images
   * Task 2.4 - Batch Generation Implementation
   */
  const generateBatch = useCallback(async (
    batchSize: number,
    prompt: string,
    params: Partial<GenerateImageParams> = {}
  ) => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    if (batchSize < 1 || batchSize > 4) {
      setError('Batch size must be between 1 and 4');
      return;
    }

    if (isBatchGenerating) {
      setError('Batch generation already in progress');
      return;
    }

    setIsBatchGenerating(true);
    setError(null);
    setBatchResults([]);
    batchCancelledRef.current = false;

    // Initialize batch progress tracking
    const initialProgress: BatchProgress[] = Array.from({ length: batchSize }, (_, i) => ({
      index: i,
      progress: null,
      result: null,
      error: null
    }));
    setBatchProgress(initialProgress);

    console.log(`🎲 Starting batch generation: ${batchSize} images`);

    try {
      const geminiService = getGeminiImageService();
      await geminiService.initialize();

      const results: GeneratedImage[] = [];

      // Generate images sequentially with seed variation
      for (let i = 0; i < batchSize; i++) {
        if (batchCancelledRef.current) {
          console.log('🚫 Batch cancelled by user');
          break;
        }

        console.log(`📸 Generating image ${i + 1}/${batchSize}...`);

        try {
          // Create progress tracker for this image
          const tracker = new ProgressTracker();

          // Update batch progress
          tracker.onProgress((progressData: GenerationProgress) => {
            setBatchProgress(prev => 
              prev.map(item => 
                item.index === i 
                  ? { ...item, progress: progressData }
                  : item
              )
            );
          });

          // Generate with seed variation (random seed for each)
          const seed = params.seed !== undefined 
            ? params.seed + i // Increment seed if provided
            : Math.floor(Math.random() * 1000000); // Random seed

          const result = await geminiService.generateImage({
            prompt,
            enhancedPrompt: params.enhancedPrompt,
            negativePrompt: params.negativePrompt,
            aspectRatio: params.aspectRatio || '1:1',
            quality: params.quality || 'standard',
            seed,
            referenceImage: params.referenceImage,
            transformationStrength: params.transformationStrength
          }, tracker);

          results.push(result);

          // Update batch progress with result
          setBatchProgress(prev => 
            prev.map(item => 
              item.index === i 
                ? { ...item, result, progress: null, error: null }
                : item
            )
          );

          console.log(`✅ Image ${i + 1}/${batchSize} complete`);

        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Generation failed';
          console.error(`❌ Image ${i + 1}/${batchSize} failed:`, errorMessage);

          // Update batch progress with error
          setBatchProgress(prev => 
            prev.map(item => 
              item.index === i 
                ? { ...item, error: errorMessage, progress: null }
                : item
            )
          );
        }
      }

      setBatchResults(results);
      console.log(`✅ Batch generation complete: ${results.length}/${batchSize} succeeded`);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Batch generation failed';
      console.error('❌ Batch generation failed:', errorMessage);
      setError(errorMessage);

    } finally {
      setIsBatchGenerating(false);
      batchCancelledRef.current = false;
    }
  }, [isBatchGenerating]);

  /**
   * Clear batch results
   */
  const clearBatch = useCallback(() => {
    setBatchProgress([]);
    setBatchResults([]);
    setError(null);
  }, []);

  return {
    mode,
    qualityTier,
    isGenerating,
    progress,
    currentImage,
    error,
    isBatchGenerating,
    batchProgress,
    batchResults,
    generateImage,
    generateBatch,
    cancelGeneration,
    setMode,
    setQualityTier,
    clearError,
    clearBatch
  };
}
