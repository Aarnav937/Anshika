/**
 * Intent Detection Service
 * Detects user intent from natural language without requiring slash commands
 * Task 3.2 - Natural Language Command Detection
 */

import { COMMAND_REGISTRY } from './commandRegistry';
import type { Command } from '../types/command';
import { AVAILABLE_TOOLS } from './toolManager';

export interface DetectedIntent {
  command: string | null;
  tool: string | null;
  confidence: number;
  parameters: Record<string, any>;
  suggestion: string | null;
  reasoning: string;
}

export interface KeywordPattern {
  keywords: string[];
  weight: number; // Higher weight = stronger signal
}

/**
 * Keyword patterns for each command/tool
 * These are used for offline detection and quick matching
 */
const INTENT_PATTERNS: Record<string, KeywordPattern[]> = {
  // Weather commands
  weather: [
    { keywords: ['weather', 'temperature', 'forecast'], weight: 10 },
    { keywords: ['hot', 'cold', 'sunny', 'rain', 'snow'], weight: 5 },
    { keywords: ['how', 'what', 'is', 'the', 'today'], weight: 2 },
  ],
  
  // Image generation
  imagine: [
    { keywords: ['generate', 'create', 'make', 'draw', 'show'], weight: 8 },
    { keywords: ['image', 'picture', 'photo', 'art', 'illustration'], weight: 10 },
    { keywords: ['paint', 'render', 'visualize'], weight: 7 },
  ],
  
  // Task management
  task: [
    { keywords: ['task', 'todo', 'reminder', 'remember'], weight: 10 },
    { keywords: ['create', 'add', 'new', 'make'], weight: 5 },
    { keywords: ['list', 'show', 'view'], weight: 3 },
  ],
  
  // Web search
  search: [
    { keywords: ['search', 'find', 'look', 'google'], weight: 10 },
    { keywords: ['what', 'who', 'where', 'when', 'why', 'how'], weight: 3 },
    { keywords: ['latest', 'news', 'current', 'recent'], weight: 5 },
  ],
  
  // Time/Date
  time: [
    { keywords: ['time', 'clock', 'hour'], weight: 10 },
    { keywords: ['what', 'tell', 'show'], weight: 2 },
  ],
  
  date: [
    { keywords: ['date', 'today', 'day', 'month', 'year'], weight: 10 },
    { keywords: ['what', 'tell', 'show'], weight: 2 },
  ],
  
  // Help
  help: [
    { keywords: ['help', 'commands', 'how', 'usage'], weight: 10 },
    { keywords: ['what', 'can', 'do', 'able'], weight: 3 },
  ],
};

/**
 * Parameter extraction patterns
 */
const PARAMETER_EXTRACTORS: Record<string, (text: string) => Record<string, any>> = {
  weather: (text: string) => {
    // Extract location from common patterns
    const patterns = [
      /(?:in|at|for)\s+([A-Z][a-zA-Z\s]+?)(?:\s|$|[?!.])/i,
      /weather\s+([A-Z][a-zA-Z\s]+?)(?:\s|$|[?!.])/i,
      /([A-Z][a-zA-Z\s]+?)\s+weather/i,
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return { location: match[1].trim() };
      }
    }
    
    return {};
  },
  
  imagine: (text: string) => {
    // Extract prompt by removing trigger words
    let prompt = text.toLowerCase();
    
    // Remove common trigger patterns
    prompt = prompt.replace(/^(generate|create|make|draw|show)\s+(me\s+)?(a|an)\s+(image|picture|photo)\s+of\s+/i, '');
    prompt = prompt.replace(/^(show|make)\s+(me\s+)?/i, '');
    
    // Extract style if mentioned
    const styleMatch = text.match(/style[:\s]+(realistic|artistic|anime|digital[-\s]?art|oil[-\s]?painting|watercolor)/i);
    const style = styleMatch ? styleMatch[1].toLowerCase().replace(/\s+/g, '-') : undefined;
    
    return { 
      prompt: prompt.trim() || text.trim(),
      ...(style && { style })
    };
  },
  
  task: (text: string) => {
    // Determine action - if text contains creation keywords, it's "add"
    const isCreation = /^(create|add|new|make|remind)/i.test(text);
    const action = isCreation ? 'add' : 'list';
    
    // Extract task title
    let title = text;
    
    // Remove common trigger words
    title = title.replace(/^(create|add|new|make)\s+(a\s+)?(task|todo|reminder)\s+(to\s+)?/i, '');
    title = title.replace(/^(remind\s+me\s+to\s+)/i, '');
    
    // Extract due date if mentioned
    const dueDateMatch = text.match(/(tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next\s+\w+)/i);
    const dueDate = dueDateMatch ? dueDateMatch[1] : undefined;
    
    // Remove due date from title if it was found at the end
    if (dueDate) {
      title = title.replace(new RegExp(`\\s*${dueDate}\\s*$`, 'i'), '');
    }
    
    return { 
      action,
      details: title.trim() || text.trim(),
      ...(dueDate && { due_date: dueDate })
    };
  },
  
  search: (text: string) => {
    // Extract search query
    let query = text;
    
    // Remove search trigger words
    query = query.replace(/^(search|find|look|google)\s+(for\s+)?/i, '');
    query = query.replace(/^(what|who|where|when|why|how)\s+(is|are|was|were|did|does|do)\s+/i, '');
    
    return { query: query.trim() || text.trim() };
  },
  
  time: (text: string) => {
    // Extract timezone if mentioned
    const tzMatch = text.match(/(EST|PST|GMT|CET|JST|UTC)/i);
    return tzMatch ? { timezone: tzMatch[1].toUpperCase() } : {};
  },
  
  date: (text: string) => {
    // Extract specific date if mentioned
    const dateMatch = text.match(/\d{4}-\d{2}-\d{2}/);
    return dateMatch ? { date: dateMatch[0] } : {};
  },
};

