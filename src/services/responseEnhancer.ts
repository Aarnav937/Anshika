/**
 * Response Enhancer Service
 * Post-processes AI responses to add personality markers, emojis, and warmth
 */

import type { PersonalityMode, PersonalityConfig } from '../types/personality';
import { EMOJI_PATTERNS, SIGNATURE_PHRASES, getRandomItem } from '../config/personalityConfig';

export interface EnhancementOptions {
  mode: PersonalityMode;
  addEmojis: boolean;
  addSignaturePhrases: boolean;
  enhanceWarmth: boolean;
  humorLevel: number; // 0-100
}

/**
 * Enhance an AI response with personality markers
 */
export function enhanceResponse(
  response: string,
  config: PersonalityConfig,
  options?: Partial<EnhancementOptions>
): string {
  const opts: EnhancementOptions = {
    mode: config.currentMode,
    addEmojis: config.customization.expressiveness !== 'reserved',
    addSignaturePhrases: true,
    enhanceWarmth: true,
    humorLevel: config.customization.humorLevel,
    ...options
  };

  let enhanced = response;

  // Add emojis if appropriate
  if (opts.addEmojis && shouldAddEmojis(opts.mode, enhanced)) {
    enhanced = addContextualEmojis(enhanced, opts.mode);
  }

  // Enhance warmth markers
  if (opts.enhanceWarmth) {
    enhanced = enhanceWarmthMarkers(enhanced, opts.mode);
  }

  return enhanced;
}

/**
 * Check if we should add emojis to this response
 */
function shouldAddEmojis(mode: PersonalityMode, response: string): boolean {
  // Don't add if already has plenty of emojis
  const emojiCount = (response.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
  if (emojiCount >= 3) return false;

  // Support mode: minimal emojis (unless celebrating success)
  if (mode === 'support' && !response.toLowerCase().includes('great') && !response.toLowerCase().includes('awesome')) {
    return emojiCount === 0; // Only add one if none present
  }

  // Professional mode: very minimal
  if (mode === 'professional') {
    return emojiCount === 0 && response.length > 200; // Only for longer responses
  }

  // Creative and casual modes: yes!
  return true;
}

/**
 * Add contextual emojis to response
 */
function addContextualEmojis(response: string, mode: PersonalityMode): string {
  const sentences = response.split(/([.!?]+\s+)/);
  let enhanced = '';
  let emojisAdded = 0;
  const maxEmojis = mode === 'creative' ? 3 : mode === 'casual' ? 2 : 1;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    enhanced += sentence;

    // Don't add emoji to punctuation-only parts
    if (sentence.match(/^[.!?]+\s+$/)) continue;

    // Add emoji at natural break points
    if (emojisAdded < maxEmojis && shouldAddEmojiHere(sentence, mode)) {
      const emoji = selectAppropriateEmoji(sentence, mode);
      if (emoji && !sentence.includes(emoji)) {
        enhanced += ' ' + emoji;
        emojisAdded++;
      }
    }
  }

  return enhanced.trim();
}

/**
 * Check if we should add an emoji after this sentence
 */
function shouldAddEmojiHere(sentence: string, mode: PersonalityMode): boolean {
  const lower = sentence.toLowerCase();

  // Positive/encouraging sentences
  if (lower.includes('great') || lower.includes('awesome') || lower.includes('perfect') ||
      lower.includes('excellent') || lower.includes('love') || lower.includes('wonderful')) {
    return true;
  }

  // Supportive sentences
  if (lower.includes('help') || lower.includes('together') || lower.includes('got this') ||
      lower.includes('you can') || lower.includes('you\'re doing')) {
    return mode === 'support' || mode === 'casual';
  }

  // Creative excitement
  if (lower.includes('create') || lower.includes('idea') || lower.includes('imagine') ||
      lower.includes('exciting') || lower.includes('amazing')) {
    return mode === 'creative';
  }

  return false;
}

/**
 * Select appropriate emoji for context
 */
