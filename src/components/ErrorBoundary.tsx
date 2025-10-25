import { Component, ErrorInfo, ReactNode } from 'react';
import { EnhancedErrorDisplay } from './EnhancedErrorDisplay';
import { CosmicErrorFallback } from './CosmicErrorFallback';
import { enhancedErrorService, EnhancedError } from '../services/enhancedErrorService';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showErrorDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: EnhancedError | null;
  errorId: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Create enhanced error for the caught error
    const enhancedError = enhancedErrorService.createError(
      'REACT_ERROR_BOUNDARY',
      error.message || 'An unexpected error occurred',
      {
        component: 'ErrorBoundary',
        action: 'render',
        timestamp: new Date()
      },
      error
    );

    return {
      hasError: true,
      error: enhancedError,
      errorId: enhancedError.id
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Call the optional onError callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Update error context with component stack
    if (this.state.error) {
      this.setState({
        error: {
          ...this.state.error,
          context: {
            ...this.state.error.context,
            metadata: {
              ...this.state.error.context.metadata,
              componentStack: errorInfo.componentStack,
              errorBoundary: true
            }
          }
        }
      });
    }

    // Show toast notification for non-critical errors
    if (this.state.error && this.state.error.severity !== 'critical') {
      // Use a timeout to ensure toast context is available
      setTimeout(() => {
        this.showToastNotification();
      }, 100);
    }
  }

  private showToastNotification() {
    try {
      // Create a custom event to trigger toast from parent component
      const toastEvent = new CustomEvent('show-error-toast', {
        detail: {
          error: this.state.error,
          title: this.state.error?.title || 'An error occurred',
          type: this.state.error?.severity === 'high' ? 'error' : 'warning'
        }
      });
      window.dispatchEvent(toastEvent);
    } catch (toastError) {
      console.warn('Failed to show toast notification:', toastError);
    }
  }

  handleRetry = async (error: EnhancedError) => {
    try {
      const success = await enhancedErrorService.handleErrorWithRetry(error);
      if (success) {
        this.setState({
          hasError: false,
          error: null,
          errorId: null
        });
      }
    } catch (retryError) {
      console.error('Error recovery failed:', retryError);
    }
  };

  handleDismiss = () => {
    this.setState({
      hasError: false,
      error: null,
      errorId: null
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // For critical errors, show cosmic fallback
      if (this.state.error.severity === 'critical') {
        return (
          <CosmicErrorFallback
            error={this.state.error}
            onRetry={this.handleRetry}
            onDismiss={this.handleDismiss}
            onReload={() => window.location.reload()}
            onGoHome={() => window.location.href = '/'}
            showTechnicalDetails={this.props.showErrorDetails}
          />
        );
      }

      // For non-critical errors, show inline error display
      return (
        <div className="error-boundary-fallback p-4 max-w-4xl mx-auto">
          <div className="bg-gray-900/60 backdrop-blur-md rounded-xl shadow-2xl border border-purple-500/20 p-6">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-100 mb-2">
                {this.state.error.title}
              </h2>
              <p className="text-gray-300 text-sm">
                {this.state.error.message}
              </p>
            </div>

            <EnhancedErrorDisplay
              error={this.state.error}
              onRetry={this.handleRetry}
              onDismiss={this.handleDismiss}
              className="mb-6"
            />

            {this.props.showErrorDetails && this.state.error?.originalError && (
              <details className="mt-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
                <summary className="cursor-pointer text-sm font-medium text-purple-300 mb-2">
                  Technical Details
                </summary>
                <div className="space-y-2 text-xs">
                  <div>
                    <strong className="text-purple-300">Error:</strong>
                    <span className="ml-2 text-gray-300">{this.state.error.originalError.message}</span>
                  </div>
                  <div>
                    <strong className="text-purple-300">Code:</strong>
                    <span className="ml-2 font-mono text-gray-300">{this.state.error.code}</span>
                  </div>
                  {this.state.error.originalError.stack && (
                    <div>
                      <strong className="text-purple-300">Stack:</strong>
                      <pre className="mt-1 text-xs bg-gray-900/50 p-2 rounded overflow-auto max-h-32 text-gray-400 font-mono">
                        {this.state.error.originalError.stack}
                      </pre>
                    </div>
                  )}
                  {this.state.error.context.metadata?.componentStack && (
                    <div>
                      <strong className="text-purple-300">Component Stack:</strong>
                      <pre className="mt-1 text-xs bg-gray-900/50 p-2 rounded overflow-auto max-h-32 text-gray-400 font-mono">
                        {this.state.error.context.metadata.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            <div className="flex gap-3 justify-center mt-6">
              {this.state.error.isRetryable && (
                <button
                  onClick={() => this.handleRetry(this.state.error!)}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-all duration-200 touch-target"
                >
                  Try Again
                </button>
              )}
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors touch-target"
              >
                Reload Page
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors touch-target"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;