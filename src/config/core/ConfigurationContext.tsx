/**
 * Configuration Context Provider
 * 
 * This module provides React Context integration for the configuration system,
 * enabling components to access and modify configuration through React hooks.
 */

import React, { createContext, useContext, ReactNode, useEffect, useState, useCallback } from 'react';
import { ConfigurationService } from './ConfigurationService';
import {
  ConfigurationUpdate,
  ConfigurationFilter,
  ConfigurationChangeCallback,
  Subscription,
  ConfigurationStatus,
  ConfigurationBackup,
  ImportOptions,
  ImportResult,
  ConfigurationError
} from './ConfigurationTypes';

// ============================================================================
// Context Type Definitions
// ============================================================================

export interface ConfigurationContextValue {
  // Service state
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  status: ConfigurationStatus | null;

  // Configuration operations
  getValue: <T>(key: string, defaultValue?: T) => Promise<T>;
  setValue: <T>(key: string, value: T) => Promise<void>;
  setMultiple: (updates: ConfigurationUpdate[]) => Promise<void>;
  resetValue: (key: string) => Promise<void>;
  removeValue: (key: string) => Promise<void>;

  // Subscription management
  subscribeToChanges: (filter: ConfigurationFilter, callback: ConfigurationChangeCallback) => Subscription;

  // Import/Export operations
  exportConfiguration: (categories?: string[]) => Promise<ConfigurationBackup>;
  importConfiguration: (backup: ConfigurationBackup, options?: ImportOptions) => Promise<ImportResult>;

  // Cache and performance
  clearCache: () => void;
  getCacheStats: () => any;

  // Service management
  refreshStatus: () => Promise<void>;
}

// ============================================================================
// Context Creation
// ============================================================================

const ConfigurationContext = createContext<ConfigurationContextValue | undefined>(undefined);

// ============================================================================
// Provider Component
// ============================================================================

interface ConfigurationProviderProps {
  children: ReactNode;
}

