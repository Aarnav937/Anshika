/**
 * Memory Storage Repository Implementation
 * 
 * This module provides an in-memory storage implementation as the final
 * fallback when both IndexedDB and LocalStorage are unavailable.
 * Data is lost when the application is reloaded.
 */

import {
  StorageRepository,
  SearchQuery,
  IntegrityResult
} from './StorageRepository';

import {
  ConfigurationValue,
  StoredConfiguration,
  StorageItem,
  Metadata,
  ConfigurationBackup,
  StorageStats,
  MaintenanceOptions
} from '../core/ConfigurationTypes';

// ============================================================================
// Memory Storage Repository Implementation
// ============================================================================

export class MemoryStorageRepository implements StorageRepository {
  private storage = new Map<string, StoredConfiguration>();
  private categoryIndex = new Map<string, Set<string>>();
  private serviceIndex = new Map<string, Set<string>>();
  private initialized = false;
  private stats = {
    accessCount: 0,
    lastCleanup: new Date().toISOString()
  };

  // ============================================================================
  // Lifecycle Management
  // ============================================================================

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    console.log('🧠 Initializing MemoryStorageRepository (data will not persist)');
    this.initialized = true;
  }

  async shutdown(): Promise<void> {
    this.storage.clear();
    this.categoryIndex.clear();
    this.serviceIndex.clear();
    this.initialized = false;
  }

  async isHealthy(): Promise<boolean> {
    return this.initialized;
  }

  // ============================================================================
  // Basic CRUD Operations
  // ============================================================================

  async store(key: string, value: ConfigurationValue, metadata?: Metadata): Promise<void> {
    if (!this.initialized) throw new Error('Repository not initialized');

    const now = new Date().toISOString();
    const storedConfig: StoredConfiguration = {
      key,
      value,
      category: metadata?.category || 'general',
      serviceId: metadata?.serviceId || 'system',
      created: now,
      lastModified: now,
      accessed: now,
      isDefault: false,
      isEncrypted: false,
      version: metadata?.version || 1,
      tags: metadata?.tags,
      notes: metadata?.notes
    };

    // Store the configuration
    this.storage.set(key, storedConfig);

    // Update indexes
    this.updateIndexes(key, storedConfig);
  }

  async retrieve(key: string): Promise<StoredConfiguration | null> {
    if (!this.initialized) throw new Error('Repository not initialized');

    const config = this.storage.get(key);
    if (!config) return null;

    // Update access timestamp
    config.accessed = new Date().toISOString();
    this.stats.accessCount++;

    return { ...config }; // Return a copy to prevent external mutation
  }

  async remove(key: string): Promise<void> {
    if (!this.initialized) throw new Error('Repository not initialized');

    const config = this.storage.get(key);
    if (config) {
      // Remove from storage
      this.storage.delete(key);

      // Remove from indexes
      this.removeFromIndexes(key, config);
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.initialized) throw new Error('Repository not initialized');
    return this.storage.has(key);
  }

  // ============================================================================
  // Batch Operations
  // ============================================================================

  async storeBatch(items: StorageItem[]): Promise<void> {
    if (!this.initialized) throw new Error('Repository not initialized');

    for (const item of items) {
      await this.store(item.key, item.value, item.metadata);
    }
  }

  async retrieveBatch(keys: string[]): Promise<(StoredConfiguration | null)[]> {
    if (!this.initialized) throw new Error('Repository not initialized');

    const results: (StoredConfiguration | null)[] = [];

    for (const key of keys) {
      const config = await this.retrieve(key);
      results.push(config);
    }

    return results;
  }

  async retrieveCategory(category: string): Promise<StoredConfiguration[]> {
    if (!this.initialized) throw new Error('Repository not initialized');

    const categoryKeys = this.categoryIndex.get(category);
    if (!categoryKeys) return [];

    const configs: StoredConfiguration[] = [];
    for (const key of categoryKeys) {
      const config = await this.retrieve(key);
      if (config) {
        configs.push(config);
      }
    }

    return configs;
  }

  async retrieveAll(): Promise<StoredConfiguration[]> {
    if (!this.initialized) throw new Error('Repository not initialized');

    const configs: StoredConfiguration[] = [];

    for (const [_key, config] of this.storage) {
      // Update access timestamp
      config.accessed = new Date().toISOString();
      configs.push({ ...config }); // Return copies
    }

    this.stats.accessCount += configs.length;
    return configs;
  }

  // ============================================================================
  // Advanced Operations
  // ============================================================================

  async search(query: SearchQuery): Promise<StoredConfiguration[]> {
    if (!this.initialized) throw new Error('Repository not initialized');

    let configs = await this.retrieveAll();

    // Apply filters
    if (query.categories && query.categories.length > 0) {
      configs = configs.filter(config => query.categories!.includes(config.category));
    }

    if (query.services && query.services.length > 0) {
      configs = configs.filter(config => query.services!.includes(config.serviceId));
    }

    if (query.tags && query.tags.length > 0) {
      configs = configs.filter(config => 
        config.tags && query.tags!.some(tag => config.tags!.includes(tag))
      );
    }

    // Text search
    if (query.text) {
      const searchText = query.text.toLowerCase();
      configs = configs.filter(config => 
        config.key.toLowerCase().includes(searchText) ||
        (config.notes && config.notes.toLowerCase().includes(searchText)) ||
        (config.tags && config.tags.some(tag => tag.toLowerCase().includes(searchText)))
      );
    }

    // Date filters
    if (query.modifiedAfter) {
      configs = configs.filter(config => 
        new Date(config.lastModified) >= query.modifiedAfter!
      );
    }

    if (query.modifiedBefore) {
      configs = configs.filter(config => 
        new Date(config.lastModified) <= query.modifiedBefore!
      );
    }

    // Apply limit and offset
    if (query.offset) {
      configs = configs.slice(query.offset);
    }

    if (query.limit) {
      configs = configs.slice(0, query.limit);
    }

    return configs;
  }

  async backup(): Promise<ConfigurationBackup> {
    if (!this.initialized) throw new Error('Repository not initialized');

    const configurations = await this.retrieveAll();
    
    // Get unique categories and services
    const categories = [...new Set(configurations.map(c => c.category))];
    const services = [...new Set(configurations.map(c => c.serviceId))];

    return {
      version: '1.0',
      timestamp: new Date().toISOString(),
      configurations,
      schemas: [],
      metadata: {
        source: 'Memory',
        totalItems: configurations.length,
        categories,
        services
      }
    };
  }

  async restore(backup: ConfigurationBackup): Promise<void> {
    if (!this.initialized) throw new Error('Repository not initialized');

    if (!backup.configurations || !Array.isArray(backup.configurations)) {
      throw new Error('Invalid backup format: missing configurations array');
    }

    // Clear existing data
    this.storage.clear();
    this.categoryIndex.clear();
    this.serviceIndex.clear();

    // Restore configurations
    const storageItems: StorageItem[] = backup.configurations.map(config => ({
      key: config.key,
      value: config.value,
      metadata: {
        category: config.category,
        serviceId: config.serviceId,
        tags: config.tags,
        notes: config.notes,
        version: config.version
      }
    }));

    await this.storeBatch(storageItems);
  }

  // ============================================================================
  // Maintenance Operations
  // ============================================================================

  async cleanup(_options?: MaintenanceOptions): Promise<void> {
    if (!this.initialized) throw new Error('Repository not initialized');

    // For memory storage, cleanup is mostly about updating stats
    this.stats.lastCleanup = new Date().toISOString();

    // Optionally, we could implement memory optimization here:
    // - Remove old access timestamps
    // - Compact data structures
    // - Clear unused indexes

    console.log(`🧹 Memory storage cleanup completed`);
  }

  async getStats(): Promise<StorageStats> {
    if (!this.initialized) throw new Error('Repository not initialized');

    // Calculate approximate memory usage
    let totalSize = 0;
    for (const [key, config] of this.storage) {
      // Rough estimation: JSON string length * 2 bytes (UTF-16)
      totalSize += (key.length + JSON.stringify(config).length) * 2;
    }

    // Add index overhead
    totalSize += Array.from(this.categoryIndex.keys()).join('').length * 2;
    totalSize += Array.from(this.serviceIndex.keys()).join('').length * 2;

    const averageAccessTime = this.storage.size > 0 ? 0.001 : 0; // Memory access is very fast

    return {
      totalSize,
      itemCount: this.storage.size,
      cacheHitRate: 100, // Memory is always a "cache hit"
      lastCleanup: this.stats.lastCleanup,
      quotaUsed: 0, // Not applicable to memory storage
      averageAccessTime
    };
  }

  async validateIntegrity(): Promise<IntegrityResult> {
    if (!this.initialized) throw new Error('Repository not initialized');

    const errors: string[] = [];
    const corruptedKeys: string[] = [];

    // Validate each stored configuration
    for (const [key, config] of this.storage) {
      if (!config.key || config.key !== key) {
        corruptedKeys.push(key);
        errors.push(`Configuration key mismatch: stored as ${key} but config.key is ${config.key}`);
        continue;
      }

      if (!config.category || typeof config.category !== 'string') {
        corruptedKeys.push(key);
        errors.push(`Invalid category for configuration: ${key}`);
        continue;
      }

      if (!config.serviceId || typeof config.serviceId !== 'string') {
        corruptedKeys.push(key);
        errors.push(`Invalid serviceId for configuration: ${key}`);
        continue;
      }

      // Validate timestamps
      try {
        new Date(config.created);
        new Date(config.lastModified);
        new Date(config.accessed);
      } catch {
        corruptedKeys.push(key);
        errors.push(`Invalid timestamps for configuration: ${key}`);
        continue;
      }
    }

    // Validate index consistency
    for (const [category, keys] of this.categoryIndex) {
      for (const key of keys) {
        const config = this.storage.get(key);
        if (!config) {
          errors.push(`Category index references non-existent key: ${key} in category ${category}`);
        } else if (config.category !== category) {
          errors.push(`Category index mismatch: ${key} indexed under ${category} but config has category ${config.category}`);
        }
      }
    }

    for (const [serviceId, keys] of this.serviceIndex) {
      for (const key of keys) {
        const config = this.storage.get(key);
        if (!config) {
          errors.push(`Service index references non-existent key: ${key} in service ${serviceId}`);
        } else if (config.serviceId !== serviceId) {
          errors.push(`Service index mismatch: ${key} indexed under ${serviceId} but config has serviceId ${config.serviceId}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      corruptedKeys,
      missingKeys: [], // Not applicable for memory storage
      errors
    };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private updateIndexes(key: string, config: StoredConfiguration): void {
    // Update category index
    if (!this.categoryIndex.has(config.category)) {
      this.categoryIndex.set(config.category, new Set());
    }
    this.categoryIndex.get(config.category)!.add(key);

    // Update service index
    if (!this.serviceIndex.has(config.serviceId)) {
      this.serviceIndex.set(config.serviceId, new Set());
    }
    this.serviceIndex.get(config.serviceId)!.add(key);
  }

  private removeFromIndexes(key: string, config: StoredConfiguration): void {
    // Remove from category index
    const categoryKeys = this.categoryIndex.get(config.category);
    if (categoryKeys) {
      categoryKeys.delete(key);
      if (categoryKeys.size === 0) {
        this.categoryIndex.delete(config.category);
      }
    }

    // Remove from service index
    const serviceKeys = this.serviceIndex.get(config.serviceId);
    if (serviceKeys) {
      serviceKeys.delete(key);
      if (serviceKeys.size === 0) {
        this.serviceIndex.delete(config.serviceId);
      }
    }
  }

  // ============================================================================
  // Debug and Development Methods
  // ============================================================================

  /**
   * Debug method to inspect the current state of the memory storage
   */
  getDebugInfo(): {
    storageSize: number;
    categoryIndexSize: number;
    serviceIndexSize: number;
    categories: string[];
    services: string[];
    totalAccesses: number;
  } {
    return {
      storageSize: this.storage.size,
      categoryIndexSize: this.categoryIndex.size,
      serviceIndexSize: this.serviceIndex.size,
      categories: Array.from(this.categoryIndex.keys()),
      services: Array.from(this.serviceIndex.keys()),
      totalAccesses: this.stats.accessCount
    };
  }

  /**
   * Debug method to clear all data (useful for testing)
   */
  clearAll(): void {
    this.storage.clear();
    this.categoryIndex.clear();
    this.serviceIndex.clear();
    this.stats.accessCount = 0;
  }
}