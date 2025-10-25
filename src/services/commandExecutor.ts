import { ParsedCommand, CommandExecutionResult, Command } from '../types/command';
import { COMMAND_REGISTRY } from './commandRegistry';

/**
 * CommandExecutor - Executes slash commands
 * 
 * For most commands, this converts them to natural language that the AI will process.
 * Special commands like /help and /clear are handled directly.
 */
export class CommandExecutor {
  /**
   * Execute a parsed command
   * Returns the natural language query string for AI processing (if applicable)
   */
  static async execute(
    command: ParsedCommand,
    addMessage: (message: Omit<import('../types').Message, 'id' | 'timestamp'>) => void,
    _updateMessage: (id: string, updates: Partial<import('../types').Message>) => void,
    context: {
      clearMessages?: () => void;
    }
  ): Promise<CommandExecutionResult & { naturalLanguage?: string }> {
    // Validate command
    if (!command.isValid) {
      return {
        success: false,
        error: command.errors?.join(', ') || 'Invalid command',
      };
    }

    try {
      // Route command to appropriate handler
      switch (command.command) {
        case 'help':
          return this.handleHelpCommand(command, addMessage);

        case 'clear':
          return this.handleClearCommand(context);

        default:
          // All other commands get converted to natural language for AI processing
          return this.convertToNaturalLanguage(command, addMessage);
      }
    } catch (error) {
      console.error('[CommandExecutor] Execution error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Command execution failed',
      };
    }
  }

  /**
   * Convert command to natural language for AI to process
   * Returns the natural language string instead of adding message directly
   */
  private static convertToNaturalLanguage(
    command: ParsedCommand,
    _addMessage: (message: Omit<import('../types').Message, 'id' | 'timestamp'>) => void
  ): CommandExecutionResult & { naturalLanguage: string } {
    const cmd = COMMAND_REGISTRY.find(c => c.name === command.command);
    if (!cmd) {
      return { success: false, error: 'Command not found', naturalLanguage: '' };
    }

    let naturalLanguage = '';

    switch (command.command) {
      case 'imagine':
        naturalLanguage = `Please generate an image with this prompt: ${command.parameters.prompt || 'a beautiful scene'}`;
        break;

      case 'weather':
        naturalLanguage = `What's the weather in ${command.parameters.location || 'my location'}?`;
        break;

      case 'task':
        if (command.parameters.action === 'create' || command.parameters.action === 'add') {
          // Use 'details' parameter from command registry (was incorrectly 'title')
          const title = command.parameters.details || command.parameters.title || 'untitled task';
          const dueDate = command.parameters.due_date ? ` due ${command.parameters.due_date}` : '';
          naturalLanguage = `Create a new task with title: ${title}${dueDate}`;
        } else {
          naturalLanguage = 'Show me all my tasks';
        }
        break;

      case 'search':
        naturalLanguage = `Search the web for: ${command.parameters.query || 'recent news'}`;
        break;

      case 'time':
        const timezone = command.parameters.timezone ? ` in ${command.parameters.timezone}` : '';
        naturalLanguage = `What time is it${timezone}?`;
        break;

      case 'date':
        naturalLanguage = 'What is today\'s date?';
        break;

      case 'remind':
        naturalLanguage = `Create a reminder: ${command.parameters.message || 'task'} at ${command.parameters.time || 'later'}`;
        break;

      case 'reminders':
        naturalLanguage = 'Show me all my reminders';
        break;

      case 'analyze':
        naturalLanguage = 'Analyze the current document and provide insights';
        break;

      case 'export':
        naturalLanguage = 'Export this chat conversation history';
        break;

      case 'settings':
        naturalLanguage = 'Open the settings panel';
        break;

      case 'history':
        naturalLanguage = 'Show my command history';
        break;

      default:
        naturalLanguage = `Execute command: ${command.command}`;
    }

    return { 
      success: true, 
      message: 'Command converted to natural language', 
      naturalLanguage 
    };
  }

  /**
   * Handle /help command - show available commands
   */
  private static handleHelpCommand(
    command: ParsedCommand,
    addMessage: (message: Omit<import('../types').Message, 'id' | 'timestamp'>) => void
  ): CommandExecutionResult {
    const specificCommand = command.parameters.command as string;

    let helpText = '';

    if (specificCommand) {
      // Get help for specific command
      const cmd = COMMAND_REGISTRY.find((c: Command) => c.name === specificCommand);
      if (cmd) {
        helpText = `**/${cmd.name}** - ${cmd.description}\n\n`;
        if (cmd.aliases.length > 0) {
          helpText += `**Aliases:** ${cmd.aliases.map((a: string) => `/${a}`).join(', ')}\n\n`;
        }
        if (cmd.parameters.length > 0) {
          helpText += '**Parameters:**\n';
          cmd.parameters.forEach(p => {
            helpText += `  • ${p.name} ${p.required ? '(required)' : '(optional)'}: ${p.description}\n`;
          });
          helpText += '\n';
        }
        if (cmd.examples && cmd.examples.length > 0) {
          helpText += '**Examples:**\n';
          cmd.examples.forEach(ex => {
            helpText += `  ${ex}\n`;
          });
        }
      } else {
        helpText = `Command not found: ${specificCommand}`;
      }
    } else {
      // Show all commands grouped by category
      const categories: Record<string, Command[]> = {};
      
      COMMAND_REGISTRY.forEach((cmd: Command) => {
        if (!categories[cmd.category]) {
          categories[cmd.category] = [];
        }
        categories[cmd.category].push(cmd);
      });

      helpText = '# Available Slash Commands\n\n';
      helpText += 'Type `/` to see autocomplete suggestions. Here are all available commands:\n\n';
      
      Object.entries(categories).forEach(([category, commands]) => {
        helpText += `### ${category}\n`;
        commands.forEach((cmd: Command) => {
          helpText += `• **/${cmd.name}** - ${cmd.description}\n`;
        });
        helpText += '\n';
      });

      helpText += '\n💡 **Tips:**\n';
      helpText += '• Type `/help <command>` for detailed help on a specific command\n';
      helpText += '• Use ↑↓ arrows to navigate autocomplete\n';
      helpText += '• Press Enter or Tab to select a command\n';
      helpText += '• Press Escape to close autocomplete';
    }

    addMessage({
      content: helpText,
      role: 'assistant',
      mode: 'online',
    });

    return { success: true, message: 'Help displayed' };
  }

  /**
   * Handle /clear command - clear chat history
   */
  private static handleClearCommand(
    context: { clearMessages?: () => void }
  ): CommandExecutionResult {
    if (context.clearMessages) {
      context.clearMessages();
      return { success: true, message: 'Chat cleared' };
    }
    return { success: false, error: 'Clear function not available' };
  }
}

export default CommandExecutor;
