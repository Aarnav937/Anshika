import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'cosmic' | 'danger' | 'success' | 'warning';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const getVariantClasses = (variant: ButtonVariant) => {
  const baseClasses = "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 touch-target";

  switch (variant) {
    case 'primary':
      return `${baseClasses} bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg hover:from-purple-700 hover:to-blue-700 hover:shadow-xl hover:scale-105 active:scale-95`;
    case 'secondary':
      return `${baseClasses} bg-gradient-to-r from-gray-100 to-gray-200 text-gray-900 shadow-sm hover:from-gray-200 hover:to-gray-300 hover:shadow-md dark:bg-gray-800 dark:text-gray-100 dark:from-gray-700 dark:to-gray-600`;
    case 'ghost':
      return `${baseClasses} text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100`;
    case 'cosmic':
      return `${baseClasses} bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 text-white shadow-lg hover:shadow-2xl hover:scale-105 active:scale-95`;
    case 'danger':
      return `${baseClasses} bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg hover:from-red-600 hover:to-pink-700 hover:shadow-xl hover:scale-105 active:scale-95`;
    case 'success':
      return `${baseClasses} bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg hover:from-green-600 hover:to-emerald-700 hover:shadow-xl hover:scale-105 active:scale-95`;
    case 'warning':
      return `${baseClasses} bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg hover:from-yellow-600 hover:to-orange-600 hover:shadow-xl hover:scale-105 active:scale-95`;
    default:
      return `${baseClasses} bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg hover:from-purple-700 hover:to-blue-700 hover:shadow-xl hover:scale-105 active:scale-95`;
  }
};

const getSizeClasses = (size: ButtonSize) => {
  switch (size) {
    case 'sm':
      return "h-8 px-3 text-xs";
    case 'md':
      return "h-10 px-4 py-2 text-sm";
    case 'lg':
      return "h-12 px-6 text-base";
    case 'xl':
      return "h-14 px-8 text-lg";
    case 'icon':
      return "h-10 w-10";
    default:
      return "h-10 px-4 py-2 text-sm";
  }
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', isLoading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    const variantClasses = getVariantClasses(variant);
    const sizeClasses = getSizeClasses(size);
    const combinedClasses = `${variantClasses} ${sizeClasses} ${className}`.trim();

    return (
      <button
        className={combinedClasses}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
        )}
        {!isLoading && leftIcon && (
          <span className="flex-shrink-0">{leftIcon}</span>
        )}
        {children}
        {!isLoading && rightIcon && (
          <span className="flex-shrink-0">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };