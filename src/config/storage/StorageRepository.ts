/**
 * Storage Repository Interface and Abstraction Layer
 * 
 * This module provides an abstract interface for configuration storage,
 * enabling multiple storage backends (IndexedDB, LocalStorage) with
 * automatic fallback capabilities.
 */

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
// Storage Repository Interface
// ============================================================================

export interface StorageRepository {
  // Lifecycle
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  isHealthy(): Promise<boolean>;
  
  // Basic CRUD operations
  store(key: string, value: ConfigurationValue, metadata?: Metadata): Promise<void>;
  retrieve(key: string): Promise<StoredConfiguration | null>;
  remove(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  
  // Batch operations for performance
  storeBatch(items: StorageItem[]): Promise<void>;
  retrieveBatch(keys: string[]): Promise<(StoredConfiguration | null)[]>;
  retrieveCategory(category: string): Promise<StoredConfiguration[]>;
  retrieveAll(): Promise<StoredConfiguration[]>;
  
  // Advanced operations
  search(query: SearchQuery): Promise<StoredConfiguration[]>;
  backup(): Promise<ConfigurationBackup>;
  restore(backup: ConfigurationBackup): Promise<void>;
  
  // Maintenance operations
  cleanup(options?: MaintenanceOptions): Promise<void>;
  getStats(): Promise<StorageStats>;
  validateIntegrity(): Promise<IntegrityResult>;
}

// ============================================================================
// Search and Query Types
// ============================================================================

export interface SearchQuery {
  text?: string;
  categories?: string[];
  services?: string[];
  tags?: string[];
  modifiedAfter?: Date;
  modifiedBefore?: Date;
  limit?: number;
  offset?: number;
}

export interface IntegrityResult {
  valid: boolean;
  corruptedKeys: string[];
  missingKeys: string[];
  errors: string[];
}

// ============================================================================
// Storage Provider Registry
// ============================================================================

export type StorageProviderType = 'indexeddb' | 'localstorage' | 'memory';

export interface StorageProvider {
  type: StorageProviderType;
  priority: number;           // Higher priority = preferred
  isAvailable(): Promise<boolean>;
  createRepository(): Promise<StorageRepository>;
  getCapabilities(): StorageCapabilities;
}

export interface StorageCapabilities {
  maxSize: number;           // Maximum storage size in bytes
  supportsTransactions: boolean;
  supportsIndexing: boolean;
  supportsEncryption: boolean;
  persistent: boolean;       // Whether data survives browser restart
}

// ============================================================================
// Storage Abstraction Layer Implementation
// ============================================================================

export class StorageAbstraction implements StorageRepository {
  private primaryRepository: StorageRepository | null = null;
  private fallbackRepository: StorageRepository | null = null;
  private providers: StorageProvider[] = [];
  private initialized = false;

  constructor() {
    this.registerDefaultProviders();
  }

  private registerDefaultProviders(): void {
    // Register providers in order of preference
    this.providers = [
      new IndexedDBProvider(),
      new LocalStorageProvider(),
      new MemoryStorageProvider()
    ];
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Try to initialize primary storage provider
    for (const provider of this.providers.sort((a, b) => b.priority - a.priority)) {
      try {
        if (await provider.isAvailable()) {
          this.primaryRepository = await provider.createRepository();
          await this.primaryRepository.initialize();
          console.log(`✅ Primary storage initialized: ${provider.type}`);
          break;
        }
      } catch (error) {
        console.warn(`❌ Failed to initialize ${provider.type}:`, error);
        continue;
      }
    }

    if (!this.primaryRepository) {
      throw new Error('No storage provider available');
    }

    // Initialize fallback storage (usually LocalStorage)
    try {
      const fallbackProvider = this.providers.find(p => 
        p.type !== (this.primaryRepository as any).type && 
        p.type !== 'memory'
      );
      
      if (fallbackProvider && await fallbackProvider.isAvailable()) {
        this.fallbackRepository = await fallbackProvider.createRepository();
        await this.fallbackRepository.initialize();
        console.log(`✅ Fallback storage initialized: ${fallbackProvider.type}`);
      }
    } catch (error) {
      console.warn('⚠️ Fallback storage initialization failed:', error);
    }

    this.initialized = true;
  }

  async shutdown(): Promise<void> {
    if (this.primaryRepository) {
      await this.primaryRepository.shutdown();
    }
    if (this.fallbackRepository) {
      await this.fallbackRepository.shutdown();
    }
    this.initialized = false;
  }

  async isHealthy(): Promise<boolean> {
    if (!this.primaryRepository) return false;
    
    try {
      return await this.primaryRepository.isHealthy();
    } catch {
      return false;
    }
  }

  // ============================================================================
  // CRUD Operations with Automatic Fallback
  // ============================================================================

