import { useEffect, useRef, useState, useCallback } from 'react';

export interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
}

export interface SwipeGesture {
  direction: 'left' | 'right' | 'up' | 'down';
  distance: number;
  velocity: number;
  duration: number;
  startPoint: TouchPoint;
  endPoint: TouchPoint;
}

export interface PinchGesture {
  scale: number;
  velocity: number;
  centerPoint: TouchPoint;
}

export interface TouchGestureHandlers {
  onSwipe?: (gesture: SwipeGesture) => void;
  onPinch?: (gesture: PinchGesture) => void;
  onTap?: (point: TouchPoint) => void;
  onDoubleTap?: (point: TouchPoint) => void;
  onLongPress?: (point: TouchPoint) => void;
  onPullToRefresh?: (distance: number) => void;
  onPullToRefreshEnd?: () => void;
}

export interface MobileGestureOptions {
  swipeThreshold?: number;
  pinchThreshold?: number;
  longPressDelay?: number;
  doubleTapDelay?: number;
  pullToRefreshThreshold?: number;
  enableHapticFeedback?: boolean;
}

const defaultOptions: Required<MobileGestureOptions> = {
  swipeThreshold: 50,
  pinchThreshold: 0.1,
  longPressDelay: 500,
  doubleTapDelay: 300,
  pullToRefreshThreshold: 80,
  enableHapticFeedback: true
};

