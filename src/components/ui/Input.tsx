import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({
    className = '',
    type = 'text',
    label,
    helperText,
    error,
    leftIcon,
    rightIcon,
    fullWidth = true,
    id,
    ...props
  }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    const baseInputClasses = `
      flex h-12 w-full rounded-xl bg-purple-900/20 dark:bg-purple-800/30 backdrop-blur-xl border px-4 py-3 text-sm lg:text-base
      file:border-0 file:bg-transparent file:text-sm file:font-medium
      placeholder:text-purple-300/70 dark:placeholder:text-purple-400/70
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/50 focus-visible:border-purple-300/50
      disabled:cursor-not-allowed disabled:opacity-50
      transition-all duration-300 text-purple-100 dark:text-purple-100
      hover:bg-purple-800/30 dark:hover:bg-purple-700/40 hover:border-purple-400/40
    `;

    const inputClasses = error
      ? `${baseInputClasses} border-red-500/50 focus-visible:ring-red-500/50 focus-visible:border-red-400/50`
      : `${baseInputClasses} border-purple-400/30 dark:border-purple-300/40 focus-visible:ring-purple-400/50`;

    const finalClassName = fullWidth ? `${inputClasses} ${className}` : className;

    return (
      <div className={`space-y-2 ${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm lg:text-base font-medium leading-none text-purple-200 dark:text-purple-100"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400">
              {leftIcon}
            </div>
          )}

          <input
            type={type}
            id={inputId}
            className={`${finalClassName} ${leftIcon ? 'pl-10' : ''} ${rightIcon ? 'pr-10' : ''}`}
            ref={ref}
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400">
              {rightIcon}
            </div>
          )}
        </div>

        {helperText && !error && (
          <p className="text-sm text-purple-300/80 dark:text-purple-400/80">
            {helperText}
          </p>
        )}

        {error && (
          <p className="text-sm text-red-400 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };