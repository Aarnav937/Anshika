import { 
  AppConfig, 
  GoogleAPIConfig, 
  LocalModelConfig, 
  HardwareCapabilities,
  GPUMemoryInfo,
  GenerationMode,
  ConfigurationManager as IConfigurationManager
} from '../types';

/**
 * Configuration schema validation utilities
 */
class ConfigurationValidator {
  /**
   * Validates Google API configuration
   */
  static validateGoogleAPIConfig(config: GoogleAPIConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.projectId || config.projectId.trim() === '') {
      errors.push('Google Cloud Project ID is required');
    }

    if (!config.location || config.location.trim() === '') {
      errors.push('Google Cloud location is required');
    }

    // Validate that either API key or service account path is provided
    if (!config.apiKey && !config.serviceAccountPath) {
      errors.push('Either API key or service account path must be provided');
    }

    // Validate API key format if provided
    if (config.apiKey && !this.isValidAPIKey(config.apiKey)) {
      errors.push('Invalid API key format');
    }

    // Validate service account path if provided
    if (config.serviceAccountPath && !this.isValidFilePath(config.serviceAccountPath)) {
      errors.push('Invalid service account file path');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates local model configuration
   */
  static validateLocalModelConfig(config: LocalModelConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.modelPath || config.modelPath.trim() === '') {
      errors.push('Model path is required');
    }

    if (!config.modelName || config.modelName.trim() === '') {
      errors.push('Model name is required');
    }

    // Validate model path exists (basic format check)
    if (config.modelPath && !this.isValidFilePath(config.modelPath)) {
      errors.push('Invalid model file path format');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates complete app configuration
   */
  static validateAppConfig(config: AppConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate Google API config
    const googleValidation = this.validateGoogleAPIConfig(config.googleAPI);
    if (!googleValidation.valid) {
      errors.push(...googleValidation.errors.map(err => `Google API: ${err}`));
    }

    // Validate local model config
    const localValidation = this.validateLocalModelConfig(config.localModel);
    if (!localValidation.valid) {
      errors.push(...localValidation.errors.map(err => `Local Model: ${err}`));
    }

    // Validate image storage settings
    if (config.imageStorage.maxStorageSize <= 0) {
      errors.push('Max storage size must be greater than 0');
    }

    if (config.imageStorage.retentionDays < 0) {
      errors.push('Retention days cannot be negative');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Basic API key format validation
   */
  private static isValidAPIKey(apiKey: string): boolean {
    // Basic validation - API keys are typically alphanumeric with specific patterns
    return /^[A-Za-z0-9_-]{20,}$/.test(apiKey);
  }

  /**
   * Basic file path validation
   */
  private static isValidFilePath(path: string): boolean {
    // Basic path validation - check for valid characters and structure
    return /^[^<>:"|?*\x00-\x1f]+$/.test(path) && path.length > 0;
  }
}

/**
 * Configuration storage manager using localStorage with fallback
 */
class ConfigurationStorage {
  private static readonly CONFIG_KEY = 'dual-image-generation-config';
  private static readonly CONFIG_VERSION = '1.0.0';

  /**
   * Loads configuration from persistent storage
   */
  static async loadConfig(): Promise<AppConfig | null> {
    try {
      const stored = localStorage.getItem(this.CONFIG_KEY);
      if (!stored) {
        return null;
      }

      const parsed = JSON.parse(stored);
      
      // Check version compatibility
      if (parsed.version !== this.CONFIG_VERSION) {
        console.warn('Configuration version mismatch, using defaults');
        return null;
      }

      return parsed.config as AppConfig;
    } catch (error) {
      console.error('Failed to load configuration:', error);
      return null;
    }
  }

  /**
   * Saves configuration to persistent storage
   */
  static async saveConfig(config: AppConfig): Promise<void> {
    try {
      const toStore = {
        version: this.CONFIG_VERSION,
        config,
        timestamp: new Date().toISOString()
      };

      localStorage.setItem(this.CONFIG_KEY, JSON.stringify(toStore));
    } catch (error) {
      console.error('Failed to save configuration:', error);
      throw new Error('Failed to save configuration to storage');
    }
  }

  /**
   * Clears stored configuration
   */
  static async clearConfig(): Promise<void> {
    try {
      localStorage.removeItem(this.CONFIG_KEY);
    } catch (error) {
      console.error('Failed to clear configuration:', error);
    }
  }
}

/**
 * Default configuration factory
 */
class DefaultConfigFactory {
  /**
   * Creates default application configuration
   */
  static createDefaultConfig(): AppConfig {
    return {
      defaultMode: GenerationMode.ONLINE,
      googleAPI: {
        projectId: '',
        location: 'us-central1',
        apiKey: '',
        serviceAccountPath: ''
      },
      localModel: {
        modelPath: '',
        modelName: 'stable-diffusion-xl',
        memoryOptimized: true,
        quantized: false,
        loraAdapters: []
      },
      imageStorage: {
        maxStorageSize: 5 * 1024 * 1024 * 1024, // 5GB
        compressionEnabled: true,
        autoCleanup: true,
        retentionDays: 30
      },
      ui: {
        showProgressDetails: true,
        autoSwitchOnError: true,
        confirmCancellation: true
      }
    };
  }
}

/**
 * Main Configuration Manager implementation
 */
export class ConfigurationManager implements IConfigurationManager {
  private config: AppConfig;
  private hardwareCapabilities?: HardwareCapabilities;

  constructor() {
    this.config = DefaultConfigFactory.createDefaultConfig();
  }

  /**
   * Initialize configuration manager and load stored config
   */
  async initialize(): Promise<void> {
    try {
      const storedConfig = await ConfigurationStorage.loadConfig();
      if (storedConfig) {
        // Validate stored configuration
        const validation = ConfigurationValidator.validateAppConfig(storedConfig);
        if (validation.valid) {
          this.config = storedConfig;
        } else {
          console.warn('Stored configuration is invalid, using defaults:', validation.errors);
        }
      }
    } catch (error) {
      console.error('Failed to initialize configuration:', error);
      // Continue with default configuration
    }
  }

  /**
   * Get current configuration
   */
  async getConfig(): Promise<AppConfig> {
    return { ...this.config };
  }

  /**
   * Update configuration with validation
   */
  async updateConfig(updates: Partial<AppConfig>): Promise<void> {
    // Create updated configuration
    const updatedConfig: AppConfig = {
      ...this.config,
      ...updates,
      // Handle nested objects properly
      googleAPI: updates.googleAPI ? { ...this.config.googleAPI, ...updates.googleAPI } : this.config.googleAPI,
      localModel: updates.localModel ? { ...this.config.localModel, ...updates.localModel } : this.config.localModel,
      imageStorage: updates.imageStorage ? { ...this.config.imageStorage, ...updates.imageStorage } : this.config.imageStorage,
      ui: updates.ui ? { ...this.config.ui, ...updates.ui } : this.config.ui
    };

    // Validate updated configuration
    const validation = ConfigurationValidator.validateAppConfig(updatedConfig);
    if (!validation.valid) {
      throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
    }

    // Save to storage
    await ConfigurationStorage.saveConfig(updatedConfig);
    
    // Update in-memory configuration
    this.config = updatedConfig;
  }

  /**
   * Validate hardware capabilities using hardware detection
   */
  async validateHardware(): Promise<HardwareCapabilities> {
    const { hardwareDetector } = await import('./hardwareDetection');
    
    try {
      const capabilities = await hardwareDetector.detectGPUCapabilities();
      this.hardwareCapabilities = capabilities;
      return capabilities;
    } catch (error) {
      console.error('Hardware validation failed:', error);
      
      // Return fallback capabilities
      const fallbackCapabilities: HardwareCapabilities = {
        gpuModel: 'Detection Failed',
        vramTotal: 4096,
        vramAvailable: 3200,
        recommendedModels: ['stable-diffusion-1.5'],
        supportsLocalGeneration: false
      };
      
      this.hardwareCapabilities = fallbackCapabilities;
      return fallbackCapabilities;
    }
  }

  /**
   * Reset configuration to defaults
   */
  async resetToDefaults(): Promise<void> {
    this.config = DefaultConfigFactory.createDefaultConfig();
    await ConfigurationStorage.saveConfig(this.config);
  }

  /**
   * Get cached hardware capabilities
   */
  getHardwareCapabilities(): HardwareCapabilities | undefined {
    return this.hardwareCapabilities;
  }

  /**
   * Get current GPU memory information
   */
  async getGPUMemoryInfo(): Promise<GPUMemoryInfo> {
    const { hardwareDetector } = await import('./hardwareDetection');
    return hardwareDetector.getGPUMemoryInfo();
  }

  /**
   * Optimize parameters based on current hardware
   */
  async optimizeParametersForHardware(parameters: any): Promise<any> {
    const { hardwareDetector } = await import('./hardwareDetection');
    return hardwareDetector.optimizeParametersForHardware(parameters);
  }

  /**
   * Check if local generation is supported by current hardware
   */
  supportsLocalGeneration(): boolean {
    return this.hardwareCapabilities?.supportsLocalGeneration ?? false;
  }

  /**
   * Get recommended models for current hardware
   */
  getRecommendedModels(): string[] {
    return this.hardwareCapabilities?.recommendedModels ?? [];
  }

  /**
   * Validate specific configuration sections
   */
  validateGoogleAPIConfig(config: GoogleAPIConfig): { valid: boolean; errors: string[] } {
    return ConfigurationValidator.validateGoogleAPIConfig(config);
  }

  validateLocalModelConfig(config: LocalModelConfig): { valid: boolean; errors: string[] } {
    return ConfigurationValidator.validateLocalModelConfig(config);
  }
}

// Export singleton instance
export const configurationManager = new ConfigurationManager();