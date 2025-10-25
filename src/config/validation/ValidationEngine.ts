/**
 * Configuration Validation Engine
 * 
 * This module provides comprehensive validation for configuration values
 * using both built-in validation rules and custom validators.
 */

import {
  ValidationResult,
  BatchValidationResult,
  ConfigurationValue,
  ConfigurationSchema,
  ValidationRules,
  ConfigurationUpdate
} from '../core/ConfigurationTypes';

// ============================================================================
// Validation Engine Implementation
// ============================================================================

export class ValidationEngine {
  private schemas = new Map<string, ConfigurationSchema>();
  private customValidators = new Map<string, (value: unknown) => Promise<ValidationResult>>();
  private initialized = false;

  // ============================================================================
  // Lifecycle Management
  // ============================================================================

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    // Load built-in validation schemas
    await this.loadBuiltInSchemas();
    
    this.initialized = true;
    console.log('✅ Validation engine initialized');
  }

  private async loadBuiltInSchemas(): Promise<void> {
    // Register built-in schemas for core configuration
    const builtInSchemas: ConfigurationSchema[] = [
      {
        key: 'ai.gemini.api_key',
        title: 'Gemini API Key',
        description: 'API key for Google Gemini AI service',
        type: 'string',
        defaultValue: '',
        required: false,
        sensitive: true,
        restartRequired: false,
        experimental: false,
        category: 'ai',
        serviceId: 'gemini',
        serviceName: 'Gemini AI',
        displayOrder: 1,
        validation: {
          minLength: 20,
          maxLength: 200,
          pattern: '^[A-Za-z0-9_-]+$'
        },
        helpText: 'Your Gemini API key from Google AI Studio. Keep this secure!',
        examples: ['AIza...abc123']
      },
      {
        key: 'ai.gemini.temperature',
        title: 'Gemini Temperature',
        description: 'Controls randomness in Gemini AI responses (0.0 = deterministic, 1.0 = creative)',
        type: 'number',
        defaultValue: 0.7,
        required: true,
        sensitive: false,
        restartRequired: false,
        experimental: false,
        category: 'ai',
        serviceId: 'gemini',
        serviceName: 'Gemini AI',
        displayOrder: 2,
        validation: {
          min: 0.0,
          max: 1.0
        },
        helpText: 'Higher values make output more random, lower values more focused',
        unit: '0.0-1.0'
      },
      {
        key: 'ai.ollama.model',
        title: 'Ollama Model',
        description: 'Selected Ollama model for offline AI',
        type: 'string',
        defaultValue: 'gemma3:4b',
        required: true,
        sensitive: false,
        restartRequired: false,
        experimental: false,
        category: 'ai',
        serviceId: 'ollama',
        serviceName: 'Ollama',
        displayOrder: 3,
        validation: {
          options: ['gemma3:4b', 'llama2', 'mistral', 'codellama']
        },
        helpText: 'Choose the local AI model to use with Ollama'
      },
      {
        key: 'voice.enabled',
        title: 'Voice Recognition Enabled',
        description: 'Enable or disable voice recognition features',
        type: 'boolean',
        defaultValue: false,
        required: true,
        sensitive: false,
        restartRequired: false,
        experimental: false,
        category: 'voice',
        serviceId: 'voice',
        serviceName: 'Voice System',
        displayOrder: 1,
        helpText: 'Allow the application to use your microphone for voice commands'
      },
    ];

    for (const schema of builtInSchemas) {
      this.registerSchema(schema);
    }
  }

  // ============================================================================
  // Schema Management
  // ============================================================================

  registerSchema(schema: ConfigurationSchema): void {
    this.schemas.set(schema.key, schema);
    console.log(`📋 Registered schema: ${schema.key}`);
  }

  getSchema(key: string): ConfigurationSchema | undefined {
    return this.schemas.get(key);
  }

  getAllSchemas(): ConfigurationSchema[] {
    return Array.from(this.schemas.values());
  }

  getSchemasByCategory(category: string): ConfigurationSchema[] {
    return Array.from(this.schemas.values())
      .filter(schema => schema.category === category)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }

  registerCustomValidator(
    key: string,
    validator: (value: unknown) => Promise<ValidationResult>
  ): void {
    this.customValidators.set(key, validator);
    console.log(`🔧 Registered custom validator: ${key}`);
  }

  // ============================================================================
  // Validation Operations
  // ============================================================================

  async validate(key: string, value: unknown): Promise<ValidationResult> {
    const schema = this.schemas.get(key);
    
    // If no schema exists, perform basic validation
    if (!schema) {
      return this.validateBasic(value);
    }

    // Perform schema-based validation
    return this.validateWithSchema(value, schema);
  }

  async validateBatch(updates: ConfigurationUpdate[]): Promise<BatchValidationResult> {
    const results = new Map<string, ValidationResult>();
    const globalErrors: string[] = [];
    let allValid = true;

    // Validate each update
    for (const update of updates) {
      try {
        const result = await this.validate(update.key, update.value);
        results.set(update.key, result);
        
        if (!result.valid) {
          allValid = false;
        }
      } catch (error) {
        const errorResult: ValidationResult = {
          valid: false,
          errors: [`Validation error: ${error}`]
        };
        results.set(update.key, errorResult);
        allValid = false;
      }
    }

    // Check for cross-field dependencies and conflicts
    const dependencyResult = await this.validateDependencies(updates);
    if (!dependencyResult.valid) {
      allValid = false;
      globalErrors.push(...dependencyResult.errors);
    }

    return {
      valid: allValid,
      results,
      globalErrors
    };
  }

  async getDefaultValue(key: string): Promise<ConfigurationValue | undefined> {
    const schema = this.schemas.get(key);
    return schema?.defaultValue;
  }

  // ============================================================================
  // Private Validation Methods
  // ============================================================================

  private validateBasic(value: unknown): ValidationResult {
    // Basic validation for unknown schemas
    if (value === null || value === undefined) {
      return {
        valid: true,
        errors: []
      };
    }

    // Check if value is a valid configuration type
    const validTypes = ['string', 'number', 'boolean'];
    const valueType = typeof value;
    
    if (!validTypes.includes(valueType) && !Array.isArray(value) && !(value instanceof File)) {
      return {
        valid: false,
        errors: [`Invalid value type: ${valueType}. Expected string, number, boolean, array, or File.`]
      };
    }

    return {
      valid: true,
      errors: []
    };
  }

  private async validateWithSchema(value: unknown, schema: ConfigurationSchema): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required values
    if (schema.required && (value === null || value === undefined || value === '')) {
      errors.push(`${schema.title} is required`);
      return { valid: false, errors, warnings };
    }

    // Skip validation if value is null/undefined and not required
    if (!schema.required && (value === null || value === undefined)) {
      return { valid: true, errors: [], warnings };
    }

    // Type validation
    const typeResult = this.validateType(value, schema.type);
    if (!typeResult.valid) {
      errors.push(...typeResult.errors);
      return { valid: false, errors, warnings };
    }

    // Schema rules validation
    if (schema.validation) {
      const rulesResult = await this.validateRules(value, schema.validation, schema);
      if (!rulesResult.valid) {
        errors.push(...rulesResult.errors);
      }
      if (rulesResult.warnings) {
        warnings.push(...rulesResult.warnings);
      }
    }

    // Custom validation
    const customValidator = this.customValidators.get(schema.key);
    if (customValidator) {
      try {
        const customResult = await customValidator(value);
        if (!customResult.valid) {
          errors.push(...customResult.errors);
        }
        if (customResult.warnings) {
          warnings.push(...customResult.warnings);
        }
      } catch (error) {
        errors.push(`Custom validation failed: ${error}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  private validateType(value: unknown, expectedType: string): ValidationResult {
    const actualType = this.getValueType(value);
    
    if (actualType !== expectedType) {
      return {
        valid: false,
        errors: [`Expected ${expectedType}, got ${actualType}`]
      };
    }

    return { valid: true, errors: [] };
  }

  private getValueType(value: unknown): string {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (Array.isArray(value)) return 'array';
    if (value instanceof File) return 'file';
    if (typeof value === 'object') return 'object';
    
    return 'unknown';
  }

  private async validateRules(
    value: unknown,
    rules: ValidationRules,
    schema: ConfigurationSchema
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // String validations
    if (typeof value === 'string') {
      if (rules.minLength !== undefined && value.length < rules.minLength) {
        errors.push(`${schema.title} must be at least ${rules.minLength} characters long`);
      }
      
      if (rules.maxLength !== undefined && value.length > rules.maxLength) {
        errors.push(`${schema.title} must be no more than ${rules.maxLength} characters long`);
      }
      
      if (rules.pattern && !new RegExp(rules.pattern).test(value)) {
        errors.push(`${schema.title} format is invalid`);
      }
    }

    // Number validations
    if (typeof value === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        errors.push(`${schema.title} must be at least ${rules.min}`);
      }
      
      if (rules.max !== undefined && value > rules.max) {
        errors.push(`${schema.title} must be no more than ${rules.max}`);
      }
    }

    // Options validation
    if (rules.options) {
      const validOptions = rules.options.map(opt => 
        typeof opt === 'string' ? opt : opt.value
      );
      
      if (!validOptions.includes(value as string)) {
        errors.push(`${schema.title} must be one of: ${validOptions.join(', ')}`);
      }
    }

    // Custom validation rule
    if (rules.customValidator) {
      try {
        const customResult = await rules.customValidator(value);
        if (!customResult.valid) {
          errors.push(...customResult.errors);
        }
        if (customResult.warnings) {
          warnings.push(...customResult.warnings);
        }
      } catch (error) {
        errors.push(`Custom validation rule failed: ${error}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  private async validateDependencies(updates: ConfigurationUpdate[]): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for conflicting configurations
    const voiceUpdate = updates.find(u => u.key === 'voice.enabled');

    // Check for API key requirements
    const geminiTempUpdate = updates.find(u => u.key === 'ai.gemini.temperature');
    const geminiKeyUpdate = updates.find(u => u.key === 'ai.gemini.api_key');
    
    if (geminiTempUpdate && (!geminiKeyUpdate || !geminiKeyUpdate.value)) {
      // Check if API key exists in storage (this would need storage access in real implementation)
      warnings.push('Gemini temperature setting may not work without a valid API key');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  // ============================================================================
  // Validation Utilities
  // ============================================================================

  /**
   * Create a validation function for API keys
   */
  static createApiKeyValidator(serviceName: string): (value: unknown) => Promise<ValidationResult> {
    return async (value: unknown): Promise<ValidationResult> => {
      if (typeof value !== 'string' || value.length === 0) {
        return {
          valid: true, // Allow empty API keys (optional)
          errors: [],
          warnings: [`${serviceName} API key is empty - service may not function`]
        };
      }

      // Basic format validation
      if (value.length < 20) {
        return {
          valid: false,
          errors: [`${serviceName} API key appears too short to be valid`]
        };
      }

      if (!/^[A-Za-z0-9_-]+$/.test(value)) {
        return {
          valid: false,
          errors: [`${serviceName} API key contains invalid characters`]
        };
      }

      return { valid: true, errors: [] };
    };
  }

  /**
   * Create a validation function for numeric ranges with units
   */
  static createNumericRangeValidator(
    min: number,
    max: number,
    unit: string
  ): (value: unknown) => Promise<ValidationResult> {
    return async (value: unknown): Promise<ValidationResult> => {
      if (typeof value !== 'number') {
        return {
          valid: false,
          errors: [`Value must be a number between ${min} and ${max} ${unit}`]
        };
      }

      if (value < min || value > max) {
        return {
          valid: false,
          errors: [`Value must be between ${min} and ${max} ${unit}`]
        };
      }

      return { valid: true, errors: [] };
    };
  }

  /**
   * Create a validation function for file uploads
   */
  static createFileValidator(
    allowedTypes: string[],
    maxSizeMB: number
  ): (value: unknown) => Promise<ValidationResult> {
    return async (value: unknown): Promise<ValidationResult> => {
      if (!(value instanceof File)) {
        return {
          valid: false,
          errors: ['Value must be a file']
        };
      }

      // Check file type
      const fileType = value.type.toLowerCase();
      const isAllowedType = allowedTypes.some(type => 
        fileType.includes(type.toLowerCase())
      );

      if (!isAllowedType) {
        return {
          valid: false,
          errors: [`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`]
        };
      }

      // Check file size
      const fileSizeMB = value.size / (1024 * 1024);
      if (fileSizeMB > maxSizeMB) {
        return {
          valid: false,
          errors: [`File size (${fileSizeMB.toFixed(2)}MB) exceeds limit of ${maxSizeMB}MB`]
        };
      }

      return { valid: true, errors: [] };
    };
  }
}