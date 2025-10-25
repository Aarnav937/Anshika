import React from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
  fullWidth?: boolean;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({
    className = '',
    label,
    helperText,
    error,
    fullWidth = true,
    resize = 'vertical',
    id,
    rows = 3,
    ...props
  }, ref) => {
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;

    const resizeClasses = {
      none: 'resize-none',
      vertical: 'resize-y',
      horizontal: 'resize-x',
      both: 'resize',
    };

    const baseTextareaClasses = `
      flex min-h-[120px] w-full rounded-xl bg-purple-900/20 dark:bg-purple-800/30 backdrop-blur-xl border px-4 py-3 text-sm lg:text-base
      placeholder:text-purple-300/70 dark:placeholder:text-purple-400/70
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/50 focus-visible:border-purple-300/50
      disabled:cursor-not-allowed disabled:opacity-50
      transition-all duration-300 text-purple-100 dark:text-purple-100
      hover:bg-purple-800/30 dark:hover:bg-purple-700/40 hover:border-purple-400/40
      ${resizeClasses[resize]}
    `;

    const textareaClasses = error
      ? `${baseTextareaClasses} border-red-500/50 focus-visible:ring-red-500/50 focus-visible:border-red-400/50`
      : `${baseTextareaClasses} border-purple-400/30 dark:border-purple-300/40 focus-visible:ring-purple-400/50`;

    const finalClassName = fullWidth ? `${textareaClasses} ${className}` : className;

    return (
      <div className={`space-y-2 ${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <label
            htmlFor={textareaId}
            className="text-sm lg:text-base font-medium leading-none text-purple-200 dark:text-purple-100"
          >
            {label}
          </label>
        )}

        <textarea
          id={textareaId}
          className={finalClassName}
          ref={ref}
          rows={rows}
          {...props}
        />

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

Textarea.displayName = "Textarea";

export { Textarea };