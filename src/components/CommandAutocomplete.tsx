import React, { useState, useEffect, useRef } from 'react';
import { Command } from '../types/command';
import { COMMAND_REGISTRY } from '../services/commandRegistry';
import { 
  FaImage, FaCloudSun, FaTasks, FaSearch, FaClock, FaCalendar, 
  FaBell, FaChartLine, FaFileExport, FaQuestionCircle, FaTrash, 
  FaCog, FaHistory 
} from 'react-icons/fa';

interface CommandAutocompleteProps {
  inputValue: string;
  onSelectCommand: (command: string) => void;
  onClose: () => void;
  isVisible: boolean;
  position?: { top: number; left: number };
}

interface CommandMatch {
  command: Command;
  matchType: 'name' | 'alias';
  matchedText: string;
  score: number;
}

/**
 * CommandAutocomplete - Intelligent autocomplete dropdown for slash commands
 * 
 * Features:
 * - Fuzzy matching with scoring
 * - Category-based grouping with icons
 * - Full keyboard navigation (Up/Down/Enter/Escape)
 * - Highlight matching text
 * - Show parameters and examples
 * - Smooth animations
 */
export const CommandAutocomplete: React.FC<CommandAutocompleteProps> = ({
  inputValue,
  onSelectCommand,
  onClose,
  isVisible,
  position,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [matches, setMatches] = useState<CommandMatch[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLDivElement>(null);

  // Category icon mapping
  const categoryIcons: Record<string, React.ReactNode> = {
    'AI Generation': <FaImage className="w-4 h-4" />,
    'Information': <FaCloudSun className="w-4 h-4" />,
    'Task Management': <FaTasks className="w-4 h-4" />,
    'Search': <FaSearch className="w-4 h-4" />,
    'Time': <FaClock className="w-4 h-4" />,
    'Date': <FaCalendar className="w-4 h-4" />,
    'Reminders': <FaBell className="w-4 h-4" />,
    'Analytics': <FaChartLine className="w-4 h-4" />,
    'Export': <FaFileExport className="w-4 h-4" />,
    'Help': <FaQuestionCircle className="w-4 h-4" />,
    'Utility': <FaTrash className="w-4 h-4" />,
    'Settings': <FaCog className="w-4 h-4" />,
    'History': <FaHistory className="w-4 h-4" />,
  };

  /**
   * Fuzzy match scoring algorithm
   * Prioritizes: exact prefix > word start > substring > fuzzy match
   */
  const calculateMatchScore = (query: string, target: string): number => {
    const lowerQuery = query.toLowerCase();
    const lowerTarget = target.toLowerCase();

    // Exact match - highest score
    if (lowerTarget === lowerQuery) return 1000;

    // Exact prefix match
    if (lowerTarget.startsWith(lowerQuery)) return 900;

    // Word boundary match (e.g., "task" matches "create_task")
    if (new RegExp(`\\b${lowerQuery}`, 'i').test(target)) return 800;

    // Substring match
    if (lowerTarget.includes(lowerQuery)) return 700;

    // Fuzzy match - character sequence
    let score = 0;
    let queryIndex = 0;
    for (let i = 0; i < target.length && queryIndex < query.length; i++) {
      if (lowerTarget[i] === lowerQuery[queryIndex]) {
        score += 100;
        queryIndex++;
      }
    }
    
    // Only return if all query characters matched
    return queryIndex === query.length ? score : 0;
  };

  /**
   * Find and score matching commands
   */
  const findMatches = (input: string): CommandMatch[] => {
    if (!input.startsWith('/')) return [];

    const query = input.slice(1).trim().toLowerCase();

    // Show all commands if just "/" or "/help"
    if (!query || query === 'help') {
      return COMMAND_REGISTRY.map(cmd => ({
        command: cmd,
        matchType: 'name' as const,
        matchedText: cmd.name,
        score: 500,
      }));
    }

    const results: CommandMatch[] = [];

    for (const cmd of COMMAND_REGISTRY) {
      // Check command name
      const nameScore = calculateMatchScore(query, cmd.name);
      if (nameScore > 0) {
        results.push({
          command: cmd,
          matchType: 'name',
          matchedText: cmd.name,
          score: nameScore + 50, // Bonus for matching command name
        });
      }

      // Check aliases
      for (const alias of cmd.aliases) {
        const aliasScore = calculateMatchScore(query, alias);
        if (aliasScore > 0) {
          results.push({
            command: cmd,
            matchType: 'alias',
            matchedText: alias,
            score: aliasScore,
          });
        }
      }
    }

    // Sort by score (highest first), then alphabetically
    return results
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.matchedText.localeCompare(b.matchedText);
      })
      .slice(0, 8); // Limit to 8 suggestions for better UX
  };

  /**
   * Update matches when input changes
   */
  useEffect(() => {
    const newMatches = findMatches(inputValue);
    setMatches(newMatches);
    setSelectedIndex(0); // Reset selection
  }, [inputValue]);

  /**
   * Scroll selected item into view
   */
  useEffect(() => {
    if (selectedItemRef.current && dropdownRef.current) {
      selectedItemRef.current.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [selectedIndex]);

  /**
   * Keyboard navigation handler
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isVisible || matches.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, matches.length - 1));
          break;

        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;

        case 'Enter':
          e.preventDefault();
          if (matches[selectedIndex]) {
            handleSelectCommand(matches[selectedIndex]);
          }
          break;

        case 'Escape':
          e.preventDefault();
          onClose();
          break;

        case 'Tab':
          e.preventDefault();
          if (matches[selectedIndex]) {
            handleSelectCommand(matches[selectedIndex]);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, matches, selectedIndex]);

  /**
   * Handle command selection
   */
  const handleSelectCommand = (match: CommandMatch) => {
    const commandText = `/${match.matchedText}`;
    onSelectCommand(commandText);
  };

  /**
   * Highlight matching text in command name
   */
  const highlightMatch = (text: string, query: string): React.ReactNode => {
    if (!query) return text;

    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerText.indexOf(lowerQuery);

    if (index === -1) {
      // Fuzzy match - highlight matched characters
      const chars = text.split('');
      let queryIndex = 0;
      return (
        <>
          {chars.map((char, i) => {
            if (queryIndex < query.length && char.toLowerCase() === lowerQuery[queryIndex]) {
              queryIndex++;
              return (
                <span key={i} className="bg-blue-500/30 text-blue-300 font-semibold">
                  {char}
                </span>
              );
            }
            return <span key={i}>{char}</span>;
          })}
        </>
      );
    }

    // Substring match - highlight continuous section
    return (
      <>
        {text.slice(0, index)}
        <span className="bg-blue-500/30 text-blue-300 font-semibold">
          {text.slice(index, index + query.length)}
        </span>
        {text.slice(index + query.length)}
      </>
    );
  };

  if (!isVisible || matches.length === 0) return null;

  const query = inputValue.slice(1).trim();

  return (
    <div
      ref={dropdownRef}
      className="absolute z-50 w-96 max-h-96 overflow-y-auto bg-gray-800 border border-gray-700 rounded-lg shadow-2xl animate-slide-up"
      style={position ? { top: position.top, left: position.left } : { bottom: '100%', left: 0, marginBottom: '0.5rem' }}
    >
      {/* Header */}
      <div className="sticky top-0 bg-gray-900 border-b border-gray-700 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FaQuestionCircle className="text-blue-400" />
          <span className="text-sm font-medium text-gray-300">
            Available Commands
          </span>
        </div>
        <span className="text-xs text-gray-500">
          {matches.length} match{matches.length !== 1 ? 'es' : ''}
        </span>
      </div>

      {/* Command list */}
      <div className="py-2">
        {matches.map((match, index) => {
          const isSelected = index === selectedIndex;
          const icon = categoryIcons[match.command.category] || <FaQuestionCircle className="w-4 h-4" />;

          return (
            <div
              key={`${match.command.name}-${match.matchType}-${index}`}
              ref={isSelected ? selectedItemRef : null}
              className={`px-4 py-3 cursor-pointer transition-all duration-150 ${
                isSelected
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-gray-700 text-gray-300'
              }`}
              onClick={() => handleSelectCommand(match)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              {/* Command name and category */}
              <div className="flex items-center gap-3 mb-1">
                <div className={`${isSelected ? 'text-white' : 'text-blue-400'}`}>
                  {icon}
                </div>
                <div className="flex-1">
                  <div className="font-mono font-semibold">
                    /{highlightMatch(match.matchedText, query)}
                  </div>
                  {match.matchType === 'alias' && (
                    <div className="text-xs opacity-75">
                      Alias for /{match.command.name}
                    </div>
                  )}
                </div>
                <div className={`text-xs px-2 py-1 rounded ${
                  isSelected ? 'bg-blue-700' : 'bg-gray-700'
                }`}>
                  {match.command.category}
                </div>
              </div>

              {/* Description */}
              <div className={`text-sm ${isSelected ? 'text-blue-100' : 'text-gray-400'} mb-2`}>
                {match.command.description}
              </div>

              {/* Parameters */}
              {match.command.parameters.length > 0 && (
                <div className={`text-xs ${isSelected ? 'text-blue-200' : 'text-gray-500'} font-mono`}>
                  {match.command.parameters.map((param, i) => (
                    <span key={param.name}>
                      {i > 0 && ' '}
                      {param.required ? `<${param.name}>` : `[${param.name}]`}
                    </span>
                  ))}
                </div>
              )}

              {/* Example */}
              {match.command.examples && match.command.examples.length > 0 && (
                <div className={`text-xs mt-2 font-mono ${
                  isSelected ? 'text-blue-200' : 'text-gray-600'
                }`}>
                  Example: {match.command.examples[0]}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer with keyboard hints */}
      <div className="sticky bottom-0 bg-gray-900 border-t border-gray-700 px-4 py-2 text-xs text-gray-500 flex items-center justify-between">
        <div className="flex gap-4">
          <span><kbd className="px-1 py-0.5 bg-gray-700 rounded">↑↓</kbd> Navigate</span>
          <span><kbd className="px-1 py-0.5 bg-gray-700 rounded">Enter</kbd> Select</span>
          <span><kbd className="px-1 py-0.5 bg-gray-700 rounded">Esc</kbd> Close</span>
        </div>
      </div>
    </div>
  );
};

export default CommandAutocomplete;
