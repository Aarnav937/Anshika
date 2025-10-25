/**
 * ConversationTags Component
 * Tag selection and filtering UI
 */

import React from 'react';
import { DEFAULT_TAGS, ConversationTag } from '../types/conversation';

interface ConversationTagsProps {
  selectedTags: string[];
  onTagSelect: (tagId: string) => void;
  availableTags?: ConversationTag[];
}

export const ConversationTags: React.FC<ConversationTagsProps> = ({
  selectedTags,
  onTagSelect,
  availableTags = DEFAULT_TAGS,
}) => {
  return (
    <div className="flex flex-wrap gap-2">
      {availableTags.map(tag => {
        const isSelected = selectedTags.includes(tag.id);
        return (
          <button
            key={tag.id}
            onClick={() => onTagSelect(tag.id)}
            className={`
              px-3 py-1 rounded-full text-xs font-medium transition-all
              ${isSelected
                ? `bg-${tag.color}-500 text-white shadow-md transform scale-105`
                : `bg-${tag.color}-100 text-${tag.color}-700 hover:bg-${tag.color}-200
                   dark:bg-${tag.color}-900 dark:text-${tag.color}-300 dark:hover:bg-${tag.color}-800`
              }
            `}
          >
            {tag.icon} {tag.name}
          </button>
        );
      })}
    </div>
  );
};

/**
 * Tag Badge Component
 * Display a single tag badge
 */
interface TagBadgeProps {
  tag: ConversationTag;
  onRemove?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export const TagBadge: React.FC<TagBadgeProps> = ({
  tag,
  onRemove,
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full font-medium
        bg-${tag.color}-100 text-${tag.color}-700
        dark:bg-${tag.color}-900 dark:text-${tag.color}-300
        ${sizeClasses[size]}
      `}
    >
      {tag.icon && <span>{tag.icon}</span>}
      <span>{tag.name}</span>
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 hover:text-red-500 transition-colors"
          aria-label="Remove tag"
        >
          ×
        </button>
      )}
    </span>
  );
};

/**
 * Tag Selector Component
 * Dropdown for selecting tags to add to a conversation
 */
interface TagSelectorProps {
  currentTags: ConversationTag[];
  onAddTag: (tag: ConversationTag) => void;
  onRemoveTag: (tagId: string) => void;
  availableTags?: ConversationTag[];
}

export const TagSelector: React.FC<TagSelectorProps> = ({
  currentTags,
  onAddTag,
  onRemoveTag,
  availableTags = DEFAULT_TAGS,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  
  // Filter out already added tags
  const availableToAdd = availableTags.filter(
    tag => !currentTags.some(t => t.id === tag.id)
  );

  return (
    <div className="relative">
      {/* Current Tags */}
      <div className="flex flex-wrap gap-2 mb-2">
        {currentTags.map(tag => (
          <TagBadge
            key={tag.id}
            tag={tag}
            onRemove={() => onRemoveTag(tag.id)}
            size="sm"
          />
        ))}
      </div>

      {/* Add Tag Button */}
      {availableToAdd.length > 0 && (
        <div>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            + Add tag
          </button>

          {/* Dropdown */}
          {isOpen && (
            <div className="absolute z-10 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 min-w-[200px]">
              {availableToAdd.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => {
                    onAddTag(tag);
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <TagBadge tag={tag} size="sm" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
