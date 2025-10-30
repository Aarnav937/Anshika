/**
 * StreamingIndicator Component
 *
 * Visual indicator showing that AI is currently generating a streaming response.
 * Provides animated typing indicators and accessibility features.
 *
 * @author A.N.S.H.I.K.A. Development Team
 * @version 1.0.0
 * @since 2025-10-31
 */

import React from 'react';

interface StreamingIndicatorProps {
  message?: string;
  variant?: 'dots' | 'pulse' | 'wave' | 'typing';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const StreamingIndicator: React.FC<StreamingIndicatorProps> = ({
  message = 'Anshika is thinking...',
  variant = 'dots',
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const renderDots = () => (
    <div className="flex items-center gap-1" aria-hidden="true">
      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  );

  const renderPulse = () => (
    <div className="flex items-center gap-2" aria-hidden="true">
      <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse" />
      <div className="text-purple-600 dark:text-purple-400 font-medium">
        Generating response...
      </div>
    </div>
  );

  const renderWave = () => (
    <div className="flex items-center gap-1" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="w-1 bg-gradient-to-t from-purple-400 to-purple-600 rounded-full animate-pulse"
          style={{
            height: `${20 + Math.sin(i * 0.5) * 10}px`,
            animationDelay: `${i * 100}ms`,
            animationDuration: '1.5s',
          }}
        />
      ))}
    </div>
  );

  const renderTyping = () => (
    <div className="flex items-center gap-2" aria-hidden="true">
      <div className="flex gap-1">
        <div className="w-1 h-4 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
        <div className="w-1 h-6 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '100ms' }} />
        <div className="w-1 h-3 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
        <div className="w-1 h-5 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
        <div className="w-1 h-4 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '400ms' }} />
      </div>
      <span className="text-purple-600 dark:text-purple-400 font-medium">Typing...</span>
    </div>
  );

  const renderIndicator = () => {
    switch (variant) {
      case 'pulse':
        return renderPulse();
      case 'wave':
        return renderWave();
      case 'typing':
        return renderTyping();
      case 'dots':
      default:
        return renderDots();
    }
  };

  return (
    <div
      className={`flex items-center gap-3 ${sizeClasses[size]} ${className}`}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      {renderIndicator()}
      {variant !== 'pulse' && variant !== 'typing' && (
        <span className="text-purple-600 dark:text-purple-400 font-medium">
          {message}
        </span>
      )}

      {/* Screen reader only text for better accessibility */}
      <span className="sr-only">
        {message}
      </span>
    </div>
  );
};