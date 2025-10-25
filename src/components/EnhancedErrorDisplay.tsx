import React, { useState } from 'react';
import { AlertTriangle, RefreshCw, HelpCircle, ExternalLink, CheckCircle, X } from 'lucide-react';
import { EnhancedError, enhancedErrorService } from '../services/enhancedErrorService';

interface EnhancedErrorDisplayProps {
  error: EnhancedError;
  onDismiss?: () => void;
  onRetry?: (error: EnhancedError) => void;
  className?: string;
}

export const EnhancedErrorDisplay: React.FC<EnhancedErrorDisplayProps> = ({
  error,
  onDismiss,
  onRetry,
  className = ''
}) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null);

  const getSeverityColor = (severity: EnhancedError['severity']) => {
    switch (severity) {
      case 'low':
        return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
      case 'medium':
        return 'border-orange-500 bg-orange-50 dark:bg-orange-900/20';
      case 'high':
        return 'border-red-500 bg-red-50 dark:bg-red-900/20';
      case 'critical':
        return 'border-red-600 bg-red-100 dark:bg-red-900/30';
      default:
        return 'border-gray-500 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const getSeverityIcon = (severity: EnhancedError['severity']) => {
    switch (severity) {
      case 'low':
      case 'medium':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'high':
      case 'critical':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getSuggestionIcon = (type: EnhancedError['suggestions'][0]['type']) => {
    switch (type) {
      case 'retry':
        return <RefreshCw className="w-4 h-4" />;
      case 'fix':
        return <CheckCircle className="w-4 h-4" />;
      case 'alternative':
        return <ExternalLink className="w-4 h-4" />;
      case 'contact':
        return <HelpCircle className="w-4 h-4" />;
      default:
        return <HelpCircle className="w-4 h-4" />;
    }
  };

  const getSuggestionColor = (type: EnhancedError['suggestions'][0]['type']) => {
    switch (type) {
      case 'retry':
        return 'text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300';
      case 'fix':
        return 'text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300';
      case 'alternative':
        return 'text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300';
      case 'contact':
        return 'text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300';
      default:
        return 'text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300';
    }
  };

  const handleRetry = async (suggestion: EnhancedError['suggestions'][0]) => {
    if (!suggestion.action || isRetrying) return;

    setIsRetrying(true);
    try {
      await suggestion.action();
      if (onRetry) {
        onRetry(error);
      }
    } catch (retryError) {
      console.error('Retry action failed:', retryError);
    } finally {
      setIsRetrying(false);
    }
  };

  const handleAutoRetry = async () => {
    if (!error.isRetryable || isRetrying) return;

    setIsRetrying(true);
    try {
      const success = await enhancedErrorService.handleErrorWithRetry(error);
      if (success && onRetry) {
        onRetry(error);
      }
    } catch (retryError) {
      console.error('Auto-retry failed:', retryError);
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className={`enhanced-error-display ${getSeverityColor(error.severity)} border-l-4 rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getSeverityIcon(error.severity)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                {error.title}
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                {error.message}
              </p>

              {/* Error Context */}
              {error.context.component && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Component: {error.context.component}
                  {error.context.action && ` • Action: ${error.context.action}`}
                </div>
              )}

              {/* Retry Count */}
              {error.retryCount && error.retryCount > 0 && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Retry attempt: {error.retryCount}
                  {error.maxRetries && ` of ${error.maxRetries}`}
                </div>
              )}
            </div>

            {onDismiss && (
              <button
                onClick={onDismiss}
                className="flex-shrink-0 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                aria-label="Dismiss error"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            )}
          </div>

          {/* Suggestions */}
          {error.suggestions.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Suggested Actions:
              </div>

              <div className="space-y-2">
                {error.suggestions
                  .sort((a, b) => b.priority - a.priority)
                  .map((suggestion, index) => {
                    const suggestionId = `${error.id}-suggestion-${index}`;
                    const isExpanded = expandedSuggestion === suggestionId;

                    return (
                      <div key={suggestionId} className="bg-white dark:bg-gray-800/50 rounded-md p-3 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-start gap-2">
                          <div className={`flex-shrink-0 mt-0.5 ${getSuggestionColor(suggestion.type)}`}>
                            {getSuggestionIcon(suggestion.type)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <button
                              onClick={() => setExpandedSuggestion(isExpanded ? null : suggestionId)}
                              className="text-left w-full"
                            >
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {suggestion.title}
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                {suggestion.description}
                              </div>
                            </button>

                            {isExpanded && (
                              <div className="mt-3 flex gap-2">
                                {suggestion.type === 'retry' && error.isRetryable && (
                                  <button
                                    onClick={() => handleRetry(suggestion)}
                                    disabled={isRetrying}
                                    className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md transition-colors flex items-center gap-1 touch-target"
                                  >
                                    {isRetrying ? (
                                      <>
                                        <RefreshCw className="w-3 h-3 animate-spin" />
                                        Retrying...
                                      </>
                                    ) : (
                                      <>
                                        <RefreshCw className="w-3 h-3" />
                                        Retry
                                      </>
                                    )}
                                  </button>
                                )}

                                {suggestion.action && suggestion.type !== 'retry' && (
                                  <button
                                    onClick={() => handleRetry(suggestion)}
                                    className={`px-3 py-1.5 text-xs text-white rounded-md transition-colors flex items-center gap-1 touch-target ${getSuggestionColor(suggestion.type)}`}
                                    style={{
                                      backgroundColor: suggestion.type === 'fix' ? '#059669' :
                                                       suggestion.type === 'alternative' ? '#7c3aed' :
                                                       suggestion.type === 'contact' ? '#ea580c' : '#6b7280'
                                    }}
                                  >
                                    {suggestion.type === 'fix' && <CheckCircle className="w-3 h-3" />}
                                    {suggestion.type === 'alternative' && <ExternalLink className="w-3 h-3" />}
                                    {suggestion.type === 'contact' && <HelpCircle className="w-3 h-3" />}
                                    {suggestion.type === 'fix' ? 'Fix' :
                                     suggestion.type === 'alternative' ? 'Try Alternative' :
                                     suggestion.type === 'contact' ? 'Get Help' : 'Action'}
                                  </button>
                                )}

                                {error.helpUrl && (
                                  <a
                                    href={error.helpUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors flex items-center gap-1 touch-target"
                                  >
                                    <HelpCircle className="w-3 h-3" />
                                    Help
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Auto-retry button for retryable errors */}
          {error.isRetryable && error.suggestions.some(s => s.type === 'retry') && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleAutoRetry}
                disabled={isRetrying}
                className="w-full px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md transition-colors flex items-center justify-center gap-2 touch-target"
              >
                {isRetrying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Retry Automatically
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedErrorDisplay;