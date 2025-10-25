/**
 * Intent Suggestion Component
 * Shows smart suggestions when system detects user intent
 * Task 3.2 - Natural Language Command Detection
 */

import React from 'react';
import type { DetectedIntent } from '../services/intentDetectionService';

interface IntentSuggestionProps {
  intent: DetectedIntent;
  onAccept: () => void;
  onDismiss: () => void;
}

export const IntentSuggestion: React.FC<IntentSuggestionProps> = ({
  intent,
  onAccept,
  onDismiss,
}) => {
  if (!intent.suggestion) return null;

  const confidencePercent = Math.round(intent.confidence * 100);
  
  return (
    <div className="flex items-center gap-2 p-3 mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg animate-slideIn">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-blue-600 dark:text-blue-400 text-sm font-medium">
            💡 Did you mean:
          </span>
          <span className="text-xs text-blue-500 dark:text-blue-300">
            {confidencePercent}% confidence
          </span>
        </div>
        <code className="block px-3 py-1.5 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-600 rounded text-sm font-mono">
          {intent.suggestion}
        </code>
      </div>
      
      <div className="flex gap-2">
        <button
          onClick={onAccept}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
          title="Execute this command"
        >
          ✓ Yes
        </button>
        <button
          onClick={onDismiss}
          className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-md transition-colors"
          title="Dismiss suggestion"
        >
          ✕ No
        </button>
      </div>
    </div>
  );
};

export default IntentSuggestion;
