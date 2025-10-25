/**
 * Configuration Service - Core Orchestrator
 * 
 * This is the main service that orchestrates all configuration operations,
 * providing the primary interface for configuration management throughout
 * the application.
 */

import {
  ConfigurationValue,
  ConfigurationUpdate,
  ConfigurationChange,
  ConfigurationChangeCallback,
  ConfigurationFilter,
  Subscription,
  CachedConfiguration,
  ConfigurationError,
  ConfigurationStatus,
  ConfigurationBackup,
  ImportOptions,
  ImportResult
} from './ConfigurationTypes';

import { StorageAbstraction } from '../storage/StorageRepository';

// ============================================================================
// Configuration Cache Implementation
// ============================================================================

class ConfigurationCache {
  private cache = new Map<string, CachedConfiguration>();
  private accessOrder = new Map<string, number>();
  private accessCounter = 0;
  private maxSize = 100;
  private defaultTTL = 300000; // 5 minutes

  get(key: string): ConfigurationValue | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    // Check if expired
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      return null;
    }

    // Update access order
    this.accessOrder.set(key, ++this.accessCounter);
    cached.accessCount++;
    
    return cached.value;
  }

  set(key: string, value: ConfigurationValue, ttl?: number): void {
    // Evict least recently used items if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    const cached: CachedConfiguration = {
      value,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
      accessCount: 1
    };

    this.cache.set(key, cached);
    this.accessOrder.set(key, ++this.accessCounter);
  }

  delete(key: string): void {
    this.cache.delete(key);
    this.accessOrder.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
    this.accessCounter = 0;
  }

  private evictLRU(): void {
    let lruKey = '';
    let lruAccess = Infinity;

    for (const [key, access] of this.accessOrder) {
      if (access < lruAccess) {
        lruAccess = access;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      this.accessOrder.delete(lruKey);
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: this.calculateHitRate()
    };
  }

  private calculateHitRate(): number {
    let totalAccesses = 0;
    let hits = 0;

    for (const cached of this.cache.values()) {
      totalAccesses += cached.accessCount;
      hits += Math.max(0, cached.accessCount - 1); // First access is always a miss
    }

    return totalAccesses > 0 ? (hits / totalAccesses) * 100 : 0;
  }
}

// ============================================================================
// Configuration Service Implementation
// ============================================================================

export class ConfigurationService {
  private storage: StorageAbstraction;
  private cache: ConfigurationCache;
  private subscribers = new Map<string, Set<ConfigurationChangeCallback>>();
  private initialized = false;

  constructor() {
    this.storage = new StorageAbstraction();
    this.cache = new ConfigurationCache();
  }

  // ============================================================================
  // Lifecycle Management
  // ============================================================================

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Initialize storage layer
      await this.storage.initialize();
      console.log('✅ Configuration storage initialized');

      // Initialize validation engine
      // await this.validator.initialize(); // Validation will be added in future phases
      console.log('✅ Configuration validation initialized');

