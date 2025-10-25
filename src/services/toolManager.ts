import { Tool, AvailableTools, ToolCall, ToolResult } from '../types';
import { performWebSearch } from './webSearchService';
import { getCurrentWeather, getWeatherForecast } from './weatherService';
import {
  getCurrentTime,
  getDateInfo,
  setReminder,
  getReminders
} from './timeDateService';
import {
  createTask,
  listTasks,
  updateTask,
  deleteTask,
  toggleTaskStatus,
  getTaskStats
} from './taskService';
import { getGeminiImageService } from './image/geminiImageService';
import { ImageStorageService } from './image/imageStorageService';
import type { OnlineGenerationParams } from '../types/imageGeneration';

// Define available tools for the AI
export const AVAILABLE_TOOLS: Tool[] = [
  {
    name: 'web_search',
    description: 'Search the web for current information, news, facts, or answers to questions. Use this when the user asks for recent events, current data, or information that might change over time.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query to perform on the web'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'get_weather',
    description: 'Get current weather information for a location. Use this when users ask about weather conditions.',
    parameters: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'The city or location to get weather for'
        }
      },
      required: ['location']
    }
  },
  {
    name: 'get_forecast',
    description: 'Get weather forecast for a location. Use this when users ask about future weather conditions.',
    parameters: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'The city or location to get forecast for'
        },
        days: {
          type: 'number',
          description: 'Number of days for forecast (default: 3, max: 10)',
          default: 3
        }
      },
      required: ['location']
    }
  },
  {
    name: 'get_time',
    description: 'Get current time for a specific timezone or local time. Use this when users ask about time in different locations.',
    parameters: {
      type: 'object',
      properties: {
        timezone: {
          type: 'string',
          description: 'Timezone code (e.g., EST, PST, GMT, CET, JST). Leave empty for local time.'
        }
      },
      required: []
    }
  },
  {
    name: 'get_date',
    description: 'Get detailed date information. Use this when users ask about dates, day of year, or date calculations.',
    parameters: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'Specific date to get info for (YYYY-MM-DD format). Leave empty for today.'
        }
      },
      required: []
    }
  },
  {
    name: 'set_reminder',
    description: 'Set a reminder for a future time. Use this when users want to schedule reminders.',
    parameters: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'The reminder message or task to remember'
        },
        time: {
          type: 'string',
          description: 'When to trigger the reminder (e.g., "2024-01-15 14:30", "in 2 hours", "tomorrow at 3pm")'
        }
      },
      required: ['message', 'time']
    }
  },
  {
    name: 'get_reminders',
    description: 'Get list of active reminders. Use this when users want to see their scheduled reminders.',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'create_task',
    description: 'Create a new task with title, optional description, priority, due date, and tags. Use this when users want to add tasks to their todo list.',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'The task title (required)'
        },
        description: {
          type: 'string',
          description: 'Optional detailed description of the task'
        },
        priority: {
          type: 'string',
          description: 'Task priority: "high", "medium", or "low" (default: "medium")',
          enum: ['high', 'medium', 'low']
        },
        due_date: {
          type: 'string',
          description: 'Due date as natural language (e.g., "tomorrow", "next week", "in 3 days", "2024-01-15")'
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of tags for categorizing the task'
        }
      },
      required: ['title']
    }
  },
  {
    name: 'list_tasks',
    description: 'List tasks with optional filtering by status. Use this when users want to see their tasks.',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description: 'Filter by task status: "pending" or "completed". Leave empty for all tasks.',
          enum: ['pending', 'completed']
        },
        limit: {
          type: 'number',
          description: 'Maximum number of tasks to show (default: 10)'
        }
      },
      required: []
    }
  },
  {
    name: 'update_task',
    description: 'Update an existing task. Note: You need the task ID from list_tasks first.',
    parameters: {
      type: 'object',
      properties: {
        task_id: {
          type: 'string',
          description: 'The ID of the task to update (get this from list_tasks)'
        },
        title: {
          type: 'string',
          description: 'New task title'
        },
        description: {
          type: 'string',
          description: 'New task description'
        },
        status: {
          type: 'string',
          description: 'New task status: "pending" or "completed"',
          enum: ['pending', 'completed']
        },
        priority: {
          type: 'string',
          description: 'New task priority: "high", "medium", or "low"',
          enum: ['high', 'medium', 'low']
        },
        due_date: {
          type: 'string',
          description: 'New due date as natural language'
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'New array of tags'
        }
      },
      required: ['task_id']
    }
  },
  {
    name: 'delete_task',
    description: 'Delete a task permanently. Note: You need the task ID from list_tasks first.',
    parameters: {
      type: 'object',
      properties: {
        task_id: {
          type: 'string',
          description: 'The ID of the task to delete'
        }
      },
      required: ['task_id']
    }
  },
  {
    name: 'toggle_task',
    description: 'Toggle a task between completed and pending status. Note: You need the task ID from list_tasks first.',
    parameters: {
      type: 'object',
      properties: {
        task_id: {
          type: 'string',
          description: 'The ID of the task to toggle'
        }
      },
      required: ['task_id']
    }
  },
  {
    name: 'get_task_stats',
    description: 'Get task statistics including total, completed, pending, and overdue counts.',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'generate_image',
    description: 'Generate an AI image from a text prompt using Gemini 2.5 Flash Image model. Use this when users ask to create, generate, or imagine images.',
    parameters: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'The detailed description of the image to generate'
        },
        style: {
          type: 'string',
          description: 'Art style preset: realistic, artistic, anime, digital-art, oil-painting, or watercolor',
          enum: ['realistic', 'artistic', 'anime', 'digital-art', 'oil-painting', 'watercolor']
        },
        quality: {
          type: 'string',
          description: 'Image quality: standard or hd',
          enum: ['standard', 'hd']
        },
        aspectRatio: {
          type: 'string',
          description: 'Image aspect ratio',
          enum: ['1:1', '16:9', '9:16', '4:3', '3:4']
        }
      },
      required: ['prompt']
    }
  }
];

