import React, { useState, useEffect } from 'react';
import { Type, RotateCcw } from 'lucide-react';
import { typographyManager } from '../utils/typographyUtils';

interface TypographySettingsProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export const TypographySettings: React.FC<TypographySettingsProps> = ({
  isOpen,
  onClose,
  className = ''
}) => {
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large' | 'extra-large'>('medium');
  const [lineHeight, setLineHeight] = useState<'tight' | 'normal' | 'relaxed'>('normal');
  const [letterSpacing, setLetterSpacing] = useState<'tight' | 'normal' | 'wide'>('normal');

  // Load current settings on mount
  useEffect(() => {
    const loadSettings = () => {
      const savedFontSize = localStorage.getItem('typography-font-size-preference') as any;
      const savedLineHeight = localStorage.getItem('typography-line-height-preference') as any;
      const savedLetterSpacing = localStorage.getItem('typography-letter-spacing-preference') as any;

      if (savedFontSize && ['small', 'medium', 'large', 'extra-large'].includes(savedFontSize)) {
        setFontSize(savedFontSize);
      }
      if (savedLineHeight && ['tight', 'normal', 'relaxed'].includes(savedLineHeight)) {
        setLineHeight(savedLineHeight);
      }
      if (savedLetterSpacing && ['tight', 'normal', 'wide'].includes(savedLetterSpacing)) {
        setLetterSpacing(savedLetterSpacing);
      }
    };

    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const handleFontSizeChange = (newSize: 'small' | 'medium' | 'large' | 'extra-large') => {
    setFontSize(newSize);
    typographyManager.applyUserFontSizePreference(newSize);
  };

  const handleLineHeightChange = (newLineHeight: 'tight' | 'normal' | 'relaxed') => {
    setLineHeight(newLineHeight);
    typographyManager.applyUserLineHeightPreference(newLineHeight);
  };

  const handleLetterSpacingChange = (newSpacing: 'tight' | 'normal' | 'wide') => {
    setLetterSpacing(newSpacing);
    typographyManager.applyUserLetterSpacingPreference(newSpacing);
  };

  const resetToDefaults = () => {
    setFontSize('medium');
    setLineHeight('normal');
    setLetterSpacing('normal');

    typographyManager.applyUserFontSizePreference('medium');
    typographyManager.applyUserLineHeightPreference('normal');
    typographyManager.applyUserLetterSpacingPreference('normal');

    // Clear localStorage
    localStorage.removeItem('typography-font-size-preference');
    localStorage.removeItem('typography-line-height-preference');
    localStorage.removeItem('typography-letter-spacing-preference');
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm ${className}`}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
              <Type className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Typography Settings
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Customize text display for better readability
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors touch-target"
            aria-label="Close typography settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Font Size Setting */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Font Size
              </label>
              <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                {fontSize.replace('-', ' ')}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {(['small', 'medium', 'large', 'extra-large'] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => handleFontSizeChange(size)}
                  className={`px-3 py-2 text-sm rounded-lg border transition-all touch-target ${
                    fontSize === size
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  {size === 'small' && 'A-'}
                  {size === 'medium' && 'A'}
                  {size === 'large' && 'A+'}
                  {size === 'extra-large' && 'A++'}
                </button>
              ))}
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Adjust the base font size for better readability
            </p>
          </div>

          {/* Line Height Setting */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Line Height
              </label>
              <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                {lineHeight}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(['tight', 'normal', 'relaxed'] as const).map((height) => (
                <button
                  key={height}
                  onClick={() => handleLineHeightChange(height)}
                  className={`px-3 py-2 text-sm rounded-lg border transition-all touch-target ${
                    lineHeight === height
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  {height === 'tight' && '↕️'}
                  {height === 'normal' && '↕️↕️'}
                  {height === 'relaxed' && '↕️↕️↕️'}
                </button>
              ))}
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Control spacing between lines of text
            </p>
          </div>

          {/* Letter Spacing Setting */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Letter Spacing
              </label>
              <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                {letterSpacing}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(['tight', 'normal', 'wide'] as const).map((spacing) => (
                <button
                  key={spacing}
                  onClick={() => handleLetterSpacingChange(spacing)}
                  className={`px-3 py-2 text-sm rounded-lg border transition-all touch-target ${
                    letterSpacing === spacing
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  {spacing === 'tight' && 'Aa'}
                  {spacing === 'normal' && 'A a'}
                  {spacing === 'wide' && 'A  a'}
                </button>
              ))}
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Adjust spacing between individual characters
            </p>
          </div>

          {/* Preview Area */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Preview
            </h4>
            <div className="space-y-2 text-sm">
              <p className="font-semibold">
                This is how headings will look
              </p>
              <p>
                This is how regular text will appear with your current settings. You can adjust the font size, line height, and letter spacing to find what works best for your reading preferences.
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                The quick brown fox jumps over the lazy dog.
              </p>
            </div>
          </div>

          {/* Reset Button */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={resetToDefaults}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors touch-target"
            >
              <RotateCcw className="w-4 h-4" />
              Reset to Defaults
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors touch-target"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors touch-target"
          >
            Apply Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default TypographySettings;