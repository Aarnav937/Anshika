/**
 * Prompt Enhancement Service
 * Uses Gemini to enhance user prompts for better image generation
 */

import axios from 'axios';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

export type EnhancementStrength = 'subtle' | 'moderate' | 'strong';

export interface EnhancedPromptResult {
  original: string;
  enhanced: string;
  negativePrompt: string;
  improvements: string[];
  confidence: number;
}

export class PromptEnhancementService {
  private initialized = false;

  async initialize(): Promise<void> {
    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key not configured');
    }
    this.initialized = true;
  }

  /**
   * Enhance a prompt using AI
   */
  async enhancePrompt(
    prompt: string,
    strength: EnhancementStrength = 'moderate'
  ): Promise<EnhancedPromptResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    const systemPrompt = this.getSystemPrompt(strength);
    const fullPrompt = `${systemPrompt}\n\nUser's prompt: "${prompt}"\n\nProvide your response in JSON format with these fields:\n- enhanced: the enhanced prompt\n- negativePrompt: what to avoid\n- improvements: array of what you added\n- confidence: 0-100`;

    try {
      const response = await axios.post(
        `${GEMINI_BASE_URL}/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
        {
          contents: [
            {
              parts: [{ text: fullPrompt }]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500,
          }
        }
      );

      const text = response.data.candidates[0]?.content?.parts[0]?.text || '';
      
      // Parse JSON response (handle markdown code blocks)
      const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || 
                       text.match(/```\n?([\s\S]*?)\n?```/) ||
                       [null, text];
      
      const parsed = JSON.parse(jsonMatch[1] || text);

      return {
        original: prompt,
        enhanced: parsed.enhanced || prompt,
        negativePrompt: parsed.negativePrompt || this.getDefaultNegativePrompt(),
        improvements: parsed.improvements || [],
        confidence: parsed.confidence || 80,
      };
    } catch (error) {
      console.error('Error enhancing prompt:', error);
      
      // Fallback to manual enhancement
      return this.fallbackEnhancement(prompt, strength);
    }
  }

  /**
   * Get system prompt based on enhancement strength
   */
  private getSystemPrompt(strength: EnhancementStrength): string {
    const base = `You are an expert at writing prompts for AI image generation. Your task is to enhance user prompts to get better results while preserving the user's intent.`;

    switch (strength) {
      case 'subtle':
        return `${base}
        
Make MINIMAL changes:
- Fix obvious grammar issues
- Add 1-2 quality modifiers (e.g., "high quality", "detailed")
- Keep the original style and intent intact
- Don't add new subjects or scenes`;

      case 'moderate':
        return `${base}
        
Make BALANCED enhancements:
- Add technical details (lighting, composition, style)
- Include 2-3 quality modifiers
- Suggest appropriate artistic style if not specified
- Add environment details if scene is vague
- Keep original subject and intent`;

      case 'strong':
        return `${base}
        
Make COMPREHENSIVE enhancements:
- Add detailed technical specifications
- Include lighting, camera angle, composition details
- Specify artistic style and influences
- Add atmospheric and mood descriptions
- Include quality modifiers and rendering details
- Expand on subject details and environment`;
    }
  }

  /**
   * Fallback enhancement when API fails
   */
  private fallbackEnhancement(
    prompt: string,
    strength: EnhancementStrength
  ): EnhancedPromptResult {
    let enhanced = prompt;
    const improvements: string[] = [];

    // Add quality modifiers if not present
    if (!prompt.toLowerCase().includes('quality') && 
        !prompt.toLowerCase().includes('detailed')) {
      enhanced += ', high quality, detailed';
      improvements.push('Added quality modifiers');
    }

    // Add rendering style for moderate/strong
    if (strength !== 'subtle') {
      if (!prompt.toLowerCase().includes('realistic') &&
          !prompt.toLowerCase().includes('photograph') &&
          !prompt.toLowerCase().includes('painting')) {
        enhanced += ', photorealistic';
        improvements.push('Added rendering style');
      }
    }

    // Add lighting for strong enhancement
    if (strength === 'strong') {
      if (!prompt.toLowerCase().includes('light')) {
        enhanced += ', professional lighting';
        improvements.push('Added lighting details');
      }
    }

    return {
      original: prompt,
      enhanced: enhanced.trim(),
      negativePrompt: this.getDefaultNegativePrompt(),
      improvements: improvements.length > 0 ? improvements : ['No changes needed'],
      confidence: 60,
    };
  }

  /**
   * Generate negative prompt suggestions
   */
  async generateNegativePrompt(prompt: string): Promise<string> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const response = await axios.post(
        `${GEMINI_BASE_URL}/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
        {
          contents: [
            {
              parts: [{
                text: `Given this image generation prompt: "${prompt}"
                
                Suggest what should be AVOIDED or EXCLUDED in the generated image. 
                Focus on common artifacts, unwanted elements, and quality issues.
                Keep it concise - just list the unwanted elements separated by commas.
                
                Example: "blurry, low quality, distorted, ugly, deformed, artifacts"`
              }]
            }
          ],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 100,
          }
        }
      );

      const text = response.data.candidates[0]?.content?.parts[0]?.text || '';
      return text.trim();
    } catch (error) {
      return this.getDefaultNegativePrompt();
    }
  }

  /**
   * Default negative prompt
   */
  private getDefaultNegativePrompt(): string {
    return 'blurry, low quality, distorted, ugly, deformed, bad anatomy, artifacts, watermark, text, signature';
  }

  /**
   * Analyze prompt and suggest improvements
   */
  async analyzePrompt(prompt: string): Promise<{
    score: number;
    suggestions: string[];
    strengths: string[];
  }> {
    let score = 50; // Base score
    const suggestions: string[] = [];
    const strengths: string[] = [];

    // Check length
    if (prompt.length < 10) {
      suggestions.push('Prompt is too short - add more details');
      score -= 10;
    } else if (prompt.length > 20) {
      strengths.push('Good prompt length');
      score += 10;
    }

    // Check for descriptive words
    const descriptiveWords = ['beautiful', 'stunning', 'detailed', 'intricate', 'vibrant', 'elegant'];
    if (descriptiveWords.some(word => prompt.toLowerCase().includes(word))) {
      strengths.push('Includes descriptive adjectives');
      score += 10;
    } else {
      suggestions.push('Add descriptive adjectives for better results');
    }

    // Check for style specifications
    const styleWords = ['realistic', 'abstract', 'painting', 'photograph', 'digital art', 'watercolor'];
    if (styleWords.some(word => prompt.toLowerCase().includes(word))) {
      strengths.push('Artistic style specified');
      score += 10;
    } else {
      suggestions.push('Consider specifying an artistic style');
    }

    // Check for lighting/atmosphere
    const atmosphereWords = ['light', 'shadow', 'glow', 'bright', 'dark', 'atmospheric'];
    if (atmosphereWords.some(word => prompt.toLowerCase().includes(word))) {
      strengths.push('Lighting/atmosphere described');
      score += 10;
    } else {
      suggestions.push('Add lighting or atmosphere details');
    }

    // Check for composition
    const compositionWords = ['foreground', 'background', 'center', 'frame', 'perspective'];
    if (compositionWords.some(word => prompt.toLowerCase().includes(word))) {
      strengths.push('Composition specified');
      score += 10;
    }

    return {
      score: Math.min(Math.max(score, 0), 100),
      suggestions,
      strengths,
    };
  }
}

// Export singleton instance
export const promptEnhancementService = new PromptEnhancementService();
