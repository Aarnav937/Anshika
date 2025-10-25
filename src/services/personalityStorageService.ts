/**
 * Personality Storage Service
 * MEMORY DISABLED - Returns defaults only
 */

import type { PersonalityConfig } from '../types/personality';
import { createDefaultPersonalityConfig } from '../config/personalityConfig';

/**
 * Load personality configuration (ALWAYS RETURNS DEFAULT)
 */
export function loadPersonalityConfig(): PersonalityConfig {
  // MEMORY DISABLED - Always return fresh default config
  console.log('📝 Using default personality config (memory disabled)');
  return createDefaultPersonalityConfig();
}

/**
 * Save personality configuration (NO-OP)
 */
export function savePersonalityConfig(_config: PersonalityConfig): void {
  // MEMORY DISABLED - Do nothing
  console.log('💾 Personality save disabled');
}

/**
 * Clear personality configuration (NO-OP)
 */
export function clearPersonalityConfig(): void {
  // MEMORY DISABLED - Do nothing
  console.log('🗑️ Personality clear disabled');
}

/**
 * Update and save personality configuration (NO-OP)
 */
export function updateAndSavePersonalityConfig(
  currentConfig: PersonalityConfig,
  updates: Partial<PersonalityConfig>
): PersonalityConfig {
  // MEMORY DISABLED - Return current config without saving
  const newConfig = {
    ...currentConfig,
    ...updates
  };
  return newConfig;
}

/**
 * Reset personality configuration to defaults
 */
export function resetPersonalityToDefaults(): PersonalityConfig {
  const defaultConfig = createDefaultPersonalityConfig();
  console.log('🔄 Reset personality to defaults');
  return defaultConfig;
}
