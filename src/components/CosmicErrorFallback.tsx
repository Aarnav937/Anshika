import React from 'react';
import { RefreshCw, Home, AlertTriangle, Zap, Star } from 'lucide-react';
import { Button } from './ui/Button';
import { EnhancedError } from '../services/enhancedErrorService';

interface CosmicErrorFallbackProps {
  error: EnhancedError;
  onRetry?: (error: EnhancedError) => void;
  onDismiss?: () => void;
  onReload?: () => void;
  onGoHome?: () => void;
  showTechnicalDetails?: boolean;
}

export const CosmicErrorFallback: React.FC<CosmicErrorFallbackProps> = ({
  error,
  onRetry,
  onDismiss,
  onReload,
  onGoHome,
  showTechnicalDetails = false
}) => {
  const getSeverityIcon = () => {
    switch (error.severity) {
      case 'critical':
        return <Zap className="w-8 h-8 text-red-400" />;
      case 'high':
        return <AlertTriangle className="w-8 h-8 text-orange-400" />;
      default:
        return <Star className="w-8 h-8 text-purple-400" />;
    }
  };

  const getSeverityGradient = () => {
    switch (error.severity) {
      case 'critical':
        return 'from-red-500/20 via-pink-500/20 to-purple-500/20';
      case 'high':
        return 'from-orange-500/20 via-yellow-500/20 to-red-500/20';
      default:
        return 'from-purple-500/20 via-blue-500/20 to-indigo-500/20';
    }
  };

  return (
    <div className="cosmic-error-fallback min-h-screen flex items-center justify-center p-4">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute inset-0 bg-gradient-to-br ${getSeverityGradient()} animate-pulse`} />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto">
        <div className="bg-gray-900/80 backdrop-blur-md rounded-2xl shadow-2xl border border-purple-500/20 p-8 text-center">
          {/* Error Icon */}
          <div className="mb-6 flex justify-center">
            <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${getSeverityGradient()} flex items-center justify-center animate-pulse`}>
              {getSeverityIcon()}
            </div>
          </div>

          {/* Error Title */}
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
            {error.title}
          </h1>

          {/* Error Message */}
          <p className="text-gray-300 text-lg mb-8 leading-relaxed">
            {error.message}
          </p>

          {/* Suggestions */}
          {error.suggestions.length > 0 && (
            <div className="mb-8 text-left">
              <h3 className="text-sm font-semibold text-purple-300 mb-3 uppercase tracking-wide">
                Suggested Solutions
              </h3>
              <div className="space-y-3">
                {error.suggestions.slice(0, 3).map((suggestion, index) => (
                  <div
                    key={index}
                    className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50 hover:border-purple-500/30 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-200 mb-1">
                          {suggestion.title}
                        </h4>
                        <p className="text-sm text-gray-400 mb-2">
                          {suggestion.description}
                        </p>
                        {suggestion.action && (
                          <Button
                            size="sm"
                            variant="cosmic"
                            onClick={() => suggestion.action?.()}
                            className="text-xs"
                          >
                            Try This
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            {onRetry && error.isRetryable && (
              <Button
                variant="cosmic"
                leftIcon={<RefreshCw className="w-4 h-4" />}
                onClick={() => onRetry(error)}
                className="min-w-[140px]"
              >
                Retry
              </Button>
            )}

            {onReload && (
              <Button
                variant="secondary"
                leftIcon={<RefreshCw className="w-4 h-4" />}
                onClick={onReload}
                className="min-w-[140px]"
              >
                Reload Page
              </Button>
            )}

            {onGoHome && (
              <Button
                variant="ghost"
                leftIcon={<Home className="w-4 h-4" />}
                onClick={onGoHome}
                className="min-w-[140px]"
              >
                Go Home
              </Button>
            )}

            {onDismiss && (
              <Button
                variant="ghost"
                onClick={onDismiss}
                className="min-w-[140px]"
              >
                Dismiss
              </Button>
            )}
          </div>

          {/* Technical Details (Collapsible) */}
          {showTechnicalDetails && error.originalError && (
            <details className="mt-8 text-left">
              <summary className="cursor-pointer text-sm font-medium text-purple-300 hover:text-purple-200 mb-4 flex items-center gap-2">
                <span>Technical Details</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
                <div className="space-y-3 text-xs">
                  <div>
                    <strong className="text-purple-300">Error Code:</strong>
                    <span className="ml-2 font-mono text-gray-300">{error.code}</span>
                  </div>
                  <div>
                    <strong className="text-purple-300">Message:</strong>
                    <span className="ml-2 text-gray-300">{error.originalError.message}</span>
                  </div>
                  {error.originalError.stack && (
                    <div>
                      <strong className="text-purple-300">Stack Trace:</strong>
                      <pre className="mt-2 text-xs bg-gray-900/50 p-3 rounded border border-gray-600/30 overflow-auto max-h-32 text-gray-400 font-mono">
                        {error.originalError.stack}
                      </pre>
                    </div>
                  )}
                  <div>
                    <strong className="text-purple-300">Category:</strong>
                    <span className="ml-2 capitalize text-gray-300">{error.category}</span>
                  </div>
                  <div>
                    <strong className="text-purple-300">Severity:</strong>
                    <span className={`ml-2 capitalize px-2 py-1 rounded text-xs ${
                      error.severity === 'critical' ? 'bg-red-500/20 text-red-300' :
                      error.severity === 'high' ? 'bg-orange-500/20 text-orange-300' :
                      error.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                      'bg-blue-500/20 text-blue-300'
                    }`}>
                      {error.severity}
                    </span>
                  </div>
                </div>
              </div>
            </details>
          )}

          {/* Error ID for support */}
          <div className="mt-6 pt-4 border-t border-gray-700/50">
            <p className="text-xs text-gray-500">
              Error ID: <span className="font-mono">{error.id}</span>
            </p>
          </div>
        </div>
      </div>

      <style>{`
        .cosmic-error-fallback {
          background: radial-gradient(ellipse at center, #1a1a2e 0%, #16213e 50%, #0f0f23 100%);
        }
      `}</style>
    </div>
  );
};