export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  timestamp?: Date;
  metadata?: Record<string, any>;
}

export interface ErrorSuggestion {
  type: 'retry' | 'alternative' | 'fix' | 'contact';
  title: string;
  description: string;
  action?: () => void | Promise<void>;
  priority: number; // 1-10, higher = more important
}

export interface EnhancedError {
  id: string;
  code: string;
  title: string;
  message: string;
  context: ErrorContext;
  suggestions: ErrorSuggestion[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'network' | 'authentication' | 'validation' | 'system' | 'user' | 'api';
  isRetryable: boolean;
  maxRetries?: number;
  retryCount?: number;
  originalError?: Error;
  helpUrl?: string;
  relatedErrors?: string[];
}

export class EnhancedErrorService {
  private static instance: EnhancedErrorService;
  private errorHistory: Map<string, EnhancedError> = new Map();
  private retryHandlers: Map<string, (error: EnhancedError) => Promise<boolean>> = new Map();

  static getInstance(): EnhancedErrorService {
    if (!EnhancedErrorService.instance) {
      EnhancedErrorService.instance = new EnhancedErrorService();
    }
    return EnhancedErrorService.instance;
  }

  createError(
    code: string,
    message: string,
    context: ErrorContext = {},
    originalError?: Error
  ): EnhancedError {
    const errorId = `${code}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const errorPatterns: Record<string, Partial<EnhancedError>> = {
      // Network errors
      'NETWORK_TIMEOUT': {
        category: 'network',
        severity: 'medium',
        isRetryable: true,
        maxRetries: 3,
        suggestions: [
          {
            type: 'retry',
            title: 'Retry Connection',
            description: 'Check your internet connection and try again',
            priority: 10,
            action: async () => {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          },
          {
            type: 'alternative',
            title: 'Switch to Offline Mode',
            description: 'Use Ollama for local processing',
            priority: 8,
            action: async () => {
              // Switch to offline mode
              const chatContext = (window as any).__CHAT_CONTEXT__;
              if (chatContext?.setMode) {
                chatContext.setMode('offline');
              }
            }
          }
        ]
      },

      'NETWORK_OFFLINE': {
        category: 'network',
        severity: 'high',
        isRetryable: false,
        suggestions: [
          {
            type: 'fix',
            title: 'Check Internet Connection',
            description: 'Please check your internet connection and refresh the page',
            priority: 10
          },
          {
            type: 'alternative',
            title: 'Use Offline Mode',
            description: 'Switch to Ollama for local AI processing',
            priority: 9,
            action: async () => {
              const chatContext = (window as any).__CHAT_CONTEXT__;
              if (chatContext?.setMode) {
                chatContext.setMode('offline');
              }
            }
          }
        ]
      },

      // API errors
      'API_RATE_LIMIT': {
        category: 'api',
        severity: 'medium',
        isRetryable: true,
        maxRetries: 2,
        suggestions: [
          {
            type: 'retry',
            title: 'Wait and Retry',
            description: 'Rate limit exceeded. Please wait a moment and try again',
            priority: 10,
            action: async () => {
              await new Promise(resolve => setTimeout(resolve, 5000));
            }
          },
          {
            type: 'alternative',
            title: 'Use Offline Mode',
            description: 'Switch to local Ollama models to avoid rate limits',
            priority: 8
          }
        ]
      },

      'API_QUOTA_EXCEEDED': {
        category: 'api',
        severity: 'high',
        isRetryable: false,
        suggestions: [
          {
            type: 'contact',
            title: 'Upgrade Plan',
            description: 'Your API quota has been exceeded. Consider upgrading your plan',
            priority: 10
          },
          {
            type: 'alternative',
            title: 'Switch to Offline',
            description: 'Use Ollama for unlimited local processing',
            priority: 9
          }
        ]
      },

      // Authentication errors
      'AUTH_INVALID_KEY': {
        category: 'authentication',
        severity: 'high',
        isRetryable: false,
        suggestions: [
          {
            type: 'fix',
            title: 'Check API Key',
            description: 'Please verify your API key is correct and active',
            priority: 10
          },
          {
            type: 'fix',
            title: 'Update API Key',
            description: 'Go to settings and update your API key',
            priority: 9,
            action: async () => {
              // Navigate to settings or show API key modal
              const event = new CustomEvent('show-api-settings');
              window.dispatchEvent(event);
            }
          }
        ]
      },

      // Validation errors
      'VALIDATION_INPUT_TOO_LONG': {
        category: 'validation',
        severity: 'low',
        isRetryable: false,
        suggestions: [
          {
            type: 'fix',
            title: 'Shorten Your Message',
            description: 'Please reduce the length of your input',
            priority: 10
          },
          {
            type: 'alternative',
            title: 'Break into Parts',
            description: 'Split your message into smaller chunks',
            priority: 8
          }
        ]
      },

      // System errors
      'SYSTEM_OOM': {
        category: 'system',
        severity: 'critical',
        isRetryable: true,
        maxRetries: 1,
        suggestions: [
          {
            type: 'retry',
            title: 'Retry with Smaller Input',
            description: 'System resources are low. Try with a shorter message',
            priority: 10,
            action: async () => {
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          },
          {
            type: 'fix',
            title: 'Refresh Page',
            description: 'Reload the page to free up memory',
            priority: 9,
            action: async () => {
              window.location.reload();
            }
          }
        ]
      }
    };

    const pattern = errorPatterns[code] || {
      category: 'system' as const,
      severity: 'medium' as const,
      isRetryable: false,
      suggestions: []
    };

    const enhancedError: EnhancedError = {
      id: errorId,
      code,
      title: this.getErrorTitle(code),
      message,
      context: {
        timestamp: new Date(),
        ...context
      },
      suggestions: pattern.suggestions || [],
      severity: pattern.severity || 'medium',
      category: pattern.category || 'system',
      isRetryable: pattern.isRetryable || false,
      maxRetries: pattern.maxRetries,
      retryCount: 0,
      originalError,
      helpUrl: this.getHelpUrl(code)
    };

    this.errorHistory.set(errorId, enhancedError);
    return enhancedError;
  }

  private getErrorTitle(code: string): string {
    const titles: Record<string, string> = {
      'NETWORK_TIMEOUT': 'Connection Timeout',
      'NETWORK_OFFLINE': 'No Internet Connection',
      'API_RATE_LIMIT': 'Rate Limit Exceeded',
      'API_QUOTA_EXCEEDED': 'API Quota Exceeded',
      'AUTH_INVALID_KEY': 'Invalid API Key',
      'VALIDATION_INPUT_TOO_LONG': 'Input Too Long',
      'SYSTEM_OOM': 'System Resources Low'
    };
    return titles[code] || 'An Error Occurred';
  }

  private getHelpUrl(code: string): string | undefined {
    const helpUrls: Record<string, string> = {
      'AUTH_INVALID_KEY': '/docs/guides/setup#api-keys',
      'API_RATE_LIMIT': '/docs/guides/troubleshooting#rate-limits',
      'NETWORK_OFFLINE': '/docs/guides/troubleshooting#offline-mode'
    };
    return helpUrls[code];
  }

  async handleErrorWithRetry(error: EnhancedError): Promise<boolean> {
    if (!error.isRetryable || !error.suggestions.length) {
      return false;
    }

    const retrySuggestion = error.suggestions.find(s => s.type === 'retry');
    if (!retrySuggestion?.action) {
      return false;
    }

    try {
      error.retryCount = (error.retryCount || 0) + 1;
      await retrySuggestion.action();

      if (error.retryCount >= (error.maxRetries || 1)) {
        // Mark as resolved
        this.errorHistory.delete(error.id);
      }

      return true;
    } catch (retryError) {
      console.error('Retry action failed:', retryError);
      return false;
    }
  }

  getErrorHistory(): EnhancedError[] {
    return Array.from(this.errorHistory.values());
  }

  clearErrorHistory(): void {
    this.errorHistory.clear();
  }

  registerRetryHandler(code: string, handler: (error: EnhancedError) => Promise<boolean>): void {
    this.retryHandlers.set(code, handler);
  }

  // Utility methods for common error scenarios
  createNetworkError(message: string, context?: ErrorContext): EnhancedError {
    return this.createError('NETWORK_TIMEOUT', message, context);
  }

  createApiError(message: string, context?: ErrorContext): EnhancedError {
    return this.createError('API_RATE_LIMIT', message, context);
  }

  createAuthError(message: string, context?: ErrorContext): EnhancedError {
    return this.createError('AUTH_INVALID_KEY', message, context);
  }

  createValidationError(message: string, context?: ErrorContext): EnhancedError {
    return this.createError('VALIDATION_INPUT_TOO_LONG', message, context);
  }
}

// Export singleton instance
export const enhancedErrorService = EnhancedErrorService.getInstance();