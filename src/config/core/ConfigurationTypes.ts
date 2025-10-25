/**
 * Core Configuration System Types and Interfaces
 * 
 * This file defines all the fundamental types used throughout the central
 * configuration system. These types ensure type safety and provide a
 * consistent interface for configuration management.
 */

// ============================================================================
// Core Configuration Types
// ============================================================================

export type ConfigurationValueType = 'string' | 'number' | 'boolean' | 'array' | 'object' | 'file';

export type ConfigurationValue = string | number | boolean | unknown[] | Record<string, unknown> | File | null;

export type ChatMode = 'online' | 'offline';

// ============================================================================
// Configuration Schema Definition
// ============================================================================

export interface ValidationRules {
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  options?: string[] | { value: string; label: string }[];
  customValidator?: (value: unknown) => Promise<ValidationResult>;
}

export interface ConfigurationSchema {
  // Identification
  key: string;
  title: string;
  description: string;
  
  // Type information
  type: ConfigurationValueType;
  defaultValue: ConfigurationValue;
  
  // Validation rules
  validation?: ValidationRules;
  required: boolean;
  
  // UI organization
  category: string;
  subcategory?: string;
  displayOrder: number;
  
  // Behavior flags
  sensitive: boolean;        // Whether to encrypt value
  restartRequired: boolean;  // Whether change requires restart
  experimental: boolean;     // Whether feature is experimental
  
  // Service information
  serviceId: string;
  serviceName: string;
  
  // Help and documentation
  helpText?: string;
  examples?: string[];
  relatedKeys?: string[];
  
  // UI hints
  placeholder?: string;
  unit?: string;           // For number inputs (e.g., "ms", "%")
  multiline?: boolean;     // For string inputs
}

// ============================================================================
// Configuration Storage Types
// ============================================================================

export interface StoredConfiguration {
  // Primary identification
  key: string;
  value: ConfigurationValue;
  
  // Metadata
  category: string;
  serviceId: string;
  
  // Timestamps
  created: string;        // ISO timestamp
  lastModified: string;   // ISO timestamp
  accessed: string;       // ISO timestamp
  
  // State information
  isDefault: boolean;
  isEncrypted: boolean;
  version: number;
  
  // Data integrity and search
  checksum?: string;
  tags?: string[];
  notes?: string;
}

export interface CachedConfiguration {
  value: ConfigurationValue;
  timestamp: number;
  ttl: number;           // Time to live in milliseconds
  accessCount: number;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Configuration Operation Types
// ============================================================================

export interface ConfigurationUpdate {
  key: string;
  value: ConfigurationValue;
  category?: string;
  timestamp?: number;
  userId?: string;
}

export interface ConfigurationChange {
  key: string;
  oldValue: ConfigurationValue;
  newValue: ConfigurationValue;
  timestamp: number;
  source: 'user' | 'system' | 'import';
  category: string;
}

export type ConfigurationChangeCallback = (changes: ConfigurationChange[]) => void | Promise<void>;

export interface Subscription {
  unsubscribe(): void;
}

// ============================================================================
// Validation Types
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface BatchValidationResult {
  valid: boolean;
  results: Map<string, ValidationResult>;
  globalErrors: string[];
}

// ============================================================================
// Service Integration Types
// ============================================================================

export interface ServiceConfiguration {
  serviceId: string;
  serviceName: string;
  version: string;
  
  // Schema registration
  schemas: ConfigurationSchema[];
  
  // Dependencies
  dependencies?: string[];
  
