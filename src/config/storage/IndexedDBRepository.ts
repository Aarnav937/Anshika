/**
 * IndexedDB Repository Implementation
 * 
 * This module provides the primary storage implementation using IndexedDB
 * for persistent, high-performance configuration storage with indexing
 * and transaction support.
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
// IndexedDB Database Schema
// ============================================================================

const DB_NAME = 'ANSHIKA_Configuration';
const DB_VERSION = 1;

const OBJECT_STORES = {
  CONFIGURATIONS: 'configurations',
  SCHEMAS: 'schemas',
  HISTORY: 'history',
  METADATA: 'metadata'
} as const;

// IndexedDB schema definitions are handled inline in database operations

// ============================================================================
// IndexedDB Repository Implementation
// ============================================================================

export class IndexedDBRepository implements StorageRepository {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  // ============================================================================
  // Lifecycle Management
  // ============================================================================

  async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._initialize();
    return this.initPromise;
  }

  private async _initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error(`Failed to open IndexedDB: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        
        // Handle unexpected database closure
        this.db.onversionchange = () => {
          this.db?.close();
          console.warn('🔄 Database version changed, closing connection');
        };

        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        try {
          this._createObjectStores(db);
        } catch (error) {
          reject(new Error(`Failed to create object stores: ${error}`));
        }
      };
    });
  }

  private _createObjectStores(db: IDBDatabase): void {
    // Create configurations store
    if (!db.objectStoreNames.contains(OBJECT_STORES.CONFIGURATIONS)) {
      const configStore = db.createObjectStore(OBJECT_STORES.CONFIGURATIONS, {
        keyPath: 'key'
      });
      
      // Create indexes for efficient querying
      configStore.createIndex('category', 'category', { unique: false });
      configStore.createIndex('serviceId', 'serviceId', { unique: false });
      configStore.createIndex('lastModified', 'lastModified', { unique: false });
      configStore.createIndex('tags', 'tags', { unique: false, multiEntry: true });
      configStore.createIndex('created', 'created', { unique: false });
    }

    // Create schemas store (for future use)
    if (!db.objectStoreNames.contains(OBJECT_STORES.SCHEMAS)) {
      const schemaStore = db.createObjectStore(OBJECT_STORES.SCHEMAS, {
        keyPath: 'key'
      });
      
      schemaStore.createIndex('category', 'category', { unique: false });
      schemaStore.createIndex('serviceId', 'serviceId', { unique: false });
    }

    // Create history store (for future use)
    if (!db.objectStoreNames.contains(OBJECT_STORES.HISTORY)) {
      const historyStore = db.createObjectStore(OBJECT_STORES.HISTORY, {
        keyPath: 'id',
        autoIncrement: true
      });
      
      historyStore.createIndex('configurationKey', 'configurationKey', { unique: false });
      historyStore.createIndex('timestamp', 'timestamp', { unique: false });
      historyStore.createIndex('userId', 'userId', { unique: false });
    }

    // Create metadata store
    if (!db.objectStoreNames.contains(OBJECT_STORES.METADATA)) {
      db.createObjectStore(OBJECT_STORES.METADATA, {
        keyPath: 'key'
      });
    }
  }

  async shutdown(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.initPromise = null;
  }

  async isHealthy(): Promise<boolean> {
    if (!this.db) return false;
    
    try {
      // Test basic database operations
      const transaction = this.db.transaction([OBJECT_STORES.CONFIGURATIONS], 'readonly');
      const store = transaction.objectStore(OBJECT_STORES.CONFIGURATIONS);
      
      return new Promise((resolve) => {
        const request = store.count();
        request.onsuccess = () => resolve(true);
        request.onerror = () => resolve(false);
      });
    } catch {
      return false;
    }
  }

  // ============================================================================
  // Basic CRUD Operations
  // ============================================================================

  async store(key: string, value: ConfigurationValue, metadata?: Metadata): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

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

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([OBJECT_STORES.CONFIGURATIONS], 'readwrite');
      const store = transaction.objectStore(OBJECT_STORES.CONFIGURATIONS);
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error(`Store operation failed: ${transaction.error?.message}`));
      
      const request = store.put(storedConfig);
      request.onerror = () => reject(new Error(`Put operation failed: ${request.error?.message}`));
    });
  }

  async retrieve(key: string): Promise<StoredConfiguration | null> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([OBJECT_STORES.CONFIGURATIONS], 'readonly');
      const store = transaction.objectStore(OBJECT_STORES.CONFIGURATIONS);
      
      const request = store.get(key);
      
      request.onsuccess = () => {
        const result = request.result as StoredConfiguration | undefined;
        
        // Update access timestamp if item exists
        if (result) {
          result.accessed = new Date().toISOString();
          
          // Update the record with new access timestamp
          const updateTransaction = this.db!.transaction([OBJECT_STORES.CONFIGURATIONS], 'readwrite');
          const updateStore = updateTransaction.objectStore(OBJECT_STORES.CONFIGURATIONS);
          updateStore.put(result);
        }
        
        resolve(result || null);
      };
      
      request.onerror = () => reject(new Error(`Retrieve operation failed: ${request.error?.message}`));
    });
  }

  async remove(key: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([OBJECT_STORES.CONFIGURATIONS], 'readwrite');
      const store = transaction.objectStore(OBJECT_STORES.CONFIGURATIONS);
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error(`Remove operation failed: ${transaction.error?.message}`));
      
      const request = store.delete(key);
      request.onerror = () => reject(new Error(`Delete operation failed: ${request.error?.message}`));
    });
  }

  async exists(key: string): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([OBJECT_STORES.CONFIGURATIONS], 'readonly');
      const store = transaction.objectStore(OBJECT_STORES.CONFIGURATIONS);
      
      const request = store.count(key);
      
      request.onsuccess = () => resolve(request.result > 0);
      request.onerror = () => reject(new Error(`Exists check failed: ${request.error?.message}`));
    });
  }

  // ============================================================================
  // Batch Operations
  // ============================================================================

  async storeBatch(items: StorageItem[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    if (items.length === 0) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([OBJECT_STORES.CONFIGURATIONS], 'readwrite');
      const store = transaction.objectStore(OBJECT_STORES.CONFIGURATIONS);
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error(`Batch store failed: ${transaction.error?.message}`));
      
      const now = new Date().toISOString();
      
      for (const item of items) {
        const storedConfig: StoredConfiguration = {
          key: item.key,
          value: item.value,
          category: item.metadata?.category || 'general',
          serviceId: item.metadata?.serviceId || 'system',
          created: now,
          lastModified: now,
          accessed: now,
          isDefault: false,
          isEncrypted: false,
          version: item.metadata?.version || 1,
          tags: item.metadata?.tags,
          notes: item.metadata?.notes
        };
        
        const request = store.put(storedConfig);
        request.onerror = () => reject(new Error(`Batch item store failed for key ${item.key}: ${request.error?.message}`));
      }
    });
  }

  async retrieveBatch(keys: string[]): Promise<(StoredConfiguration | null)[]> {
    if (!this.db) throw new Error('Database not initialized');
    if (keys.length === 0) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([OBJECT_STORES.CONFIGURATIONS], 'readonly');
      const store = transaction.objectStore(OBJECT_STORES.CONFIGURATIONS);
      
      const results: (StoredConfiguration | null)[] = new Array(keys.length);
      let completed = 0;
      
      keys.forEach((key, index) => {
        const request = store.get(key);
        
        request.onsuccess = () => {
          results[index] = request.result || null;
          completed++;
          
          if (completed === keys.length) {
            resolve(results);
          }
        };
        
        request.onerror = () => {
          reject(new Error(`Batch retrieve failed for key ${key}: ${request.error?.message}`));
        };
      });
    });
  }

  async retrieveCategory(category: string): Promise<StoredConfiguration[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([OBJECT_STORES.CONFIGURATIONS], 'readonly');
      const store = transaction.objectStore(OBJECT_STORES.CONFIGURATIONS);
      const index = store.index('category');
      
      const request = index.getAll(category);
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(new Error(`Category retrieve failed: ${request.error?.message}`));
    });
  }

  async retrieveAll(): Promise<StoredConfiguration[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([OBJECT_STORES.CONFIGURATIONS], 'readonly');
      const store = transaction.objectStore(OBJECT_STORES.CONFIGURATIONS);
      
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(new Error(`Retrieve all failed: ${request.error?.message}`));
    });
  }

  // ============================================================================
  // Advanced Operations
  // ============================================================================

  async search(query: SearchQuery): Promise<StoredConfiguration[]> {
    if (!this.db) throw new Error('Database not initialized');

    const allConfigs = await this.retrieveAll();
    let results = allConfigs;

    // Apply filters
    if (query.categories && query.categories.length > 0) {
      results = results.filter(config => query.categories!.includes(config.category));
    }

    if (query.services && query.services.length > 0) {
      results = results.filter(config => query.services!.includes(config.serviceId));
    }

    if (query.tags && query.tags.length > 0) {
      results = results.filter(config => 
        config.tags && query.tags!.some(tag => config.tags!.includes(tag))
      );
    }

    // Text search
    if (query.text) {
      const searchText = query.text.toLowerCase();
      results = results.filter(config => 
        config.key.toLowerCase().includes(searchText) ||
        (config.notes && config.notes.toLowerCase().includes(searchText)) ||
        (config.tags && config.tags.some(tag => tag.toLowerCase().includes(searchText)))
      );
    }

    // Date filters
    if (query.modifiedAfter) {
      results = results.filter(config => 
        new Date(config.lastModified) >= query.modifiedAfter!
      );
    }

    if (query.modifiedBefore) {
      results = results.filter(config => 
        new Date(config.lastModified) <= query.modifiedBefore!
      );
    }

    // Apply limit and offset
    if (query.offset) {
      results = results.slice(query.offset);
    }

    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  async backup(): Promise<ConfigurationBackup> {
    if (!this.db) throw new Error('Database not initialized');

    const configurations = await this.retrieveAll();
    
    // Get unique categories and services
    const categories = [...new Set(configurations.map(c => c.category))];
    const services = [...new Set(configurations.map(c => c.serviceId))];

    return {
      version: '1.0',
      timestamp: new Date().toISOString(),
      configurations,
      schemas: [], // Will be implemented when schema system is ready
      metadata: {
        source: 'IndexedDB',
        totalItems: configurations.length,
        categories,
        services
      }
    };
  }

  async restore(backup: ConfigurationBackup): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Validate backup format
    if (!backup.configurations || !Array.isArray(backup.configurations)) {
      throw new Error('Invalid backup format: missing configurations array');
    }

    // Store all configurations from backup
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
    if (!this.db) throw new Error('Database not initialized');

    // For now, just update the last cleanup timestamp
    // Future implementations can add:
    // - Remove old history entries
    // - Compact storage
    // - Remove orphaned records
    
    const metadata = {
      key: 'last_cleanup',
      value: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([OBJECT_STORES.METADATA], 'readwrite');
      const store = transaction.objectStore(OBJECT_STORES.METADATA);
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error(`Cleanup failed: ${transaction.error?.message}`));
      
      store.put(metadata);
    });
  }

  async getStats(): Promise<StorageStats> {
    if (!this.db) throw new Error('Database not initialized');

    const configurations = await this.retrieveAll();
    
    // Calculate storage size (approximate)
    const totalSize = configurations.reduce((size, config) => {
      const configSize = JSON.stringify(config).length * 2; // Approximate bytes (UTF-16)
      return size + configSize;
    }, 0);

    // Get last cleanup time
    let lastCleanup = new Date().toISOString();
    try {
      const cleanupRecord = await this.getMetadata('last_cleanup');
      if (cleanupRecord) {
        lastCleanup = cleanupRecord as string;
      }
    } catch {
      // Use current time if no cleanup record exists
    }

    return {
      totalSize,
      itemCount: configurations.length,
      cacheHitRate: 0, // Not applicable for IndexedDB
      lastCleanup,
      quotaUsed: 0, // Would need to query storage API
      averageAccessTime: 0 // Would need performance monitoring
    };
  }

  async validateIntegrity(): Promise<IntegrityResult> {
    if (!this.db) throw new Error('Database not initialized');

    const errors: string[] = [];
    const corruptedKeys: string[] = [];
    
    try {
      const configurations = await this.retrieveAll();
      
      // Check each configuration for basic integrity
      for (const config of configurations) {
        if (!config.key || typeof config.key !== 'string') {
          corruptedKeys.push(config.key || 'unknown');
          errors.push(`Invalid key for configuration: ${config.key}`);
          continue;
        }

        if (!config.category || typeof config.category !== 'string') {
          corruptedKeys.push(config.key);
          errors.push(`Invalid category for configuration: ${config.key}`);
          continue;
        }

        if (!config.serviceId || typeof config.serviceId !== 'string') {
          corruptedKeys.push(config.key);
          errors.push(`Invalid serviceId for configuration: ${config.key}`);
          continue;
        }

        // Check timestamp validity
        if (!config.created || !config.lastModified) {
          corruptedKeys.push(config.key);
          errors.push(`Missing timestamps for configuration: ${config.key}`);
          continue;
        }

        try {
          new Date(config.created);
          new Date(config.lastModified);
        } catch {
          corruptedKeys.push(config.key);
          errors.push(`Invalid timestamps for configuration: ${config.key}`);
          continue;
        }
      }
      
      return {
        valid: errors.length === 0,
        corruptedKeys,
        missingKeys: [], // Not applicable for this check
        errors
      };
    } catch (error) {
      return {
        valid: false,
        corruptedKeys: [],
        missingKeys: [],
        errors: [`Integrity validation failed: ${error}`]
      };
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async getMetadata(key: string): Promise<unknown> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([OBJECT_STORES.METADATA], 'readonly');
      const store = transaction.objectStore(OBJECT_STORES.METADATA);
      
      const request = store.get(key);
      
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.value : null);
      };
      
      request.onerror = () => reject(new Error(`Metadata retrieval failed: ${request.error?.message}`));
    });
  }
}