// Execute a tool based on the tool call
export async function executeTool(toolCall: ToolCall): Promise<ToolResult> {
  const { id, function: { name, arguments: args } } = toolCall;

  console.log('🔧 Executing tool:', name, 'with args:', args);

  try {
    const parsedArgs = JSON.parse(args);
    let result = '';

    switch (name as AvailableTools) {
      case 'web_search':
        result = await performWebSearch(parsedArgs.query);
        break;

      case 'get_weather':
        result = await getCurrentWeather(parsedArgs.location);
        break;

      case 'get_forecast':
        result = await getWeatherForecast(parsedArgs.location, parsedArgs.days || 3);
        break;

      case 'get_time':
        result = getCurrentTime(parsedArgs.timezone);
        break;

      case 'get_date':
        result = getDateInfo(parsedArgs.date);
        break;

      case 'set_reminder':
        result = setReminder(parsedArgs.message, parsedArgs.time);
        break;

      case 'get_reminders':
        result = getReminders();
        break;

      case 'create_task':
        result = createTask(parsedArgs.title, parsedArgs.description, parsedArgs.priority, parsedArgs.due_date, parsedArgs.tags);
        break;

      case 'list_tasks':
        result = listTasks(parsedArgs.status, parsedArgs.limit);
        break;

      case 'update_task':
        result = updateTask(parsedArgs.task_id, parsedArgs);
        break;

      case 'delete_task':
        result = deleteTask(parsedArgs.task_id);
        break;

      case 'toggle_task':
        result = toggleTaskStatus(parsedArgs.task_id);
        break;

      case 'get_task_stats':
        result = getTaskStats();
        break;

      case 'generate_image':
        try {
          const imageService = getGeminiImageService();
          await imageService.initialize();
          
          const stylePreset = parsedArgs.style || 'realistic';
          const params: OnlineGenerationParams = {
            prompt: parsedArgs.prompt,
            negativePrompt: '',
            stylePreset: stylePreset,
            quality: parsedArgs.quality || 'standard',
            aspectRatio: parsedArgs.aspectRatio || '1:1',
            seed: undefined,
          };
          
          console.log('🎨 Generating image with params:', params);
          const generatedImage = await imageService.generateImage(params);
          
          // Save to storage so it appears in the gallery
          console.log('💾 Saving image to storage...');
          const storageService = new ImageStorageService();
          await storageService.saveImage(generatedImage);
          console.log('✅ Image saved to gallery');
          
          // Notify gallery to refresh
          window.dispatchEvent(new CustomEvent('imageStorageUpdated'));
          console.log('📢 Notified gallery to refresh');
          
          result = `✅ Image generated successfully!\n\n**Prompt:** ${parsedArgs.prompt}\n**Style:** ${stylePreset}\n**Quality:** ${params.quality}\n**Model:** Gemini 2.5 Flash Image\n**Generation time:** ${generatedImage.metadata.generationTime?.toFixed(2)}s\n\nThe image has been saved and is now available in the **Image Generation** tab. Click the "Image Generation" button at the top to see it!`;
        } catch (error) {
          console.error('❌ Image generation error:', error);
          result = `❌ Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
        break;

      default:
        result = `❌ Unknown tool: ${name}`;
    }

    return {
      tool_call_id: id,
      content: result
    };
  } catch (error) {
    console.error(`Tool execution error for ${name}:`, error);
    return {
      tool_call_id: id,
      content: `❌ Failed to execute ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Check if a message might benefit from tool usage
export function shouldUseTools(message: string, webSearchEnabled: boolean): boolean {
  const lowerMessage = message.toLowerCase();

  // Always check for explicit tool requests
  const toolKeywords = [
    'search', 'find', 'lookup', 'weather', 'forecast',
    'time', 'date', 'remind', 'reminder', 'schedule',
    'stock', 'price', 'market', 'trading', 'shares', 'ticker',
    'task', 'todo', 'to-do', 'to do', 'create task', 'add task',
    'list tasks', 'show tasks', 'my tasks', 'task list', 'delete task',
    'complete task', 'mark done', 'task stats', 'task statistics',
    'generate', 'create', 'make', 'draw', 'image', 'picture', 'photo', 'imagine'
  ];

  const hasToolKeywords = toolKeywords.some(keyword => lowerMessage.includes(keyword));

  // Check for question patterns that might benefit from tools
  const questionPatterns = [
    'what is', 'how is', 'when is', 'where is', 'who is',
    'current', 'today', 'now', 'latest', 'recent'
  ];

  const isQuestionWithContext = questionPatterns.some(pattern => lowerMessage.includes(pattern));

  // Always enable tools for task management, or if web search is enabled and message seems to need external info
  const hasTaskKeywords = lowerMessage.includes('task') || lowerMessage.includes('todo') ||
    lowerMessage.includes('create') || lowerMessage.includes('list') || lowerMessage.includes('show') ||
    lowerMessage.includes('complete') || lowerMessage.includes('delete') || lowerMessage.includes('mark');

  return hasTaskKeywords || (webSearchEnabled && (hasToolKeywords || isQuestionWithContext));
}

// Get tools array for API calls (filtered based on what's enabled)
export function getEnabledTools(webSearchEnabled: boolean): Tool[] {
  // Always include task management tools
  const taskTools = AVAILABLE_TOOLS.filter(tool =>
    ['create_task', 'list_tasks', 'update_task', 'delete_task', 'toggle_task', 'get_task_stats'].includes(tool.name as AvailableTools)
  );

  if (!webSearchEnabled) {
    // Return task tools plus non-web tools when web search is disabled
    return [
      ...taskTools,
      ...AVAILABLE_TOOLS.filter(tool =>
        !['web_search'].includes(tool.name as AvailableTools) &&
        !['create_task', 'list_tasks', 'update_task', 'delete_task', 'toggle_task', 'get_task_stats'].includes(tool.name as AvailableTools)
      )
    ];
  }

  return AVAILABLE_TOOLS;
}