/**
 * Detect intent from user message using keyword matching
 * This is fast and works offline
 */
export function detectIntentFromKeywords(message: string): DetectedIntent {
  const messageLower = message.toLowerCase();
  
  const scores: Record<string, number> = {};
  
  // Calculate scores for each intent
  for (const [intentName, patterns] of Object.entries(INTENT_PATTERNS)) {
    let score = 0;
    
    for (const pattern of patterns) {
      for (const keyword of pattern.keywords) {
        if (messageLower.includes(keyword)) {
          score += pattern.weight;
        }
      }
    }
    
    scores[intentName] = score;
  }
  
  // Find best match
  const sortedIntents = Object.entries(scores)
    .filter(([_, score]) => score > 0)
    .sort(([_, a], [__, b]) => b - a);
  
  if (sortedIntents.length === 0) {
    return {
      command: null,
      tool: null,
      confidence: 0,
      parameters: {},
      suggestion: null,
      reasoning: 'No matching intent found',
    };
  }
  
  const [bestIntent, bestScore] = sortedIntents[0];
  const maxPossibleScore = INTENT_PATTERNS[bestIntent].reduce((sum, p) => sum + p.weight * p.keywords.length, 0);
  const confidence = Math.min(bestScore / maxPossibleScore, 1.0);
  
  // Extract parameters for this intent
  const extractor = PARAMETER_EXTRACTORS[bestIntent];
  const parameters = extractor ? extractor(message) : {};
  
  // Find matching command
  const command = COMMAND_REGISTRY.find(
    (cmd: Command) => cmd.name === bestIntent || cmd.aliases.includes(bestIntent)
  );
  
  // Find matching tool
  const tool = AVAILABLE_TOOLS.find(t => {
    const toolName = t.name.replace(/_/g, '');
    return toolName === bestIntent || t.name.includes(bestIntent);
  });
  
  // Generate suggestion
  let suggestion: string | null = null;
  if (confidence > 0.4 && confidence < 0.8 && command) {
    const paramStr = Object.entries(parameters)
      .map(([_, v]) => `${v}`)
      .join(' ');
    suggestion = `/${command.name} ${paramStr}`.trim();
  }
  
  return {
    command: command?.name || null,
    tool: tool?.name || null,
    confidence,
    parameters,
    suggestion,
    reasoning: `Detected '${bestIntent}' with confidence ${(confidence * 100).toFixed(0)}% (score: ${bestScore})`,
  };
}

/**
 * Check if message should trigger automatic tool execution
 * High confidence intents are executed automatically
 */
export function shouldAutoExecute(intent: DetectedIntent): boolean {
  return intent.confidence >= 0.7 && (intent.command !== null || intent.tool !== null);
}

/**
 * Check if message should show a suggestion
 * Medium confidence intents get suggestions
 */
export function shouldShowSuggestion(intent: DetectedIntent): boolean {
  return intent.confidence >= 0.4 && intent.confidence < 0.7 && intent.suggestion !== null;
}

/**
 * Convert natural language to command string
 * Used when auto-executing detected intents
 */
export function convertToCommand(intent: DetectedIntent): string | null {
  if (!intent.command) return null;
  
  const paramStr = Object.entries(intent.parameters)
    .map(([_, v]) => v)
    .filter(v => v)
    .join(' ');
  
  return `/${intent.command} ${paramStr}`.trim();
}

/**
 * Get explanation of detected intent for debugging
 */
export function explainIntent(intent: DetectedIntent): string {
  if (intent.confidence === 0) {
    return 'No clear intent detected. Try being more specific or use a slash command.';
  }
  
  const confidencePercent = (intent.confidence * 100).toFixed(0);
  const parts: string[] = [];
  
  parts.push(`Detected intent: **${intent.command || intent.tool || 'unknown'}**`);
  parts.push(`Confidence: ${confidencePercent}%`);
  
  if (Object.keys(intent.parameters).length > 0) {
    parts.push(`Parameters: ${JSON.stringify(intent.parameters)}`);
  }
  
  if (intent.suggestion) {
    parts.push(`Suggestion: \`${intent.suggestion}\``);
  }
  
  parts.push(`Reasoning: ${intent.reasoning}`);
  
  return parts.join('\n');
}

export default {
  detectIntentFromKeywords,
  shouldAutoExecute,
  shouldShowSuggestion,
  convertToCommand,
  explainIntent,
};
