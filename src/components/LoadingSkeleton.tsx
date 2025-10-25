import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'shimmer';
}

const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rectangular',
  width,
  height,
  animation = 'shimmer'
}) => {
  const baseClasses = 'bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700';

  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-lg'
  };

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'loading-shimmer',
    shimmer: 'loading-shimmer'
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      style={style}
    />
  );
};

// Message Bubble Skeleton
export const MessageBubbleSkeleton: React.FC = () => (
  <div className="flex justify-start message-bubble animate-fade-in">
    <div className="chat-message assistant max-w-[75%]">
      <div className="space-y-3 p-4">
        <Skeleton variant="text" width="80%" height={16} className="mb-2" />
        <Skeleton variant="text" width="60%" height={16} className="mb-2" />
        <Skeleton variant="text" width="40%" height={16} />
      </div>
      <div className="flex items-center justify-between mt-3 px-4 pb-2">
        <Skeleton variant="text" width="100px" height={12} />
        <Skeleton variant="circular" width={16} height={16} />
      </div>
    </div>
  </div>
);

// Chat Interface Skeleton
export const ChatInterfaceSkeleton: React.FC = () => (
  <div className="max-w-4xl mx-auto">
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700">
      {/* Messages Area Skeleton */}
      <div className="h-96 overflow-y-auto p-4 space-y-4">
        <MessageBubbleSkeleton />
        <div className="flex justify-end">
          <MessageBubbleSkeleton />
        </div>
        <MessageBubbleSkeleton />
        <div className="flex justify-end">
          <MessageBubbleSkeleton />
        </div>
      </div>

      {/* Input Area Skeleton */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Skeleton variant="rounded" height={44} className="mb-2" />
          </div>
          <div className="flex gap-2">
            <Skeleton variant="circular" width={44} height={44} />
            <Skeleton variant="circular" width={44} height={44} />
            <Skeleton variant="circular" width={44} height={44} />
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Sidebar Skeleton
export const SidebarSkeleton: React.FC = () => (
  <div className="w-64 bg-gray-900/60 dark:bg-gray-900/80 backdrop-blur-md border-r border-purple-500/20 dark:border-purple-400/30 p-4">
    <div className="space-y-4">
      <Skeleton variant="text" width="60%" height={24} className="mb-6" />
      <div className="space-y-2">
        <Skeleton variant="rounded" height={40} className="mb-2" />
        <Skeleton variant="rounded" height={40} className="mb-2" />
        <Skeleton variant="rounded" height={40} />
      </div>
    </div>
  </div>
);

// Document Card Skeleton
export const DocumentCardSkeleton: React.FC = () => (
  <div className="bg-gray-900/60 dark:bg-gray-900/80 backdrop-blur-md rounded-xl shadow-2xl border border-purple-500/20 dark:border-purple-400/30 p-6 card-hover">
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <Skeleton variant="text" width="70%" height={20} />
        <Skeleton variant="circular" width={24} height={24} />
      </div>
      <Skeleton variant="text" width="100%" height={16} className="mb-2" />
      <Skeleton variant="text" width="80%" height={16} className="mb-4" />
      <div className="flex items-center gap-4">
        <Skeleton variant="text" width="60px" height={14} />
        <Skeleton variant="text" width="80px" height={14} />
      </div>
    </div>
  </div>
);

// Image Generation Panel Skeleton
export const ImageGenerationSkeleton: React.FC = () => (
  <div className="max-w-4xl mx-auto space-y-6">
    <div className="bg-gray-900/60 dark:bg-gray-900/80 backdrop-blur-md rounded-xl shadow-2xl border border-purple-500/20 dark:border-purple-400/30 p-6">
      <div className="space-y-4">
        <Skeleton variant="text" width="50%" height={24} />
        <Skeleton variant="rounded" height={48} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Skeleton variant="rectangular" height={120} />
          <Skeleton variant="rectangular" height={120} />
          <Skeleton variant="rectangular" height={120} />
          <Skeleton variant="rectangular" height={120} />
        </div>
      </div>
    </div>
  </div>
);

// Generic List Skeleton
export const ListSkeleton: React.FC<{ items?: number }> = ({ items = 5 }) => (
  <div className="space-y-3">
    {Array.from({ length: items }).map((_, index) => (
      <div key={index} className="flex items-center gap-3 p-3">
        <Skeleton variant="circular" width={32} height={32} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="70%" height={16} />
          <Skeleton variant="text" width="40%" height={12} />
        </div>
      </div>
    ))}
  </div>
);

// Table Skeleton
export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 4
}) => (
  <div className="space-y-3">
    {/* Header */}
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {Array.from({ length: columns }).map((_, index) => (
        <Skeleton key={`header-${index}`} variant="text" width="80%" height={16} />
      ))}
    </div>

    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={`row-${rowIndex}`} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton
            key={`cell-${rowIndex}-${colIndex}`}
            variant="text"
            width="90%"
            height={14}
          />
        ))}
      </div>
    ))}
  </div>
);

export default Skeleton;