  async store(key: string, value: ConfigurationValue, metadata?: Metadata): Promise<void> {
    try {
      if (!this.primaryRepository) throw new Error('Primary storage not available');
      await this.primaryRepository.store(key, value, metadata);
      
      // Also store in fallback for redundancy
      if (this.fallbackRepository) {
        try {
          await this.fallbackRepository.store(key, value, metadata);
        } catch (error) {
          console.warn('⚠️ Fallback storage failed:', error);
        }
      }
    } catch (error) {
      console.error('❌ Primary storage failed:', error);
      
      // Try fallback storage
      if (this.fallbackRepository) {
        await this.fallbackRepository.store(key, value, metadata);
        console.log('✅ Used fallback storage for store operation');
      } else {
        throw new Error(`Storage failed: ${error}`);
      }
    }
  }

  async retrieve(key: string): Promise<StoredConfiguration | null> {
    try {
      if (!this.primaryRepository) throw new Error('Primary storage not available');
      const result = await this.primaryRepository.retrieve(key);
      
      // Update access timestamp
      if (result) {
        result.accessed = new Date().toISOString();
      }
      
      return result;
    } catch (error) {
      console.warn('⚠️ Primary storage retrieve failed:', error);
      
      // Try fallback storage
      if (this.fallbackRepository) {
        try {
          const result = await this.fallbackRepository.retrieve(key);
          if (result) {
            console.log('✅ Used fallback storage for retrieve operation');
            result.accessed = new Date().toISOString();
          }
          return result;
        } catch (fallbackError) {
          console.error('❌ Fallback storage also failed:', fallbackError);
        }
      }
      
      return null;
    }
  }

  async remove(key: string): Promise<void> {
    const errors: Error[] = [];

    // Remove from primary storage
    try {
      if (this.primaryRepository) {
        await this.primaryRepository.remove(key);
      }
    } catch (error) {
      errors.push(error as Error);
    }

    // Remove from fallback storage
    try {
      if (this.fallbackRepository) {
        await this.fallbackRepository.remove(key);
      }
    } catch (error) {
      errors.push(error as Error);
    }

    // If both failed, throw the first error
    if (errors.length === 2) {
      throw errors[0];
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      if (!this.primaryRepository) throw new Error('Primary storage not available');
      return await this.primaryRepository.exists(key);
    } catch (error) {
      // Try fallback storage
      if (this.fallbackRepository) {
        try {
          return await this.fallbackRepository.exists(key);
        } catch (fallbackError) {
          console.error('❌ Both storage systems failed for exists check:', error, fallbackError);
        }
      }
      return false;
    }
  }

  // ============================================================================
  // Batch Operations
  // ============================================================================

  async storeBatch(items: StorageItem[]): Promise<void> {
    try {
      if (!this.primaryRepository) throw new Error('Primary storage not available');
      await this.primaryRepository.storeBatch(items);
      
      // Also store in fallback for redundancy
      if (this.fallbackRepository) {
        try {
          await this.fallbackRepository.storeBatch(items);
        } catch (error) {
          console.warn('⚠️ Fallback batch store failed:', error);
        }
      }
    } catch (error) {
      console.error('❌ Primary batch store failed:', error);
      
      // Try fallback storage
      if (this.fallbackRepository) {
        await this.fallbackRepository.storeBatch(items);
        console.log('✅ Used fallback storage for batch store');
      } else {
        throw new Error(`Batch store failed: ${error}`);
      }
    }
  }

  async retrieveBatch(keys: string[]): Promise<(StoredConfiguration | null)[]> {
    try {
      if (!this.primaryRepository) throw new Error('Primary storage not available');
      return await this.primaryRepository.retrieveBatch(keys);
    } catch (error) {
      console.warn('⚠️ Primary batch retrieve failed:', error);
      
      // Try fallback storage
      if (this.fallbackRepository) {
        try {
          const result = await this.fallbackRepository.retrieveBatch(keys);
          console.log('✅ Used fallback storage for batch retrieve');
          return result;
        } catch (fallbackError) {
          console.error('❌ Fallback batch retrieve failed:', fallbackError);
        }
      }
      
      // Return array of nulls if both failed
      return keys.map(() => null);
    }
  }

  async retrieveCategory(category: string): Promise<StoredConfiguration[]> {
    try {
      if (!this.primaryRepository) throw new Error('Primary storage not available');
      return await this.primaryRepository.retrieveCategory(category);
    } catch (error) {
      console.warn('⚠️ Primary category retrieve failed:', error);
      
      // Try fallback storage
      if (this.fallbackRepository) {
        try {
          const result = await this.fallbackRepository.retrieveCategory(category);
          console.log('✅ Used fallback storage for category retrieve');
          return result;
        } catch (fallbackError) {
          console.error('❌ Fallback category retrieve failed:', fallbackError);
        }
      }
      
      return [];
    }
  }

  async retrieveAll(): Promise<StoredConfiguration[]> {
    try {
      if (!this.primaryRepository) throw new Error('Primary storage not available');
      return await this.primaryRepository.retrieveAll();
    } catch (error) {
      console.warn('⚠️ Primary retrieveAll failed:', error);
      
      // Try fallback storage
      if (this.fallbackRepository) {
        try {
          const result = await this.fallbackRepository.retrieveAll();
          console.log('✅ Used fallback storage for retrieveAll');
          return result;
        } catch (fallbackError) {
          console.error('❌ Fallback retrieveAll failed:', fallbackError);
        }
      }
      
      return [];
    }
  }

