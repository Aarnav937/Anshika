/**
 * Smart Mode Service
 * Analyzes prompts and hardware to recommend the best generation mode
 */

import { HardwareInfo } from '../../types/imageGeneration';

export interface ModeRecommendation {
  mode: 'online' | 'offline';
  qualityTier: 'fast' | 'medium' | 'high';
  confidence: number; // 0-100
  reasoning: string;
  estimatedTime: number; // seconds
}

export interface PromptComplexity {
  level: 'simple' | 'medium' | 'complex';
  score: number; // 0-100
  details: {
    objectCount: number;
    hasDetails: boolean;
    hasLighting: boolean;
    hasStyle: boolean;
    hasComposition: boolean;
  };
}

export class SmartModeService {
  /**
   * Analyze prompt complexity
   */
  analyzePrompt(prompt: string): PromptComplexity {
    const lowerPrompt = prompt.toLowerCase();
    
    // Count objects/subjects (simple heuristic)
    const objectIndicators = ['a ', 'an ', 'the ', 'with ', 'and '];
    const objectCount = objectIndicators.reduce(
      (count, indicator) => count + (lowerPrompt.split(indicator).length - 1),
      0
    );

    // Check for detail indicators
    const detailWords = ['detailed', 'intricate', 'complex', 'elaborate', 'ornate', 'precise'];
    const hasDetails = detailWords.some(word => lowerPrompt.includes(word));

    // Check for lighting terms
    const lightingWords = ['lighting', 'sunlight', 'shadow', 'bright', 'dark', 'glow', 'illuminat'];
    const hasLighting = lightingWords.some(word => lowerPrompt.includes(word));

    // Check for style terms
    const styleWords = ['style', 'artistic', 'realistic', 'abstract', 'painting', 'photograph', 'render'];
    const hasStyle = styleWords.some(word => lowerPrompt.includes(word));

    // Check for composition terms
    const compositionWords = ['composition', 'foreground', 'background', 'perspective', 'angle', 'view'];
    const hasComposition = compositionWords.some(word => lowerPrompt.includes(word));

    // Calculate complexity score
    let score = 0;
    score += Math.min(objectCount * 10, 30); // Max 30 points for objects
    score += hasDetails ? 20 : 0;
    score += hasLighting ? 15 : 0;
    score += hasStyle ? 15 : 0;
    score += hasComposition ? 20 : 0;

    // Determine complexity level
    let level: 'simple' | 'medium' | 'complex';
    if (score < 30) level = 'simple';
    else if (score < 60) level = 'medium';
    else level = 'complex';

    return {
      level,
      score,
      details: {
        objectCount,
        hasDetails,
        hasLighting,
        hasStyle,
        hasComposition,
      },
    };
  }

  /**
   * Recommend best mode based on hardware and prompt
   */
  recommendMode(
    hardwareInfo: HardwareInfo,
    promptComplexity: PromptComplexity,
    userPreference?: 'speed' | 'quality' | 'balanced'
  ): ModeRecommendation {
    const hasGPU = hardwareInfo.gpu.model !== 'Unknown';

    // Default to online mode (offline removed)
    let mode: 'online' | 'offline' = 'online';
    let qualityTier: 'fast' | 'medium' | 'high' = 'medium';
    let confidence = 90;
    let reasoning = 'Online mode recommended for reliable, high-quality results.';
    let estimatedTime = 10;

    // Offline mode removed - always use online

    // Adjust quality based on prompt complexity
    if (userPreference === 'speed') {
      qualityTier = 'fast';
      estimatedTime = 8;
      reasoning = 'Fast quality for quick results.';
    } else if (userPreference === 'quality') {
      qualityTier = 'high';
      estimatedTime = 15;
      reasoning = 'High quality for best results.';
    } else {
      // Balanced or auto
      switch (promptComplexity.level) {
        case 'simple':
          qualityTier = 'fast';
          estimatedTime = 8;
          reasoning = 'Simple prompt detected. Standard quality will work great.';
          break;
        case 'medium':
          qualityTier = 'medium';
          estimatedTime = 10;
          reasoning = 'Medium complexity prompt. Balanced quality recommended.';
          break;
        case 'complex':
          qualityTier = 'high';
          estimatedTime = 15;
          reasoning = 'Complex prompt with details. HD quality recommended for best results.';
          break;
      }
    }

    // Adjust confidence based on hardware
    if (!hasGPU) {
      confidence = Math.max(confidence - 10, 70);
      reasoning += ' (Limited GPU detected - online mode ensures quality)';
    }

    return {
      mode,
      qualityTier,
      confidence,
      reasoning,
      estimatedTime,
    };
  }

  /**
   * Get recommendation with explanations
   */
  async getSmartRecommendation(
    prompt: string,
    hardwareInfo: HardwareInfo,
    userPreference?: 'speed' | 'quality' | 'balanced'
  ): Promise<ModeRecommendation> {
    const complexity = this.analyzePrompt(prompt);
    const recommendation = this.recommendMode(hardwareInfo, complexity, userPreference);
    
    return recommendation;
  }
}

// Export singleton instance
export const smartModeService = new SmartModeService();
