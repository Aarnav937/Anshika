import React from 'react';

interface EditPreviewProps {
  oldResponse: string;
  newResponse: string;
  isGenerating: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const EditPreview: React.FC<EditPreviewProps> = ({
  oldResponse,
  newResponse,
  isGenerating,
  onConfirm,
  onCancel,
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden border border-gray-700">
        {/* Header */}
        <div className="bg-gray-900 p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">Compare AI Responses</h3>
          <p className="text-sm text-gray-400 mt-1">
            Review the new response before replacing the old one
          </p>
        </div>

        {/* Comparison Area */}
        <div className="grid grid-cols-2 gap-4 p-4 overflow-y-auto max-h-[60vh]">
          {/* Old Response */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-300">Original Response</h4>
              <span className="text-xs text-gray-500 bg-gray-700 px-2 py-1 rounded">Old</span>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
              <p className="text-gray-200 whitespace-pre-wrap">{oldResponse}</p>
            </div>
          </div>

          {/* New Response */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-300">New Response</h4>
              <span className="text-xs text-green-400 bg-green-900/30 px-2 py-1 rounded">New</span>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4 border border-green-600">
              {isGenerating ? (
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-sm text-gray-400">Generating new response...</span>
                </div>
              ) : (
                <p className="text-gray-200 whitespace-pre-wrap">{newResponse}</p>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-gray-900 p-4 border-t border-gray-700 flex items-center justify-between">
          <div className="text-sm text-gray-400">
            <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            Choose which response to keep
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isGenerating}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
            >
              {isGenerating ? 'Generating...' : 'Confirm & Replace'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
