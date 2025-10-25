/**
 * GenerationProgressModal Component
 * Shows progress during image generation
 */

import { GenerationProgress } from '../../types/imageGeneration';

interface GenerationProgressModalProps {
  progress: GenerationProgress;
  onCancel: () => void;
}

export function GenerationProgressModal({
  progress,
  onCancel
}: GenerationProgressModalProps) {
  const { percentage, stage, message, estimatedTimeRemaining } = progress;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000] backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-8 max-w-lg w-[90%] shadow-2xl">
        <h3 className="text-2xl text-center text-gray-800 mb-6">
          🎨 Generating Image...
        </h3>

        <div className="w-full h-3 bg-gray-200 rounded-md overflow-hidden mb-4">
          <div 
            className="h-full bg-gradient-to-r from-purple-600 to-purple-800 rounded-md transition-all duration-300 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>

        <div className="flex justify-between mb-4 text-sm">
          <span className="font-semibold text-purple-600">{percentage.toFixed(0)}%</span>
          <span className="text-gray-600 capitalize">{stage}</span>
        </div>

        <p className="text-center text-gray-700 mb-4">{message}</p>

        {estimatedTimeRemaining !== undefined && (
          <p className="text-center text-gray-500 text-sm mb-4">
            ⏱️ Time remaining: ~{estimatedTimeRemaining}s
          </p>
        )}

        <button 
          onClick={onCancel} 
          className="w-full px-4 py-3 bg-red-500 text-white rounded-lg font-medium text-base transition-colors hover:bg-red-600"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
