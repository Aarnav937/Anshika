/**
 * useIntentDetection Hook
 * Manages intent detection state and provides detection functions
 * Task 3.2 - Natural Language Command Detection
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  detectIntentFromKeywords,
  shouldAutoExecute,
  shouldShowSuggestion,
  convertToCommand,
  type DetectedIntent,
} from '../services/intentDetectionService';

interface UseIntentDetectionOptions {
  enabled?: boolean;
  onIntentDetected?: (intent: DetectedIntent) => void;
  conversationHistory?: string[];
}

interface UseIntentDetectionReturn {
  currentIntent: DetectedIntent | null;
  detectIntent: (message: string) => DetectedIntent;
  clearIntent: () => void;
  shouldAutoExecuteIntent: boolean;
  shouldShowSuggestionUI: boolean;
  commandToExecute: string | null;
}

export function useIntentDetection(
  options: UseIntentDetectionOptions = {}
): UseIntentDetectionReturn {
  const { enabled = true, onIntentDetected, conversationHistory = [] } = options;
  
  const [currentIntent, setCurrentIntent] = useState<DetectedIntent | null>(null);
  const lastMessageRef = useRef<string>('');

  /**
   * Detect intent from user message
   */
  const detectIntent = useCallback(
    (message: string): DetectedIntent => {
      if (!enabled) {
        return {
          command: null,
          tool: null,
          confidence: 0,
          parameters: {},
          suggestion: null,
          reasoning: 'Intent detection disabled',
        };
      }

      // Don't detect intent for slash commands
      if (message.trim().startsWith('/')) {
        return {
          command: null,
          tool: null,
          confidence: 0,
          parameters: {},
          suggestion: null,
          reasoning: 'Message is already a slash command',
        };
      }

      // Use keyword-based detection
      const intent = detectIntentFromKeywords(message);
      
      // Apply context awareness
      const contextualIntent = applyContextAwareness(intent, message, conversationHistory);
      
      setCurrentIntent(contextualIntent);
      lastMessageRef.current = message;
      
      // Notify callback
      if (onIntentDetected) {
        onIntentDetected(contextualIntent);
      }
      
      return contextualIntent;
    },
    [enabled, onIntentDetected, conversationHistory]
  );

  /**
   * Clear current intent
   */
  const clearIntent = useCallback(() => {
    setCurrentIntent(null);
    lastMessageRef.current = '';
  }, []);

  /**
   * Determine if intent should auto-execute
   */
  const shouldAutoExecuteIntent = currentIntent ? shouldAutoExecute(currentIntent) : false;

  /**
   * Determine if suggestion UI should show
   */
  const shouldShowSuggestionUI = currentIntent ? shouldShowSuggestion(currentIntent) : false;

  /**
   * Get command string to execute
   */
  const commandToExecute = currentIntent ? convertToCommand(currentIntent) : null;

  // Auto-clear intent after 10 seconds
  useEffect(() => {
    if (currentIntent) {
      const timer = setTimeout(() => {
        clearIntent();
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [currentIntent, clearIntent]);

  return {
    currentIntent,
    detectIntent,
    clearIntent,
    shouldAutoExecuteIntent,
    shouldShowSuggestionUI,
    commandToExecute,
  };
}

/**
 * Apply context awareness to intent detection
 * Uses conversation history to improve detection accuracy
 */
function applyContextAwareness(
  intent: DetectedIntent,
  currentMessage: string,
  conversationHistory: string[]
): DetectedIntent {
  // If no recent context, return as-is
  if (conversationHistory.length === 0) {
    return intent;
  }

  const lastMessage = conversationHistory[conversationHistory.length - 1]?.toLowerCase() || '';
  const currentLower = currentMessage.toLowerCase();

  // Context pattern: Follow-up image modifications
  // "make it blue" after image generation
  if (lastMessage.includes('image') || lastMessage.includes('picture')) {
    const modificationKeywords = ['make it', 'change', 'modify', 'update', 'different'];
    if (modificationKeywords.some(kw => currentLower.includes(kw))) {
      return {
        ...intent,
        command: 'imagine',
        tool: 'generate_image',
        confidence: Math.max(intent.confidence, 0.75),
        parameters: {
          ...intent.parameters,
          prompt: currentMessage, // Use full message as modification prompt
        },
        reasoning: `Context-aware: Detected image modification based on previous conversation`,
      };
    }
  }

  // Context pattern: Follow-up weather queries
  // "what about tomorrow" after weather query
  if (lastMessage.includes('weather') || lastMessage.includes('temperature')) {
    const timeKeywords = ['tomorrow', 'today', 'next week', 'forecast'];
    if (timeKeywords.some(kw => currentLower.includes(kw))) {
      return {
        ...intent,
        command: 'weather',
        tool: 'get_forecast',
        confidence: Math.max(intent.confidence, 0.8),
        reasoning: `Context-aware: Detected follow-up weather query`,
      };
    }
  }

  // Context pattern: Task references
  // "mark it done" after task creation
  if (lastMessage.includes('task') || lastMessage.includes('reminder')) {
    const taskActions = ['mark', 'complete', 'done', 'finish', 'delete', 'remove'];
    if (taskActions.some(action => currentLower.includes(action))) {
      return {
        ...intent,
        command: 'task',
        tool: 'toggle_task',
        confidence: Math.max(intent.confidence, 0.8),
        reasoning: `Context-aware: Detected task action based on previous conversation`,
      };
    }
  }

  // Boost confidence if intent matches recent topic
  const recentTopics = conversationHistory.slice(-3).join(' ').toLowerCase();
  if (intent.command && recentTopics.includes(intent.command)) {
    return {
      ...intent,
      confidence: Math.min(intent.confidence + 0.15, 1.0),
      reasoning: `${intent.reasoning} + context boost (topic continuity)`,
    };
  }

  return intent;
}

export default useIntentDetection;
