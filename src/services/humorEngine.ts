/**
 * Humor Engine Service
 * Manages puns, wordplay, and humor insertion based on context
 */

import type { PersonalityMode } from '../types/personality';
import { PUN_TRIGGERS } from '../config/personalityConfig';

/**
 * Check if a pun opportunity exists in the text
 */
export function detectPunOpportunity(text: string): boolean {
  const lower = text.toLowerCase();
  return PUN_TRIGGERS.some(trigger => lower.includes(trigger));
}

/**
 * Check if humor is appropriate in this context
 */
export function isHumorAppropriate(
  mode: PersonalityMode,
  sentiment: string,
  humorLevel: number
): boolean {
  // Never add humor if user is frustrated or stressed
  if (sentiment === 'frustrated' || sentiment === 'stressed') {
    return false;
  }

  // Support mode: very minimal humor
  if (mode === 'support') {
    return humorLevel > 80 && sentiment === 'accomplished';
  }

  // Professional mode: subtle humor only
  if (mode === 'professional') {
    return humorLevel > 60;
  }

  // Creative and casual modes: humor is welcome!
  if (mode === 'creative' || mode === 'casual') {
    return humorLevel > 30;
  }

  // Learning mode: light humor to keep it fun
  if (mode === 'learning') {
    return humorLevel > 50;
  }

  return false;
}

/**
 * Get the frequency of humor based on mode and user preferences
 */
export function getHumorFrequency(mode: PersonalityMode, humorLevel: number): number {
  // Returns a percentage (0-100) of how often to attempt humor

  const baseFrequency = {
    professional: 20,
    creative: 90,
    support: 10,
    learning: 50,
    casual: 75,
    default: 60
  };

  const base = baseFrequency[mode] || 60;
  
  // Adjust by user's humor level preference
  const adjusted = (base * humorLevel) / 100;
  
  return Math.min(100, Math.max(0, adjusted));
}

/**
 * Generate a tech pun based on keyword
 */
export function generateTechPun(keyword: string): string | null {
  const puns: Record<string, string[]> = {
    'bug': [
      "Let's debug this - and no, I don't mean removing actual insects! 🐛",
      "Time to squash this bug! (The code kind, not the creepy-crawly kind)",
    ],
    'code': [
      "Let's code this up! (I promise not to make it too encode-nvenient)",
      "Time to write some code that's truly code-tastic!",
    ],
    'function': [
      "This function is going to function beautifully!",
      "Let's make this function fully functional!",
    ],
    'loop': [
      "Let's break out of this loop - I promise I'm not going in circles!",
      "We'll loop through this - hopefully not infinitely!",
    ],
    'array': [
      "Let's array-nge things nicely!",
      "Time to get our ducks in an array!",
    ],
    'string': [
      "No strings attached to this solution!",
      "Let's string this together perfectly!",
    ],
    'class': [
      "This is a first-class solution!",
      "Time to add some class to this code!",
    ],
    'data': [
      "Let's date-a... I mean, data this properly!",
      "Time to get our data in order!",
    ],
    'file': [
      "Let's file this under 'awesome solutions'!",
      "Time to get our files in a row!",
    ],
    'test': [
      "Let's put this to the test! (And hopefully it passes)",
      "Time to test our mettle... and our code!",
    ],
  };

  const keyword_lower = keyword.toLowerCase();
  const matchingPuns = puns[keyword_lower];
  
  if (matchingPuns && matchingPuns.length > 0) {
    return matchingPuns[Math.floor(Math.random() * matchingPuns.length)];
  }

  return null;
}

/**
 * Check if response already has sufficient humor
 */
export function hasEnoughHumor(response: string): boolean {
  const lower = response.toLowerCase();
  
  // Check for existing humor markers
  const humorMarkers = [
    '!', '😄', '😊', '😂', '🤣', '😅',
    'haha', 'lol', 'kidding', 'joking',
    '(and ', '- and ', 'no pun intended'
  ];
  
  const markerCount = humorMarkers.filter(marker => lower.includes(marker)).length;
  
  // If response already has 2+ humor markers, it's probably humorous enough
  return markerCount >= 2;
}

/**
 * Add a light playful comment to response
 */
export function addPlayfulComment(response: string, mode: PersonalityMode): string {
  if (mode === 'professional' || mode === 'support') {
    return response; // Don't add playfulness to these modes
  }

  const playfulComments = {
    creative: [
      "\n\n(Getting excited just thinking about it! ✨)",
      "\n\n(This is going to be so cool!)",
    ],
    learning: [
      "\n\n(Once you get the hang of it, it's actually pretty neat!)",
      "\n\n(Hope that makes sense - let me know if you want me to explain anything!)",
    ],
    casual: [
      "\n\n(Pretty cool, right?)",
      "\n\n(Hope that helps! 😊)",
    ],
    default: [
      "\n\n(Let me know if you need more details!)",
    ]
  };

  const comments = playfulComments[mode] || playfulComments.default;
  
  // Only add if response is substantial (not too short)
  if (response.length > 150 && Math.random() > 0.7) { // 30% chance
    return response + comments[Math.floor(Math.random() * comments.length)];
  }

  return response;
}

/**
 * Generate a self-aware pun apology
 */
export function generatePunApology(): string {
  const apologies = [
    "(Okay, I know that pun was terrible, but I couldn't resist! 😅)",
    "(Sorry, the pun was calling and I had to answer! 🙈)",
    "(That pun was a bit of a stretch, wasn't it? 😊)",
    "(I'll see myself out for that pun... 😄)",
  ];
  
  return apologies[Math.floor(Math.random() * apologies.length)];
}

/**
 * Determine if we should add a pun based on frequency settings
 */
export function shouldAddPun(
  mode: PersonalityMode,
  humorLevel: number,
  messagesWithPuns: number,
  totalMessages: number
): boolean {
  // Calculate current pun frequency
  const currentFrequency = totalMessages > 0 ? (messagesWithPuns / totalMessages) * 100 : 0;
  
  // Get target frequency
  const targetFrequency = getHumorFrequency(mode, humorLevel);
  
  // Allow puns if we're below target frequency
  // Add some randomness to make it natural
  if (currentFrequency < targetFrequency) {
    return Math.random() < 0.4; // 40% chance when below target
  } else {
    return Math.random() < 0.1; // 10% chance when at/above target
  }
}
