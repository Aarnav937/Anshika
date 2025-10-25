/**
 * Configuration Hooks Collection
 * 
 * This module provides specialized React hooks for accessing and managing
 * configuration values with type safety and performance optimization.
 */

import { useState, useEffect, useCallback } from 'react';
import { useConfiguration } from '../core/ConfigurationContext';
import {
  ConfigurationFilter,
  ConfigurationChangeCallback,
  Subscription,
  ConfigurationError
} from '../core/ConfigurationTypes';

// ============================================================================
// Type Definitions
// ============================================================================

export interface UseConfigValueOptions<T> {
  defaultValue?: T;
  validate?: (value: T) => boolean | string;
  transform?: (value: any) => T;
  debounceMs?: number;
}

export interface UseConfigValueResult<T> {
  value: T;
  setValue: (newValue: T) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  reset: () => Promise<void>;
  remove: () => Promise<void>;
}

export interface UseConfigBatchOptions {
  defaultValues?: Record<string, any>;
  validateAll?: (values: Record<string, any>) => boolean | string;
  autoRefresh?: boolean;
}

export interface UseConfigBatchResult {
  values: Record<string, any>;
  setValues: (newValues: Record<string, any>) => Promise<void>;
  setValue: <T>(key: string, value: T) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// ============================================================================
// Single Configuration Value Hook
// ============================================================================

/**
 * Hook for managing a single configuration value with type safety
 */
export function useConfigValue<T>(
  key: string,
  options: UseConfigValueOptions<T> = {}
): UseConfigValueResult<T> {
  const config = useConfiguration();
  const [localValue, setLocalValue] = useState<T | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    defaultValue,
    validate,
    transform,
    debounceMs = 0
  } = options;

  // ============================================================================
  // Value Loading
  // ============================================================================

  const loadValue = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const rawValue = await config.getValue<T>(key, defaultValue);
      
      // Apply transformation if provided
      const processedValue = transform ? transform(rawValue) : rawValue;
      
      // Apply validation if provided
      if (validate) {
        const validationResult = validate(processedValue);
        if (validationResult !== true) {
          const errorMessage = typeof validationResult === 'string' 
            ? validationResult 
            : `Invalid value for ${key}`;
          throw new ConfigurationError(errorMessage, 'VALIDATION_FAILED');
        }
      }

      setLocalValue(processedValue);
    } catch (loadError) {
      const errorMessage = loadError instanceof Error ? loadError.message : 'Failed to load configuration';
      setError(errorMessage);
      console.error(`❌ Failed to load config value ${key}:`, loadError);
      
      // Fall back to default value if available
      if (defaultValue !== undefined) {
        setLocalValue(defaultValue);
      }
    } finally {
      setIsLoading(false);
    }
  }, [key, defaultValue, validate, transform, config]);

  // ============================================================================
  // Value Setting with Debounce
  // ============================================================================

  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  const setValue = useCallback(async (newValue: T) => {
    try {
      setError(null);

      // Apply validation if provided
      if (validate) {
        const validationResult = validate(newValue);
        if (validationResult !== true) {
          const errorMessage = typeof validationResult === 'string' 
            ? validationResult 
            : `Invalid value for ${key}`;
          throw new ConfigurationError(errorMessage, 'VALIDATION_FAILED');
        }
      }

      // Clear existing debounce timer
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      // Update local value immediately for responsive UI
      setLocalValue(newValue);

      // Debounce the actual save operation
      const saveOperation = async () => {
        try {
          await config.setValue(key, newValue);
          console.log(`✅ Configuration ${key} updated successfully`);
        } catch (saveError) {
          const errorMessage = saveError instanceof Error ? saveError.message : 'Failed to save configuration';
          setError(errorMessage);
          console.error(`❌ Failed to save config value ${key}:`, saveError);
          
          // Revert local value on save failure
          await loadValue();
        }
      };

      if (debounceMs > 0) {
        const timer = setTimeout(saveOperation, debounceMs);
        setDebounceTimer(timer);
      } else {
        await saveOperation();
      }

    } catch (validationError) {
      const errorMessage = validationError instanceof Error ? validationError.message : 'Validation failed';
      setError(errorMessage);
      console.error(`❌ Validation failed for ${key}:`, validationError);
    }
  }, [key, validate, debounceMs, debounceTimer, config, loadValue]);

  // ============================================================================
  // Reset and Remove Operations
  // ============================================================================

  const reset = useCallback(async () => {
    try {
      setError(null);
      await config.resetValue(key);
      await loadValue();
      console.log(`✅ Configuration ${key} reset to default`);
    } catch (resetError) {
      const errorMessage = resetError instanceof Error ? resetError.message : 'Failed to reset configuration';
      setError(errorMessage);
      console.error(`❌ Failed to reset config value ${key}:`, resetError);
    }
  }, [key, config, loadValue]);

  const remove = useCallback(async () => {
    try {
      setError(null);
      await config.removeValue(key);
      setLocalValue(defaultValue);
      console.log(`✅ Configuration ${key} removed`);
    } catch (removeError) {
      const errorMessage = removeError instanceof Error ? removeError.message : 'Failed to remove configuration';
      setError(errorMessage);
      console.error(`❌ Failed to remove config value ${key}:`, removeError);
    }
  }, [key, defaultValue, config]);

  // ============================================================================
  // Effects
  // ============================================================================

  // Load initial value
  useEffect(() => {
    loadValue();
  }, [loadValue]);

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  return {
    value: localValue as T,
    setValue,
    isLoading,
    error,
    reset,
    remove
  };
}

