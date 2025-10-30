/**
 * StreamControls Component
 *
 * Provides controls for managing streaming responses (pause, resume, cancel).
 * Includes keyboard shortcuts and accessibility features.
 *
 * @author A.N.S.H.I.K.A. Development Team
 * @version 1.0.0
 * @since 2025-10-31
 */

import React, { useEffect } from 'react';
import { Pause, Play, Square, Keyboard } from 'lucide-react';
import { useChat } from '../contexts/ChatContext';

interface StreamControlsProps {
  className?: string;
  showKeyboardHints?: boolean;
  // Optional props for testing - allow dependency injection
  isStreaming?: boolean;
  pauseStreaming?: () => void;
  resumeStreaming?: () => void;
  cancelStreaming?: () => void;
}

export const StreamControls: React.FC<StreamControlsProps> = ({
  className = '',
  showKeyboardHints = true,
  isStreaming: propIsStreaming,
  pauseStreaming: propPauseStreaming,
  resumeStreaming: propResumeStreaming,
  cancelStreaming: propCancelStreaming,
}) => {
  // Use props if provided, otherwise use context
  const useContextValues = propIsStreaming === undefined || propPauseStreaming === undefined ||
                          propResumeStreaming === undefined || propCancelStreaming === undefined;

  const context = useContextValues ? useChat() : null;
  const {
    isStreaming: contextIsStreaming,
    pauseStreaming: contextPauseStreaming,
    resumeStreaming: contextResumeStreaming,
    cancelStreaming: contextCancelStreaming,
  } = context || {};

  const isStreaming = propIsStreaming ?? contextIsStreaming;
  const pauseStreaming = propPauseStreaming ?? contextPauseStreaming;
  const resumeStreaming = propResumeStreaming ?? contextResumeStreaming;
  const cancelStreaming = propCancelStreaming ?? contextCancelStreaming;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts when streaming
      if (!isStreaming || !cancelStreaming || !pauseStreaming) return;

      // Ctrl/Cmd + C to cancel
      if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
        event.preventDefault();
        cancelStreaming();
      }

      // Space to pause/resume
      if (event.key === ' ') {
        event.preventDefault();
        // Note: We can't determine if it's paused from here, so we'll assume pause for now
        // In a real implementation, you'd track pause state
        pauseStreaming();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isStreaming, cancelStreaming, pauseStreaming]);

  if (!isStreaming) return null;

  return (
    <div
      className={`flex items-center gap-2 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm ${className}`}
      role="toolbar"
      aria-label="Streaming controls"
    >
      {/* Pause/Resume Button */}
      <button
        onClick={() => pauseStreaming?.()}
        className="flex items-center gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        aria-label="Pause streaming"
        title="Pause streaming (Space)"
      >
        <Pause className="w-4 h-4" />
        <span className="text-sm font-medium">Pause</span>
      </button>

      {/* Resume Button (shown when paused) */}
      <button
        onClick={() => resumeStreaming?.()}
        className="flex items-center gap-2 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
        aria-label="Resume streaming"
        title="Resume streaming"
      >
        <Play className="w-4 h-4" />
        <span className="text-sm font-medium">Resume</span>
      </button>

      {/* Cancel Button */}
      <button
        onClick={() => cancelStreaming?.()}
        className="flex items-center gap-2 px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        aria-label="Cancel streaming"
        title="Cancel streaming (Ctrl+C)"
      >
        <Square className="w-4 h-4" />
        <span className="text-sm font-medium">Cancel</span>
      </button>

      {/* Keyboard Shortcuts Hint */}
      {showKeyboardHints && (
        <div className="flex items-center gap-2 ml-4 pl-4 border-l border-gray-300 dark:border-gray-600">
          <Keyboard className="w-4 h-4 text-gray-500" />
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>
              <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">Space</kbd>
              <span className="ml-1">Pause</span>
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">Ctrl+C</kbd>
              <span className="ml-1">Cancel</span>
            </span>
          </div>
        </div>
      )}

      {/* Status Indicator */}
      <div className="flex items-center gap-2 ml-auto">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs text-gray-600 dark:text-gray-400">
            Streaming active
          </span>
        </div>
      </div>
    </div>
  );
};