import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme, ThemeMode } from '../contexts/ThemeContext';

interface ThemeToggleProps {
  /** Show labels for each mode */
  showLabels?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  showLabels = false,
  size = 'md',
  className = ''
}) => {
  const { theme, setTheme, effectiveTheme } = useTheme();

  const sizeClasses = {
    sm: 'h-8 px-2 text-xs',
    md: 'h-10 px-3 text-sm',
    lg: 'h-12 px-4 text-base',
  };

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 20,
  };

  const modes: { mode: ThemeMode; icon: typeof Sun; label: string }[] = [
    { mode: 'light', icon: Sun, label: 'Light' },
    { mode: 'auto', icon: Monitor, label: 'Auto' },
    { mode: 'dark', icon: Moon, label: 'Dark' },
  ];

  const handleModeClick = (mode: ThemeMode) => {
    setTheme(mode);
  };

  const getTooltipText = (): string => {
    if (theme === 'auto') {
      return `Auto (currently ${effectiveTheme})`;
    }
    return theme.charAt(0).toUpperCase() + theme.slice(1);
  };

  return (
    <div className={`inline-flex items-center ${className}`}>
      <div 
        className="inline-flex bg-gray-200 dark:bg-gray-800 rounded-lg p-1 gap-1 transition-colors duration-300"
        role="radiogroup"
        aria-label="Theme mode selection"
      >
        {modes.map(({ mode, icon: Icon, label }) => {
          const isActive = theme === mode;
          
          return (
            <button
              key={mode}
              onClick={() => handleModeClick(mode)}
              role="radio"
              aria-checked={isActive}
              aria-label={`${label} theme`}
              title={mode === 'auto' ? `Auto (follows system: ${effectiveTheme})` : `${label} theme`}
              className={`
                relative flex items-center justify-center gap-2 rounded-md
                ${sizeClasses[size]}
                transition-all duration-300 ease-in-out
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
                dark:focus-visible:ring-offset-gray-900
                ${isActive 
                  ? 'bg-white dark:bg-gray-700 shadow-lg text-gray-900 dark:text-gray-100 scale-105' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                }
              `}
            >
              <Icon 
                size={iconSizes[size]} 
                className={`
                  transition-transform duration-300
                  ${isActive ? 'scale-110' : 'scale-100'}
                `}
              />
              {showLabels && (
                <span className="font-medium whitespace-nowrap">
                  {label}
                </span>
              )}
              
              {/* Active indicator */}
              {isActive && (
                <span className="absolute inset-0 rounded-md ring-2 ring-blue-500 dark:ring-blue-400 animate-pulse-subtle" />
              )}
            </button>
          );
        })}
      </div>

      {/* Screen reader live region for announcements */}
      <span className="sr-only" aria-live="polite">
        Current theme: {getTooltipText()}
      </span>
    </div>
  );
};

export default ThemeToggle;
