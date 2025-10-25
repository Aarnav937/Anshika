/**
 * Command System Types
 * Task 3.1 - Slash Command System
 */

export type CommandCategory = 'image' | 'tools' | 'task' | 'system' | 'export';

export interface CommandParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'enum';
  description: string;
  required: boolean;
  default?: string | number | boolean;
  options?: string[]; // For enum type
  placeholder?: string;
}

export interface Command {
  name: string;
  aliases: string[];
  description: string;
  category: CommandCategory;
  parameters: CommandParameter[];
  examples: string[];
  icon?: string;
  requiresWebSearch?: boolean;
}

export interface ParsedCommand {
  command: string;
  parameters: Record<string, string | number | boolean>;
  rawInput: string;
  isValid: boolean;
  errors?: string[];
}

export interface CommandSuggestion {
  command: Command;
  score: number; // 0-1, relevance score
  matchedAlias?: string;
}

export interface CommandHistory {
  command: string;
  timestamp: Date;
  success: boolean;
  result?: string;
}

export interface CommandExecutionResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}