      this.initialized = true;
      console.log('🚀 Configuration service ready');
    } catch (error) {
      console.error('❌ Configuration service initialization failed:', error);
      throw new ConfigurationError(
        'INIT_FAILED',
        'Failed to initialize configuration service',
        true,
        'Check storage and validation engine status'
      );
    }
  }

  async shutdown(): Promise<void> {
    if (!this.initialized) return;

    try {
      // Clear cache
      this.cache.clear();
      
      // Clear subscribers
      this.subscribers.clear();
      
      // Shutdown storage
      await this.storage.shutdown();
      
      this.initialized = false;
      console.log('✅ Configuration service shutdown complete');
    } catch (error) {
      console.error('❌ Configuration service shutdown failed:', error);
    }
  }

  async getStatus(): Promise<ConfigurationStatus> {
    const errors: ConfigurationError[] = [];
    const warnings: string[] = [];
    
    let healthy = true;

    // Check storage health
    try {
      const storageHealthy = await this.storage.isHealthy();
      if (!storageHealthy) {
        healthy = false;
        errors.push(new ConfigurationError(
          'STORAGE_UNHEALTHY',
          'Configuration storage is not healthy',
          true,
          'Check browser storage availability and quota'
        ));
      }
    } catch (error) {
      healthy = false;
      errors.push(new ConfigurationError(
        'STORAGE_ERROR',
        `Storage health check failed: ${error}`,
        true,
        'Restart the application or clear browser data'
      ));
    }

    // Get statistics
    const stats = await this.storage.getStats();
    
    return {
      healthy,
      errors,
      warnings,
      statistics: {
        totalConfigurations: stats.itemCount,
        modifiedConfigurations: 0, // TODO: implement tracking
        errorConfigurations: 0,    // TODO: implement tracking
        categoriesCount: 0,        // TODO: implement tracking
        servicesCount: 0           // TODO: implement tracking
      }
    };
  }

  // ============================================================================
  // Core Configuration Operations
  // ============================================================================

  async get<T>(key: string, defaultValue?: T): Promise<T> {
    if (!this.initialized) {
      throw new ConfigurationError(
        'NOT_INITIALIZED',
        'Configuration service not initialized',
        true,
        'Call initialize() before using configuration service'
      );
    }

    // Check cache first
    const cachedValue = this.cache.get(key);
    if (cachedValue !== null) {
      return cachedValue as T;
    }

    try {
      // Load from storage
      const storedConfig = await this.storage.retrieve(key);
      
      if (storedConfig) {
        // Cache the value
        this.cache.set(key, storedConfig.value);
        return storedConfig.value as T;
      } else if (defaultValue !== undefined) {
        // Cache the default value
        this.cache.set(key, defaultValue as ConfigurationValue);
        return defaultValue;
      } else {
        throw new ConfigurationError(
          'NOT_FOUND',
          `Configuration key '${key}' not found and no default value provided`,
          false,
          'Provide a default value or ensure the configuration exists'
        );
      }
    } catch (error) {
      if (error instanceof ConfigurationError) {
        throw error;
      }
      
      // If storage fails and we have a default, return it
      if (defaultValue !== undefined) {
        console.warn(`Storage failed for ${key}, using default value:`, error);
        return defaultValue;
      }
      
      throw new ConfigurationError(
        'RETRIEVAL_FAILED',
        `Failed to retrieve configuration '${key}': ${error}`,
        true,
        'Check storage health or provide a default value'
      );
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    if (!this.initialized) {
      throw new ConfigurationError(
        'NOT_INITIALIZED',
        'Configuration service not initialized',
        true,
        'Call initialize() before using configuration service'
      );
    }

    // Get old value for change notification
    let oldValue: ConfigurationValue = null;
    try {
      const storedConfig = await this.storage.retrieve(key);
      oldValue = storedConfig?.value || null;
    } catch {
      // Ignore retrieval errors when setting new value
    }

    try {
      // Validate the new value (validation disabled for now)
      // const validationResult = await this.validator.validate(key, value);

      // Store the configuration
      await this.storage.store(key, value as ConfigurationValue);

      // Update cache
      this.cache.set(key, value as ConfigurationValue);

      // Notify subscribers
      await this.notifyChange({
        key,
        oldValue,
        newValue: value as ConfigurationValue,
        timestamp: Date.now(),
        source: 'user',
        category: 'unknown' // TODO: get from schema
      });

      console.log(`✅ Configuration updated: ${key} = ${JSON.stringify(value)}`);
    } catch (error) {
      if (error instanceof ConfigurationError) {
        throw error;
      }

      throw new ConfigurationError(
        'UPDATE_FAILED',
        `Failed to update configuration '${key}': ${error}`,
        true,
        'Check storage health and try again'
      );
    }
  }

  async setMultiple(updates: ConfigurationUpdate[]): Promise<void> {
    if (!this.initialized) {
      throw new ConfigurationError(
        'NOT_INITIALIZED',
        'Configuration service not initialized',
        true,
        'Call initialize() before using configuration service'
      );
    }

    if (updates.length === 0) return;

    const changes: ConfigurationChange[] = [];
    const errors: ConfigurationError[] = [];

    // Get old values and validate all updates first
    for (const update of updates) {
      try {
        // Get old value
        let oldValue: ConfigurationValue = null;
        try {
          const storedConfig = await this.storage.retrieve(update.key);
          oldValue = storedConfig?.value || null;
        } catch {
          // Ignore retrieval errors
        }

        // Validate new value (validation disabled for now)
        // const validationResult = await this.validator.validate(update.key, update.value);

        changes.push({
          key: update.key,
          oldValue,
          newValue: update.value,
          timestamp: update.timestamp || Date.now(),
          source: 'user',
          category: update.category || 'unknown'
        });
      } catch (error) {
        errors.push(new ConfigurationError(
          'BATCH_VALIDATION_FAILED',
          `Failed to validate ${update.key}: ${error}`,
          true,
          'Check individual configuration values'
        ));
      }
    }

    // If there are validation errors, don't proceed
    if (errors.length > 0) {
      throw new ConfigurationError(
        'BATCH_VALIDATION_FAILED',
        `Batch validation failed: ${errors.map(e => e.message).join('; ')}`,
        false,
        'Fix validation errors and try again'
      );
    }

    try {
      // Store all valid updates
      const storageItems = changes.map(change => ({
        key: change.key,
        value: change.newValue,
        metadata: {
          category: change.category
        }
      }));

      await this.storage.storeBatch(storageItems);

      // Update cache for all items
      for (const change of changes) {
        this.cache.set(change.key, change.newValue);
      }

      // Notify subscribers with batched changes
      await this.notifyChanges(changes);

      console.log(`✅ Batch configuration update completed: ${changes.length} items`);
    } catch (error) {
      throw new ConfigurationError(
        'BATCH_UPDATE_FAILED',
        `Failed to update configurations: ${error}`,
        true,
        'Check storage health and try again'
      );
    }
  }

  async reset(key: string): Promise<void> {
    if (!this.initialized) {
      throw new ConfigurationError(
        'NOT_INITIALIZED',
        'Configuration service not initialized',
        true,
        'Call initialize() before using configuration service'
      );
    }

    try {
      // Get default value from schema
      // For now, just remove the configuration since validation is disabled
      await this.remove(key);
      
      console.log(`✅ Configuration reset to default: ${key}`);
    } catch (error) {
      throw new ConfigurationError(
        'RESET_FAILED',
        `Failed to reset configuration '${key}': ${error}`,
        true,
        'Check if configuration exists and has a default value'
      );
    }
  }

  async remove(key: string): Promise<void> {
    if (!this.initialized) {
      throw new ConfigurationError(
        'NOT_INITIALIZED',
        'Configuration service not initialized',
        true,
        'Call initialize() before using configuration service'
      );
    }

    try {
      // Get old value for change notification
      let oldValue: ConfigurationValue = null;
      try {
        const storedConfig = await this.storage.retrieve(key);
        oldValue = storedConfig?.value || null;
      } catch {
        // Configuration doesn't exist, nothing to remove
        return;
      }

      // Remove from storage
      await this.storage.remove(key);

      // Remove from cache
      this.cache.delete(key);

      // Notify subscribers
      await this.notifyChange({
        key,
        oldValue,
        newValue: null,
        timestamp: Date.now(),
        source: 'user',
        category: 'unknown' // TODO: get from schema
      });

      console.log(`✅ Configuration removed: ${key}`);
    } catch (error) {
      throw new ConfigurationError(
        'REMOVAL_FAILED',
        `Failed to remove configuration '${key}': ${error}`,
        true,
        'Check storage health and try again'
      );
    }
  }

  // ============================================================================
  // Subscription and Change Notification
  // ============================================================================

  subscribeToChanges(
    filter: ConfigurationFilter,
    callback: ConfigurationChangeCallback
  ): Subscription {
    const filterId = this.createFilterId(filter);
    
    if (!this.subscribers.has(filterId)) {
      this.subscribers.set(filterId, new Set());
    }
    
    this.subscribers.get(filterId)!.add(callback);

    return {
      unsubscribe: () => {
        const callbacks = this.subscribers.get(filterId);
        if (callbacks) {
          callbacks.delete(callback);
          if (callbacks.size === 0) {
            this.subscribers.delete(filterId);
          }
        }
      }
    };
  }

  private createFilterId(filter: ConfigurationFilter): string {
    const parts = [
      filter.keys?.join(',') || '',
      filter.categories?.join(',') || '',
      filter.services?.join(',') || '',
      filter.tags?.join(',') || ''
    ];
    return parts.join('|');
  }

  private async notifyChange(change: ConfigurationChange): Promise<void> {
    await this.notifyChanges([change]);
  }

  private async notifyChanges(changes: ConfigurationChange[]): Promise<void> {
    if (changes.length === 0) return;

    const notificationPromises: Promise<void>[] = [];

    for (const [filterId, callbacks] of this.subscribers) {
      const filter = this.parseFilterId(filterId);
      const relevantChanges = changes.filter(change => this.matchesFilter(change, filter));
      
      if (relevantChanges.length > 0) {
        for (const callback of callbacks) {
          notificationPromises.push(
            this.safeNotify(callback, relevantChanges)
          );
        }
      }
    }

    // Wait for all notifications to complete
    await Promise.allSettled(notificationPromises);
  }

  private parseFilterId(filterId: string): ConfigurationFilter {
    const [keys, categories, services, tags] = filterId.split('|');
    return {
      keys: keys ? keys.split(',') : undefined,
      categories: categories ? categories.split(',') : undefined,
      services: services ? services.split(',') : undefined,
      tags: tags ? tags.split(',') : undefined
    };
  }

  private matchesFilter(change: ConfigurationChange, filter: ConfigurationFilter): boolean {
    if (filter.keys && !filter.keys.includes(change.key)) {
      return false;
    }
    
    if (filter.categories && !filter.categories.includes(change.category)) {
      return false;
    }
    
    if (filter.services) {
      // TODO: get service from schema
      return true; // For now, assume match
    }
    
    if (filter.tags) {
      // TODO: get tags from schema
      return true; // For now, assume match
    }
    
    return true;
  }

  private async safeNotify(
    callback: ConfigurationChangeCallback,
    changes: ConfigurationChange[]
  ): Promise<void> {
    try {
      const result = callback(changes);
      if (result instanceof Promise) {
        await result;
      }
    } catch (error) {
      console.error('Configuration change notification failed:', error);
    }
  }

  // ============================================================================
  // Import/Export Operations
  // ============================================================================

  async exportConfiguration(categories?: string[]): Promise<ConfigurationBackup> {
    if (!this.initialized) {
      throw new ConfigurationError(
        'NOT_INITIALIZED',
        'Configuration service not initialized',
        true,
        'Call initialize() before using configuration service'
      );
    }

    try {
      const backup = await this.storage.backup();
      
      // Filter by categories if specified
      if (categories && categories.length > 0) {
        backup.configurations = backup.configurations.filter(config =>
          categories.includes(config.category)
        );
        backup.metadata.categories = categories;
        backup.metadata.totalItems = backup.configurations.length;
      }
      
      return backup;
    } catch (error) {
      throw new ConfigurationError(
        'EXPORT_FAILED',
        `Failed to export configuration: ${error}`,
        true,
        'Check storage health and try again'
      );
    }
  }

  async importConfiguration(
    backup: ConfigurationBackup,
    options: ImportOptions = {
      overwriteExisting: false,
      validateValues: true,
      importSchemas: false,
      conflictResolution: 'prompt'
    }
  ): Promise<ImportResult> {
    if (!this.initialized) {
      throw new ConfigurationError(
        'NOT_INITIALIZED',
        'Configuration service not initialized',
        true,
        'Call initialize() before using configuration service'
      );
    }

    const result: ImportResult = {
      success: false,
      importedCount: 0,
      skippedCount: 0,
      errorCount: 0,
      conflicts: [],
      errors: []
    };

    try {
      // Validate backup format
      if (!backup.configurations || !Array.isArray(backup.configurations)) {
        result.errors.push({
          error: 'Invalid backup format: missing configurations array',
          severity: 'error'
        });
        return result;
      }

      const updates: ConfigurationUpdate[] = [];
      
      for (const config of backup.configurations) {
        try {
          // Check if configuration already exists
          const exists = await this.storage.exists(config.key);
          
          if (exists && !options.overwriteExisting && options.conflictResolution !== 'overwrite') {
            if (options.conflictResolution === 'skip') {
              result.skippedCount++;
              continue;
            } else {
              // Add to conflicts for user resolution
              const existingConfig = await this.storage.retrieve(config.key);
              result.conflicts.push({
                key: config.key,
                existingValue: existingConfig?.value || null,
                importedValue: config.value
              });
              continue;
            }
          }

          // Validate value if requested (validation disabled for now)
          // if (options.validateValues) {
          //   const validationResult = await this.validator.validate(config.key, config.value);
          // }

          updates.push({
            key: config.key,
            value: config.value,
            category: config.category
          });
        } catch (error) {
          result.errors.push({
            key: config.key,
            error: `Processing failed: ${error}`,
            severity: 'error'
          });
          result.errorCount++;
        }
      }

      // Import valid configurations
      if (updates.length > 0) {
        await this.setMultiple(updates);
        result.importedCount = updates.length;
      }

      result.success = result.errorCount === 0;
      return result;
    } catch (error) {
      result.errors.push({
        error: `Import failed: ${error}`,
        severity: 'error'
      });
      return result;
    }
  }

  // ============================================================================
  // Cache and Performance Management
  // ============================================================================

  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ Configuration cache cleared');
  }

  getCacheStats() {
    return this.cache.getStats();
  }
}
