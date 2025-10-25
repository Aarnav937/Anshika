import React from 'react';
import { LucideIcon } from 'lucide-react';

export type IconVariant = 'default' | 'cosmic' | 'glow' | 'gradient' | 'minimal';
export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface IconProps {
  icon: LucideIcon;
  variant?: IconVariant;
  size?: IconSize;
  className?: string;
}

const getSizeClasses = (size: IconSize) => {
  switch (size) {
    case 'xs':
      return 'w-3 h-3';
    case 'sm':
      return 'w-4 h-4';
    case 'md':
      return 'w-5 h-5';
    case 'lg':
      return 'w-6 h-6';
    case 'xl':
      return 'w-8 h-8';
    default:
      return 'w-5 h-5';
  }
};

const getVariantClasses = (variant: IconVariant) => {
  switch (variant) {
    case 'cosmic':
      return 'text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]';
    case 'glow':
      return 'text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)] animate-pulse';
    case 'gradient':
      return 'bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent';
    case 'minimal':
      return 'text-gray-500 dark:text-gray-400';
    default:
      return 'text-gray-600 dark:text-gray-300';
  }
};

export const Icon: React.FC<IconProps> = ({
  icon: IconComponent,
  variant = 'default',
  size = 'md',
  className = ''
}) => {
  const sizeClasses = getSizeClasses(size);
  const variantClasses = getVariantClasses(variant);
  const combinedClasses = `${sizeClasses} ${variantClasses} ${className}`.trim();

  return <IconComponent className={combinedClasses} />;
};

// Pre-configured cosmic icons for common use cases
export const CosmicIcon: React.FC<Omit<IconProps, 'variant'>> = (props) => (
  <Icon {...props} variant="cosmic" />
);

export const GlowIcon: React.FC<Omit<IconProps, 'variant'>> = (props) => (
  <Icon {...props} variant="glow" />
);

export const GradientIcon: React.FC<Omit<IconProps, 'variant'>> = (props) => (
  <Icon {...props} variant="gradient" />
);

export const MinimalIcon: React.FC<Omit<IconProps, 'variant'>> = (props) => (
  <Icon {...props} variant="minimal" />
);