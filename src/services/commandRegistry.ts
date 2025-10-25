/**
 * Command Registry
 * Central registry of all available commands
 * Task 3.1 - Slash Command System
 */

import type { Command } from '../types/command';

export const COMMAND_REGISTRY: Command[] = [
  // ========== IMAGE GENERATION ==========
  {
    name: 'imagine',
    aliases: ['img', 'generate', 'gen'],
    description: 'Generate an AI image from a text prompt',
    category: 'image',
    icon: '🎨',
    parameters: [
      {
        name: 'prompt',
        type: 'string',
        description: 'Description of the image to generate',
        required: true,
        placeholder: 'a sunset over mountains',
      },
      {
        name: 'style',
        type: 'enum',
        description: 'Art style preset',
        required: false,
        options: ['realistic', 'artistic', 'anime', 'digital-art', 'oil-painting', 'watercolor'],
        default: 'realistic',
      },
      {
        name: 'quality',
        type: 'enum',
        description: 'Image quality',
        required: false,
        options: ['standard', 'hd'],
        default: 'standard',
      },
    ],
    examples: [
      '/imagine a sunset over mountains',
      '/imagine a cat wearing a hat style:anime',
      '/img futuristic city quality:hd',
    ],
  },

  // ========== WEATHER ==========
  {
    name: 'weather',
    aliases: ['w', 'forecast'],
    description: 'Get current weather for a location',
    category: 'tools',
    icon: '🌤️',
    requiresWebSearch: true,
    parameters: [
      {
        name: 'location',
        type: 'string',
        description: 'City or location name',
        required: true,
        placeholder: 'New York',
      },
    ],
    examples: [
      '/weather New York',
      '/w London',
      '/weather Tokyo',
    ],
  },

  // ========== TASK MANAGEMENT ==========
  {
    name: 'task',
    aliases: ['todo', 't'],
    description: 'Manage tasks (add, list, complete, delete)',
    category: 'task',
    icon: '✅',
    parameters: [
      {
        name: 'action',
        type: 'enum',
        description: 'Action to perform',
        required: true,
        options: ['add', 'list', 'complete', 'delete', 'stats'],
      },
      {
        name: 'details',
        type: 'string',
        description: 'Task details (for add) or task ID (for complete/delete)',
        required: false,
        placeholder: 'Buy groceries',
      },
    ],
    examples: [
      '/task add Buy groceries',
      '/task list',
      '/task complete task-123',
      '/todo add Call dentist priority:high',
    ],
  },

  // ========== WEB SEARCH ==========
  {
    name: 'search',
    aliases: ['s', 'find', 'google'],
    description: 'Search the web for information',
    category: 'tools',
    icon: '🔍',
    requiresWebSearch: true,
    parameters: [
      {
        name: 'query',
        type: 'string',
        description: 'Search query',
        required: true,
        placeholder: 'latest news on AI',
      },
    ],
    examples: [
      '/search latest AI news',
      '/s TypeScript best practices',
      '/find Python tutorials',
    ],
  },

  // ========== TIME & DATE ==========
  {
    name: 'time',
    aliases: ['clock', 'now'],
    description: 'Get current time for a timezone',
    category: 'tools',
    icon: '🕐',
    parameters: [
      {
        name: 'timezone',
        type: 'string',
        description: 'Timezone code (e.g., EST, PST, GMT)',
        required: false,
        placeholder: 'EST',
      },
    ],
    examples: [
      '/time',
      '/time EST',
      '/clock PST',
    ],
  },

  {
    name: 'date',
    aliases: ['today', 'calendar'],
    description: 'Get date information',
    category: 'tools',
    icon: '📅',
    parameters: [
      {
        name: 'date',
        type: 'string',
        description: 'Specific date (YYYY-MM-DD) or leave empty for today',
        required: false,
        placeholder: '2025-12-25',
      },
    ],
    examples: [
      '/date',
      '/today',
      '/date 2025-12-25',
    ],
  },

  // ========== REMINDERS ==========
  {
    name: 'remind',
    aliases: ['reminder', 'alert'],
    description: 'Set a reminder',
    category: 'tools',
    icon: '⏰',
    parameters: [
      {
        name: 'time',
        type: 'string',
        description: 'When to remind (e.g., "in 2 hours", "tomorrow at 3pm")',
        required: true,
        placeholder: 'in 2 hours',
      },
      {
        name: 'message',
        type: 'string',
        description: 'Reminder message',
        required: true,
        placeholder: 'Call dentist',
      },
    ],
    examples: [
      '/remind "in 2 hours" Call dentist',
      '/reminder tomorrow Meeting with team',
      '/alert "next week" Submit report',
    ],
  },

  {
    name: 'reminders',
    aliases: ['list-reminders', 'alarms'],
    description: 'List all active reminders',
    category: 'tools',
    icon: '📋',
    parameters: [],
    examples: [
      '/reminders',
      '/list-reminders',
    ],
  },

  // ========== DOCUMENT ANALYSIS ==========
  {
    name: 'analyze',
    aliases: ['analyse', 'inspect'],
    description: 'Analyze an uploaded document',
    category: 'tools',
    icon: '📄',
    parameters: [
      {
        name: 'document',
        type: 'string',
        description: 'Document ID or name (leave empty to analyze last upload)',
        required: false,
        placeholder: 'document-123',
      },
    ],
    examples: [
      '/analyze',
      '/analyze document-123',
      '/inspect report.pdf',
    ],
  },

  // ========== EXPORT ==========
  {
    name: 'export',
    aliases: ['download', 'save'],
    description: 'Export conversation or data',
    category: 'export',
    icon: '💾',
    parameters: [
      {
        name: 'format',
        type: 'enum',
        description: 'Export format',
        required: false,
        options: ['markdown', 'pdf', 'json'],
        default: 'markdown',
      },
    ],
    examples: [
      '/export',
      '/export pdf',
      '/download json',
    ],
  },

  // ========== SYSTEM COMMANDS ==========
  {
    name: 'help',
    aliases: ['?', 'commands'],
    description: 'Show help for commands',
    category: 'system',
    icon: '❓',
    parameters: [
      {
        name: 'command',
        type: 'string',
        description: 'Specific command to get help for',
        required: false,
        placeholder: 'imagine',
      },
    ],
    examples: [
      '/help',
      '/help imagine',
      '/? task',
    ],
  },

  {
    name: 'clear',
    aliases: ['reset', 'cls'],
    description: 'Clear the conversation',
    category: 'system',
    icon: '🗑️',
    parameters: [],
    examples: [
      '/clear',
      '/reset',
    ],
  },

  {
    name: 'settings',
    aliases: ['config', 'preferences'],
    description: 'Open settings panel',
    category: 'system',
    icon: '⚙️',
    parameters: [],
    examples: [
      '/settings',
      '/config',
    ],
  },

  {
    name: 'history',
    aliases: ['h', 'log'],
    description: 'Show command history',
    category: 'system',
    icon: '📜',
    parameters: [
      {
        name: 'limit',
        type: 'number',
        description: 'Number of commands to show',
        required: false,
        default: 10,
      },
    ],
    examples: [
      '/history',
      '/h 20',
      '/log',
    ],
  },
];

export default COMMAND_REGISTRY;
