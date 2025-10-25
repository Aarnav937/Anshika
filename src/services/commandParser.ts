/**
 * Command Parser Service
 * Parses slash commands and validates parameters
 * Task 3.1 - Slash Command System
 */

import type { ParsedCommand, CommandParameter, Command } from '../types/command';
import { COMMAND_REGISTRY } from './commandRegistry';

export class CommandParser {
  /**
   * Check if input starts with command prefix
   */
  static isCommand(input: string): boolean {
    return input.trim().startsWith('/');
  }

  /**
   * Parse command string into structured format
   */
  static parse(input: string): ParsedCommand {
    const trimmed = input.trim();
    
    if (!this.isCommand(trimmed)) {
      return {
        command: '',
        parameters: {},
        rawInput: input,
        isValid: false,
        errors: ['Input does not start with /'],
      };
    }

    // Remove leading slash
    const withoutSlash = trimmed.substring(1);
    
    // Split only the command name, keep rest as single string
    const firstSpaceIndex = withoutSlash.indexOf(' ');
    const commandName = firstSpaceIndex === -1 
      ? withoutSlash.toLowerCase() 
      : withoutSlash.substring(0, firstSpaceIndex).toLowerCase();
    const argsString = firstSpaceIndex === -1 
      ? '' 
      : withoutSlash.substring(firstSpaceIndex + 1).trim();

    if (commandName.length === 0) {
      return {
        command: '',
        parameters: {},
        rawInput: input,
        isValid: false,
        errors: ['Empty command'],
      };
    }

    // Find command in registry (check aliases too)
    const command = COMMAND_REGISTRY.find(
      (cmd: Command) => cmd.name === commandName || cmd.aliases.includes(commandName)
    );

    if (!command) {
      return {
        command: commandName,
        parameters: {},
        rawInput: input,
        isValid: false,
        errors: [`Unknown command: ${commandName}`],
      };
    }

    // Parse parameters based on command
    const { parameters, errors } = this.parseParameters(command, argsString);

    return {
      command: command.name, // Use canonical name, not alias
      parameters,
      rawInput: input,
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Parse and validate parameters
   * New approach: For commands like /imagine, treat all text as the prompt
   * unless named parameters are detected (e.g., style:anime)
   */
  private static parseParameters(
    command: Command,
    argsString: string
  ): { parameters: Record<string, any>; errors: string[] } {
    const parameters: Record<string, any> = {};
    const errors: string[] = [];

    if (!argsString) {
      // No args provided - check required parameters
      const requiredParams = command.parameters.filter(p => p.required);
      if (requiredParams.length > 0) {
        errors.push(
          `Missing required parameter: ${requiredParams[0].name}`
        );
      }
      return { parameters, errors };
    }

    // For single-parameter commands (like /imagine), treat entire string as that parameter
    if (command.parameters.length === 1 || 
        (command.parameters.length > 1 && !argsString.includes(':'))) {
      const firstParam = command.parameters[0];
      parameters[firstParam.name] = argsString;
      
      // Set defaults for remaining parameters
      for (let i = 1; i < command.parameters.length; i++) {
        const param = command.parameters[i];
        if (param.default !== undefined) {
          parameters[param.name] = param.default;
        }
      }
      
      return { parameters, errors };
    }

    // For commands with named parameters (e.g., style:anime quality:hd)
    // Parse named parameters first
    const namedParams: Record<string, string> = {};
    let remainingText = argsString;
    
    const namedParamRegex = /(\w+):([\w-]+)/g;
    let match;
    while ((match = namedParamRegex.exec(argsString)) !== null) {
      namedParams[match[1]] = match[2];
      remainingText = remainingText.replace(match[0], '').trim();
    }

    // First parameter gets remaining text
    if (command.parameters.length > 0) {
      const firstParam = command.parameters[0];
      if (remainingText) {
        parameters[firstParam.name] = remainingText;
      } else if (firstParam.required) {
        errors.push(`Missing required parameter: ${firstParam.name}`);
      }
    }

    // Map named parameters to their definitions
    for (let i = 1; i < command.parameters.length; i++) {
      const paramDef = command.parameters[i];
      const value = namedParams[paramDef.name];

      if (value) {
        try {
          parameters[paramDef.name] = this.parseParameterValue(paramDef, value);
        } catch (error) {
          errors.push(
            `Invalid value for ${paramDef.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      } else if (paramDef.default !== undefined) {
        parameters[paramDef.name] = paramDef.default;
      } else if (paramDef.required) {
        errors.push(`Missing required parameter: ${paramDef.name}`);
      }
    }

    return { parameters, errors };
  }

  /**
   * Parse single parameter value based on type
   */
  private static parseParameterValue(param: CommandParameter, value: string): any {
    switch (param.type) {
      case 'string':
        return value;

      case 'number':
        const num = parseFloat(value);
        if (isNaN(num)) {
          throw new Error(`Expected number, got: ${value}`);
        }
        return num;

      case 'boolean':
        const lower = value.toLowerCase();
        if (['true', 'yes', '1', 'on'].includes(lower)) return true;
        if (['false', 'no', '0', 'off'].includes(lower)) return false;
        throw new Error(`Expected boolean, got: ${value}`);

      case 'enum':
        if (!param.options?.includes(value)) {
          throw new Error(
            `Expected one of [${param.options?.join(', ')}], got: ${value}`
          );
        }
        return value;

      default:
        return value;
    }
  }

  /**
   * Get command suggestions based on partial input
   */
  static getSuggestions(input: string): string[] {
    const trimmed = input.trim().toLowerCase();
    
    if (!trimmed.startsWith('/')) {
      return [];
    }

    const withoutSlash = trimmed.substring(1);
    
    if (withoutSlash.length === 0) {
      // Show all commands
      return COMMAND_REGISTRY.map((cmd: Command) => `/${cmd.name}`);
    }

    // Filter commands that match
    const matches: string[] = [];

    for (const cmd of COMMAND_REGISTRY) {
      // Check command name
      if (cmd.name.startsWith(withoutSlash)) {
        matches.push(`/${cmd.name}`);
      }

      // Check aliases
      for (const alias of cmd.aliases) {
        if (alias.startsWith(withoutSlash)) {
          matches.push(`/${alias}`);
        }
      }
    }

    return matches.slice(0, 10); // Limit to 10 suggestions
  }

  /**
   * Get command help text
   */
  static getHelp(commandName: string): string {
    const command = COMMAND_REGISTRY.find(
      (cmd: Command) => cmd.name === commandName || cmd.aliases.includes(commandName)
    );

    if (!command) {
      return `Command not found: ${commandName}`;
    }

    let help = `**/${command.name}** - ${command.description}\n\n`;

    if (command.aliases.length > 0) {
      help += `**Aliases:** ${command.aliases.map((a: string) => `/${a}`).join(', ')}\n\n`;
    }

    if (command.parameters.length > 0) {
      help += `**Parameters:**\n`;
      for (const param of command.parameters) {
        const required = param.required ? '(required)' : '(optional)';
        help += `  • **${param.name}** ${required}: ${param.description}\n`;
        if (param.default !== undefined) {
          help += `    Default: ${param.default}\n`;
        }
      }
      help += '\n';
    }

    if (command.examples.length > 0) {
      help += `**Examples:**\n`;
      for (const example of command.examples) {
        help += `  \`${example}\`\n`;
      }
    }

    return help;
  }
}

export default CommandParser;
