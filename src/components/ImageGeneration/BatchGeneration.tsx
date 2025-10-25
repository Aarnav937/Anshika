/**
 * Batch Generation Component
 * Allows generating multiple images at once (2-4 images)
 * Task 2.4 Implementation - October 8, 2025
 */

import React, { useState } from 'react';
import { GeneratedImage, GenerationProgress } from '../../types/imageGeneration';

interface BatchGenerationProps {
  onBatchGenerate: (batchSize: number) => Promise<void>;
  isGenerating: boolean;
  batchProgress: BatchProgress[];
  onClose?: () => void;
}

export interface BatchProgress {
  index: number;
  progress: GenerationProgress | null;
  result: GeneratedImage | null;
  error: string | null;
}

export const BatchGeneration: React.FC<BatchGenerationProps> = ({
  onBatchGenerate,
  isGenerating,
  batchProgress,
  onClose
}) => {
  const [batchSize, setBatchSize] = useState<number>(2);
  const [useSeedVariation, setUseSeedVariation] = useState(true);

  const handleBatchSizeChange = (size: number) => {
    if (size >= 1 && size <= 4) {
      setBatchSize(size);
    }
  };

  const completedCount = batchProgress.filter(p => p.result !== null).length;
  const errorCount = batchProgress.filter(p => p.error !== null).length;
  const overallProgress = batchProgress.length > 0 
    ? Math.round((completedCount / batchProgress.length) * 100)
    : 0;

  return (
    <div className="batch-generation-panel space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
          🎲 Batch Generation
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            disabled={isGenerating}
          >
            ✕
          </button>
        )}
      </div>

      {/* Batch Size Selector */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Batch Size: {batchSize} image{batchSize > 1 ? 's' : ''}
        </label>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((size) => (
            <button
              key={size}
              onClick={() => handleBatchSizeChange(size)}
              disabled={isGenerating}
              className={`
                flex-1 px-4 py-2 rounded-lg font-medium transition-all
                ${batchSize === size
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }
                ${isGenerating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {size}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Generate multiple variations of your prompt simultaneously
        </p>
      </div>

      {/* Seed Variation Toggle */}
      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            🎲 Seed Variation
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Create unique variations by randomizing seeds
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={useSeedVariation}
            onChange={(e) => setUseSeedVariation(e.target.checked)}
            disabled={isGenerating}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-gradient-to-r peer-checked:from-purple-500 peer-checked:to-pink-500"></div>
        </label>
      </div>

      {/* Generate Button (only show when not generating and no results) */}
      {!isGenerating && batchProgress.length === 0 && (
        <button
          onClick={() => onBatchGenerate(batchSize)}
          className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg text-lg font-semibold transition-all duration-200 hover:-translate-y-1 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          🎲 Generate {batchSize} Image{batchSize > 1 ? 's' : ''}
        </button>
      )}

      {/* Overall Progress (when generating) */}
      {isGenerating && batchProgress.length > 0 && (
        <div className="space-y-3 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-700 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Overall Progress
            </span>
            <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
              {completedCount} / {batchProgress.length} completed
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500 ease-out"
              style={{ width: `${overallProgress}%` }}
            />
          </div>

          {/* Individual Progress */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {batchProgress.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-2 bg-white dark:bg-gray-800 rounded-lg"
              >
                {/* Image Number */}
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
                  {index + 1}
                </div>

                {/* Status */}
                <div className="flex-1 min-w-0">
                  {item.error ? (
                    <div className="flex items-center gap-2">
                      <span className="text-red-500 text-sm">❌ Error</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {item.error}
                      </span>
                    </div>
                  ) : item.result ? (
                    <div className="flex items-center gap-2">
                      <span className="text-green-500 text-sm">✅ Complete</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {item.result.metadata.generationTime.toFixed(1)}s
                      </span>
                    </div>
                  ) : item.progress ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {item.progress.stage}
                        </span>
                        <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                          {item.progress.percentage}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                        <div
                          className="h-full bg-gradient-to-r from-purple-400 to-pink-400 transition-all"
                          style={{ width: `${item.progress.percentage}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 dark:text-gray-500">⏳ Waiting...</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Error Summary */}
          {errorCount > 0 && (
            <div className="text-xs text-red-600 dark:text-red-400 text-center">
              ⚠️ {errorCount} image{errorCount > 1 ? 's' : ''} failed to generate
            </div>
          )}
        </div>
      )}

      {/* Batch Results Grid (after completion) */}
      {!isGenerating && batchProgress.length > 0 && completedCount > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Batch Results ({completedCount} images)
            </h4>
            <button
              onClick={() => window.location.reload()} // Simple reset
              className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
            >
              Clear & New Batch
            </button>
          </div>

          <div className={`grid gap-3 ${
            completedCount === 1 ? 'grid-cols-1' :
            completedCount === 2 ? 'grid-cols-2' :
            'grid-cols-2 sm:grid-cols-2'
          }`}>
            {batchProgress
              .filter(item => item.result !== null)
              .map((item, index) => (
                <div
                  key={index}
                  className="relative group rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-400 transition-all"
                >
                  <img
                    src={item.result!.url}
                    alt={`Batch result ${index + 1}`}
                    className="w-full h-auto"
                  />
                  
                  {/* Overlay Info */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-center space-y-2">
                      <p className="text-sm font-semibold">Image {item.index + 1}</p>
                      <p className="text-xs">
                        {item.result!.metadata.generationTime.toFixed(1)}s
                      </p>
                      <button
                        onClick={() => {
                          const a = document.createElement('a');
                          a.href = item.result!.url;
                          a.download = `batch-${item.index + 1}-${Date.now()}.png`;
                          a.click();
                        }}
                        className="px-3 py-1 bg-white text-purple-600 rounded-lg text-xs font-medium hover:bg-purple-50"
                      >
                        Download
                      </button>
                    </div>
                  </div>

                  {/* Badge */}
                  <div className="absolute top-2 left-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                    #{item.index + 1}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Info Banner */}
      {!isGenerating && batchProgress.length === 0 && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            💡 <strong>Tip:</strong> Batch generation creates multiple images from the same prompt. 
            Enable seed variation for unique results, or disable it to generate similar images.
          </p>
        </div>
      )}
    </div>
  );
};

export default BatchGeneration;
