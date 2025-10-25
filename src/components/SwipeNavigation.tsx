import React from 'react';
import { useMobileGestures, SwipeGesture } from '../hooks/useMobileGestures';

interface SwipeNavigationProps {
  currentTab: string;
  tabs: string[];
  onTabChange: (tab: string) => void;
  children: React.ReactNode;
  className?: string;
  enableSwipe?: boolean;
  swipeThreshold?: number;
}

export const SwipeNavigation: React.FC<SwipeNavigationProps> = ({
  currentTab,
  tabs,
  onTabChange,
  children,
  className = '',
  enableSwipe = true,
  swipeThreshold = 50
}) => {
  const { ref: gestureRef } = useMobileGestures({
    onSwipe: (gesture: SwipeGesture) => {
      if (!enableSwipe) return;

      const currentIndex = tabs.indexOf(currentTab);
      if (currentIndex === -1) return;

      let newIndex = currentIndex;

      // Handle horizontal swipes for tab navigation
      if (gesture.direction === 'left' && gesture.distance >= swipeThreshold) {
        // Swipe left - next tab
        newIndex = Math.min(currentIndex + 1, tabs.length - 1);
      } else if (gesture.direction === 'right' && gesture.distance >= swipeThreshold) {
        // Swipe right - previous tab
        newIndex = Math.max(currentIndex - 1, 0);
      }

      if (newIndex !== currentIndex) {
        onTabChange(tabs[newIndex]);
      }
    }
  }, {
    swipeThreshold,
    enableHapticFeedback: true
  });

  return (
    <div ref={gestureRef as any} className={`swipe-navigation ${className}`}>
      {children}
    </div>
  );
};

export default SwipeNavigation;