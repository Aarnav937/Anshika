/**
 * Keyboard Shortcuts Help Modal
 * Displays all available keyboard shortcuts
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { X, Keyboard, Search, Sparkles } from 'lucide-react';
import { trapFocus } from '../utils/accessibilityUtils';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    // Trap focus
    const cleanup = trapFocus(modalRef.current);

    // Handle escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
      cleanup();
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const allShortcuts = useMemo(() => ({
    'Global Shortcuts': [
      { keys: 'Ctrl/Cmd + Enter', description: 'Send message' },
      { keys: 'Ctrl/Cmd + K', description: 'New conversation' },
      { keys: 'Ctrl/Cmd + F', description: 'Search conversations' },
      { keys: 'Ctrl/Cmd + ,', description: 'Open settings' },
      { keys: 'Escape', description: 'Close modal or cancel action' },
      { keys: 'Ctrl/Cmd + /', description: 'Show this help' },
    ],
    'Chat Shortcuts': [
      { keys: 'Shift + Enter', description: 'New line in message input' },
      { keys: 'Arrow Up', description: 'Edit last message' },
      { keys: 'Tab', description: 'Navigate between elements' },
    ],
    'Voice Shortcuts': [
      { keys: 'Spacebar (hold)', description: 'Voice input (push-to-talk)' },
      { keys: 'Ctrl/Cmd + M', description: 'Toggle microphone' },
    ],
    'Document Shortcuts': [
      { keys: 'Ctrl/Cmd + U', description: 'Upload document' },
      { keys: 'Ctrl/Cmd + D', description: 'Open document workspace' },
      { keys: 'Ctrl/Cmd + Shift + F', description: 'Document search' },
    ],
    'Task Shortcuts': [
      { keys: 'Ctrl/Cmd + T', description: 'Create new task' },
      { keys: 'Ctrl/Cmd + Shift + T', description: 'Open task list' },
    ],
    'Navigation': [
      { keys: 'Arrow Keys', description: 'Navigate lists and menus' },
      { keys: 'Home', description: 'Jump to first item' },
      { keys: 'End', description: 'Jump to last item' },
      { keys: 'Enter', description: 'Select/activate item' },
    ],
  }), []);

  const filteredShortcutGroups = useMemo(() => {
    if (!searchTerm.trim()) {
      return allShortcuts;
    }

    const filtered: Partial<typeof allShortcuts> = {};
    const searchLower = searchTerm.toLowerCase();

    Object.entries(allShortcuts).forEach(([groupName, shortcuts]) => {
      const filteredShortcuts = shortcuts.filter(shortcut =>
        shortcut.description.toLowerCase().includes(searchLower) ||
        shortcut.keys.toLowerCase().includes(searchLower)
      );

      if (filteredShortcuts.length > 0) {
        (filtered as any)[groupName] = filteredShortcuts;
      }
    });

    return filtered;
  }, [allShortcuts, searchTerm]);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
    >
      <div
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg">
              <Keyboard className="w-6 h-6 text-white" aria-hidden="true" />
            </div>
            <h2 id="shortcuts-title" className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 dark:hover:bg-gray-700/50 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 backdrop-blur-sm"
            aria-label="Close shortcuts help"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" aria-hidden="true" />
          </button>
        </div>

        {/* Search Section */}
        <div className="p-6 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search shortcuts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)] bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
          {Object.keys(filteredShortcutGroups).length === 0 ? (
            <div className="text-center py-8">
              <Sparkles className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No shortcuts found matching your search.</p>
            </div>
          ) : (
            <div className="grid gap-8 md:grid-cols-2">
              {Object.entries(filteredShortcutGroups).map(([groupName, shortcuts]) => (
                <div key={groupName} className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                    <div className="w-2 h-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full mr-3"></div>
                    {groupName}
                  </h3>
                  <div className="space-y-2">
                    {shortcuts.map((shortcut, index) => (
                      <div
                        key={index}
                        className="flex items-start justify-between py-3 px-4 rounded-xl hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 dark:hover:from-gray-700/50 dark:hover:to-gray-600/50 transition-all duration-200 border border-transparent hover:border-indigo-200 dark:hover:border-gray-600"
                      >
                        <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 pr-4 leading-relaxed">
                          {shortcut.description}
                        </span>
                        <kbd className="inline-flex items-center px-3 py-1 text-xs font-mono font-semibold text-indigo-700 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg dark:from-gray-700 dark:to-gray-600 dark:text-indigo-300 dark:border-gray-500 whitespace-nowrap shadow-sm">
                          {shortcut.keys}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Additional Tips */}
          <div className="mt-8 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-gray-800/50 dark:to-gray-700/50 rounded-xl border border-indigo-200 dark:border-gray-600 backdrop-blur-sm">
            <h4 className="font-semibold text-indigo-900 dark:text-indigo-200 mb-3 flex items-center">
              <Sparkles className="w-4 h-4 mr-2" />
              Pro Tips
            </h4>
            <ul className="space-y-2 text-sm text-indigo-800 dark:text-indigo-300">
              <li className="flex items-center">
                <div className="w-1 h-1 bg-indigo-400 rounded-full mr-3"></div>
                Use <kbd className="px-2 py-1 text-xs bg-white/50 dark:bg-gray-700/50 rounded mx-1">Tab</kbd> to navigate between interactive elements
              </li>
              <li className="flex items-center">
                <div className="w-1 h-1 bg-indigo-400 rounded-full mr-3"></div>
                Most shortcuts work with both Ctrl (Windows/Linux) and Cmd (Mac)
              </li>
              <li className="flex items-center">
                <div className="w-1 h-1 bg-indigo-400 rounded-full mr-3"></div>
                Press <kbd className="px-2 py-1 text-xs bg-white/50 dark:bg-gray-700/50 rounded mx-1">?</kbd> anytime to show this cosmic help
              </li>
              <li className="flex items-center">
                <div className="w-1 h-1 bg-indigo-400 rounded-full mr-3"></div>
                Screen reader users: All features are fully accessible with cosmic navigation
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-indigo-50 dark:from-gray-900/50 dark:to-gray-800/50">
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Keyboard shortcut display component
 */
interface ShortcutKeyProps {
  keys: string;
  className?: string;
}

export function ShortcutKey({ keys, className = '' }: ShortcutKeyProps) {
  const keyParts = keys.split('+').map(k => k.trim());

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {keyParts.map((key, index) => (
        <React.Fragment key={index}>
          {index > 0 && <span className="text-gray-400 dark:text-gray-500">+</span>}
          <kbd className="px-2 py-1 text-xs font-mono font-semibold text-gray-800 bg-gray-100 border border-gray-300 rounded dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600">
            {key}
          </kbd>
        </React.Fragment>
      ))}
    </span>
  );
}
