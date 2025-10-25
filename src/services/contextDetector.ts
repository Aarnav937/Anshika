/**
 * Context Detector Service
 * Automatically detects the context of a conversation to determine
 * which personality mode Anshika should use
 */

import type { PersonalityMode, ContextDetectionResult, UserSentiment } from '../types/personality';

/**
 * Detect the appropriate personality mode based on user message
 */
export function detectContext(userMessage: string, _conversationHistory?: string[]): ContextDetectionResult {
  const message = userMessage.toLowerCase();
  
  // Detect user sentiment first
  const sentiment = detectSentiment(message);
  
  // Support Mode - User seems frustrated, stuck, or stressed
  if (sentiment === 'frustrated' || sentiment === 'stressed' || sentiment === 'confused') {
    return {
      mode: 'support',
      confidence: 0.9,
      userSentiment: sentiment,
      reasoning: 'User appears to need emotional support or is experiencing difficulty'
    };
  }
  
  // Professional Mode - Technical/work-related tasks
  if (isProfessionalContext(message)) {
    return {
      mode: 'professional',
      confidence: 0.85,
      userSentiment: sentiment,
      reasoning: 'Technical or professional work detected'
    };
  }
  
  // Creative Mode - Art, brainstorming, creative work
  if (isCreativeContext(message)) {
    return {
      mode: 'creative',
      confidence: 0.85,
      userSentiment: sentiment,
      reasoning: 'Creative or artistic work detected'
    };
  }
  
  // Learning Mode - Educational, how-to, explanations
  if (isLearningContext(message)) {
    return {
      mode: 'learning',
      confidence: 0.8,
      userSentiment: sentiment,
      reasoning: 'Learning or educational context detected'
    };
  }
  
  // Casual Mode - General chat, greetings, casual conversation
  if (isCasualContext(message)) {
    return {
      mode: 'casual',
      confidence: 0.75,
      userSentiment: sentiment,
      reasoning: 'Casual conversation detected'
    };
  }
  
  // Default Mode - When unsure
  return {
    mode: 'default',
    confidence: 0.6,
    userSentiment: sentiment,
    reasoning: 'No specific context detected, using balanced approach'
  };
}

/**
 * Detect user sentiment from message
 */
export function detectSentiment(message: string): UserSentiment {
  const msg = message.toLowerCase();
  
  // Frustrated indicators
  const frustratedWords = [
    'frustrated', 'annoyed', 'stuck', 'broken', 'won\'t work', 'doesn\'t work',
    'not working', 'failed', 'error', 'bug', 'issue', 'problem', 'help!',
    'wrong', 'incorrect', 'can\'t figure', 'tried everything', 'giving up'
  ];
  if (frustratedWords.some(word => msg.includes(word))) {
    return 'frustrated';
  }
  
  // Stressed indicators
  const stressedWords = [
    'urgent', 'deadline', 'asap', 'hurry', 'quickly', 'fast',
    'stressed', 'overwhelmed', 'panic', 'worried', 'anxious'
  ];
  if (stressedWords.some(word => msg.includes(word))) {
    return 'stressed';
  }
  
  // Confused indicators
  const confusedWords = [
    'confused', 'don\'t understand', 'what does', 'what is',
    'how does', 'why does', 'unclear', 'not sure', 'don\'t get it',
    'explain', 'clarify', 'lost', 'complicated'
  ];
  if (confusedWords.some(word => msg.includes(word))) {
    return 'confused';
  }
  
  // Excited indicators
  const excitedWords = [
    'excited', 'awesome', 'amazing', 'love', 'great', 'fantastic',
    'wonderful', 'perfect', 'excellent', 'yay', '!', 'wow', 'cool'
  ];
  if (excitedWords.some(word => msg.includes(word)) || msg.split('!').length > 2) {
    return 'excited';
  }
  
  // Happy indicators
  const happyWords = [
    'happy', 'glad', 'thanks', 'thank you', 'appreciate',
    'good', 'nice', 'pleased', '😊', '😄', '🎉'
  ];
  if (happyWords.some(word => msg.includes(word))) {
    return 'happy';
  }
  
  // Accomplished indicators
  const accomplishedWords = [
    'worked', 'success', 'did it', 'fixed', 'solved', 'finished',
    'completed', 'done', 'accomplished', 'achieved'
  ];
  if (accomplishedWords.some(word => msg.includes(word))) {
    return 'accomplished';
  }
  
  // Default to neutral
  return 'neutral';
}

