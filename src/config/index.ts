/**
 * Configuration System - Main Entry Point
 * 
 * This module exports all configuration system components, hooks, types, and services
 * for use throughout the application.
 */

// ============================================================================
// Core Configuration System
// ============================================================================

// Context and Provider
export { ConfigurationProvider, useConfiguration, ConfigurationErrorBoundary, ConfigurationLoading } from './core/ConfigurationContext';

// Main Service
export { ConfigurationService } from './core/ConfigurationService';

// Storage Layer
export { StorageAbstraction } from './storage/StorageRepository';
export { IndexedDBRepository } from './storage/IndexedDBRepository';
export { LocalStorageRepository } from './storage/LocalStorageRepository';
export { MemoryStorageRepository } from './storage/MemoryStorageRepository';

// Validation Engine
export { ValidationEngine } from './validation/ValidationEngine';

// ============================================================================
// React Hooks
// ============================================================================

export {
  useConfigValue,
  useConfigBatch,
  useConfigSubscription,
  useConfigCategory
} from './hooks/useConfigurationHooks';

export type {
  UseConfigValueOptions,
  UseConfigValueResult,
  UseConfigBatchOptions,
  UseConfigBatchResult,
  UseConfigSubscriptionOptions
} from './hooks/useConfigurationHooks';

// ============================================================================
// UI Components
// ============================================================================

export { ConfigurationDashboard } from './components/ConfigurationDashboard';

// ============================================================================
// Types and Interfaces
// ============================================================================

// Core configuration types
export type {
  ConfigurationValue,
  ConfigurationUpdate,
  Metadata
} from './core/ConfigurationTypes';

// Storage types
export type {
  StorageItem
} from './core/ConfigurationTypes';

// Validation types
export type {
  ValidationRules,
  ConfigurationSchema,
  ValidationResult,
  BatchValidationResult
} from './core/ConfigurationTypes';

// Service types
export type {
  ServiceConfiguration,
  ConfigurationFilter,
  ConfigurationChangeCallback,
  Subscription
} from './core/ConfigurationTypes';

// Import/Export types
export type {
  ConfigurationBackup,
  ImportOptions,
  ImportResult,
  ConfigurationConflict,
  ImportError
} from './core/ConfigurationTypes';

// Status and monitoring types
export type {
  ConfigurationStatus,
  ConfigurationHistory,
  AccessContext
} from './core/ConfigurationTypes';

// ============================================================================
// Utility Constants
// ============================================================================

export const CONFIG_VERSION = '1.0.0';
export const CONFIG_NAMESPACE = 'anshika-config';

// ============================================================================
// Default Configuration Values
// ============================================================================

export const DEFAULT_CONFIG = {
  // AI Configuration
  'ai.mode': 'online',
  'ai.temperature.online': 0.7,
  'ai.temperature.offline': 0.8,
  'ai.model.gemini': 'gemini-2.5-flash-exp',
  'ai.model.ollama': 'llama3.2',
  'ai.maxTokens': 4096,
  'ai.stream': true,
  
  // Voice Configuration
  'voice.enabled': true,
  'voice.autoplay': false,
  'voice.rate': 1.0,
  'voice.pitch': 1.0,
  'voice.volume': 0.8,
  'voice.voice': 'default',
  
  // UI Configuration
  'ui.theme': 'system',
  'ui.compactMode': false,
  'ui.showTimestamps': true,
  'ui.animations': true,
  'ui.fontSize': 'medium',
  
  // Document Intelligence
  'documents.autoAnalysis': true,
  'documents.maxFileSize': 10485760, // 10MB
  'documents.supportedTypes': ['pdf', 'docx', 'txt'],
  'documents.extractImages': false,
  
  // Task Management
  'tasks.autoSave': true,
  'tasks.defaultPriority': 'medium',
  'tasks.showCompleted': true,
  'tasks.sortBy': 'createdAt',
  
  // System Configuration
  'system.debugMode': false,
  'system.logLevel': 'info',
  'system.autoUpdate': true,
  'system.telemetry': false
} as const;

// ============================================================================
// Configuration Categories
// ============================================================================

export const CONFIG_CATEGORIES = {
  AI: 'ai',
  VOICE: 'voice',
  UI: 'ui',
  DOCUMENTS: 'documents',
  TASKS: 'tasks',
  SYSTEM: 'system'
} as const;

// ============================================================================
// Validation Schemas
// ============================================================================

export const BUILT_IN_SCHEMAS = {
  AI_TEMPERATURE: {
    type: 'number',
    minimum: 0,
    maximum: 2,
    description: 'AI model temperature (0-2)'
  },
  
  AI_MODE: {
    type: 'string',
    enum: ['online', 'offline'],
    description: 'AI processing mode'
  },
  
  VOICE_RATE: {
    type: 'number',
    minimum: 0.1,
    maximum: 3.0,
    description: 'Voice playback rate'
  },
  
  FILE_SIZE: {
    type: 'number',
    minimum: 1,
    maximum: 100485760, // 100MB
    description: 'Maximum file size in bytes'
  }
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a configuration provider with default settings
 */
export function createConfigurationProvider() {
  const { ConfigurationService } = require('./core/ConfigurationService');
  return new ConfigurationService();
}

/**
 * Initialize configuration system with defaults
 */
export async function initializeConfiguration(service: any) {
  try {
    // Load default values
    const updates = Object.entries(DEFAULT_CONFIG).map(([key, value]) => ({
      key,
      value
    }));
    
    await service.setMultiple(updates);
    console.log('✅ Configuration system initialized with defaults');
    
  } catch (error) {
    console.error('❌ Failed to initialize configuration system:', error);
    throw error;
  }
}

/**
 * Get configuration value with type safety
 */
export async function getTypedConfig<T>(
  service: any,
  key: keyof typeof DEFAULT_CONFIG,
  defaultValue?: T
): Promise<T> {
  return await service.get(key, defaultValue || DEFAULT_CONFIG[key] as T);
}

/**
 * Set configuration value with validation
 */
export async function setTypedConfig<T>(
  service: any,
  key: keyof typeof DEFAULT_CONFIG,
  value: T
): Promise<void> {
  await service.set(key, value);
}

// ============================================================================
// Export All
// ============================================================================

export default {
  DEFAULT_CONFIG,
  CONFIG_CATEGORIES,
  BUILT_IN_SCHEMAS,
  createConfigurationProvider,
  initializeConfiguration
};