  // ============================================================================
  // Advanced Operations
  // ============================================================================

  async search(query: SearchQuery): Promise<StoredConfiguration[]> {
    try {
      if (!this.primaryRepository) throw new Error('Primary storage not available');
      return await this.primaryRepository.search(query);
    } catch (error) {
      console.warn('⚠️ Primary search failed:', error);
      
      // Try fallback storage
      if (this.fallbackRepository) {
        try {
          const result = await this.fallbackRepository.search(query);
          console.log('✅ Used fallback storage for search');
          return result;
        } catch (fallbackError) {
          console.error('❌ Fallback search failed:', fallbackError);
        }
      }
      
      return [];
    }
  }

  async backup(): Promise<ConfigurationBackup> {
    try {
      if (!this.primaryRepository) throw new Error('Primary storage not available');
      return await this.primaryRepository.backup();
    } catch (error) {
      console.warn('⚠️ Primary backup failed:', error);
      
      // Try fallback storage
      if (this.fallbackRepository) {
        const result = await this.fallbackRepository.backup();
        console.log('✅ Used fallback storage for backup');
        return result;
      }
      
      throw new Error(`Backup failed: ${error}`);
    }
  }

  async restore(backup: ConfigurationBackup): Promise<void> {
    const errors: Error[] = [];

    // Restore to primary storage
    try {
      if (this.primaryRepository) {
        await this.primaryRepository.restore(backup);
      }
    } catch (error) {
      errors.push(error as Error);
    }

    // Restore to fallback storage
    try {
      if (this.fallbackRepository) {
        await this.fallbackRepository.restore(backup);
      }
    } catch (error) {
      errors.push(error as Error);
    }

    // If both failed, throw the first error
    if (errors.length === 2) {
      throw errors[0];
    }
  }

  // ============================================================================
  // Maintenance Operations
  // ============================================================================

  async cleanup(options?: MaintenanceOptions): Promise<void> {
    const tasks = [];

    if (this.primaryRepository) {
      tasks.push(this.primaryRepository.cleanup(options));
    }

    if (this.fallbackRepository) {
      tasks.push(this.fallbackRepository.cleanup(options));
    }

    await Promise.allSettled(tasks);
  }

  async getStats(): Promise<StorageStats> {
    try {
      if (!this.primaryRepository) throw new Error('Primary storage not available');
      return await this.primaryRepository.getStats();
    } catch (error) {
      // Return basic stats if primary storage fails
      return {
        totalSize: 0,
        itemCount: 0,
        cacheHitRate: 0,
        lastCleanup: new Date().toISOString(),
        quotaUsed: 0,
        averageAccessTime: 0
      };
    }
  }

  async validateIntegrity(): Promise<IntegrityResult> {
    try {
      if (!this.primaryRepository) throw new Error('Primary storage not available');
      return await this.primaryRepository.validateIntegrity();
    } catch (error) {
      return {
        valid: false,
        corruptedKeys: [],
        missingKeys: [],
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }
}

// ============================================================================
// Storage Provider Implementations (Stubs)
// ============================================================================

export class IndexedDBProvider implements StorageProvider {
  type: StorageProviderType = 'indexeddb';
  priority = 100;

  async isAvailable(): Promise<boolean> {
    return typeof window !== 'undefined' && 'indexedDB' in window && indexedDB !== null;
  }

  async createRepository(): Promise<StorageRepository> {
    // Dynamic import will be fixed in integration phase
    throw new Error('IndexedDB repository creation temporarily disabled');
  }

  getCapabilities(): StorageCapabilities {
    return {
      maxSize: 250 * 1024 * 1024, // 250MB typical quota
      supportsTransactions: true,
      supportsIndexing: true,
      supportsEncryption: false,   // Handled at application level
      persistent: true
    };
  }
}

export class LocalStorageProvider implements StorageProvider {
  type: StorageProviderType = 'localstorage';
  priority = 50;

  async isAvailable(): Promise<boolean> {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return false;
      
      const testKey = '__storage_test__';
      window.localStorage.setItem(testKey, 'test');
      window.localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  async createRepository(): Promise<StorageRepository> {
    // Dynamic import will be fixed in integration phase
    throw new Error('LocalStorage repository creation temporarily disabled');
  }

  getCapabilities(): StorageCapabilities {
    return {
      maxSize: 10 * 1024 * 1024,   // 10MB typical limit
      supportsTransactions: false,
      supportsIndexing: false,
      supportsEncryption: false,
      persistent: true
    };
  }
}

export class MemoryStorageProvider implements StorageProvider {
  type: StorageProviderType = 'memory';
  priority = 10;

  async isAvailable(): Promise<boolean> {
    return true; // Always available as fallback
  }

  async createRepository(): Promise<StorageRepository> {
    // Dynamic import will be fixed in integration phase
    throw new Error('Memory repository creation temporarily disabled');
  }

  getCapabilities(): StorageCapabilities {
    return {
      maxSize: 50 * 1024 * 1024,   // Limited by available RAM
      supportsTransactions: false,
      supportsIndexing: false,
      supportsEncryption: false,
      persistent: false
    };
  }
}