// ============================================================================
// Batch Configuration Values Hook
// ============================================================================

/**
 * Hook for managing multiple configuration values efficiently
 */
export function useConfigBatch(
  keys: string[],
  options: UseConfigBatchOptions = {}
): UseConfigBatchResult {
  const config = useConfiguration();
  const [values, setValuesState] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    defaultValues = {},
    validateAll,
    autoRefresh = false
  } = options;

  // ============================================================================
  // Batch Loading
  // ============================================================================

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const batchResults: Record<string, any> = {};
      
      // Load all values in parallel
      const loadPromises = keys.map(async (key) => {
        try {
          const value = await config.getValue(key, defaultValues[key]);
          return { key, value };
        } catch (loadError) {
          console.warn(`⚠️ Failed to load ${key}, using default:`, loadError);
          return { key, value: defaultValues[key] };
        }
      });

      const results = await Promise.all(loadPromises);
      
      results.forEach(({ key, value }) => {
        batchResults[key] = value;
      });

      // Apply batch validation if provided
      if (validateAll) {
        const validationResult = validateAll(batchResults);
        if (validationResult !== true) {
          const errorMessage = typeof validationResult === 'string' 
            ? validationResult 
            : 'Batch validation failed';
          throw new ConfigurationError(errorMessage, 'VALIDATION_FAILED');
        }
      }

      setValuesState(batchResults);
    } catch (batchError) {
      const errorMessage = batchError instanceof Error ? batchError.message : 'Failed to load batch configuration';
      setError(errorMessage);
      console.error('❌ Failed to load batch configuration:', batchError);
    } finally {
      setIsLoading(false);
    }
  }, [keys, defaultValues, validateAll, config]);

  // ============================================================================
  // Batch Setting
  // ============================================================================

  const setValues = useCallback(async (newValues: Record<string, any>) => {
    try {
      setError(null);

      // Apply batch validation if provided
      if (validateAll) {
        const mergedValues = { ...values, ...newValues };
        const validationResult = validateAll(mergedValues);
        if (validationResult !== true) {
          const errorMessage = typeof validationResult === 'string' 
            ? validationResult 
            : 'Batch validation failed';
          throw new ConfigurationError(errorMessage, 'VALIDATION_FAILED');
        }
      }

      // Update local state immediately
      setValuesState((prevValues: Record<string, any>) => ({ ...prevValues, ...newValues }));

      // Save to configuration service
      const updates = Object.entries(newValues).map(([key, value]) => ({
        key,
        value
      }));

      await config.setMultiple(updates);
      console.log(`✅ Batch configuration updated: ${updates.length} values`);

    } catch (batchError) {
      const errorMessage = batchError instanceof Error ? batchError.message : 'Failed to save batch configuration';
      setError(errorMessage);
      console.error('❌ Failed to save batch configuration:', batchError);
      
      // Revert changes on failure
      await refresh();
    }
  }, [values, validateAll, config, refresh]);

  // ============================================================================
  // Single Value Setting in Batch
  // ============================================================================

  const setValue = useCallback(async <T>(key: string, value: T) => {
    await setValues({ [key]: value });
  }, [setValues]);

  // ============================================================================
  // Effects
  // ============================================================================

  // Load initial values
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto-refresh if enabled
  useEffect(() => {
    if (!autoRefresh) return;

    const refreshInterval = setInterval(() => {
      refresh();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(refreshInterval);
  }, [autoRefresh, refresh]);

  return {
    values,
    setValues,
    setValue,
    isLoading,
    error,
    refresh
  };
}

// ============================================================================
// Configuration Change Subscription Hook
// ============================================================================

export interface UseConfigSubscriptionOptions {
  immediate?: boolean;
  debounceMs?: number;
}

/**
 * Hook for subscribing to configuration changes
 */
export function useConfigSubscription(
  filter: ConfigurationFilter,
  callback: ConfigurationChangeCallback,
  options: UseConfigSubscriptionOptions = {}
): {
  isSubscribed: boolean;
  error: string | null;
  unsubscribe: () => void;
} {
  const config = useConfiguration();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { immediate = true, debounceMs = 0 } = options;

  // ============================================================================
  // Debounced Callback
  // ============================================================================

  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  const debouncedCallback = useCallback<ConfigurationChangeCallback>((change) => {
    if (debounceMs > 0) {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      const timer = setTimeout(() => {
        callback(change);
      }, debounceMs);

      setDebounceTimer(timer);
    } else {
      callback(change);
    }
  }, [callback, debounceMs, debounceTimer]);

  // ============================================================================
  // Subscription Management
  // ============================================================================

  const subscribe = useCallback(() => {
    try {
      setError(null);
      const sub = config.subscribeToChanges(filter, debouncedCallback);
      setSubscription(sub);
      console.log('✅ Configuration subscription established');
    } catch (subscriptionError) {
      const errorMessage = subscriptionError instanceof Error ? subscriptionError.message : 'Failed to subscribe';
      setError(errorMessage);
      console.error('❌ Failed to establish configuration subscription:', subscriptionError);
    }
  }, [config, filter, debouncedCallback]);

  const unsubscribe = useCallback(() => {
    if (subscription) {
      subscription.unsubscribe();
      setSubscription(null);
      console.log('✅ Configuration subscription removed');
    }
  }, [subscription]);

  // ============================================================================
  // Effects
  // ============================================================================

  // Establish subscription
  useEffect(() => {
    if (immediate) {
      subscribe();
    }

    return () => {
      unsubscribe();
    };
  }, [immediate, subscribe, unsubscribe]);

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  return {
    isSubscribed: subscription !== null,
    error,
    unsubscribe
  };
}

// ============================================================================
// Configuration Categories Hook
// ============================================================================

/**
 * Hook for managing configuration by categories
 */
export function useConfigCategory(category: string) {
  const config = useConfiguration();
  const [categoryValues, setCategoryValues] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCategory = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Export just this category
      const backup = await config.exportConfiguration([category]);
      setCategoryValues(backup.configurations || {});
    } catch (categoryError) {
      const errorMessage = categoryError instanceof Error ? categoryError.message : 'Failed to load category';
      setError(errorMessage);
      console.error(`❌ Failed to load category ${category}:`, categoryError);
    } finally {
      setIsLoading(false);
    }
  }, [category, config]);

  const exportCategory = useCallback(async () => {
    return await config.exportConfiguration([category]);
  }, [category, config]);

  useEffect(() => {
    loadCategory();
  }, [loadCategory]);

  return {
    values: categoryValues,
    isLoading,
    error,
    refresh: loadCategory,
    exportCategory
  };
}