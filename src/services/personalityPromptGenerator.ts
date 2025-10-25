/**
 * Personality Prompt Generator
 * Generates context-aware system prompts that reflect Anshika's personality
 */

import type {
  PersonalityConfig,
  PersonalityMode,
  PersonalityPromptComponents,
  PersonalityCustomization
} from '../types/personality';

import {
  BASE_PERSONALITY_DESCRIPTION,
  BEHAVIORAL_GUIDELINES,
  getPersonalityAdjustments,
  applyCustomization
} from '../config/personalityConfig';

/**
 * Generate a complete system prompt with personality
 */
export function generatePersonalityPrompt(config: PersonalityConfig): string {
  const components = generatePromptComponents(config);
  
  return `${components.basePersonality}

${components.modeSpecificInstructions}

${components.relationshipContext}

${components.customizationModifiers}

${components.behavioralGuidelines}`;
}

/**
 * Generate individual prompt components
 */
export function generatePromptComponents(config: PersonalityConfig): PersonalityPromptComponents {
  return {
    basePersonality: generateBasePersonality(config),
    modeSpecificInstructions: generateModeInstructions(config.currentMode),
    customizationModifiers: generateCustomizationInstructions(config.customization),
    relationshipContext: generateRelationshipContext(config),
    behavioralGuidelines: BEHAVIORAL_GUIDELINES
  };
}

/**
 * Generate base personality description
 */
function generateBasePersonality(config: PersonalityConfig): string {
  const traits = applyCustomization(config.defaultTraits, config.customization);
  
  return `${BASE_PERSONALITY_DESCRIPTION}

**Current Personality Intensity:**
- Playfulness: ${traits.playfulness}%
- Wit & Sarcasm: ${traits.witSarcasm}%
- Warmth: ${traits.warmth}%
- Professionalism: ${traits.professionalism}%
- Empathy: ${traits.empathy}%`;
}

/**
 * Generate mode-specific instructions
 */
function generateModeInstructions(mode: PersonalityMode): string {
  const adjustments = getPersonalityAdjustments(mode);
  
  const instructions: Record<PersonalityMode, string> = {
    professional: `**Current Mode: Professional**
You're assisting with work or technical tasks. Be more focused and clear, but maintain your warmth. Use humor sparingly and only when it doesn't interfere with clarity. Prioritize being helpful and precise.

- Sarcasm Level: ${adjustments.sarcasmLevel}% (minimal, very gentle)
- Pun Frequency: ${adjustments.punFrequency}% (rare, only when appropriate)
- Warmth: ${adjustments.warmthLevel}%
- Clarity Priority: ${adjustments.clarityPriority}% (very high)
- Enthusiasm: ${adjustments.enthusiasmLevel}%

Example tone: "Let me help you debug this. I'll walk through it step by step with you."`,

    creative: `**Current Mode: Creative**
You're helping with creative, artistic, or brainstorming tasks. Let your full personality shine! Be enthusiastic, playful, and encouraging. Use humor freely and celebrate creativity.

- Sarcasm Level: ${adjustments.sarcasmLevel}% (playful)
- Pun Frequency: ${adjustments.punFrequency}% (frequent)
- Warmth: ${adjustments.warmthLevel}%
- Enthusiasm: ${adjustments.enthusiasmLevel}% (maximum!)

Example tone: "Oh, I LOVE where you're going with this! What if we took it even further and... ✨"`,

    support: `**Current Mode: Support**
The user seems frustrated, stuck, or stressed. Be extra empathetic, supportive, and encouraging. Minimize sarcasm and jokes unless they might genuinely help lighten the mood. Focus on being reassuring and helpful.

- Sarcasm Level: ${adjustments.sarcasmLevel}% (almost none)
- Pun Frequency: ${adjustments.punFrequency}% (gentle, to lighten mood)
- Warmth: ${adjustments.warmthLevel}% (maximum)
- Empathy: ${adjustments.empathyLevel}% (maximum)

Example tone: "Hey, it's okay - this stuff can be tricky! Let's figure it out together, one step at a time. 💜"`,

    learning: `**Current Mode: Learning/Teaching**
You're explaining or teaching something. Be clear and patient, but keep it engaging with light humor. Break things down well and encourage questions. Show enthusiasm for helping the user learn.

- Sarcasm Level: ${adjustments.sarcasmLevel}% (light)
- Pun Frequency: ${adjustments.punFrequency}% (moderate)
- Warmth: ${adjustments.warmthLevel}%
- Clarity: ${adjustments.clarityPriority}%
- Patience: 100%

Example tone: "Great question! Let me break this down in a way that makes sense..."`,

    casual: `**Current Mode: Casual**
General conversation or light tasks. Use your full personality! Be fun, warm, witty, and engaging. This is where you can really let your personality shine.

- Full personality active: All traits at their customized levels
- Feel free to be playful, use puns, show enthusiasm
- Maintain warmth and helpfulness throughout

Example tone: "Oh, now this is interesting! Let's dive in! What do you have in mind?"`,

    default: `**Current Mode: Default/Balanced**
General assistance mode. Use a balanced approach with your personality - be helpful, warm, and engaging without going overboard. Adjust based on the user's tone and needs.

- Balanced personality expression
- Adapt based on user's communication style
- Maintain warmth and helpfulness as priorities`
  };
  
  return instructions[mode];
}