  // Lifecycle callbacks
  onConfigurationChange?: ConfigurationChangeCallback;
  onInitialize?: () => Promise<void>;
  onShutdown?: () => Promise<void>;
}

export interface ConfigurationFilter {
  keys?: string[];
  categories?: string[];
  services?: string[];
  tags?: string[];
}

// ============================================================================
// Storage and Persistence Types
// ============================================================================

export interface StorageItem {
  key: string;
  value: ConfigurationValue;
  metadata?: Metadata;
}

export interface Metadata {
  category?: string;
  serviceId?: string;
  tags?: string[];
  notes?: string;
  version?: number;
}

export interface ConfigurationBackup {
  version: string;
  timestamp: string;
  configurations: StoredConfiguration[];
  schemas: ConfigurationSchema[];
  metadata: {
    source: string;
    totalItems: number;
    categories: string[];
    services: string[];
  };
}

export interface EncryptedValue {
  data: number[];        // Encrypted data as array of bytes
  iv: number[];          // Initialization vector
  algorithm: string;     // Encryption algorithm used
}

// ============================================================================
// UI and User Interface Types
// ============================================================================

export interface ConfigurationCategory {
  id: string;
  title: string;
  description: string;
  icon?: string;
  displayOrder: number;
  subcategories?: ConfigurationSubcategory[];
  itemCount: number;
}

export interface ConfigurationSubcategory {
  id: string;
  title: string;
  description: string;
  displayOrder: number;
  itemCount: number;
}

export interface ConfigurationItem {
  schema: ConfigurationSchema;
  value: ConfigurationValue;
  isDefault: boolean;
  isDirty: boolean;
  hasError: boolean;
  errorMessage?: string;
  lastModified?: string;
}

export interface ConfigurationSearchResult {
  key: string;
  title: string;
  description: string;
  category: string;
  relevanceScore: number;
  matchType: 'title' | 'description' | 'key' | 'tag';
  highlight?: string;
}

// ============================================================================
// Import/Export Types
// ============================================================================

export interface ConfigurationExport {
  version: string;
  timestamp: string;
  source: string;
  categories: string[];
  configurations: Record<string, ConfigurationValue>;
  schemas?: ConfigurationSchema[];
  metadata: {
    totalItems: number;
    encryptedItems: string[];
    notes?: string;
  };
}

export interface ImportOptions {
  overwriteExisting: boolean;
  validateValues: boolean;
  importSchemas: boolean;
  selectedCategories?: string[];
  conflictResolution: 'skip' | 'overwrite' | 'prompt';
}

export interface ImportResult {
  success: boolean;
  importedCount: number;
  skippedCount: number;
  errorCount: number;
  conflicts: ConfigurationConflict[];
  errors: ImportError[];
}

export interface ConfigurationConflict {
  key: string;
  existingValue: ConfigurationValue;
  importedValue: ConfigurationValue;
  resolution?: 'keep' | 'replace' | 'merge';
}

export interface ImportError {
  key?: string;
  error: string;
  severity: 'error' | 'warning';
}

// ============================================================================
// Error and Status Types
// ============================================================================

export class ConfigurationError extends Error {
  constructor(
    public code: string,
    message: string,
    public recoverable: boolean = true,
    public suggestion?: string,
    public key?: string,
    public category?: string
  ) {
    super(message);
    this.name = 'ConfigurationError';
    
    // Maintain proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ConfigurationError);
    }
  }
}

export interface ConfigurationStatus {
  healthy: boolean;
  errors: ConfigurationError[];
  warnings: string[];
  statistics: {
    totalConfigurations: number;
    modifiedConfigurations: number;
    errorConfigurations: number;
    categoriesCount: number;
    servicesCount: number;
  };
}

// ============================================================================
// Advanced Feature Types
// ============================================================================

export interface ConfigurationHistory {
  id: string;
  configurationKey: string;
  oldValue: ConfigurationValue;
  newValue: ConfigurationValue;
  timestamp: string;
  userId?: string;
  source: 'user' | 'system' | 'import' | 'migration';
  reason?: string;
}

export interface AccessContext {
  userId?: string;
  sessionId?: string;
  source: 'ui' | 'api' | 'system';
  timestamp: number;
}

export enum SensitivityLevel {
  PUBLIC = 0,      // No protection needed
  INTERNAL = 1,    // Basic obfuscation
  SENSITIVE = 2,   // Encryption at rest
  RESTRICTED = 3   // Encryption + access logging
}

