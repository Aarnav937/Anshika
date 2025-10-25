import React, { useState, useEffect } from 'react';
import { RefreshCw, ChevronDown } from 'lucide-react';
import { useMobileGestures } from '../hooks/useMobileGestures';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
  threshold?: number;
  className?: string;
  disabled?: boolean;
  refreshIcon?: React.ReactNode;
  pullText?: string;
  releaseText?: string;
  refreshingText?: string;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  threshold = 80,
  className = '',
  disabled = false,
  refreshIcon,
  pullText = 'Pull to refresh',
  releaseText = 'Release to refresh',
  refreshingText = 'Refreshing...'
}) => {
  const [refreshState, setRefreshState] = useState<'idle' | 'pulling' | 'canRefresh' | 'refreshing'>('idle');
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { ref: gestureRef } = useMobileGestures({
    onPullToRefresh: (distance: number) => {
      if (disabled || isRefreshing) return;

      setPullDistance(distance);
      setRefreshState(distance >= threshold ? 'canRefresh' : 'pulling');
    },
    onPullToRefreshEnd: async () => {
      if (disabled || isRefreshing) return;

      if (refreshState === 'canRefresh') {
        setRefreshState('refreshing');
        setIsRefreshing(true);

        try {
          await onRefresh();
        } catch (error) {
          console.error('Refresh failed:', error);
        } finally {
          setIsRefreshing(false);
          setRefreshState('idle');
          setPullDistance(0);
        }
      } else {
        setRefreshState('idle');
        setPullDistance(0);
      }
    }
  }, {
    pullToRefreshThreshold: threshold,
    enableHapticFeedback: true
  });

  // Calculate pull progress for animations
  const pullProgress = Math.min(pullDistance / threshold, 1);
  const iconRotation = pullProgress * 180; // Rotate icon based on pull progress

  // Reset state when disabled
  useEffect(() => {
    if (disabled) {
      setRefreshState('idle');
      setPullDistance(0);
      setIsRefreshing(false);
    }
  }, [disabled]);

  const getDisplayText = () => {
    switch (refreshState) {
      case 'pulling':
        return pullText;
      case 'canRefresh':
        return releaseText;
      case 'refreshing':
        return refreshingText;
      default:
        return pullText;
    }
  };

  const getIcon = () => {
    if (refreshIcon) return refreshIcon;

    if (refreshState === 'refreshing' || isRefreshing) {
      return <RefreshCw className="w-5 h-5 animate-spin" />;
    }

    return <ChevronDown className="w-5 h-5" style={{ transform: `rotate(${iconRotation}deg)` }} />;
  };

  return (
    <div className={`pull-to-refresh-container ${className}`}>
      {/* Pull Indicator */}
      {!disabled && (refreshState !== 'idle' || pullDistance > 0) && (
        <div
          className="pull-to-refresh-indicator fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm"
          style={{
            transform: `translateY(${Math.max(0, pullDistance - 60)}px)`,
            opacity: Math.min(pullProgress, 1)
          }}
        >
          <div className="flex flex-col items-center justify-center py-4 px-6">
            <div className="mb-2 transition-transform duration-200 ease-out">
              {getIcon()}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              {getDisplayText()}
            </p>

            {/* Progress Bar */}
            <div className="w-full max-w-xs mt-2 bg-gray-200 dark:bg-gray-700 rounded-full h-1">
              <div
                className="bg-blue-600 h-1 rounded-full transition-all duration-200 ease-out"
                style={{ width: `${pullProgress * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Content Container */}
      <div
        ref={gestureRef as any}
        className={`pull-to-refresh-content ${disabled ? 'pointer-events-none' : ''}`}
        style={{
          transform: refreshState === 'refreshing' ? 'translateY(60px)' : 'none',
          transition: refreshState === 'refreshing' ? 'transform 0.3s ease-out' : 'none'
        }}
      >
        {children}
      </div>

      {/* Refreshing Overlay */}
      {(refreshState === 'refreshing' || isRefreshing) && (
        <div className="fixed inset-0 bg-black/10 dark:bg-black/20 backdrop-blur-sm z-40 flex items-start justify-center pt-20">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mx-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {refreshingText}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PullToRefresh;