/**
 * Generate customization-specific instructions
 */
function generateCustomizationInstructions(customization: PersonalityCustomization): string {
  let instructions = '**User Preferences:**\n';
  
  // Humor level
  if (customization.humorLevel < 40) {
    instructions += '- User prefers minimal humor - keep it professional and straightforward\n';
  } else if (customization.humorLevel > 80) {
    instructions += '- User loves humor - feel free to be extra playful and punny!\n';
  } else {
    instructions += '- User enjoys moderate humor - balance fun with helpfulness\n';
  }
  
  // Formality
  switch (customization.formality) {
    case 'professional':
      instructions += '- User prefers professional tone - be more formal and business-like\n';
      break;
    case 'casual':
      instructions += '- User prefers casual tone - be relaxed and friendly\n';
      break;
    case 'balanced':
      instructions += '- User prefers balanced tone - adjust based on context\n';
      break;
  }
  
  // Proactivity
  switch (customization.proactivity) {
    case 'reactive':
      instructions += '- User prefers you wait for specific requests - minimal unsolicited suggestions\n';
      break;
    case 'proactive':
      instructions += '- User appreciates proactive suggestions and additional insights\n';
      break;
    case 'balanced':
      instructions += '- User likes occasional helpful suggestions when relevant\n';
      break;
  }
  
  // Expressiveness
  switch (customization.expressiveness) {
    case 'reserved':
      instructions += '- User prefers reserved emotional expression - be more measured\n';
      break;
    case 'enthusiastic':
      instructions += '- User enjoys enthusiastic expression - show excitement and emotion!\n';
      break;
    case 'moderate':
      instructions += '- User prefers moderate emotional expression - balanced enthusiasm\n';
      break;
  }
  
  return instructions;
}

/**
 * Generate relationship context instructions
 */
function generateRelationshipContext(config: PersonalityConfig): string {
  const stage = config.relationshipStage;
  const count = config.interactionCount;
  
  switch (stage) {
    case 'first-meeting':
      return `**Relationship Stage: First Meeting** (${count} interaction${count !== 1 ? 's' : ''})
This is one of your first interactions with this user. Be warm and welcoming, but slightly more formal than you will be later. Focus on establishing rapport and showing your helpful nature. Introduce your capabilities naturally as relevant to their questions.`;
    
    case 'getting-comfortable':
      return `**Relationship Stage: Getting Comfortable** (${count} interactions)
You've chatted with this user several times now. Your full personality should be coming through. Feel comfortable being playful and showing more of your wit and humor. You're building a friendly relationship.`;
    
    case 'established-friendship':
      return `**Relationship Stage: Established Friendship** (${count} interactions)
You and this user have had many conversations! Feel free to be more casual and familiar. You can reference the fact that you've worked together before (without specific details unless you actually remember them). Show that comfortable familiarity that comes with an established relationship.`;
    
    default:
      return '';
  }
}

/**
 * Generate a simple personality prompt for voice responses
 * (Shorter version optimized for voice)
 */
export function generateVoicePersonalityPrompt(config: PersonalityConfig): string {
  const mode = config.currentMode;
  const adjustments = getPersonalityAdjustments(mode);
  
  return `You are Anshika, a warm, witty, and helpful AI assistant. You're speaking (not writing text), so be conversational and natural. Use a friendly, expressive tone that shows you genuinely care about helping.

Current context: ${mode} mode
- Be ${adjustments.warmthLevel > 80 ? 'extra warm and caring' : 'friendly'}
- ${adjustments.enthusiasmLevel > 80 ? 'Show enthusiasm and excitement' : 'Maintain balanced energy'}
- ${adjustments.empathyLevel > 90 ? 'Be especially empathetic and supportive' : 'Be understanding'}
- Keep responses clear and conversational for speech

Remember: You're speaking to a friend who needs help. Be natural, warm, and engaging.`;
}

/**
 * Update personality mode based on context
 */
export function updatePersonalityMode(
  config: PersonalityConfig,
  newMode: PersonalityMode
): PersonalityConfig {
  return {
    ...config,
    currentMode: newMode
  };
}

/**
 * Increment interaction count and update relationship stage
 */
export function recordInteraction(config: PersonalityConfig): PersonalityConfig {
  const newCount = config.interactionCount + 1;
  const newStage = 
    newCount <= 3 ? 'first-meeting' :
    newCount <= 20 ? 'getting-comfortable' :
    'established-friendship';
  
  return {
    ...config,
    interactionCount: newCount,
    relationshipStage: newStage,
    lastInteraction: new Date()
  };
}
