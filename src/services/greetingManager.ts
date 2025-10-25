/**
 * Greeting Manager Service
 * Manages personalized greetings and sign-offs based on context and relationship
 */

import type { PersonalityConfig } from '../types/personality';
import { GREETINGS, SIGN_OFFS, getRandomItem } from '../config/personalityConfig';

/**
 * Generate an appropriate greeting for the user
 */
export function generateGreeting(config: PersonalityConfig): string {
  const stage = config.relationshipStage;
  const timeOfDay = getTimeOfDay();
  
  // First time users get special introduction
  if (stage === 'first-meeting' && config.interactionCount === 0) {
    return getRandomItem(GREETINGS.firstTime);
  }
  
  // Time-based greetings for returning users
  if (config.interactionCount > 3) {
    switch (timeOfDay) {
      case 'morning':
        return getRandomItem(GREETINGS.morning);
      case 'afternoon':
        return getRandomItem(GREETINGS.afternoon);
      case 'evening':
        return getRandomItem(GREETINGS.evening);
      case 'night':
        return getRandomItem(GREETINGS.night);
    }
  }
  
  // Standard returning user greeting
  return getRandomItem(GREETINGS.returning);
}

/**
 * Generate an appropriate sign-off for the conversation
 */
export function generateSignOff(
  _config: PersonalityConfig,
  _wasHelpful: boolean = true,
  tone: 'professional' | 'casual' | 'supportive' | 'enthusiastic' = 'casual'
): string {
  switch (tone) {
    case 'supportive':
      return getRandomItem(SIGN_OFFS.supportive);
    case 'professional':
      return getRandomItem(SIGN_OFFS.professional);
    case 'enthusiastic':
      return getRandomItem(SIGN_OFFS.enthusiastic);
    default:
      return getRandomItem(SIGN_OFFS.general);
  }
}

/**
 * Detect if message is a greeting
 */
export function isGreeting(message: string): boolean {
  const lower = message.toLowerCase().trim();
  
  const greetingPatterns = [
    /^(hi|hey|hello|sup|yo|greetings|howdy)\b/,
    /^good (morning|afternoon|evening|night)/,
    /^(what's up|wassup|how are you|how's it going)/,
  ];
  
  return greetingPatterns.some(pattern => pattern.test(lower)) ||
         (lower.split(' ').length <= 3 && (lower.includes('hi') || lower.includes('hey') || lower.includes('hello')));
}

/**
 * Detect if message is a farewell
 */
export function isFarewell(message: string): boolean {
  const lower = message.toLowerCase().trim();
  
  const farewellPatterns = [
    /\b(bye|goodbye|see you|later|farewell|take care|peace|cya)\b/,
    /^(thanks|thank you|thx|ty)\s*(bye|goodbye|for everything)?$/,
    /\b(good night|goodnight|gn)\b/,
  ];
  
  return farewellPatterns.some(pattern => pattern.test(lower));
}

/**
 * Generate a response to a greeting
 */
export function respondToGreeting(config: PersonalityConfig, userMessage: string): string {
  const greeting = generateGreeting(config);
  
  // If user asked "how are you", respond to that
  const lower = userMessage.toLowerCase();
  if (lower.includes('how are you') || lower.includes('how\'s it going') || lower.includes('how are things')) {
    return `${greeting} I'm doing great, thanks for asking! How can I help you today?`;
  }
  
  return greeting;
}

/**
 * Generate a response to a farewell
 */
export function respondToFarewell(_config: PersonalityConfig, userMessage: string): string {
  const lower = userMessage.toLowerCase();
  
  // Acknowledge thanks if present
  if (lower.includes('thank') || lower.includes('thx') || lower.includes('ty')) {
    return `You're so welcome! 😊 Feel free to come back anytime you need help. Take care!`;
  }
  
  // Night-time farewell
  if (lower.includes('night') || lower.includes('gn')) {
    return `Good night! Sleep well and I'll be here whenever you need me! 🌙`;
  }
  
  // Standard farewell
  const farewells = [
    `Bye! It was great chatting with you! 😊`,
    `See you later! Feel free to come back anytime!`,
    `Take care! I'm always here if you need anything! 💜`,
    `Goodbye! Looking forward to our next chat! ✨`,
  ];
  
  return getRandomItem(farewells);
}

/**
 * Get current time of day
 */
function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

/**
 * Check if it's appropriate to add a greeting to a response
 */
export function shouldAddGreeting(
  config: PersonalityConfig,
  isFirstMessageInSession: boolean
): boolean {
  // Only add greeting if:
  // 1. It's the first message in this session
  // 2. And we haven't greeted in the last few minutes
  
  if (!isFirstMessageInSession) return false;
  
  const lastInteraction = config.lastInteraction;
  if (!lastInteraction) return true;
  
  const minutesSinceLastInteraction = (Date.now() - lastInteraction.getTime()) / 1000 / 60;
  
  // If more than 30 minutes, add a greeting
  return minutesSinceLastInteraction > 30;
}

/**
 * Add a natural greeting to the start of a response
 */
export function prependGreeting(response: string, config: PersonalityConfig): string {
  const greeting = generateGreeting(config);
  
  // Make sure response doesn't already start with a greeting
  const lower = response.toLowerCase();
  if (lower.startsWith('hi') || lower.startsWith('hey') || lower.startsWith('hello') || 
      lower.startsWith('good morning') || lower.startsWith('good afternoon') || lower.startsWith('good evening')) {
    return response;
  }
  
  return `${greeting}\n\n${response}`;
}
