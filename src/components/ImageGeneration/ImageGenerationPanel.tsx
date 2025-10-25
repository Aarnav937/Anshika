/**
 * ImageGenerationPanel Component
 * Main panel for image generation with Gallery
 */

import { useState, useEffect } from 'react';
import { useImageGeneration } from '../../hooks/useImageGeneration';
import { PromptInput } from './PromptInput';
import { ModeSelector } from './ModeSelector';
import { GenerationProgressModal } from './GenerationProgressModal';
import { ImageGallery } from './ImageGallery';
import { AdvancedSettings } from './AdvancedSettings';
import { StylePresets } from './StylePresets';
import { ImageToImagePanel, type ImageToImageParams } from './ImageToImagePanel';
import { BatchGeneration } from './BatchGeneration';
import { ImageHistoryPanel } from './ImageHistoryPanel';
import { imageStorageService } from '../../services/image/imageStorageService';
import { Image, Sparkles, Wand2, Grid3x3, History } from 'lucide-react';
import type { AspectRatio } from '../../types/imageGeneration';

type TabType = 'generate' | 'transform' | 'batch' | 'gallery' | 'history';

interface ImageGenerationPanelProps {
  initialTab?: TabType;
}

export function ImageGenerationPanel({ initialTab }: ImageGenerationPanelProps) {
  const {
    mode,
    isGenerating,
    progress,
    currentImage,
    error,
    isBatchGenerating,
    batchProgress,
    generateImage,
    generateBatch,
    cancelGeneration,
    setMode,
    clearError,
    clearBatch
  } = useImageGeneration();

  const [activeTab, setActiveTab] = useState<TabType>(initialTab || 'generate');
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [enhancePrompt, setEnhancePrompt] = useState(true); // Default to enhanced
  
  // Advanced settings (Gemini-specific)
  const [negativePrompt, setNegativePrompt] = useState('');
  const [seed, setSeed] = useState<number>(-1); // -1 means random

  // Auto-save generated images to storage
  useEffect(() => {
    if (currentImage && !isGenerating) {
      imageStorageService.saveImage(currentImage).catch(err => {
        console.error('Failed to save image:', err);
      });
    }
  }, [currentImage, isGenerating]);

  // Update active tab when initialTab prop changes
  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, activeTab]);

  const handleGenerate = async () => {
    // Enhance prompt if enabled
    const finalPrompt = enhancePrompt
      ? `${prompt}, highly detailed, sharp focus, professional photography, vibrant colors, masterpiece quality, 8k resolution`
      : prompt;

    await generateImage(finalPrompt, {
      aspectRatio,
      negativePrompt: negativePrompt || undefined,
      seed: seed === -1 ? undefined : seed
    });
  };

  const handleTransform = async (params: ImageToImageParams) => {
    if (!params.referenceImage) return;

    // Enhance prompt if enabled
    const finalPrompt = enhancePrompt
      ? `${params.prompt}, highly detailed, sharp focus, professional photography, vibrant colors, masterpiece quality, 8k resolution`
      : params.prompt;

    await generateImage(finalPrompt, {
      aspectRatio,
      negativePrompt: params.negativePrompt || undefined,
      seed: params.seed,
      referenceImage: params.referenceImage,
      transformationStrength: params.strength
    });
  };

  return (
    <div className="max-w-7xl mx-auto my-8 p-8 bg-white rounded-2xl shadow-xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">🎨 AI Image Generation</h2>
        <p className="text-gray-600">
          Generate stunning images using AI. Powered by Gemini 2.5 Flash Image.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 border-b-2 border-gray-200 overflow-x-auto">
        <button
          className={`px-6 py-3 border-b-3 font-medium transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'generate'
              ? 'border-purple-600 text-purple-600 font-semibold'
              : 'border-transparent text-gray-600 hover:text-purple-600 hover:bg-purple-50'
          }`}
          onClick={() => setActiveTab('generate')}
        >
          <Sparkles className="w-5 h-5" />
          Generate
        </button>
        <button
          className={`px-6 py-3 border-b-3 font-medium transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'transform'
              ? 'border-purple-600 text-purple-600 font-semibold'
              : 'border-transparent text-gray-600 hover:text-purple-600 hover:bg-purple-50'
          }`}
          onClick={() => setActiveTab('transform')}
        >
          <Wand2 className="w-5 h-5" />
          Transform
        </button>
        <button
          className={`px-6 py-3 border-b-3 font-medium transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'batch'
              ? 'border-purple-600 text-purple-600 font-semibold'
              : 'border-transparent text-gray-600 hover:text-purple-600 hover:bg-purple-50'
          }`}
          onClick={() => setActiveTab('batch')}
        >
          <Grid3x3 className="w-5 h-5" />
          Batch
        </button>
        <button
          className={`px-6 py-3 border-b-3 font-medium transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'gallery'
              ? 'border-purple-600 text-purple-600 font-semibold'
              : 'border-transparent text-gray-600 hover:text-purple-600 hover:bg-purple-50'
          }`}
          onClick={() => setActiveTab('gallery')}
        >
          <Image className="w-5 h-5" />
          Gallery
        </button>
        <button
          className={`px-6 py-3 border-b-3 font-medium transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'history'
              ? 'border-purple-600 text-purple-600 font-semibold'
              : 'border-transparent text-gray-600 hover:text-purple-600 hover:bg-purple-50'
          }`}
          onClick={() => setActiveTab('history')}
        >
          <History className="w-5 h-5" />
          History
        </button>
      </div>

      <div className="flex flex-col gap-6">
      {activeTab === 'generate' ? (
        <>
        <ModeSelector
          currentMode={mode}
          onModeChange={setMode}
          disabled={isGenerating}
        />

        <PromptInput
          value={prompt}
          onChange={setPrompt}
          disabled={isGenerating}
        />

        {/* Style Presets */}
        <StylePresets
          onStyleSelect={(style) => {
            // Append style to prompt
            const basePrompt = prompt.split(',')[0].trim(); // Get base without existing styles
            setPrompt(`${basePrompt}, ${style.promptAddition}`);
            // Update negative prompt
            setNegativePrompt(style.negativePrompt);
          }}
        />

        {/* Advanced Settings Panel */}
        <AdvancedSettings
          aspectRatio={aspectRatio}
          onAspectRatioChange={setAspectRatio}
          negativePrompt={negativePrompt}
          onNegativePromptChange={setNegativePrompt}
          enhancePrompt={enhancePrompt}
          onEnhancePromptChange={setEnhancePrompt}
          seed={seed}
          onSeedChange={setSeed}
        />

        {error && (
          <div className="p-4 bg-red-50 border-2 border-red-400 rounded-lg text-red-800 flex justify-between items-center">
            <span>❌ {error}</span>
            <button 
              onClick={clearError} 
              className="text-red-800 hover:text-red-900 text-2xl font-bold w-8 h-8 flex items-center justify-center"
            >
              ×
            </button>
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg text-lg font-semibold transition-all duration-200 hover:-translate-y-1 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {isGenerating ? '⏳ Generating...' : '🎨 Generate Image'}
        </button>

        {currentImage && (
          <div className="mt-6 p-6 border-2 border-gray-200 rounded-xl bg-gray-50">
            <h3 className="text-xl font-bold text-gray-800 mb-4">✨ Generated Image</h3>
            <img
              src={currentImage.url}
              alt={currentImage.metadata.prompt}
              className="w-full h-auto rounded-lg shadow-md mb-4"
            />
            <div className="space-y-2 text-gray-700 mb-4">
              <p><strong className="text-gray-900">Prompt:</strong> {currentImage.metadata.prompt}</p>
              <p><strong className="text-gray-900">Time:</strong> {currentImage.metadata.generationTime.toFixed(2)}s</p>
              <p><strong className="text-gray-900">Model:</strong> {currentImage.metadata.model}</p>
              <p><strong className="text-gray-900">Size:</strong> {(currentImage.blob.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = currentImage.url;
                  link.download = `generated-${Date.now()}.png`;
                  link.click();
                }}
                className="px-4 py-2 bg-green-500 text-white rounded-lg font-semibold transition-all hover:bg-green-600 hover:-translate-y-0.5 hover:shadow-md"
              >
                💾 Download
              </button>
              <button
                onClick={() => setActiveTab('gallery')}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold transition-all hover:bg-blue-600 hover:-translate-y-0.5 hover:shadow-md"
              >
                🖼️ View in Gallery
              </button>
            </div>
          </div>
        )}
        </>
      ) : activeTab === 'transform' ? (
        <>
          <ImageToImagePanel
            onTransform={handleTransform}
            isTransforming={isGenerating}
          />
          
          {currentImage && (
            <div className="mt-6 p-6 border-2 border-gray-200 rounded-xl bg-gray-50">
              <h3 className="text-xl font-bold text-gray-800 mb-4">✨ Transformed Image</h3>
              <img
                src={currentImage.url}
                alt={currentImage.metadata.prompt}
                className="w-full h-auto rounded-lg shadow-md mb-4"
              />
              <div className="space-y-2 text-gray-700 mb-4">
                <p><strong className="text-gray-900">Prompt:</strong> {currentImage.metadata.prompt}</p>
                <p><strong className="text-gray-900">Time:</strong> {currentImage.metadata.generationTime.toFixed(2)}s</p>
                <p><strong className="text-gray-900">Model:</strong> {currentImage.metadata.model}</p>
                <p><strong className="text-gray-900">Size:</strong> {(currentImage.blob.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = currentImage.url;
                    link.download = `transformed-${Date.now()}.png`;
                    link.click();
                  }}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg font-semibold transition-all hover:bg-green-600 hover:-translate-y-0.5 hover:shadow-md"
                >
                  💾 Download
                </button>
                <button
                  onClick={() => setActiveTab('gallery')}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold transition-all hover:bg-blue-600 hover:-translate-y-0.5 hover:shadow-md"
                >
                  🖼️ View in Gallery
                </button>
              </div>
            </div>
          )}
        </>
      ) : activeTab === 'batch' ? (
        <>
          <div className="space-y-6">
            <PromptInput
              value={prompt}
              onChange={setPrompt}
              disabled={isBatchGenerating}
            />

            {/* Advanced Settings (always visible before generation) */}
            {!isBatchGenerating && batchProgress.length === 0 && (
              <AdvancedSettings
                aspectRatio={aspectRatio}
                onAspectRatioChange={setAspectRatio}
                negativePrompt={negativePrompt}
                onNegativePromptChange={setNegativePrompt}
                enhancePrompt={enhancePrompt}
                onEnhancePromptChange={setEnhancePrompt}
                seed={seed}
                onSeedChange={setSeed}
              />
            )}

            <BatchGeneration
              onBatchGenerate={async (batchSize) => {
                const finalPrompt = enhancePrompt
                  ? `${prompt}, highly detailed, sharp focus, professional photography, vibrant colors, masterpiece quality, 8k resolution`
                  : prompt;

                await generateBatch(batchSize, finalPrompt, {
                  aspectRatio,
                  negativePrompt: negativePrompt || undefined,
                  seed: seed === -1 ? undefined : seed
                });
              }}
              isGenerating={isBatchGenerating}
              batchProgress={batchProgress}
            />

            {/* Clear batch button */}
            {!isBatchGenerating && batchProgress.length > 0 && (
              <button
                onClick={clearBatch}
                className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold transition-all hover:bg-gray-300"
              >
                Clear & Start New Batch
              </button>
            )}
          </div>
        </>
      ) : activeTab === 'gallery' ? (
        <ImageGallery />
      ) : (
        <ImageHistoryPanel />
      )}
      </div>

      {isGenerating && progress && (
        <GenerationProgressModal
          progress={progress}
          onCancel={cancelGeneration}
        />
      )}
    </div>
  );
}