export function useMobileGestures(
  handlers: TouchGestureHandlers,
  options: MobileGestureOptions = {}
) {
  const opts = { ...defaultOptions, ...options };
  const elementRef = useRef<HTMLElement>(null);

  // Touch state
  // @ts-expect-error - Reserved for future multi-touch tracking
  const [activeTouches, setActiveTouches] = useState<TouchList | null>(null);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);

  // Gesture tracking
  const gestureStartRef = useRef<TouchPoint | null>(null);
  const lastTapRef = useRef<TouchPoint | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initialPinchDistanceRef = useRef<number>(0);

  // Haptic feedback utility
  const triggerHapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!opts.enableHapticFeedback || typeof navigator === 'undefined') return;

    try {
      if ('vibrate' in navigator) {
        const patterns = {
          light: [10],
          medium: [20],
          heavy: [30]
        };
        navigator.vibrate(patterns[type]);
      }
    } catch (error) {
      console.warn('Haptic feedback not supported:', error);
    }
  }, [opts.enableHapticFeedback]);

  // Calculate distance between two points
  const calculateDistance = useCallback((point1: TouchPoint, point2: TouchPoint): number => {
    const dx = point1.x - point2.x;
    const dy = point1.y - point2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Calculate angle between two points
  const calculateAngle = useCallback((point1: TouchPoint, point2: TouchPoint): number => {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    return Math.atan2(dy, dx) * 180 / Math.PI;
  }, []);

  // Determine swipe direction
  const getSwipeDirection = useCallback((start: TouchPoint, end: TouchPoint): SwipeGesture['direction'] => {
    const angle = calculateAngle(start, end);
    const absAngle = Math.abs(angle);

    if (absAngle <= 45) return 'right';
    if (absAngle >= 135) return 'left';
    if (angle > 45 && angle < 135) return 'down';
    return 'up';
  }, [calculateAngle]);

  // Handle touch start
  const handleTouchStart = useCallback((event: TouchEvent) => {
    const touch = event.touches[0];
    if (!touch) return;

    const touchPoint: TouchPoint = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now()
    };

    gestureStartRef.current = touchPoint;
    setActiveTouches(event.touches);

    // Long press detection
    if (handlers.onLongPress) {
      longPressTimerRef.current = setTimeout(() => {
        triggerHapticFeedback('medium');
        handlers.onLongPress!(touchPoint);
      }, opts.longPressDelay);
    }

    // Pinch gesture initialization
    if (event.touches.length === 2) {
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      initialPinchDistanceRef.current = calculateDistance(
        { x: touch1.clientX, y: touch1.clientY, timestamp: Date.now() },
        { x: touch2.clientX, y: touch2.clientY, timestamp: Date.now() }
      );
    }
  }, [handlers, opts.longPressDelay, opts.enableHapticFeedback, triggerHapticFeedback, calculateDistance]);

  // Handle touch move
  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (!gestureStartRef.current) return;

    const currentTouch = event.touches[0];
    if (!currentTouch) return;

    const currentPoint: TouchPoint = {
      x: currentTouch.clientX,
      y: currentTouch.clientY,
      timestamp: Date.now()
    };

    // Clear long press timer if finger moved
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    // Pull to refresh detection (vertical swipe from top)
    if (handlers.onPullToRefresh && currentPoint.y > gestureStartRef.current.y) {
      const distance = currentPoint.y - gestureStartRef.current.y;
      if (distance > 0 && !isPullRefreshing) {
        setPullDistance(distance);
        if (distance >= opts.pullToRefreshThreshold) {
          setIsPullRefreshing(true);
          triggerHapticFeedback('light');
          handlers.onPullToRefresh(distance);
        }
      }
    }

    // Pinch gesture detection
    if (event.touches.length === 2 && handlers.onPinch) {
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      const currentDistance = calculateDistance(
        { x: touch1.clientX, y: touch1.clientY, timestamp: Date.now() },
        { x: touch2.clientX, y: touch2.clientY, timestamp: Date.now() }
      );

      if (initialPinchDistanceRef.current > 0) {
        const scale = currentDistance / initialPinchDistanceRef.current;
        const centerPoint: TouchPoint = {
          x: (touch1.clientX + touch2.clientX) / 2,
          y: (touch1.clientY + touch2.clientY) / 2,
          timestamp: Date.now()
        };

        const pinchGesture: PinchGesture = {
          scale,
          velocity: Math.abs(scale - 1),
          centerPoint
        };

        if (Math.abs(scale - 1) >= opts.pinchThreshold) {
          handlers.onPinch(pinchGesture);
        }
      }
    }
  }, [handlers, opts.pullToRefreshThreshold, opts.pinchThreshold, isPullRefreshing, triggerHapticFeedback, calculateDistance]);

  // Handle touch end
  const handleTouchEnd = useCallback((event: TouchEvent) => {
    if (!gestureStartRef.current) return;

    const endTouch = event.changedTouches[0];
    if (!endTouch) return;

    const endPoint: TouchPoint = {
      x: endTouch.clientX,
      y: endTouch.clientY,
      timestamp: Date.now()
    };

    // Clear timers
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    // Handle pull to refresh end
    if (isPullRefreshing && handlers.onPullToRefreshEnd) {
      handlers.onPullToRefreshEnd();
      setIsPullRefreshing(false);
      setPullDistance(0);
    }

    // Handle tap gestures
    if (handlers.onTap || handlers.onDoubleTap) {
      const distance = calculateDistance(gestureStartRef.current, endPoint);
      const duration = endPoint.timestamp - gestureStartRef.current.timestamp;

      // Check if it's a tap (not a swipe)
      if (distance <= 10 && duration <= 200) {
        // Double tap detection
        if (handlers.onDoubleTap && lastTapRef.current) {
          const timeSinceLastTap = endPoint.timestamp - lastTapRef.current.timestamp;
          const lastTapDistance = calculateDistance(lastTapRef.current, endPoint);

          if (timeSinceLastTap <= opts.doubleTapDelay && lastTapDistance <= 20) {
            triggerHapticFeedback('light');
            handlers.onDoubleTap(endPoint);
            lastTapRef.current = null;
            gestureStartRef.current = null;
            return;
          }
        }

        // Single tap
        if (handlers.onTap) {
          triggerHapticFeedback('light');
          handlers.onTap(endPoint);
        }

        lastTapRef.current = endPoint;
      }
    }

    // Handle swipe gestures
    if (handlers.onSwipe) {
      const distance = calculateDistance(gestureStartRef.current, endPoint);
      const duration = endPoint.timestamp - gestureStartRef.current.timestamp;
      const velocity = distance / duration;

      if (distance >= opts.swipeThreshold && velocity > 0.1) {
        const direction = getSwipeDirection(gestureStartRef.current, endPoint);
        const swipeGesture: SwipeGesture = {
          direction,
          distance,
          velocity,
          duration,
          startPoint: gestureStartRef.current,
          endPoint
        };

        triggerHapticFeedback('medium');
        handlers.onSwipe(swipeGesture);
      }
    }

    // Reset state
    gestureStartRef.current = null;
    initialPinchDistanceRef.current = 0;
    setActiveTouches(null);
    setPullDistance(0);
  }, [
    handlers,
    opts.swipeThreshold,
    opts.doubleTapDelay,
    isPullRefreshing,
    triggerHapticFeedback,
    calculateDistance,
    getSwipeDirection
  ]);

  // Set up event listeners
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);

      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Manual gesture trigger for testing
  const triggerGesture = useCallback((type: string, data: any) => {
    switch (type) {
      case 'swipe':
        if (handlers.onSwipe) {
          handlers.onSwipe(data);
        }
        break;
      case 'pinch':
        if (handlers.onPinch) {
          handlers.onPinch(data);
        }
        break;
      case 'tap':
        if (handlers.onTap) {
          handlers.onTap(data);
        }
        break;
    }
  }, [handlers]);

  return {
    ref: elementRef,
    isPullRefreshing,
    pullDistance,
    triggerGesture,
    triggerHapticFeedback
  };
}

export default useMobileGestures;