/**
 * Check if message indicates professional/technical context
 */
function isProfessionalContext(message: string): boolean {
  const professionalKeywords = [
    // Programming
    'code', 'function', 'class', 'variable', 'api', 'database', 'query',
    'debug', 'compile', 'build', 'deploy', 'test', 'git', 'commit',
    'typescript', 'javascript', 'python', 'java', 'react', 'vue', 'angular',
    
    // Technical
    'algorithm', 'optimize', 'performance', 'architecture', 'security',
    'authentication', 'authorization', 'encryption', 'backend', 'frontend',
    
    // Business/Professional
    'project', 'deadline', 'meeting', 'presentation', 'report',
    'documentation', 'requirements', 'specification'
  ];
  
  const keywordCount = professionalKeywords.filter(keyword => 
    message.includes(keyword)
  ).length;
  
  return keywordCount >= 2 || 
         message.includes('work on') || 
         message.includes('working on') ||
         message.includes('need to implement');
}

/**
 * Check if message indicates creative context
 */
function isCreativeContext(message: string): boolean {
  const creativeKeywords = [
    'create', 'design', 'draw', 'art', 'creative', 'brainstorm',
    'idea', 'ideas', 'imagine', 'concept', 'visualize', 'illustration',
    'story', 'write', 'compose', 'generate image', 'make something',
    'color', 'style', 'aesthetic', 'beautiful', 'artistic',
    'paint', 'sketch', 'craft', 'invent', 'original'
  ];
  
  const keywordCount = creativeKeywords.filter(keyword => 
    message.includes(keyword)
  ).length;
  
  return keywordCount >= 1 || 
         message.includes('what if') || 
         message.includes('let\'s make') ||
         message.includes('come up with');
}

/**
 * Check if message indicates learning context
 */
function isLearningContext(message: string): boolean {
  const learningKeywords = [
    'how to', 'how do', 'how does', 'what is', 'what are',
    'explain', 'teach', 'learn', 'understand', 'tutorial',
    'guide', 'show me', 'tell me', 'help me understand',
    'why does', 'why is', 'difference between', 'compare',
    'example', 'examples', 'demonstrate'
  ];
  
  return learningKeywords.some(keyword => message.includes(keyword)) ||
         message.endsWith('?') && (
           message.includes('what') || 
           message.includes('how') || 
           message.includes('why') ||
           message.includes('when') ||
           message.includes('where')
         );
}

/**
 * Check if message indicates casual context
 */
function isCasualContext(message: string): boolean {
  const casualKeywords = [
    'hi', 'hello', 'hey', 'sup', 'yo', 'greetings',
    'good morning', 'good afternoon', 'good evening',
    'how are you', 'what\'s up', 'wassup',
    'chat', 'talk', 'tell me about', 'random',
    'just wondering', 'curious', 'quick question'
  ];
  
  return casualKeywords.some(keyword => message.includes(keyword)) ||
         message.split(' ').length < 5; // Very short messages are usually casual
}

/**
 * Get confidence threshold for mode switching
 * Higher threshold = less likely to switch modes
 */
export function shouldSwitchMode(
  currentMode: PersonalityMode,
  detectedMode: PersonalityMode,
  confidence: number
): boolean {
  // Never switch from support mode unless confidence is very high
  if (currentMode === 'support' && confidence < 0.95) {
    return false;
  }
  
  // Don't switch if already in the right mode
  if (currentMode === detectedMode) {
    return false;
  }
  
  // Require high confidence to switch modes
  return confidence >= 0.8;
}