export interface SecurityClassification {
  level: SensitivityLevel;
  encryptionRequired: boolean;
  accessLogging: boolean;
  auditTrail: boolean;
}

// ============================================================================
// Storage Statistics and Maintenance
// ============================================================================

export interface StorageStats {
  totalSize: number;          // Total storage used in bytes
  itemCount: number;          // Number of configuration items
  cacheHitRate: number;       // Cache performance metric
  lastCleanup: string;        // Last maintenance timestamp
  quotaUsed: number;          // Percentage of storage quota used
  averageAccessTime: number;  // Performance metric in milliseconds
}

export interface MaintenanceOptions {
  cleanupHistory: boolean;    // Remove old history entries
  compactStorage: boolean;    // Optimize storage layout
  validateIntegrity: boolean; // Check data corruption
  rebuildCache: boolean;      // Clear and rebuild cache
}

// ============================================================================
// Type Guards and Utility Types
// ============================================================================

export const isConfigurationValue = (value: unknown): value is ConfigurationValue => {
  return value === null || 
         typeof value === 'string' || 
         typeof value === 'number' || 
         typeof value === 'boolean' || 
         Array.isArray(value) || 
         (typeof value === 'object' && value !== null) ||
         (value instanceof File);
};

export const isStoredConfiguration = (obj: unknown): obj is StoredConfiguration => {
  if (typeof obj !== 'object' || obj === null) return false;
  
  const config = obj as StoredConfiguration;
  return typeof config.key === 'string' &&
         isConfigurationValue(config.value) &&
         typeof config.category === 'string' &&
         typeof config.serviceId === 'string' &&
         typeof config.created === 'string' &&
         typeof config.lastModified === 'string';
};

export const isConfigurationSchema = (obj: unknown): obj is ConfigurationSchema => {
  if (typeof obj !== 'object' || obj === null) return false;
  
  const schema = obj as ConfigurationSchema;
  return typeof schema.key === 'string' &&
         typeof schema.title === 'string' &&
         typeof schema.type === 'string' &&
         typeof schema.category === 'string' &&
         typeof schema.serviceId === 'string';
};

// ============================================================================
// Configuration Categories - System Defaults
// ============================================================================

export const SYSTEM_CATEGORIES = {
  AI: 'ai',
  VOICE: 'voice',
  TASKS: 'tasks',
  DOCUMENT: 'document',
  INTERFACE: 'interface',
  ADVANCED: 'advanced',
  DEVELOPER: 'developer'
} as const;

export const DEFAULT_CATEGORIES: ConfigurationCategory[] = [
  {
    id: SYSTEM_CATEGORIES.AI,
    title: 'AI Configuration',
    description: 'AI model settings, API keys, and behavior configuration',
    displayOrder: 1,
    itemCount: 0
  },
  {
    id: SYSTEM_CATEGORIES.VOICE,
    title: 'Voice Settings',
    description: 'Speech recognition and voice configuration',
    displayOrder: 2,
    itemCount: 0
  },
  {
    id: SYSTEM_CATEGORIES.TASKS,
    title: 'Task Management',
    description: 'Task system configuration and behavior settings',
    displayOrder: 3,
    itemCount: 0
  },
  {
    id: SYSTEM_CATEGORIES.DOCUMENT,
    title: 'Document Intelligence',
    description: 'Document processing and analysis configuration',
    displayOrder: 4,
    itemCount: 0
  },
  {
    id: SYSTEM_CATEGORIES.INTERFACE,
    title: 'User Interface',
    description: 'UI appearance, behavior, and personalization settings',
    displayOrder: 5,
    itemCount: 0
  },
  {
    id: SYSTEM_CATEGORIES.ADVANCED,
    title: 'Advanced Settings',
    description: 'Performance, debugging, and advanced feature configuration',
    displayOrder: 6,
    itemCount: 0
  },
  {
    id: SYSTEM_CATEGORIES.DEVELOPER,
    title: 'Developer Tools',
    description: 'Development, debugging, and system diagnostic settings',
    displayOrder: 7,
    itemCount: 0
  }
];
