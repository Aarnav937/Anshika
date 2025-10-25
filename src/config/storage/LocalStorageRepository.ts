/**
 * LocalStorage Repository Implementation
 * 
 * This module provides a LocalStorage-based fallback storage implementation
 * for configuration data when IndexedDB is unavailable or fails.
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
// LocalStorage Keys and Constants
// ============================================================================

const STORAGE_PREFIX = 'anshika_config_';
const METADATA_KEY = `${STORAGE_PREFIX}metadata`;
const INDEX_KEY = `${STORAGE_PREFIX}index`;

interface StorageIndex {
  keys: string[];
  categories: Record<string, string[]>;
  services: Record<string, string[]>;
  lastUpdate: string;
}

// ============================================================================
// LocalStorage Repository Implementation
// ============================================================================

export class LocalStorageRepository implements StorageRepository {
  private initialized = false;
  private storageIndex: StorageIndex = {
    keys: [],
    categories: {},
    services: {},
    lastUpdate: new Date().toISOString()
  };

  // ============================================================================
  // Lifecycle Management
  // ============================================================================

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Check localStorage availability
    if (!this.isLocalStorageAvailable()) {
      throw new Error('LocalStorage is not available');
    }

    // Load existing index or create new one
    await this.loadIndex();
    this.initialized = true;
  }

  async shutdown(): Promise<void> {
    if (this.initialized) {
      await this.saveIndex();
    }
    this.initialized = false;
  }

  async isHealthy(): Promise<boolean> {
    try {
      const testKey = `${STORAGE_PREFIX}health_check`;
      const testValue = Date.now().toString();
      
      localStorage.setItem(testKey, testValue);
      const retrieved = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      
      return retrieved === testValue;
    } catch {
      return false;
    }
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

    try {
      const storageKey = this.getStorageKey(key);
      const serializedConfig = JSON.stringify(storedConfig);
      
      localStorage.setItem(storageKey, serializedConfig);
      await this.updateIndex(key, storedConfig);
    } catch (error) {
      if (this.isQuotaExceeded(error)) {
        throw new Error('LocalStorage quota exceeded. Please clear some space or use fewer configurations.');
      }
      throw new Error(`Failed to store configuration: ${error}`);
    }
  }

  async retrieve(key: string): Promise<StoredConfiguration | null> {
    if (!this.initialized) throw new Error('Repository not initialized');

    try {
      const storageKey = this.getStorageKey(key);
      const serializedConfig = localStorage.getItem(storageKey);
      
      if (!serializedConfig) return null;

      const config: StoredConfiguration = JSON.parse(serializedConfig);
      
      // Update access timestamp
      config.accessed = new Date().toISOString();
      localStorage.setItem(storageKey, JSON.stringify(config));
      
      return config;
    } catch (error) {
      console.error(`Failed to retrieve configuration ${key}:`, error);
      return null;
    }
  }

  async remove(key: string): Promise<void> {
    if (!this.initialized) throw new Error('Repository not initialized');

    const storageKey = this.getStorageKey(key);
    localStorage.removeItem(storageKey);
    await this.removeFromIndex(key);
  }

  async exists(key: string): Promise<boolean> {
    if (!this.initialized) throw new Error('Repository not initialized');

    const storageKey = this.getStorageKey(key);
    return localStorage.getItem(storageKey) !== null;
  }

  // ============================================================================
  // Batch Operations
  // ============================================================================

  async storeBatch(items: StorageItem[]): Promise<void> {
    if (!this.initialized) throw new Error('Repository not initialized');
    if (items.length === 0) return;

    const errors: Error[] = [];

    for (const item of items) {
      try {
        await this.store(item.key, item.value, item.metadata);
      } catch (error) {
        errors.push(new Error(`Failed to store ${item.key}: ${error}`));
      }
    }

    if (errors.length === items.length) {
      throw new Error(`All batch operations failed: ${errors[0].message}`);
    } else if (errors.length > 0) {
      console.warn(`${errors.length} out of ${items.length} batch operations failed:`, errors);
    }
  }

  async retrieveBatch(keys: string[]): Promise<(StoredConfiguration | null)[]> {
    if (!this.initialized) throw new Error('Repository not initialized');
    
    const results: (StoredConfiguration | null)[] = [];
    
    for (const key of keys) {
      try {
        const config = await this.retrieve(key);
        results.push(config);
      } catch (error) {
        console.error(`Failed to retrieve ${key} in batch:`, error);
        results.push(null);
      }
    }

    return results;
  }

  async retrieveCategory(category: string): Promise<StoredConfiguration[]> {
    if (!this.initialized) throw new Error('Repository not initialized');

    const categoryKeys = this.storageIndex.categories[category] || [];
    const configs: StoredConfiguration[] = [];

    for (const key of categoryKeys) {
      try {
        const config = await this.retrieve(key);
        if (config) {
          configs.push(config);
        }
      } catch (error) {
        console.error(`Failed to retrieve ${key} from category ${category}:`, error);
      }
    }

    return configs;
  }

  async retrieveAll(): Promise<StoredConfiguration[]> {
    if (!this.initialized) throw new Error('Repository not initialized');

    const configs: StoredConfiguration[] = [];

    for (const key of this.storageIndex.keys) {
      try {
        const config = await this.retrieve(key);
        if (config) {
          configs.push(config);
        }
      } catch (error) {
        console.error(`Failed to retrieve ${key} in retrieveAll:`, error);
      }
    }

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
        source: 'LocalStorage',
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

    // Clean up orphaned entries (keys in localStorage but not in index)
    const orphanedKeys: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX) && 
          key !== INDEX_KEY && key !== METADATA_KEY) {
        
        const configKey = this.extractConfigKey(key);
        if (configKey && !this.storageIndex.keys.includes(configKey)) {
          orphanedKeys.push(key);
        }
      }
    }

    // Remove orphaned entries
    for (const orphanedKey of orphanedKeys) {
      localStorage.removeItem(orphanedKey);
    }

    // Update cleanup metadata
    const metadata = {
      lastCleanup: new Date().toISOString(),
      orphanedRemoved: orphanedKeys.length
    };
    
    localStorage.setItem(METADATA_KEY, JSON.stringify(metadata));
    
    console.log(`🧹 LocalStorage cleanup completed: removed ${orphanedKeys.length} orphaned entries`);
  }

  async getStats(): Promise<StorageStats> {
    if (!this.initialized) throw new Error('Repository not initialized');

    const configurations = await this.retrieveAll();
    
    // Calculate approximate storage size
    let totalSize = 0;
    for (const config of configurations) {
      totalSize += JSON.stringify(config).length * 2; // Approximate UTF-16 bytes
    }

    // Add index and metadata size
    totalSize += JSON.stringify(this.storageIndex).length * 2;
    
    const metadata = this.getCleanupMetadata();
    
    return {
      totalSize,
      itemCount: configurations.length,
      cacheHitRate: 0, // Not applicable for LocalStorage
      lastCleanup: metadata.lastCleanup || new Date().toISOString(),
      quotaUsed: this.calculateQuotaUsage(),
      averageAccessTime: 0 // Would need performance monitoring
    };
  }

  async validateIntegrity(): Promise<IntegrityResult> {
    if (!this.initialized) throw new Error('Repository not initialized');

    const errors: string[] = [];
    const corruptedKeys: string[] = [];
    const missingKeys: string[] = [];

    // Check index consistency
    for (const indexedKey of this.storageIndex.keys) {
      const storageKey = this.getStorageKey(indexedKey);
      const item = localStorage.getItem(storageKey);
      
      if (!item) {
        missingKeys.push(indexedKey);
        errors.push(`Configuration ${indexedKey} exists in index but not in storage`);
        continue;
      }

      try {
        const config = JSON.parse(item) as StoredConfiguration;
        
        // Basic validation
        if (!config.key || !config.category || !config.serviceId) {
          corruptedKeys.push(indexedKey);
          errors.push(`Configuration ${indexedKey} has missing required fields`);
        }
      } catch (parseError) {
        corruptedKeys.push(indexedKey);
        errors.push(`Configuration ${indexedKey} has invalid JSON: ${parseError}`);
      }
    }

    return {
      valid: errors.length === 0,
      corruptedKeys,
      missingKeys,
      errors
    };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private isLocalStorageAvailable(): boolean {
    try {
      const testKey = '__localStorage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  private isQuotaExceeded(error: any): boolean {
    return error instanceof DOMException && (
      error.code === 22 || // QUOTA_EXCEEDED_ERR
      error.code === 1014 || // NS_ERROR_DOM_QUOTA_REACHED
      error.name === 'QuotaExceededError'
    );
  }

  private getStorageKey(configKey: string): string {
    return `${STORAGE_PREFIX}${configKey}`;
  }

  private extractConfigKey(storageKey: string): string | null {
    if (!storageKey.startsWith(STORAGE_PREFIX)) return null;
    return storageKey.substring(STORAGE_PREFIX.length);
  }

  private async loadIndex(): Promise<void> {
    try {
      const indexData = localStorage.getItem(INDEX_KEY);
      if (indexData) {
        this.storageIndex = JSON.parse(indexData);
      } else {
        // Build index from existing data
        await this.rebuildIndex();
      }
    } catch (error) {
      console.warn('Failed to load storage index, rebuilding:', error);
      await this.rebuildIndex();
    }
  }

  private async saveIndex(): Promise<void> {
    try {
      this.storageIndex.lastUpdate = new Date().toISOString();
      localStorage.setItem(INDEX_KEY, JSON.stringify(this.storageIndex));
    } catch (error) {
      console.error('Failed to save storage index:', error);
    }
  }

  private async rebuildIndex(): Promise<void> {
    this.storageIndex = {
      keys: [],
      categories: {},
      services: {},
      lastUpdate: new Date().toISOString()
    };

    // Scan localStorage for existing configurations
    for (let i = 0; i < localStorage.length; i++) {
      const storageKey = localStorage.key(i);
      if (!storageKey || !storageKey.startsWith(STORAGE_PREFIX) || 
          storageKey === INDEX_KEY || storageKey === METADATA_KEY) {
        continue;
      }

      try {
        const configKey = this.extractConfigKey(storageKey);
        if (!configKey) continue;

        const configData = localStorage.getItem(storageKey);
        if (!configData) continue;

        const config: StoredConfiguration = JSON.parse(configData);
        this.addToIndex(configKey, config);
      } catch (error) {
        console.error(`Failed to process ${storageKey} during index rebuild:`, error);
      }
    }

    await this.saveIndex();
    console.log(`📋 Rebuilt LocalStorage index with ${this.storageIndex.keys.length} configurations`);
  }

  private async updateIndex(key: string, config: StoredConfiguration): Promise<void> {
    // Add key to keys array if not present
    if (!this.storageIndex.keys.includes(key)) {
      this.storageIndex.keys.push(key);
    }

    this.addToIndex(key, config);
    await this.saveIndex();
  }

  private addToIndex(key: string, config: StoredConfiguration): void {
    // Update category index
    if (!this.storageIndex.categories[config.category]) {
      this.storageIndex.categories[config.category] = [];
    }
    if (!this.storageIndex.categories[config.category].includes(key)) {
      this.storageIndex.categories[config.category].push(key);
    }

    // Update service index
    if (!this.storageIndex.services[config.serviceId]) {
      this.storageIndex.services[config.serviceId] = [];
    }
    if (!this.storageIndex.services[config.serviceId].includes(key)) {
      this.storageIndex.services[config.serviceId].push(key);
    }
  }

  private async removeFromIndex(key: string): Promise<void> {
    // Remove from keys array
    this.storageIndex.keys = this.storageIndex.keys.filter(k => k !== key);

    // Remove from category indexes
    for (const category in this.storageIndex.categories) {
      this.storageIndex.categories[category] = 
        this.storageIndex.categories[category].filter(k => k !== key);
      
      // Clean up empty category arrays
      if (this.storageIndex.categories[category].length === 0) {
        delete this.storageIndex.categories[category];
      }
    }

    // Remove from service indexes
    for (const service in this.storageIndex.services) {
      this.storageIndex.services[service] = 
        this.storageIndex.services[service].filter(k => k !== key);
      
      // Clean up empty service arrays
      if (this.storageIndex.services[service].length === 0) {
        delete this.storageIndex.services[service];
      }
    }

    await this.saveIndex();
  }

  private getCleanupMetadata(): { lastCleanup?: string; orphanedRemoved?: number } {
    try {
      const metadataStr = localStorage.getItem(METADATA_KEY);
      return metadataStr ? JSON.parse(metadataStr) : {};
    } catch {
      return {};
    }
  }

  private calculateQuotaUsage(): number {
    try {
      // Rough estimation of quota usage
      // This is approximate since we can't directly query LocalStorage quota
      let usedSize = 0;
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          if (value) {
            usedSize += (key.length + value.length) * 2; // UTF-16 bytes
          }
        }
      }

      // Assume 10MB LocalStorage limit (common browser limit)
      const assumedLimit = 10 * 1024 * 1024;
      return (usedSize / assumedLimit) * 100;
    } catch {
      return 0;
    }
  }
}