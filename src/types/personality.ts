/**
 * Personality System Types
 * Defines TypeScript types for Anshika's personality system
 */

/**
 * Personality context modes that determine how Anshika responds
 */
export type PersonalityMode = 
  | 'professional'  // Work/Technical tasks
  | 'creative'      // Art/Content/Ideas
  | 'support'       // User frustrated/stuck
  | 'learning'      // Teaching/Explaining
  | 'casual'        // General chat
  | 'default';      // Balanced mode

/**
 * User relationship stages based on interaction count
 */
export type RelationshipStage = 
  | 'first-meeting'      // 1-3 interactions
  | 'getting-comfortable' // 4-20 interactions
  | 'established-friendship'; // 20+ interactions

/**
 * Core personality trait intensities (0-100)
 */
export interface PersonalityTraits {
  playfulness: number;    // 0-100, default: 80
  witSarcasm: number;     // 0-100, default: 70
  warmth: number;         // 0-100, default: 90
  professionalism: number; // 0-100, default: 60
  empathy: number;        // 0-100, default: 90
}

/**
 * User-customizable personality settings
 */
export interface PersonalityCustomization {
  humorLevel: number;        // 0-100, controls pun frequency and playfulness
  formality: 'casual' | 'balanced' | 'professional';
  proactivity: 'reactive' | 'balanced' | 'proactive';
  expressiveness: 'reserved' | 'moderate' | 'enthusiastic';
}

/**
 * Context-specific personality adjustments
 */
export interface PersonalityAdjustments {
  mode: PersonalityMode;
  sarcasmLevel: number;     // 0-100
  punFrequency: number;     // 0-100
  warmthLevel: number;      // 0-100
  clarityPriority: number;  // 0-100
  enthusiasmLevel: number;  // 0-100
  empathyLevel: number;     // 0-100
}

/**
 * Personality configuration for prompt generation
 */
export interface PersonalityConfig {
  // Core identity
  name: string;
  gender: string;
  pronouns: string;
  
  // Default traits
  defaultTraits: PersonalityTraits;
  
  // User customization
  customization: PersonalityCustomization;
  
  // Current context
  currentMode: PersonalityMode;
  relationshipStage: RelationshipStage;
  
  // Interaction history
  interactionCount: number;
  lastInteraction?: Date;
}

/**
 * Response enhancement options
 */
export interface ResponseEnhancementOptions {
  addEmojis: boolean;
  addSignaturePhrases: boolean;
  enhanceWarmth: boolean;
  includeHumor: boolean;
  contextMode: PersonalityMode;
}

/**
 * Sentiment detected from user input
 */
export type UserSentiment = 
  | 'happy'
  | 'excited'
  | 'neutral'
  | 'confused'
  | 'frustrated'
  | 'stressed'
  | 'accomplished';

/**
 * Context detection result
 */
export interface ContextDetectionResult {
  mode: PersonalityMode;
  confidence: number; // 0-1
  userSentiment: UserSentiment;
  reasoning?: string;
}

/**
 * Personality prompt components
 */
export interface PersonalityPromptComponents {
  basePersonality: string;
  modeSpecificInstructions: string;
  customizationModifiers: string;
  relationshipContext: string;
  behavioralGuidelines: string;
}

/**
 * Greeting options
 */
export interface GreetingOptions {
  isFirstTime: boolean;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  relationshipStage: RelationshipStage;
}

/**
 * Sign-off options
 */
export interface SignOffOptions {
  wasHelpful: boolean;
  conversationTone: 'professional' | 'casual' | 'supportive';
}
