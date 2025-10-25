/**
 * SearchSuggestions Component
 * 
 * Displays autocomplete suggestions in a dropdown below the search input.
 * Provides keyboard navigation and click-to-select functionality.
 */

import React, { useState, useRef, useEffect } from 'react';
import './SearchComponents.css';

interface SearchSuggestionsProps {
  suggestions: string[];
  query: string;
  onSuggestionSelect: (suggestion: string) => void;
  onClose: () => void;
}

const SearchSuggestions: React.FC<SearchSuggestionsProps> = ({
  suggestions,
  query,
  onSuggestionSelect,
  onClose
}) => {
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < suggestions.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && suggestions[selectedIndex]) {
            onSuggestionSelect(suggestions[selectedIndex]);
          }
          break;
        case 'Escape':
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, suggestions, onSuggestionSelect, onClose]);

  // Highlight matching text in suggestions
  const highlightMatch = (suggestion: string, searchQuery: string) => {
    if (!searchQuery) return suggestion;
    
    const regex = new RegExp(`(${searchQuery})`, 'gi');
    const parts = suggestion.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="suggestion-highlight">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  if (suggestions.length === 0) return null;

  return (
    <div 
      ref={suggestionsRef}
      className="search-suggestions-dropdown"
      role="listbox"
    >
      {suggestions.map((suggestion, index) => (
        <div
          key={index}
          className={`suggestion-item ${
            index === selectedIndex ? 'selected' : ''
          }`}
          onClick={() => onSuggestionSelect(suggestion)}
          onMouseEnter={() => setSelectedIndex(index)}
          role="option"
          aria-selected={index === selectedIndex}
        >
          <span className="suggestion-icon">💡</span>
          <span className="suggestion-text">
            {highlightMatch(suggestion, query)}
          </span>
        </div>
      ))}
      
      <div className="suggestions-footer">
        <span className="suggestions-tip">
          ↑↓ to navigate • Enter to select • Esc to close
        </span>
      </div>
    </div>
  );
};

export default SearchSuggestions;