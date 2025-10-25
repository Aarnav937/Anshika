import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle, Lightbulb, BookOpen, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

export interface TooltipStep {
  id: string;
  title: string;
  content: string;
  icon?: React.ReactNode;
}

interface ContextualHelpTooltipProps {
  title: string;
  content: string;
  steps?: TooltipStep[];
  position?: 'top' | 'bottom' | 'left' | 'right';
  variant?: 'default' | 'cosmic' | 'minimal';
  size?: 'sm' | 'md' | 'lg';
  trigger?: 'hover' | 'click' | 'focus';
  className?: string;
  children?: React.ReactNode;
}

export const ContextualHelpTooltip: React.FC<ContextualHelpTooltipProps> = ({
  title,
  content,
  steps = [],
  position = 'top',
  variant = 'cosmic',
  size = 'md',
  trigger = 'hover',
  className = '',
  children
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node) &&
          triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
        setIsVisible(false);
        setIsExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTrigger = () => {
    if (trigger === 'click') {
      setIsVisible(!isVisible);
      setIsExpanded(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsVisible(false);
      setIsExpanded(false);
    }
  };

  const getPositionClasses = () => {
    const positions = {
      top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
      bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
      left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
      right: 'left-full top-1/2 transform -translate-y-1/2 ml-2',
    };
    return positions[position];
  };

  const getVariantClasses = () => {
    const variants = {
      default: 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700',
      cosmic: 'bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-800 dark:via-gray-700 dark:to-gray-600 border-indigo-200 dark:border-gray-600',
      minimal: 'bg-gray-900 text-white border-gray-700',
    };
    return variants[variant];
  };

  const getSizeClasses = () => {
    const sizes = {
      sm: 'max-w-xs p-3 text-sm',
      md: 'max-w-sm p-4 text-sm',
      lg: 'max-w-md p-5 text-base',
    };
    return sizes[size];
  };

  const getIcon = () => {
    if (steps.length > 0) return <BookOpen className="w-4 h-4" />;
    if (variant === 'cosmic') return <Sparkles className="w-4 h-4" />;
    return <HelpCircle className="w-4 h-4" />;
  };

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Trigger */}
      <div
        ref={triggerRef}
        onClick={handleTrigger}
        onMouseEnter={() => trigger === 'hover' && setIsVisible(true)}
        onMouseLeave={() => trigger === 'hover' && setIsVisible(false)}
        onFocus={() => trigger === 'focus' && setIsVisible(true)}
        onBlur={() => trigger === 'focus' && setIsVisible(false)}
        onKeyDown={handleKeyDown}
        className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 cursor-help shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        tabIndex={trigger === 'focus' ? 0 : -1}
        role="button"
        aria-label={`Help for ${title}`}
      >
        {children || getIcon()}
      </div>

      {/* Tooltip */}
      {isVisible && (
        <div
          ref={tooltipRef}
          className={`absolute ${getPositionClasses()} z-50 ${getSizeClasses()} ${getVariantClasses()} rounded-xl shadow-2xl border backdrop-blur-sm animate-fade-in`}
          role="tooltip"
          aria-live="polite"
        >
          {/* Arrow */}
          <div
            className={`absolute w-3 h-3 transform rotate-45 ${getVariantClasses()} border-r border-b ${
              position === 'top' ? 'top-full -mt-2 left-1/2 -translate-x-1/2' :
              position === 'bottom' ? 'bottom-full -mb-2 left-1/2 -translate-x-1/2' :
              position === 'left' ? 'left-full -ml-2 top-1/2 -translate-y-1/2' :
              'right-full -mr-2 top-1/2 -translate-y-1/2'
            }`}
          />

          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg">
                {getIcon()}
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {title}
              </h3>
            </div>

            {steps.length > 1 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 hover:bg-white/20 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
                aria-label={isExpanded ? 'Collapse steps' : 'Expand steps'}
              >
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                )}
              </button>
            )}
          </div>

          {/* Content */}
          <div className="space-y-3">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {content}
            </p>

            {/* Steps */}
            {steps.length > 0 && (isExpanded || steps.length === 1) && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Lightbulb className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    Quick Steps
                  </span>
                </div>

                <div className="space-y-2">
                  {steps.map((step, index) => (
                    <div
                      key={step.id}
                      className={`flex items-start space-x-3 p-2 rounded-lg transition-colors ${
                        index === currentStep
                          ? 'bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 border border-indigo-200 dark:border-indigo-700'
                          : 'bg-gray-50 dark:bg-gray-800/50'
                      }`}
                    >
                      <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                        index === currentStep
                          ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
                          : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                      }`}>
                        {index + 1}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                          {step.title}
                        </h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                          {step.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation for multiple steps */}
            {steps.length > 1 && isExpanded && (
              <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-600">
                <button
                  onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                  disabled={currentStep === 0}
                  className="px-3 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>

                <div className="flex space-x-1">
                  {steps.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentStep(index)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === currentStep
                          ? 'bg-gradient-to-r from-indigo-500 to-purple-600'
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                      aria-label={`Go to step ${index + 1}`}
                    />
                  ))}
                </div>

                <button
                  onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
                  disabled={currentStep === steps.length - 1}
                  className="px-3 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Predefined tooltip configurations for common use cases
export const TooltipPresets = {
  voiceInput: {
    title: 'Voice Input',
    content: 'Click and hold to record your message, or enable push-to-talk mode for hands-free interaction.',
    steps: [
      {
        id: 'enable-mic',
        title: 'Enable Microphone',
        content: 'Click the microphone button or use Ctrl/Cmd + M to start voice input.'
      },
      {
        id: 'speak-clearly',
        title: 'Speak Clearly',
        content: 'Speak naturally and clearly. The AI will transcribe your speech in real-time.'
      },
      {
        id: 'send-message',
        title: 'Send Message',
        content: 'Release the button or press Enter to send your voice message.'
      }
    ]
  },

  imageGeneration: {
    title: 'AI Image Generation',
    content: 'Create stunning visuals with our cosmic AI. Describe what you want to see and watch it come to life.',
    steps: [
      {
        id: 'describe-subject',
        title: 'Describe Your Vision',
        content: 'Enter a detailed description of the image you want to create.'
      },
      {
        id: 'choose-style',
        title: 'Select Style',
        content: 'Choose from various art styles like cosmic, realistic, or abstract.'
      },
      {
        id: 'generate',
        title: 'Generate',
        content: 'Click generate and watch your cosmic creation come to life!'
      }
    ]
  },

  documentUpload: {
    title: 'Document Intelligence',
    content: 'Upload documents to analyze, summarize, and ask questions about their content.',
    steps: [
      {
        id: 'select-file',
        title: 'Choose Document',
        content: 'Click upload and select PDF, DOCX, or TXT files from your device.'
      },
      {
        id: 'ai-processing',
        title: 'AI Analysis',
        content: 'Our AI will process and index your document for intelligent queries.'
      },
      {
        id: 'ask-questions',
        title: 'Ask Questions',
        content: 'Use the document workspace to ask questions about your content.'
      }
    ]
  }
};