export const ConfigurationProvider: React.FC<ConfigurationProviderProps> = ({ children }) => {
  // Service instance (created once)
  const [configService] = useState(() => new ConfigurationService());

  // Provider state
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<ConfigurationStatus | null>(null);

  // ============================================================================
  // Initialization and Lifecycle
  // ============================================================================

  useEffect(() => {
    const initializeService = async () => {
      try {
        setIsLoading(true);
        setError(null);

        console.log('🚀 Initializing Configuration Provider...');

        // Initialize the configuration service
        await configService.initialize();

        // Get initial status
        const initialStatus = await configService.getStatus();
        setStatus(initialStatus);

        setIsInitialized(true);
        setIsLoading(false);

        console.log('✅ Configuration Provider initialized successfully');

        // Log any initialization warnings
        if (initialStatus.warnings.length > 0) {
          console.warn('⚠️ Configuration warnings:', initialStatus.warnings);
        }

        if (initialStatus.errors.length > 0) {
          console.error('❌ Configuration errors:', initialStatus.errors);
        }
      } catch (initError) {
        const errorMessage = initError instanceof Error ? initError.message : 'Unknown initialization error';
        console.error('❌ Configuration Provider initialization failed:', initError);
        setError(errorMessage);
        setIsLoading(false);
      }
    };

    initializeService();

    // Cleanup on unmount
    return () => {
      configService.shutdown().catch(shutdownError => {
        console.error('❌ Configuration service shutdown failed:', shutdownError);
      });
    };
  }, [configService]);

  // ============================================================================
  // Configuration Operations
  // ============================================================================

  const getValue = useCallback(async function<T>(key: string, defaultValue?: T): Promise<T> {
    try {
      return await configService.get<T>(key, defaultValue);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown get error';
      console.error(`❌ Failed to get configuration ${key}:`, error);
      
      // If we have a default value, return it instead of throwing
      if (defaultValue !== undefined) {
        console.warn(`⚠️ Using default value for ${key} due to error:`, errorMessage);
        return defaultValue;
      }
      
      throw error;
    }
  }, [configService]);

  const setValue = useCallback(async function<T>(key: string, value: T): Promise<void> {
    try {
      await configService.set(key, value);
      
      // Refresh status after successful update
      const newStatus = await configService.getStatus();
      setStatus(newStatus);
    } catch (error) {
      console.error(`❌ Failed to set configuration ${key}:`, error);
      
      // Update error state
      if (error instanceof ConfigurationError) {
        setError(error.message);
      }
      
      throw error;
    }
  }, [configService]);

  const setMultiple = useCallback(async (updates: ConfigurationUpdate[]): Promise<void> => {
    try {
      await configService.setMultiple(updates);
      
      // Refresh status after successful batch update
      const newStatus = await configService.getStatus();
      setStatus(newStatus);
      
      console.log(`✅ Batch configuration update completed: ${updates.length} items`);
    } catch (error) {
      console.error('❌ Failed to set multiple configurations:', error);
      
      // Update error state
      if (error instanceof ConfigurationError) {
        setError(error.message);
      }
      
      throw error;
    }
  }, [configService]);

  const resetValue = useCallback(async (key: string): Promise<void> => {
    try {
      await configService.reset(key);
      
      // Refresh status after reset
      const newStatus = await configService.getStatus();
      setStatus(newStatus);
      
      console.log(`✅ Configuration reset to default: ${key}`);
    } catch (error) {
      console.error(`❌ Failed to reset configuration ${key}:`, error);
      throw error;
    }
  }, [configService]);

  const removeValue = useCallback(async (key: string): Promise<void> => {
    try {
      await configService.remove(key);
      
      // Refresh status after removal
      const newStatus = await configService.getStatus();
      setStatus(newStatus);
      
      console.log(`✅ Configuration removed: ${key}`);
    } catch (error) {
      console.error(`❌ Failed to remove configuration ${key}:`, error);
      throw error;
    }
  }, [configService]);

  // ============================================================================
  // Subscription Management
  // ============================================================================

  const subscribeToChanges = useCallback((
    filter: ConfigurationFilter,
    callback: ConfigurationChangeCallback
  ): Subscription => {
    return configService.subscribeToChanges(filter, callback);
  }, [configService]);

  // ============================================================================
  // Import/Export Operations
  // ============================================================================

  const exportConfiguration = useCallback(async (categories?: string[]): Promise<ConfigurationBackup> => {
    try {
      const backup = await configService.exportConfiguration(categories);
      console.log(`✅ Configuration exported: ${backup.metadata.totalItems} items`);
      return backup;
    } catch (error) {
      console.error('❌ Failed to export configuration:', error);
      throw error;
    }
  }, [configService]);

  const importConfiguration = useCallback(async (
    backup: ConfigurationBackup,
    options?: ImportOptions
  ): Promise<ImportResult> => {
    try {
      setIsLoading(true);
      const result = await configService.importConfiguration(backup, options);
      
      // Refresh status after import
      const newStatus = await configService.getStatus();
      setStatus(newStatus);
      
      setIsLoading(false);
      
      if (result.success) {
        console.log(`✅ Configuration imported: ${result.importedCount} items`);
      } else {
        console.warn(`⚠️ Configuration import completed with errors: ${result.errorCount} errors`);
      }
      
      return result;
    } catch (error) {
      setIsLoading(false);
      console.error('❌ Failed to import configuration:', error);
      throw error;
    }
  }, [configService]);

  // ============================================================================
  // Cache and Performance Management
  // ============================================================================

  const clearCache = useCallback(() => {
    configService.clearCache();
    console.log('🗑️ Configuration cache cleared via Context');
  }, [configService]);

  const getCacheStats = useCallback(() => {
    return configService.getCacheStats();
  }, [configService]);

  // ============================================================================
  // Status Management
  // ============================================================================

  const refreshStatus = useCallback(async (): Promise<void> => {
    try {
      const newStatus = await configService.getStatus();
      setStatus(newStatus);
      
      // Clear error state if status is healthy
      if (newStatus.healthy && error) {
        setError(null);
      }
    } catch (statusError) {
      console.error('❌ Failed to refresh configuration status:', statusError);
      const errorMessage = statusError instanceof Error ? statusError.message : 'Unknown status error';
      setError(errorMessage);
    }
  }, [configService, error]);

  // ============================================================================
  // Context Value
  // ============================================================================

  const contextValue: ConfigurationContextValue = {
    // State
    isInitialized,
    isLoading,
    error,
    status,

    // Operations
    getValue,
    setValue,
    setMultiple,
    resetValue,
    removeValue,

    // Subscriptions
    subscribeToChanges,

    // Import/Export
    exportConfiguration,
    importConfiguration,

    // Cache management
    clearCache,
    getCacheStats,

    // Status management
    refreshStatus
  };

  // ============================================================================
  // Error Boundary Integration
  // ============================================================================

  // Auto-refresh status periodically to detect issues
  useEffect(() => {
    if (!isInitialized) return;

    const statusInterval = setInterval(() => {
      refreshStatus().catch(error => {
        console.error('❌ Periodic status refresh failed:', error);
      });
    }, 60000); // Check every minute

    return () => clearInterval(statusInterval);
  }, [isInitialized, refreshStatus]);

  // ============================================================================
  // Render Provider
  // ============================================================================

  return (
    <ConfigurationContext.Provider value={contextValue}>
      {children}
    </ConfigurationContext.Provider>
  );
};