function selectAppropriateEmoji(sentence: string, mode: PersonalityMode): string {
  const lower = sentence.toLowerCase();

  // Mode-specific emoji selection
  if (mode === 'creative') {
    if (lower.includes('create') || lower.includes('art') || lower.includes('design')) {
      return getRandomItem(EMOJI_PATTERNS.creative);
    }
    if (lower.includes('idea') || lower.includes('think')) {
      return getRandomItem(EMOJI_PATTERNS.thinking);
    }
  }

  if (mode === 'support') {
    if (lower.includes('together') || lower.includes('help') || lower.includes('got this')) {
      return getRandomItem(EMOJI_PATTERNS.support);
    }
  }

  // Success/celebration
  if (lower.includes('great') || lower.includes('awesome') || lower.includes('perfect')) {
    return getRandomItem(EMOJI_PATTERNS.celebration);
  }

  // Excitement
  if (lower.includes('exciting') || lower.includes('amazing') || lower.includes('love')) {
    return getRandomItem(EMOJI_PATTERNS.excitement);
  }

  // Default warmth
  return getRandomItem(EMOJI_PATTERNS.warmth);
}

/**
 * Enhance warmth markers in response
 */
function enhanceWarmthMarkers(response: string, mode: PersonalityMode): string {
  let enhanced = response;

  // Don't over-enhance professional mode
  if (mode === 'professional') return enhanced;

  // Add warmth to cold phrases
  const warmthEnhancements: Record<string, string> = {
    'I can help': 'I\'d be happy to help',
    'I will help': 'I\'d love to help',
    'Here is': 'Here\'s what I found',
    'This is': 'So here\'s the thing',
    'You can': 'You can definitely',
    'Try this': 'Give this a try',
    'Do this': 'Try doing this',
  };

  // Only apply a few enhancements to keep it natural
  let enhancementsApplied = 0;
  const maxEnhancements = 2;

  for (const [cold, warm] of Object.entries(warmthEnhancements)) {
    if (enhancementsApplied >= maxEnhancements) break;
    
    const regex = new RegExp(`\\b${cold}\\b`, 'gi');
    if (regex.test(enhanced)) {
      enhanced = enhanced.replace(regex, warm);
      enhancementsApplied++;
    }
  }

  return enhanced;
}

/**
 * Check if response needs a signature phrase
 */
export function needsSignaturePhrase(response: string): boolean {
  const lower = response.toLowerCase();
  
  // Already has a signature phrase
  if (lower.includes('i\'ve got your back') || 
      lower.includes('let me help you') ||
      lower.includes('challenge accepted') ||
      lower.includes('let\'s dive in')) {
    return false;
  }

  // Long responses might benefit from one
  return response.length > 100;
}

/**
 * Add an appropriate signature phrase to start or end of response
 */
export function addSignaturePhrase(response: string, mode: PersonalityMode, position: 'start' | 'end' = 'start'): string {
  let phrase = '';

  switch (mode) {
    case 'support':
      phrase = getRandomItem(SIGNATURE_PHRASES.supportive);
      break;
    case 'creative':
      phrase = getRandomItem(SIGNATURE_PHRASES.engaged);
      break;
    case 'professional':
      phrase = getRandomItem(SIGNATURE_PHRASES.helpful);
      break;
    case 'learning':
      phrase = getRandomItem(SIGNATURE_PHRASES.acknowledging);
      break;
    default:
      phrase = getRandomItem(SIGNATURE_PHRASES.helpful);
  }

  if (position === 'start') {
    return `${phrase} ${response}`;
  } else {
    return `${response} ${phrase}`;
  }
}

/**
 * Quick enhancement for short responses
 */
export function quickEnhance(response: string, mode: PersonalityMode): string {
  // Add one emoji if response is very short and has none
  if (response.length < 50 && !response.match(/[\u{1F300}-\u{1F9FF}]/gu)) {
    const emoji = mode === 'support' ? '💜' : mode === 'creative' ? '✨' : '😊';
    return `${response} ${emoji}`;
  }
  return response;
}