// ============================================================================
// Hook for Using Configuration Context
// ============================================================================

export const useConfiguration = (): ConfigurationContextValue => {
  const context = useContext(ConfigurationContext);
  
  if (context === undefined) {
    throw new Error(
      'useConfiguration must be used within a ConfigurationProvider. ' +
      'Make sure your component is wrapped with <ConfigurationProvider>.'
    );
  }
  
  return context;
};

// ============================================================================
// Error Boundary for Configuration Context
// ============================================================================

interface ConfigurationErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ConfigurationErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
}

export class ConfigurationErrorBoundary extends React.Component<
  ConfigurationErrorBoundaryProps,
  ConfigurationErrorBoundaryState
> {
  constructor(props: ConfigurationErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ConfigurationErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Configuration Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const { fallback: Fallback } = this.props;
      
      if (Fallback) {
        return (
          <Fallback
            error={this.state.error!}
            retry={() => this.setState({ hasError: false, error: null })}
          />
        );
      }

      // Default fallback UI
      return (
        <div className="configuration-error-boundary p-6 bg-red-50 border border-red-200 rounded-lg">
          <h2 className="text-lg font-semibold text-red-800 mb-2">
            Configuration System Error
          </h2>
          <p className="text-red-600 mb-4">
            The configuration system encountered an error. This may affect application settings.
          </p>
          <details className="mb-4">
            <summary className="text-red-700 cursor-pointer">Error Details</summary>
            <pre className="mt-2 text-sm text-red-600 bg-red-100 p-2 rounded overflow-auto">
              {this.state.error?.stack || this.state.error?.message}
            </pre>
          </details>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// Higher-Order Component for Configuration
// ============================================================================

export interface WithConfigurationProps {
  configuration: ConfigurationContextValue;
}

export function withConfiguration<P extends WithConfigurationProps>(
  Component: React.ComponentType<P>
): React.FC<Omit<P, 'configuration'>> {
  return function ConfigurationWrappedComponent(props) {
    const configuration = useConfiguration();
    
    return <Component {...(props as P)} configuration={configuration} />;
  };
}

// ============================================================================
// Configuration Loading Component
// ============================================================================

interface ConfigurationLoadingProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export const ConfigurationLoading: React.FC<ConfigurationLoadingProps> = ({ 
  children, 
  fallback = <div>Loading configuration...</div> 
}) => {
  const { isInitialized, isLoading } = useConfiguration();

  if (!isInitialized || isLoading) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};